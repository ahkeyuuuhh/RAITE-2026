import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { connect, authClient, request } from './api';
import { AppContext, useRemote } from './context';
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Icon,
  Label,
  Pill,
  Row,
  colors,
  s,
  type IconName,
} from './ui';
import {
  Availability,
  Calendar,
  ClassDetail,
  Classes,
  Consultations,
  Home,
  Jobs,
  Notifications,
  Roster,
} from './screens';
import { CreateDraft, Quiz, Review, Submissions } from './assessment-screens';
import type { Assessment, Config, Notice, Profile } from './types';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Root />
    </SafeAreaProvider>
  );
}
function Root() {
  const [config, setConfig] = useState<Config>(),
    [profile, setProfile] = useState<Profile>(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const c = await connect();
      setConfig(c.config);
      const { data } = await c.auth.auth.getSession();
      if (data.session) setProfile(await request<Profile>('/me'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  useEffect(() => {
    if (!config) return;
    const { data } = authClient().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) setProfile(undefined);
    });
    return () => data.subscription.unsubscribe();
  }, [config]);
  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="sparkles" size={38} />
        <Heading>ClassAssist</Heading>
        <ActivityIndicator />
      </SafeAreaView>
    );
  if (!profile)
    return <Login config={config} error={error} retry={bootstrap} onSignedIn={setProfile} />;
  return (
    <Workspace
      config={config!}
      profile={profile}
      onLogout={async () => {
        const { error } = await authClient().auth.signOut({ scope: 'local' });
        if (error) throw error;
        setProfile(undefined);
      }}
    />
  );
}
function Login({
  config,
  error: initialError,
  retry,
  onSignedIn,
}: {
  config?: Config;
  error: string;
  retry: () => void;
  onSignedIn: (p: Profile) => void;
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(initialError),
    [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
          ]}
        >
          <View style={{ alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <View style={styles.logo}>
              <Icon name="sparkles" size={38} color="#fff" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.4 }}>
              ClassAssist
            </Text>
          </View>
          <Text style={styles.hero}>Good things{'\n'}start with a question.</Text>
          <Text style={[s.body, { textAlign: 'center', marginVertical: 18 }]}>
            A little less admin. A little more learning.{'\n'}Your classroom companion, wherever you
            are.
          </Text>
          <Card>
            <Heading>Welcome back</Heading>
            <Body>Sign in with your school’s assigned account.</Body>
            {error && (
              <View style={s.error}>
                <Text accessibilityRole="alert" style={s.errorText}>
                  {error}
                </Text>
              </View>
            )}
            {!config ? (
              <Button title="Reconnect to server" onPress={retry} />
            ) : (
              <>
                <Field
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                />
                <Button
                  title="Sign in"
                  busy={busy}
                  disabled={!email || !password}
                  onPress={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      const { error } = await authClient().auth.signInWithPassword({
                        email: email.trim(),
                        password,
                      });
                      if (error) throw error;
                      const p = await request<Profile>('/me');
                      onSignedIn(p);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </>
            )}
            <Text style={s.caption}>
              Teacher access is assigned by your administrator. An enrollment code only joins a
              class.
            </Text>
          </Card>
          <Text style={[s.caption, { textAlign: 'center', marginTop: 24 }]}>
            Thoughtfully made for teachers & students.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const tabs: { key: string; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Today', icon: 'house.fill' },
  { key: 'classes', label: 'Classes', icon: 'person.2.fill' },
  { key: 'assistant', label: 'Assistant', icon: 'sparkles' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'more', label: 'You', icon: 'gearshape' },
];
function Workspace({
  profile,
  config,
  onLogout,
}: {
  profile: Profile;
  config: Config;
  onLogout: () => Promise<void>;
}) {
  const [tab, setTab] = useState('home'),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [modal, setModal] = useState<{ kind: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  const open = useCallback((kind: string, id?: string) => {
    setError('');
    setMessage('');
    setModal({ kind, id });
  }, []);
  const act = async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fn();
      refresh();
      if (success) setMessage(success);
      return r;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const notice = (
    <>
      {error && (
        <View style={s.error}>
          <Text accessibilityRole="alert" style={s.errorText}>
            {error}
          </Text>
        </View>
      )}
      {message && (
        <View style={s.success}>
          <Text accessibilityLiveRegion="polite" style={s.successText}>
            {message}
          </Text>
        </View>
      )}
    </>
  );
  const content = () =>
    tab === 'home' ? (
      <Home />
    ) : tab === 'classes' ? (
      <Classes />
    ) : tab === 'assistant' ? (
      profile.role === 'teacher' ? (
        <TeacherStudio />
      ) : (
        <Consultations />
      )
    ) : tab === 'calendar' ? (
      <Calendar />
    ) : (
      <View style={s.stack}>
        <Card>
          <Label>{profile.role}</Label>
          <Heading>{profile.name}</Heading>
          <Body>Asia/Manila · School time zone</Body>
        </Card>
        <Card>
          <Row title="Your consultations" icon="calendar" onPress={() => open('book')} />
          <Row title="Notification center" icon="bell" onPress={() => open('notifications')} />
          {profile.role === 'teacher' && (
            <>
              <Row
                title="Consultation availability"
                icon="clock"
                onPress={() => open('availability')}
              />
              <Row title="Publication activity" icon="doc.text" onPress={() => open('jobs')} />
            </>
          )}
          <Row title="About ClassAssist" icon="sparkles" onPress={() => open('about')} />
        </Card>
        <Button title="Sign out" secondary busy={busy} onPress={() => act(onLogout)} />
      </View>
    );
  const modalContent = () => {
    if (!modal) return null;
    switch (modal.kind) {
      case 'class':
        return <ClassDetail classId={modal.id!} />;
      case 'roster':
        return <Roster classId={modal.id!} />;
      case 'book':
        return <Consultations />;
      case 'create-draft':
        return <CreateDraft classId={modal.id} />;
      case 'review':
        return <Review id={modal.id!} />;
      case 'quiz':
        return <Quiz id={modal.id!} />;
      case 'submissions':
        return <Submissions id={modal.id!} />;
      case 'availability':
        return <Availability />;
      case 'notifications':
        return <Notifications />;
      case 'jobs':
        return <Jobs />;
      default:
        return (
          <Card>
            <Heading>Room for learning.</Heading>
            <Body>
              ClassAssist helps students book time with teachers and helps teachers prepare reviewed
              assessments.
            </Body>
            <Body>
              AI drafts need teacher review. Sample drafts are labeled. Server-confirmed saves and
              receipts are authoritative. Notifications are in-app; background device push is not
              enabled.
            </Body>
            <Body>
              Demo accounts are fictional. This app does not capture your screen, clipboard, or
              camera.
            </Body>
          </Card>
        );
    }
  };
  return (
    <AppContext.Provider value={{ profile, config, revision, refresh, busy, act, open }}>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.top}>
          <View>
            <Label>{profile.role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</Label>
            <Text style={styles.title}>
              {tab === 'home'
                ? `Hello, ${profile.name
                    .split(' ')
                    .slice(0, profile.role === 'teacher' ? 2 : 1)
                    .join(' ')}.`
                : tabs.find((t) => t.key === tab)?.label}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => open('notifications')}
            style={styles.bell}
          >
            <Icon name="bell" />
          </Pressable>
        </View>
        <ScrollView
          key={tab}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        >
          {notice}
          {content()}
        </ScrollView>
        <View style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 12) }]}>
          <BlurView intensity={70} tint="light" style={styles.dock}>
            {tabs.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: tab === t.key }}
                onPress={() => {
                  setTab(t.key);
                  setMessage('');
                  setError('');
                  refresh();
                }}
                style={[styles.tab, tab === t.key && styles.activeTab]}
              >
                <Icon name={t.icon} size={21} color={tab === t.key ? colors.ink : colors.muted} />
                <Text style={[styles.tabLabel, tab === t.key && { color: colors.ink }]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </BlurView>
        </View>
        <Modal
          visible={Boolean(modal)}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            if (!busy) setModal(undefined);
          }}
        >
          <SafeAreaView style={styles.root}>
            <View style={styles.modalTop}>
              <Text style={s.label}>CLASSASSIST</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close panel"
                disabled={busy}
                onPress={() => setModal(undefined)}
                style={styles.bell}
              >
                <Icon name="xmark" size={18} />
              </Pressable>
            </View>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
              >
                {notice}
                {modalContent()}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </AppContext.Provider>
  );
}
function TeacherStudio() {
  const { data } = useRemote<Assessment[]>('/assessments');
  const context = React.useContext(AppContext);
  return (
    <View style={s.stack}>
      <Card>
        <Icon name="sparkles" size={28} />
        <Heading>Your teaching sidekick.</Heading>
        <Body>Bring a lesson. Build a draft. Make it your own before it goes to class.</Body>
        <Button title="Prepare an assessment" onPress={() => context.open('create-draft')} />
      </Card>
      <Heading>Assessment studio</Heading>
      {data?.map((a) => (
        <Card key={a.id}>
          <Pill>{a.state}</Pill>
          <Heading>{a.title}</Heading>
          <Button title="Review draft" secondary onPress={() => context.open('review', a.id)} />
        </Card>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.bg,
  },
  content: { padding: 20, gap: 18, width: '100%', maxWidth: 640, alignSelf: 'center' },
  top: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.8, color: colors.ink, marginTop: 7 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.5,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.ink,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#253C31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  dock: {
    flexDirection: 'row',
    padding: 7,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,.06)',
    backgroundColor: 'rgba(255,255,255,.94)',
    maxWidth: 460,
    width: '100%',
  },
  tab: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    borderRadius: 100,
  },
  activeTab: { backgroundColor: '#E8E8ED' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
});
