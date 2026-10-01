import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import Svg, { Path, Circle, Rect } from 'react-native-svg';
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
/* ==================== FLOATING PILL NAVBAR VECTOR ICONS ==================== */

function NavSearchIcon({ color = '#FFFFFF', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.8" cy="10.8" r="6.6" stroke={color} strokeWidth="2.4" />
      <Path d="M16 16L20.8 20.8" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

function NavCompassIcon({ color = '#FFFFFF', size = 21 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="3.5" width="17" height="17" rx="5.5" stroke={color} strokeWidth="2" />
      <Path
        d="M14.6 9.4L10.2 10.8L9.4 14.6L13.8 13.2L14.6 9.4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="1.3" fill={color} />
    </Svg>
  );
}

function NavPlanetIcon({ color = '#FFFFFF', size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5.6" stroke={color} strokeWidth="2" />
      <Path
        d="M3.2 15.2C5.2 18 10 18.5 14.8 15.8C18.8 13.5 20.8 9.8 19.5 7.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M20.8 8.8C18.8 6 14 5.5 9.2 8.2C5.2 10.5 3.2 14.2 4.5 16.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NavLibraryIcon({ color = '#FFFFFF', size = 21 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3.8" width="6.5" height="16.4" rx="3.25" stroke={color} strokeWidth="2" />
      <Circle cx="7.25" cy="8.2" r="1.2" fill={color} />
      <Circle cx="7.25" cy="15.8" r="1.2" fill={color} />
      <Rect x="13.5" y="3.8" width="6.5" height="16.4" rx="3.25" stroke={color} strokeWidth="2" />
      <Circle cx="16.75" cy="8.2" r="1.2" fill={color} />
      <Circle cx="16.75" cy="15.8" r="1.2" fill={color} />
    </Svg>
  );
}

export type PillIconType = 'search' | 'compass' | 'planet' | 'library';

export interface PillTabItem {
  key: string;
  label: string;
  icon: PillIconType;
}

const studentTabs: PillTabItem[] = [
  { key: 'home', label: 'Explore', icon: 'search' },
  { key: 'review', label: 'Review', icon: 'compass' },
  { key: 'agent', label: 'Agent', icon: 'planet' },
  { key: 'calendar', label: 'Calendar', icon: 'library' },
];

const teacherTabs: PillTabItem[] = [
  { key: 'home', label: 'Classroom', icon: 'search' },
  { key: 'assistant', label: 'Agent', icon: 'planet' },
  { key: 'calendar', label: 'Calendar', icon: 'compass' },
  { key: 'profile', label: 'Profile', icon: 'library' },
];

function FloatingPillNavBar({
  tabs,
  activeTab,
  onSelectTab,
  bottomInset = 16,
}: {
  tabs: PillTabItem[];
  activeTab: string;
  onSelectTab: (key: string) => void;
  bottomInset?: number;
}) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeTab));
  const TAB_WIDTH = 52;
  const PADDING_H = 6;
  const INDICATOR_SIZE = 44;
  const INDICATOR_OFFSET = PADDING_H + (TAB_WIDTH - INDICATOR_SIZE) / 2;

  const slideAnim = useRef(new Animated.Value(activeIndex * TAB_WIDTH)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex * TAB_WIDTH,
        friction: 6.8,
        tension: 55,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.90,
          duration: 70,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          friction: 4.5,
          tension: 65,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [activeIndex]);

  const renderIcon = (type: PillIconType, isSelected: boolean) => {
    const iconColor = isSelected ? '#000000' : 'rgba(255, 255, 255, 0.85)';
    switch (type) {
      case 'search':
        return <NavSearchIcon color={iconColor} size={20} />;
      case 'compass':
        return <NavCompassIcon color={iconColor} size={21} />;
      case 'planet':
        return <NavPlanetIcon color={iconColor} size={22} />;
      case 'library':
        return <NavLibraryIcon color={iconColor} size={21} />;
      default:
        return <NavSearchIcon color={iconColor} size={20} />;
    }
  };

  const pillWidth = tabs.length * TAB_WIDTH + PADDING_H * 2;

  return (
    <View
      style={[
        styles.pillDockWrapper,
        { bottom: Math.max(bottomInset, 18) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pillDockContainer,
          { width: pillWidth },
        ]}
      >
        {/* Animated Sliding White Circle Indicator */}
        <Animated.View
          style={[
            styles.pillActiveIndicator,
            {
              left: INDICATOR_OFFSET,
              transform: [
                { translateX: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        />

        {/* Tab Buttons Row */}
        <View style={styles.pillTabsRow}>
          {tabs.map((t) => {
            const isSelected = t.key === activeTab;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectTab(t.key)}
                style={({ pressed }) => [
                  styles.pillTabButton,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
                ]}
              >
                {renderIcon(t.icon, isSelected)}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

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
      case 'profile':
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
              <Row title="About ClassAssist" icon="sparkles" onPress={() => open('about')} />
            </Card>
            <Button title="Sign out" secondary busy={busy} onPress={() => act(onLogout)} />
          </View>
        );
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                onPress={() => open('notifications')}
                style={styles.bell}
              >
                <Icon name="bell" />
              </Pressable>
              {profile.role === 'student' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  onPress={() => setModal({ kind: 'profile' })}
                  style={styles.bell}
                >
                  <Icon name="person.fill" />
                </Pressable>
              )}
            </View>
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
          <FloatingPillNavBar
            tabs={tabs}
            activeTab={tab === 'classes' && profile.role === 'teacher' ? 'home' : tab}
            onSelectTab={(selectedKey) => {
              setTab(selectedKey);
              setMessage('');
              setError('');
              refresh();
            }}
            bottomInset={insets.bottom}
          />
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
  pillDockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pillDockContainer: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 12,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 14px 38px -4px rgba(0, 0, 0, 0.55), 0 4px 14px -2px rgba(0, 0, 0, 0.35)',
        }
      : {}),
    position: 'relative',
    justifyContent: 'center',
  },
  pillActiveIndicator: {
    position: 'absolute',
    top: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.22)',
        }
      : {}),
  },
  pillTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    height: '100%',
  },
  pillTabButton: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  modalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
});
