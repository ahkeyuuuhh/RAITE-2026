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
  TeacherHomeScreen,
  StudentHomeScreen,
  StudentReviewScreen,
  StudentAgentScreen,
  Jobs,
  Notifications,
  Roster,
} from './screens';
import { CreateDraft, Quiz, Review, Submissions } from './assessment-screens';
import { AuthFlow } from './auth-flow';
import type { Assessment, Config, Notice, Profile } from './types';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Root />
    </SafeAreaProvider>
  );
}
const DEFAULT_FALLBACK_CONFIG: Config = {
  supabaseUrl: 'https://alazisaoccfhwnepapci.supabase.co',
  supabaseKey: 'sb_publishable_0btsdOthImc4TkeBkqhALA_g0MFGNvw',
  aiConfigured: true,
  sampleEnabled: true,
  timezone: 'Asia/Manila',
};

function Root() {
  const [config, setConfig] = useState<Config>(DEFAULT_FALLBACK_CONFIG),
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
    try {
      const client = authClient();
      if (!client?.auth) return;
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) setProfile(undefined);
      });
      return () => data?.subscription?.unsubscribe();
    } catch {
      // Ignored in dev / offline mode
    }
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
    return <AuthFlow config={config || DEFAULT_FALLBACK_CONFIG} error={error} retry={bootstrap} onSignedIn={setProfile} />;
  return (
    <Workspace
      config={config || DEFAULT_FALLBACK_CONFIG}
      profile={profile}
      onLogout={async () => {
        try {
          const client = authClient();
          if (client?.auth) {
            await client.auth.signOut({ scope: 'local' });
          }
        } catch {
          // Ignored
        }
        setProfile(undefined);
      }}
    />
  );
}
const studentTabs: { key: string; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'house.fill' },
  { key: 'review', label: 'Review', icon: 'doc.text' },
  { key: 'agent', label: 'Agent', icon: 'plus' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', label: 'Profile', icon: 'person.fill' },
];

const teacherTabs: { key: string; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'house.fill' },
  { key: 'classes', label: 'Classes', icon: 'person.2.fill' },
  { key: 'assistant', label: 'Studio', icon: 'sparkles' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', label: 'Profile', icon: 'person.fill' },
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
  const tabs = profile.role === 'student' ? studentTabs : teacherTabs;
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
  const content = () => {
    if (tab === 'home') {
      return profile.role === 'teacher' ? <TeacherHomeScreen /> : <StudentHomeScreen />;
    }
    if (tab === 'review') {
      return <StudentReviewScreen />;
    }
    if (tab === 'agent') {
      return <StudentAgentScreen onBack={() => setTab('home')} />;
    }
    if (tab === 'classes') {
      return <Classes />;
    }
    if (tab === 'assistant') {
      return profile.role === 'teacher' ? <TeacherStudio /> : <Consultations />;
    }
    if (tab === 'calendar') {
      return <Calendar />;
    }
    return (
      <View style={s.stack}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{profile.role === 'teacher' ? 'Faculty Member' : 'Student Scholar'}</Label>
            <Pill tone={profile.role === 'teacher' ? 'green' : 'blue'}>
              {profile.role === 'teacher' ? 'Teacher' : 'Student'}
            </Pill>
          </View>
          <Heading>{profile.name}</Heading>
          <Body>University of the Philippines Diliman · Asia/Manila</Body>
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
  };
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
        {tab !== 'agent' && (
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
        )}
        {tab === 'agent' ? (
          <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 12) }}>
            {notice}
            {content()}
          </View>
        ) : (
          <ScrollView
            key={tab}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
            contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
          >
            {notice}
            {content()}
          </ScrollView>
        )}
        {tab !== 'agent' && (
          <View style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 12) }]}>
            <BlurView intensity={70} tint="light" style={styles.dock}>
            {tabs.map((t) => {
              const isSelected = tab === t.key;
              const isAgent = t.key === 'agent';
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setTab(t.key);
                    setMessage('');
                    setError('');
                    refresh();
                  }}
                  style={[
                    styles.tab,
                    isSelected && !isAgent && styles.activeTab,
                    isAgent && styles.agentTab,
                  ]}
                >
                  {isAgent ? (
                    <View style={[styles.agentPlusBadge, isSelected && styles.agentPlusBadgeActive]}>
                      <Icon name="plus" size={17} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Icon name={t.icon} size={21} color={isSelected ? colors.ink : colors.muted} />
                  )}
                  <Text
                    style={[
                      styles.tabLabel,
                      isSelected && { color: colors.ink, fontWeight: '700' },
                      isAgent && isSelected && { color: colors.blue },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>
        )}
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
    gap: 4,
    borderRadius: 100,
  },
  activeTab: { backgroundColor: '#E8E8ED' },
  agentTab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentPlusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  agentPlusBadgeActive: {
    backgroundColor: colors.blue,
    transform: [{ scale: 1.08 }],
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
});
