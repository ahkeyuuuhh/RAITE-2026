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
import { connect, authClient, request, setAuthToken, getAuthToken } from './api';
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
import { QuizGeneratorScreen } from './quiz-generator-modal';
import { DocumentSummarizerScreen } from './document-summarizer-modal';
import { AudioBitesScreen } from './audio-bites-modal';
import { AuthFlow } from './auth-flow';
import { ProfessorProfileScreen } from './professor-profile';
import type { Assessment, Config, Notice, Profile } from './types';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const fontLinkId = 'sf-inter-webfont';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'sf-inter-styles';
    style.textContent = `
      * {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Inter", system-ui, -apple-system-subheadline, "Helvetica Neue", sans-serif;
      }
      body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #F2F2F7;
      }
      @keyframes rainbowBorder {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      @keyframes rainbowGlowPulse {
        0% {
          box-shadow: 0 0 14px rgba(255, 45, 85, 0.4), 0 0 24px rgba(0, 122, 255, 0.35);
        }
        50% {
          box-shadow: 0 0 24px rgba(175, 82, 222, 0.65), 0 0 36px rgba(52, 199, 89, 0.5);
        }
        100% {
          box-shadow: 0 0 14px rgba(255, 45, 85, 0.4), 0 0 24px rgba(0, 122, 255, 0.35);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

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
      const token = await getAuthToken();
      if (token) {
        try {
          const p = await request<Profile>('/me');
          setProfile(p);
        } catch {
          await setAuthToken(null);
        }
      }
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
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          const token = await getAuthToken();
          if (!token) setProfile(undefined);
        }
      });
      return () => data?.subscription?.unsubscribe();
    } catch {
      // Ignored in dev / offline mode
    }
  }, [config]);
  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="book.closed" size={36} color="#811212" />
        <Heading style={{ marginTop: 8 }}>Aider</Heading>
        <ActivityIndicator color="#811212" style={{ marginTop: 12 }} />
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
          await request('/auth/logout', {}).catch(() => undefined);
          await setAuthToken(null);
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
  { key: 'agent', label: 'Agent', icon: 'sparkles' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'profile', label: 'Profile', icon: 'person.fill' },
];

const teacherTabs: { key: string; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Classroom', icon: 'book.closed' },
  { key: 'assistant', label: 'Agent', icon: 'sparkles' },
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
    [modal, setModal] = useState<{ kind: string; id?: string }>(),
    [standaloneScreen, setStandaloneScreen] = useState<string | null>(null),
    [professorClassId, setProfessorClassId] = useState<string>();
  const insets = useSafeAreaInsets();
  const refresh = useCallback(() => setRevision((x) => x + 1), []);
  const open = useCallback((kind: string, id?: string) => {
    setError('');
    setMessage('');
    if (kind === 'quiz-gen' || kind === 'quiz_generator') {
      setStandaloneScreen('quiz-gen');
      return;
    }
    if (kind === 'summary' || kind === 'summarizer') {
      setStandaloneScreen('summarizer');
      return;
    }
    if (kind === 'audio-bites' || kind === 'podcast' || kind === 'audio') {
      setStandaloneScreen('audio-bites');
      return;
    }
    if (kind === 'agent') {
      setTab('agent');
      return;
    }
    if (kind === 'class' && profile.role === 'teacher' && id) {
      setModal(undefined);
      setProfessorClassId(id);
      return;
    }
    setModal({ kind, id });
  }, [profile.role]);
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
      return profile.role === 'teacher' ? <TeacherHomeScreen onCreateClass={() => setTab('classes')} /> : <StudentHomeScreen />;
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
    if (tab === 'profile' && profile.role === 'teacher') {
      return <ProfessorProfileScreen onLogout={onLogout} />;
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
  if (standaloneScreen === 'quiz-gen') {
    return (
      <AppContext.Provider value={{ profile, config, revision, refresh, busy, act, open }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <QuizGeneratorScreen
            onBack={() => {
              setStandaloneScreen(null);
              refresh();
            }}
          />
        </View>
      </AppContext.Provider>
    );
  }

  if (standaloneScreen === 'summarizer') {
    return (
      <AppContext.Provider value={{ profile, config, revision, refresh, busy, act, open }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <DocumentSummarizerScreen
            onBack={() => {
              setStandaloneScreen(null);
              refresh();
            }}
            onAskTutor={() => {
              setStandaloneScreen(null);
              setTab('agent');
            }}
          />
        </View>
      </AppContext.Provider>
    );
  }

  if (standaloneScreen === 'audio-bites') {
    return (
      <AppContext.Provider value={{ profile, config, revision, refresh, busy, act, open }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <AudioBitesScreen
            onBack={() => {
              setStandaloneScreen(null);
              refresh();
            }}
            onAskTutor={() => {
              setStandaloneScreen(null);
              setTab('agent');
            }}
          />
        </View>
      </AppContext.Provider>
    );
  }

  const isProfessorClassroom = profile.role === 'teacher' && Boolean(professorClassId);
  return (
    <AppContext.Provider value={{ profile, config, revision, refresh, busy, act, open }}>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        {isProfessorClassroom ? (
          <View style={{ flex: 1 }}>
            {notice}
            <ClassDetail
              classId={professorClassId!}
              {...({ onBack: () => setProfessorClassId(undefined) } as any)}
            />
          </View>
        ) : (
          <>
        {tab !== 'agent' && !(tab === 'home' && profile.role === 'teacher') && !(tab === 'profile' && profile.role === 'teacher') && (
          <View style={styles.top}>
            <View>
              <Label>{profile.role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</Label>
              <Text style={styles.title}>
                {tab === 'classes'
                  ? 'Classes'
                  : tab === 'home'
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
          <View style={{ flex: 1 }}>
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
          <View style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 16) }]}>
            {/* Single Unified Frosted Glass Capsule Navbar */}
            <View style={styles.dockContainer}>
              <BlurView intensity={Platform.OS === 'ios' ? 80 : 50} tint="light" style={styles.dock}>
                {tabs.map((t) => {
                  const isSelected = tab === t.key || (tab === 'classes' && profile.role === 'teacher' && t.key === 'home');
                  const isAgent = t.key === 'agent' || t.key === 'assistant';
                  const activeColor = profile.role === 'teacher' ? '#811212' : '#111827';
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
                      style={({ pressed }) => [
                        styles.tabPressable,
                        pressed && styles.tabPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.tabContent,
                          isAgent
                            ? {
                                backgroundColor: isSelected ? '#000000' : '#111827',
                                paddingHorizontal: 16,
                                paddingVertical: 7,
                                borderRadius: 22,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.22,
                                shadowRadius: 8,
                                elevation: 5,
                              }
                            : isSelected
                            ? [
                                styles.activeTabChip,
                                profile.role === 'teacher' && { backgroundColor: 'rgba(129, 18, 18, 0.08)' },
                              ]
                            : null,
                        ]}
                      >
                        <Icon
                          name={t.icon}
                          size={isAgent ? 21 : 22}
                          color={isAgent ? '#FFFFFF' : isSelected ? activeColor : '#6B7280'}
                        />
                        <Text
                          style={[
                            styles.tabLabel,
                            isAgent
                              ? { color: '#FFFFFF', fontWeight: '700', fontSize: 11 }
                              : isSelected
                              ? [
                                  styles.activeTabLabel,
                                  profile.role === 'teacher' && { color: activeColor, fontWeight: '700' },
                                ]
                              : styles.inactiveTabLabel,
                          ]}
                          numberOfLines={1}
                        >
                          {t.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </BlurView>
            </View>
          </View>
        )}
          </>
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
  dockWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dockContainer: {
    flex: 1,
    maxWidth: 440,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderTopColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }
      : {}),
  },
  dock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: '100%',
  },
  tabPressable: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 22,
    minWidth: 44,
    gap: 3.5,
  },
  activeTabChip: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 14,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  inactiveTabLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
  moreWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderTopColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }
      : {}),
  },
  moreBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  moreButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
});
