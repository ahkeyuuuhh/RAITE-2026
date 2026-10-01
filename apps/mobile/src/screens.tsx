import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  Pressable,
  Switch,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { request, dateText, localDate, localDateTime, toISO } from './api';
import { GEMINI_API_KEY } from './gemini-key';
import { useApp, useRemote } from './context';
import { QuizGeneratorScreen, QuizGeneratorModal } from './quiz-generator-modal';
import { BlurView } from 'expo-blur';
import { Prism } from './Prism';
import {
  Body,
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Icon,
  Label,
  Pill,
  Ring,
  Row,
  MetricCard,
  FeatureCard,
  ProgressRing,
  BarChartWidget,
  SparklineWidget,
  colors,
  fontStack,
  s,
} from './ui';
import type {
  Assessment,
  Attempt,
  Booking,
  CalendarEvent,
  Classroom,
  Job,
  Notice,
  Profile,
  Rules,
  Slot,
  Teacher,
} from './types';

export function RemoteState({ error, loading }: { error: string; loading: boolean }) {
  const { refresh } = useApp();
  return error ? (
    <Card>
      <Body>{error}</Body>
      <Button title="Try again" secondary onPress={refresh} />
    </Card>
  ) : loading ? (
    <ActivityIndicator accessibilityLabel="Loading" style={{ padding: 24 }} />
  ) : null;
}
const professorAccent = '#811212';

export function TeacherHomeScreen({ onCreateClass }: { onCreateClass: () => void }) {
  const { profile, open } = useApp();
  const { data: assessments } = useRemote<Assessment[]>('/assessments');
  const { data: classes, error: classesError } = useRemote<Classroom[]>('/classes');
  const [query, setQuery] = useState('');

  const pendingReviews = new Map<string, number>();
  for (const assessment of assessments || []) {
    if (assessment.state === 'draft') {
      pendingReviews.set(assessment.class_id, (pendingReviews.get(assessment.class_id) || 0) + 1);
    }
  }

  // The existing /classes endpoint returns oldest first, so reverse its real data for Recent.
  const visibleClasses = [...(classes || [])]
    .reverse()
    .filter((classroom) =>
      [classroom.name, classroom.subject, classroom.description]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    );
  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P';

  return (
    <View style={s.stack}>
      <View style={professorStyles.brandRow}>
        <View style={professorStyles.brand}>
          <Icon name="book.closed" size={28} color={professorAccent} />
          <Text style={professorStyles.brandName}>ClassAssist</Text>
        </View>
        <View accessibilityLabel={profile.name + ' profile'} style={professorStyles.avatar}>
          <Text style={professorStyles.avatarText}>{initials}</Text>
        </View>
      </View>

      <View style={professorStyles.intro}>
        <Text style={professorStyles.title}>Classroom</Text>
        <Text style={professorStyles.subtitle}>Manage your classes, classwork, and students.</Text>
      </View>

      <View style={professorStyles.searchField}>
        <Icon name="magnifyingglass" size={21} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search classes, codes, or sections"
          value={query}
          onChangeText={setQuery}
          placeholder="Search classes, codes, or sections..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={professorStyles.searchInput}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onCreateClass}
        style={({ pressed }) => [professorStyles.createButton, pressed && { opacity: 0.82 }]}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
        <Text style={professorStyles.createButtonText}>Create new class</Text>
      </Pressable>

      <View style={professorStyles.sectionHeader}>
        <Heading>Your Classes</Heading>
        <View style={professorStyles.sortLabel}>
          <Text style={professorStyles.sortText}>Sort by Recent</Text>
          <Icon name="chevron.down" size={14} color={colors.muted} />
        </View>
      </View>

      <RemoteState error={classesError || ''} loading={!classes && !classesError} />
      {visibleClasses.length ? (
        visibleClasses.map((classroom) => (
          <Pressable
            key={classroom.id}
            accessibilityRole="button"
            accessibilityLabel={'Open ' + classroom.name}
            onPress={() => open('class', classroom.id)}
            style={({ pressed }) => [professorStyles.classCard, pressed && { opacity: 0.88 }]}
          >
            <View style={professorStyles.cardTop}>
              <Text numberOfLines={1} style={professorStyles.subjectBadge}>
                {classroom.subject}
              </Text>
              <Icon name="chevron.right" size={18} color={colors.muted} />
            </View>
            <Text style={professorStyles.classTitle}>{classroom.name}</Text>
            {!!classroom.description && (
              <Text numberOfLines={1} style={professorStyles.description}>
                {classroom.description}
              </Text>
            )}
            <View style={professorStyles.cardDivider} />
            <View style={professorStyles.cardMeta}>
              <View style={professorStyles.studentCount}>
                <Icon name="person.2.fill" size={19} color={colors.muted} />
                <Text style={professorStyles.metaText}>{classroom.member_count} students</Text>
              </View>
              {!!pendingReviews.get(classroom.id) && (
                <View style={professorStyles.pendingReviews}>
                  <Icon name="doc.text" size={18} color={professorAccent} />
                  <Text numberOfLines={1} style={professorStyles.pendingText}>
                    {pendingReviews.get(classroom.id)} pending reviews
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))
      ) : classes && query.trim() ? (
        <Text style={professorStyles.emptyText}>{'No classes match “' + query.trim() + '”.'}</Text>
      ) : classes ? (
        <Text style={professorStyles.emptyText}>No classes yet. Create your first class to get started.</Text>
      ) : null}
    </View>
  );
}

const professorStyles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandName: { color: colors.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.45 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F1F4',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  intro: { gap: 3, marginTop: 5 },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -1.15, color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted },
  searchField: {
    minWidth: 0,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 15, color: colors.ink },
  createButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: professorAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: -2,
  },
  createButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortText: { color: colors.muted, fontSize: 14 },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.line,
    padding: 17,
    gap: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subjectBadge: {
    maxWidth: '82%',
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: '#F8E9E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: professorAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  classTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.35 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 19 },
  cardDivider: { height: 1, backgroundColor: colors.line, marginTop: 1 },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 24,
  },
  studentCount: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  metaText: { color: colors.muted, fontSize: 14 },
  pendingReviews: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, flex: 1, minWidth: 0 },
  pendingText: { color: professorAccent, fontSize: 13, flexShrink: 1 },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, paddingVertical: 14 },
});
export function StudentHomeScreen() {
  const { open } = useApp();
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const { data: bookings } = useRemote<Booking[]>('/consultations');
  const { data: assessments } = useRemote<Assessment[]>('/assessments');
  const { data: classes } = useRemote<Classroom[]>('/classes');

  if (showQuizGenerator) {
    return <QuizGeneratorScreen onBack={() => setShowQuizGenerator(false)} />;
  }

  const upcoming = (bookings || []).filter(
    (b) => b.status === 'booked' && new Date(b.ends_at) > new Date(),
  );
  const openAssessments = (assessments || []).filter((a) => a.state === 'open');
  const activeClassrooms = classes || [];

  return (
    <View style={s.stack}>
      {/* 4 Metric Widgets in Squircle Grid */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MetricCard
          icon="doc.text"
          title="Quizzes"
          value={openAssessments.length}
          unit="active"
          widget={
            <ProgressRing
              size={38}
              pct={openAssessments.length > 0 ? 0.75 : 0.15}
              strokeWidth={4.2}
              color={colors.ink}
              trackColor="#E5E5EA"
            />
          }
        />

        <MetricCard
          icon="calendar"
          title="Sessions"
          value={upcoming.length}
          unit="booked"
          widget={
            <ProgressRing
              size={38}
              pct={upcoming.length > 0 ? 0.6 : 0.1}
              strokeWidth={4.2}
              color={colors.ink}
              trackColor="#E5E5EA"
            />
          }
          onPress={() => open('calendar')}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <MetricCard
          icon="person.2.fill"
          title="Classes"
          value={activeClassrooms.length}
          unit="enrolled"
          widget={
            <BarChartWidget
              width={36}
              maxHeight={26}
              heights={[10, 16, 26, 18, 12]}
              activeIndex={2}
            />
          }
        />

        <MetricCard
          icon="sparkles"
          title="AI Tutor"
          value="24/7"
          unit="online"
          widget={
            <SparklineWidget
              width={42}
              height={22}
              color={colors.ink}
            />
          }
          onPress={() => open('agent')}
        />
      </View>

      {/* Feature Section: 3-column 1-row Card Layout */}
      <View style={{ marginTop: 14, marginBottom: 4 }}>
        <Heading style={{ fontSize: 18 }}>Feature Section</Heading>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Card 1: Quiz Generator */}
        <FeatureCard
          icon="sparkles"
          title="Quiz Gen"
          subtitle="AI generator"
          onPress={() => {
            open('quiz-gen');
            setShowQuizGenerator(true);
          }}
        />

        {/* Card 2: Flashcards (Coming Soon) */}
        <FeatureCard
          icon="doc.on.doc"
          title="Cards"
          subtitle="Smart review"
        />

        {/* Card 3: Summarizer (Coming Soon) */}
        <FeatureCard
          icon="waveform"
          title="Summary"
          subtitle="Key notes"
        />
      </View>

      {/* Enrolled Classes */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>Enrolled Classrooms</Heading>
        <Text style={s.caption}>{activeClassrooms.length} Enrolled</Text>
      </View>
      <Card>
        {activeClassrooms.length ? (
          activeClassrooms.slice(0, 2).map((c) => (
            <Row
              key={c.id}
              title={c.name}
              detail={`${c.subject} · Taught by ${c.teacher_name}`}
              icon="person.2.fill"
              onPress={() => open('class', c.id)}
            />
          ))
        ) : (
          <Body>You haven't joined a class yet. Use a class code from your teacher.</Body>
        )}
      </Card>
    </View>
  );
}

export function StudentReviewScreen() {
  const { open } = useApp();
  const { data: assessments, error: assessError } = useRemote<Assessment[]>('/assessments');
  const { data: classes } = useRemote<Classroom[]>('/classes');

  const openAssessments = (assessments || []).filter((a) => a.state === 'open');
  const scheduledAssessments = (assessments || []).filter((a) =>
    ['approved', 'announced'].includes(a.state),
  );

  return (
    <View style={s.stack}>
      <Card style={{ backgroundColor: '#F0F4FE', padding: 20, borderColor: '#D9E2F8', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill tone="blue">Quizzes & Assessment Review</Pill>
          <Icon name="doc.text" size={24} color={colors.blue} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 8, letterSpacing: -0.5 }}>
          Assessments & Learning Review
        </Text>
        <Body style={{ marginTop: 4, color: '#334155' }}>
          Take assigned quizzes, track submission deadlines, and review key course topics.
        </Body>
      </Card>

      {/* Open Assessments Available Now */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 6 }]}>
        <Heading>Active Quizzes</Heading>
        {openAssessments.length > 0 && <Pill tone="blue">{openAssessments.length} Due</Pill>}
      </View>
      <RemoteState error={assessError || ''} loading={!assessments && !assessError} />
      {!openAssessments.length ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="checkmark.circle.fill" size={24} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>No Open Quizzes</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                You have no active assessments due right now. Great job staying on top of coursework!
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        openAssessments.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pill tone="blue">{a.class_name || 'Class Assessment'}</Pill>
              <Text style={{ fontSize: 11, color: colors.muted }}>{a.duration_minutes || 20} mins</Text>
            </View>
            <Heading style={{ marginTop: 6 }}>{a.title}</Heading>
            <Body>{a.announcement || 'Review the lesson and complete each question independently.'}</Body>
            <View style={{ marginTop: 10 }}>
              <Button title="Take Quiz Now" onPress={() => open('quiz', a.id)} />
            </View>
          </Card>
        ))
      )}

      {/* Upcoming Scheduled Assessments */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 6 }]}>
        <Heading>Upcoming Assessments</Heading>
        <Text style={s.caption}>Scheduled</Text>
      </View>
      {!scheduledAssessments.length ? (
        <Card>
          <Body>No upcoming assessments scheduled yet by your teachers.</Body>
        </Card>
      ) : (
        scheduledAssessments.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pill tone="gray">{a.class_name || 'Upcoming'}</Pill>
              <Text style={{ fontSize: 11, color: colors.muted }}>{a.duration_minutes} mins</Text>
            </View>
            <Heading style={{ marginTop: 4 }}>{a.title}</Heading>
            <Body numberOfLines={2}>{a.announcement || 'Scheduled assessment for enrolled students.'}</Body>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
              Opens: {dateText(a.opens_at)} · Closes: {dateText(a.closes_at)}
            </Text>
          </Card>
        ))
      )}

      {/* Classroom Lesson Materials */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 6 }]}>
        <Heading>Course Materials</Heading>
        <Text style={s.caption}>Enrolled</Text>
      </View>
      <Card>
        {classes?.length ? (
          classes.map((c) => (
            <Row
              key={c.id}
              title={c.name}
              detail={`${c.subject} · Taught by ${c.teacher_name}`}
              icon="doc.text"
              onPress={() => open('class', c.id)}
            />
          ))
        ) : (
          <Body>Join a classroom to view lesson study guides.</Body>
        )}
      </Card>
    </View>
  );
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  model?: string;
  live?: boolean;
  imageUri?: string;
}

interface ImagePayload {
  data: string;
  mimeType: string;
}

async function callGeminiDirect(
  message: string,
  history: { role: string; content: string }[] = [],
  image?: ImagePayload | null,
): Promise<{ reply: string; model: string } | null> {
  const apiKey = GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  
  const userParts: any[] = [];
  if (image && image.data) {
    userParts.push({
      inline_data: {
        mime_type: image.mimeType || 'image/jpeg',
        data: image.data,
      },
    });
  }
  userParts.push({
    text: message || (image ? 'Here is my lesson material or problem sheet. Please analyze it and guide me through the concepts step-by-step.' : 'Hello!'),
  });

  const contents = [
    ...history.slice(-6).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: userParts },
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 28000);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [
                {
                  text: `You are ClassAssist Socratic Tutor, an encouraging, articulate, and academically rigorous study mentor for Philippine students.

CORE TUTORING PEDAGOGY:
1. STRICT SOCRATIC METHOD: You MUST NEVER give direct answers, final numerical solutions, completed code, or full essays under any circumstances. Even if the student says "just give me the answer" or "what is the final answer?", politely decline and offer a progressive hint or ask a guiding question instead.
2. GUIDANCE & PROGRESSIVE HINTS:
   - Break complex problems or topics down into bite-sized, digestible thinking steps.
   - Ask guiding, diagnostic questions that lead the student to discover the answer on their own.
   - Point out subtle clues or foundational formulas they need to recall.
   - Identify and gently clarify misconceptions. Celebrate each insight the student gets right!
3. WHEN AN IMAGE / LESSON IS UPLOADED:
   - Analyze the image in detail (diagrams, questions, lesson title, text, formulas).
   - Acknowledge and state the core lesson topic and the learning objective clearly.
   - Ask an opening diagnostic question to invite the student to take the first step together (e.g. "What information is given first?" or "What formula relates these two quantities?").
4. STRICT FORMATTING RULE:
   - NEVER use markdown double asterisks (**) anywhere in your response. Never output **. Use plain text, bullet points with • or -, or quotation marks instead.
   - Keep answers clear, accessible, and structured.`,
                },
              ],
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          text = text.replace(/\*\*/g, '');
          return { reply: text, model };
        }
      }
    } catch (e) {
      console.warn(`Direct Gemini call failed for ${model}:`, e);
    }
  }
  return null;
}

const PROMPT_WORDS = [
  'anything...',
  'about your lessons...',
  'to generate a quiz...',
  'for study tips...',
  'to explain a concept...',
  'about deadlines...',
  'to summarize notes...',
];

function useTypingEffect(words: string[], typingSpeed = 68, deletingSpeed = 36, pauseTime = 2200) {
  const [displayedText, setDisplayedText] = useState(words[0] || 'anything...');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(cursorTimer);
  }, []);

  useEffect(() => {
    const targetWord = words[wordIdx % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedText.length < targetWord.length) {
        timeout = setTimeout(() => {
          setDisplayedText(targetWord.slice(0, displayedText.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(targetWord.slice(0, displayedText.length - 1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setWordIdx((prev) => (prev + 1) % words.length);
        timeout = setTimeout(() => {}, 350);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, wordIdx, words, typingSpeed, deletingSpeed, pauseTime]);

  return { text: displayedText, cursorVisible };
}

export function ThreeDotsWave({ color = '#6366F1', size = 7 }: { color?: string; size?: number }) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createWave = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -5.5,
            duration: 280,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 280,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 560 - delay)),
        ]),
      );
    };

    const a1 = createWave(anim1, 0);
    const a2 = createWave(anim2, 140);
    const a3 = createWave(anim3, 280);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [anim1, anim2, anim3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 18, paddingHorizontal: 3 }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY: anim1 }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY: anim2 }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY: anim3 }],
        }}
      />
    </View>
  );
}

function SmoothUserBubble({ message }: { message: ChatMessage }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        alignSelf: 'flex-end',
        maxWidth: '85%',
        minWidth: 80,
        backgroundColor: '#007AFF',
        borderRadius: 20,
        borderBottomRightRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {message.imageUri && (
        <View
          style={{
            marginBottom: 8,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          <Image
            source={{ uri: message.imageUri }}
            style={{ width: 220, height: 160, borderRadius: 13 }}
            resizeMode="cover"
          />
        </View>
      )}
      {message.content ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: '#FFFFFF', fontWeight: '500' }}>
          {message.content}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 10,
          color: 'rgba(255, 255, 255, 0.75)',
          marginTop: 4,
          alignSelf: 'flex-end',
        }}
      >
        {message.time}
      </Text>
    </Animated.View>
  );
}

function SmoothAssistantText({
  text,
  isStreaming,
  onComplete,
  onStreamStep,
}: {
  text: string;
  isStreaming: boolean;
  onComplete?: () => void;
  onStreamStep?: () => void;
}) {
  const [displayedLength, setDisplayedLength] = useState(isStreaming ? 0 : text.length);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(text.length);
      return;
    }

    setDisplayedLength(0);
    const totalLength = text.length;
    let current = 0;

    const interval = setInterval(() => {
      const step = current < 60 ? 2 : current < 220 ? 3 : 5;
      current = Math.min(totalLength, current + step);
      setDisplayedLength(current);
      onStreamStep?.();

      if (current >= totalLength) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 18);

    return () => clearInterval(interval);
  }, [text, isStreaming]);

  const visibleText = isStreaming ? text.slice(0, displayedLength) : text;

  return (
    <Text style={{ fontSize: 14, lineHeight: 22, color: '#1F2937' }}>
      {visibleText.replace(/\*\*/g, '')}
      {isStreaming && displayedLength < text.length && (
        <Text style={{ color: '#6366F1', fontWeight: '700' }}> ▋</Text>
      )}
    </Text>
  );
}

function WaveFrequencyBars({ isListening }: { isListening: boolean }) {
  const barAnims = [
    useRef(new Animated.Value(6)).current,
    useRef(new Animated.Value(14)).current,
    useRef(new Animated.Value(20)).current,
    useRef(new Animated.Value(12)).current,
    useRef(new Animated.Value(18)).current,
    useRef(new Animated.Value(8)).current,
  ];

  useEffect(() => {
    if (!isListening) {
      barAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 6,
          duration: 180,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const configs = [
      { min: 5, max: 22, duration: 240, delay: 0 },
      { min: 8, max: 28, duration: 290, delay: 60 },
      { min: 10, max: 32, duration: 220, delay: 110 },
      { min: 6, max: 25, duration: 310, delay: 170 },
      { min: 8, max: 29, duration: 250, delay: 80 },
      { min: 5, max: 20, duration: 330, delay: 140 },
    ];

    const loops = barAnims.map((anim, idx) => {
      const cfg = configs[idx];
      return Animated.loop(
        Animated.sequence([
          Animated.delay(cfg.delay),
          Animated.timing(anim, {
            toValue: cfg.max,
            duration: cfg.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: cfg.min,
            duration: cfg.duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
    });

    loops.forEach((l) => l.start());

    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [isListening]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 32, gap: 3.5, paddingHorizontal: 2 }}>
      {barAnims.map((anim, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: 3.5,
            height: anim,
            borderRadius: 2,
            backgroundColor: '#8E8E93',
          }}
        />
      ))}
    </View>
  );
}

export function StudentAgentScreen({ onBack }: { onBack?: () => void } = {}) {
  const { open } = useApp();
  const { text: typingEffectText, cursorVisible } = useTypingEffect(PROMPT_WORDS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPromptsSheet, setShowPromptsSheet] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ live: boolean; model: string } | null>(null);
  const [statusChecking, setStatusChecking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    previewUrl: string;
    data: string;
    mimeType: string;
    name?: string;
  } | null>(null);

  const handlePickImage = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.accept = 'image/*';
      inputEl.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 12 * 1024 * 1024) {
          alert('Please choose an image under 12MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const [header, base64] = res.split(',');
          const mimeType = header.match(/:(.*?);/)?.[1] || file.type || 'image/jpeg';
          setSelectedImage({
            previewUrl: res,
            data: base64,
            mimeType,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      };
      inputEl.click();
    }
  };

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);

  // Smooth entrance animations when switching to Agent Screen
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const screenSlideAnim = useRef(new Animated.Value(18)).current;
  const screenScaleAnim = useRef(new Animated.Value(0.97)).current;

  // Animated moving rainbow border
  const rainbowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenSlideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenScaleAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenFadeAnim, screenSlideAnim, screenScaleAnim]);

  useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.timing(rainbowAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      );
      loop.start();
      return () => loop.stop();
    } else {
      rainbowAnim.setValue(0);
    }
  }, [isListening, rainbowAnim]);

  const rainbowBorderColor = rainbowAnim.interpolate({
    inputRange: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
    outputRange: [
      '#FF2D55',
      '#FF9500',
      '#FFCC00',
      '#34C759',
      '#007AFF',
      '#5856D6',
      '#FF2D55',
    ],
  });

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          if (typeof recognitionRef.current.stop === 'function') {
            recognitionRef.current.stop();
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const checkStatus = async () => {
    setStatusChecking(true);
    try {
      const res = await request<{ live: boolean; model: string }>('/ai/status', undefined, false, 'GET');
      setAiStatus(res);
    } catch {
      setAiStatus({ live: false, model: 'offline-preview' });
    } finally {
      setStatusChecking(false);
    }
  };

  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    checkStatus();
  }, []);

  const samplePrompts = [
    {
      tag: '📐 Algebra',
      title: 'Factoring vs Quadratic Formula',
      prompt: 'Help me understand when to use the quadratic formula versus factoring. Guide me with questions.',
    },
    {
      tag: '⚡ Physics',
      title: 'Newton’s 3 Laws',
      prompt: 'I want to master Newton’s laws of motion. Quiz me with real-world scenarios to test my understanding.',
    },
    {
      tag: '🧬 Biology',
      title: 'Cellular Respiration Steps',
      prompt: 'Can you guide me step-by-step through cellular respiration? Ask me questions so I discover the stages.',
    },
    {
      tag: '🌿 Botany',
      title: 'Photosynthesis Stages',
      prompt: 'Break down light-dependent reactions and Calvin cycle. Guide me step-by-step with diagnostic questions.',
    },
    {
      tag: '📷 Lesson Photo',
      title: 'Analyze Uploaded Lesson Sheet',
      prompt: 'I have attached a photo of my lesson material. Please analyze it and guide me through the concepts step-by-step.',
    },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    const currentImage = selectedImage;
    if ((!text && !currentImage) || isThinking) return;

    setInput('');
    setSelectedImage(null);
    setShowPromptsSheet(false);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: text || (currentImage ? 'Uploaded lesson material for guided study.' : ''),
      time: timeStr,
      imageUri: currentImage?.previewUrl,
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsThinking(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const history = updated.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let replyText = '';
      let replyModel = 'gemini-3.5-flash-lite';
      let isLive = true;

      // 1. Prioritize direct Google Gemini call with Vision support & Socratic Tutoring instructions
      const direct = await callGeminiDirect(
        text,
        history,
        currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : null,
      );
      if (direct?.reply) {
        replyText = direct.reply.replace(/\*\*/g, '');
        replyModel = direct.model;
        isLive = true;
      } else {
        // 2. Fallback to backend API server
        const res = await request<{ reply: string; model: string; live: boolean }>(
          '/ai/chat',
          {
            message: text || (currentImage ? 'Please analyze my lesson sheet and guide me step-by-step.' : ''),
            history,
            image: currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : undefined,
          },
          false,
        );
        if (res?.reply) {
          replyText = res.reply.replace(/\*\*/g, '');
          replyModel = res.model || 'gemini-3.5-flash-lite';
          isLive = res.live ?? true;
        }
      }

      const aiMsg: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: (replyText || 'No explanation returned.').replace(/\*\*/g, ''),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: replyModel,
        live: isLive,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setStreamingMsgId(aiMsg.id);
      setAiStatus((prev) => ({ ...prev, live: isLive, model: replyModel }));
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: `Notice: ${err?.message || 'Unable to reach ClassAssist AI tutor'}.\n\nPlease ensure your device is connected to the internet.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'system-notice',
        live: false,
      };
      setMessages((prev) => [...prev, errMsg]);
      setStreamingMsgId(errMsg.id);
    } finally {
      setIsThinking(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    const clean = (text || '').replace(/\*\*/g, '');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setShowPromptsSheet(false);
  };

  const startListening = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setInput(currentTranscript);
          }
        };

        rec.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn('Failed to start SpeechRecognition:', err);
      }
    }

    // Graceful simulated voice transcription fallback when Web Speech API is blocked or unsupported
    setIsListening(true);
    const demoPhrases = [
      'Can you explain this lesson step-by-step?',
      'Summarize key concepts for my upcoming test',
      'Give me 3 practice quiz questions with solutions',
      'What are the key points I need to review?',
    ];
    const chosenPhrase = demoPhrases[Math.floor(Math.random() * demoPhrases.length)];
    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx += 2;
      setInput(chosenPhrase.slice(0, currentIdx));
      if (currentIdx >= chosenPhrase.length) {
        clearInterval(interval);
        setTimeout(() => setIsListening(false), 900);
      }
    }, 50);
    recognitionRef.current = {
      stop: () => {
        clearInterval(interval);
        setIsListening(false);
      },
    };
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        if (typeof recognitionRef.current.stop === 'function') {
          recognitionRef.current.stop();
        }
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleMicPress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleWaveformPress = () => {
    handleSend('Give me a quick summary of my next study priorities.');
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        opacity: screenFadeAnim,
        transform: [
          { translateY: screenSlideAnim },
          { scale: screenScaleAnim },
        ],
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Static Raymarched Prism Background (Zoomed out, shifted more downwards) */}
      <Prism
        height={3.5}
        baseWidth={5.5}
        glow={1.1}
        scale={1.5}
        offset={{ x: 0, y: 260 }}
        noise={0.2}
        transparent={true}
        lightMode={false}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, zIndex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingBottom: isKeyboardVisible
              ? (Platform.OS === 'ios' ? 8 : 10)
              : Math.max(insets.bottom, 14),
          }}
        >
        {/* 1. TOP BAR */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            zIndex: 20,
          }}
        >
          <Pressable
            onPress={onBack || (() => setShowPromptsSheet((prev) => !prev))}
            accessibilityLabel={onBack ? 'Back' : 'Menu'}
            style={({ pressed }) => [
              { padding: 4, borderRadius: 8 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icon name={onBack ? 'arrow.left' : 'line.2.horizontal'} size={24} color={colors.ink} />
          </Pressable>
        </View>

        {/* AI STUDY ASSISTANT SETUP GUIDE DRAWER */}
        {showGuide && (
          <Card
            style={{
              backgroundColor: '#FAFAFF',
              borderColor: '#C7D2FE',
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="sparkles" size={16} color="#111827" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                  AI Study Assistant Setup
                </Text>
              </View>
              <Pressable onPress={() => setShowGuide(false)}>
                <Icon name="xmark" size={16} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, lineHeight: 19, color: '#374151', marginBottom: 10 }}>
              Status:{' '}
              <Text style={{ fontWeight: '700', color: aiStatus?.live ? '#059669' : '#D97706' }}>
                {aiStatus?.live ? 'Live AI Service Connected' : 'Offline Preview Mode'}
              </Text>
              {'\n'}To connect your key, configure <Text style={{ fontFamily: 'monospace' }}>AI_API_KEY</Text> in your root <Text style={{ fontWeight: '600' }}>.env</Text> file.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title={statusChecking ? 'Checking…' : 'Recheck Status'}
                busy={statusChecking}
                onPress={checkStatus}
              />
              <Button
                title="Close"
                secondary
                onPress={() => setShowGuide(false)}
              />
            </View>
          </Card>
        )}

        {/* 2. MAIN CENTER CANVAS: Minimal, Clean Black & White Aesthetic */}
        {messages.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 150,
            }}
          >
            {/* Clean Centered Title */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: '400',
                color: colors.ink,
                letterSpacing: -0.5,
                textAlign: 'center',
              }}
            >
              Where should we start?
            </Text>
          </View>
        ) : (
          /* CONVERSATION THREAD (When chat is active) */
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ gap: 14, paddingVertical: 10 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <SmoothUserBubble key={m.id} message={m} />
              ) : (
                <View
                  key={m.id}
                  style={{
                    alignSelf: 'flex-start',
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 20,
                    borderBottomLeftRadius: 4,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="sparkles" size={14} color="#111827" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>AI Assistant</Text>
                      <View style={{ backgroundColor: m.live ? '#ECFDF5' : '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: m.live ? '#059669' : '#6B7280' }}>
                          {m.live ? 'Online' : 'Preview'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{m.time}</Text>
                  </View>

                  <SmoothAssistantText
                    text={m.content || 'No explanation returned.'}
                    isStreaming={streamingMsgId === m.id}
                    onStreamStep={() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }}
                    onComplete={() => {
                      setStreamingMsgId(null);
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 60);
                    }}
                  />
                </View>
              ),
            )}

            {isThinking && (
              <Animated.View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  borderBottomLeftRadius: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <Icon name="sparkles" size={16} color="#111827" />
                <ThreeDotsWave color="#111827" size={7} />
              </Animated.View>
            )}
          </ScrollView>
        )}

        {/* QUICK PROMPT SUGGESTIONS SHEET (Toggled via [+] Button) */}
        {showPromptsSheet && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
              marginBottom: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 4,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Quick Study Inquiries</Text>
              <Pressable onPress={() => setShowPromptsSheet(false)}>
                <Icon name="xmark" size={14} color="#6B7280" />
              </Pressable>
            </View>
            {samplePrompts.map((p, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSend(p.prompt)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    backgroundColor: '#F9FAFB',
                  },
                  pressed && { backgroundColor: '#F3F4F6' },
                ]}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1' }}>{p.tag}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink, marginTop: 1 }}>{p.title}</Text>
                </View>
                <Icon name="arrow.up" size={13} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Selected Lesson Image Preview Badge */}
        {selectedImage && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              borderRadius: 16,
              padding: 6,
              paddingRight: 10,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
              gap: 8,
            }}
          >
            <Image
              source={{ uri: selectedImage.previewUrl }}
              style={{ width: 34, height: 34, borderRadius: 10 }}
              resizeMode="cover"
            />
            <View style={{ maxWidth: 170 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                {selectedImage.name || 'Lesson Sheet'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>
                Gemini Vision Ready
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedImage(null)}
              accessibilityLabel="Remove attached image"
              style={({ pressed }) => [
                {
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 2,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon name="xmark" size={11} color="#6B7280" />
            </Pressable>
          </View>
        )}

        {/* 3. FLOATING GLASSMORPHIC CAPSULE INPUT DOCK WITH MOVING RAINBOW BORDER */}
        <Animated.View
          style={[
            {
              borderRadius: 36,
              padding: isListening ? 2.5 : 0,
              transition: 'all 0.35s ease',
            } as any,
            Platform.OS === 'web' && isListening
              ? ({
                  background:
                    'linear-gradient(115deg, #FF2D55 0%, #FF9500 16%, #FFCC00 32%, #34C759 48%, #007AFF 64%, #5856D6 80%, #AF52DE 92%, #FF2D55 100%)',
                  backgroundSize: '300% 300%',
                  animation: 'rainbowBorder 2.4s linear infinite, rainbowGlowPulse 2.2s ease-in-out infinite',
                } as any)
              : Platform.OS !== 'web' && isListening
              ? {
                  borderWidth: 2.5,
                  borderColor: rainbowBorderColor,
                }
              : null,
          ]}
        >
          <View
            style={[
              {
                borderRadius: isListening ? 33.5 : 36,
                overflow: 'hidden',
                backgroundColor: isListening ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.35)',
                borderWidth: isListening ? 0 : 1,
                borderColor: 'rgba(255, 255, 255, 0.65)',
                borderTopColor: 'rgba(255, 255, 255, 0.95)',
                borderBottomColor: 'rgba(255, 255, 255, 0.30)',
                shadowColor: isListening ? '#6366F1' : '#000',
                shadowOffset: { width: 0, height: isListening ? 6 : 8 },
                shadowOpacity: isListening ? 0.25 : 0.08,
                shadowRadius: isListening ? 24 : 24,
                elevation: 6,
              },
              Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(30px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(190%)',
                    boxShadow: isListening
                      ? '0 8px 32px rgba(99, 102, 241, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
                      : '0 8px 32px rgba(0, 0, 0, 0.07), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
                  } as any)
                : null,
            ]}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 55}
              tint="light"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 10,
                paddingRight: 8,
                paddingVertical: 6,
                minHeight: 54,
                gap: 8,
                backgroundColor: 'transparent',
              }}
            >
              {/* 1. FAR LEFT: Upload Lesson Photo / Camera Button */}
              <Pressable
                onPress={handlePickImage}
                accessibilityLabel="Upload Lesson Photo or Document"
                style={({ pressed }) => [
                  {
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selectedImage ? '#EEF2FF' : 'transparent',
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Icon
                  name="camera"
                  size={21}
                  color={selectedImage ? '#4F46E5' : '#8E8E93'}
                />
              </Pressable>

              {/* Wave Frequency Visualizer on the Typing Bar */}
              {isListening && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
                  <WaveFrequencyBars isListening={isListening} />
                </View>
              )}

              {/* 2. CENTER: TextInput / Live Speech Transcription / Animated Typewriter Placeholder */}
              <View
                style={{
                  flex: 1,
                  height: 40,
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Listening indicator when input is empty */}
                {isListening && !input ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#8E8E93',
                        fontFamily: fontStack,
                      }}
                    >
                      Listening… Speak now
                    </Text>
                  </View>
                ) : !input ? (
                  /* Animated Typewriter Placeholder */
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 15,
                        fontFamily: fontStack,
                        color: '#8E8E93',
                        lineHeight: 20,
                      }}
                    >
                      {selectedImage ? (
                        'Ask about this lesson…'
                      ) : (
                        <>
                          Ask me{' '}
                          <Text style={{ color: '#8E8E93', fontWeight: '400' }}>
                            {typingEffectText}
                          </Text>
                          <Text style={{ color: '#8E8E93', opacity: cursorVisible ? 1 : 0 }}>|</Text>
                        </>
                      )}
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => {
                    if (isListening) stopListening();
                    handleSend();
                  }}
                  returnKeyType="send"
                  maxLength={1000}
                  multiline={false}
                  style={{
                    fontSize: 15,
                    fontFamily: fontStack,
                    color: colors.ink,
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                    margin: 0,
                    height: 40,
                    textAlignVertical: 'center',
                    backgroundColor: 'transparent',
                    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                  }}
                />
              </View>

              {/* 3. FAR RIGHT: Microphone Button + Enter Button side-by-side */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Microphone Button (Speech to Text) */}
                <Pressable
                  onPress={handleMicPress}
                  accessibilityLabel={isListening ? 'Stop Listening' : 'Voice Input'}
                  style={({ pressed }) => [
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isListening ? '#FEE2E2' : 'transparent',
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Icon name="mic" size={21} color={isListening ? '#EF4444' : '#8E8E93'} />
                </Pressable>

                {/* Enter Button (Black #111827) */}
                <Pressable
                  onPress={() => {
                    if (isListening) {
                      stopListening();
                      if (input.trim() || selectedImage) handleSend();
                    } else if (input.trim() || selectedImage) {
                      handleSend();
                    } else {
                      handleWaveformPress();
                    }
                  }}
                  disabled={isThinking}
                  accessibilityLabel={
                    input.trim() || selectedImage
                      ? 'Send to Tutor'
                      : isListening
                      ? 'Send or Stop'
                      : 'Ask Tutor'
                  }
                  style={({ pressed }) => [
                    {
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: '#111827',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.25s ease',
                    } as any,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {isThinking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : isListening ? (
                    <Icon name="arrow.right" size={17} color="#FFFFFF" />
                  ) : input.trim() || selectedImage ? (
                    <Icon name="arrow.up" size={17} color="#FFFFFF" />
                  ) : (
                    <Icon name="waveform" size={17} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  </Animated.View>
);
}

export function Home() {
  const { profile } = useApp();
  return profile.role === 'teacher' ? <TeacherHomeScreen onCreateClass={() => {}} /> : <StudentHomeScreen />;
}
export function Classes() {
  const { profile, open, act, busy } = useApp();
  const { data, error } = useRemote<Classroom[]>('/classes');
  const [name, setName] = useState(''),
    [subject, setSubject] = useState(''),
    [code, setCode] = useState(''),
    [invite, setInvite] = useState(''),
    [preview, setPreview] = useState<{ id: string; name: string; subject: string }>();
  return (
    <View style={s.stack}>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((c) => (
        <Card key={c.id}>
          <Label>{c.subject}</Label>
          <Heading>{c.name}</Heading>
          <Body>{c.description || 'Your shared space for learning.'}</Body>
          <Row
            title={c.teacher_name}
            detail={`${c.member_count} students`}
            icon="person.2.fill"
            onPress={() => open('class', c.id)}
          />
          <Button title="Open classroom" secondary onPress={() => open('class', c.id)} />
        </Card>
      ))}
      <Card>
        <Heading>{profile.role === 'teacher' ? 'Start a classroom' : 'Join your class'}</Heading>
        {profile.role === 'teacher' ? (
          <>
            <Field
              label="Class name"
              value={name}
              onChangeText={setName}
              placeholder="Grade 10 · Newton"
            />
            <Field
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              placeholder="Science"
            />
            <Button
              title="Create class"
              busy={busy}
              onPress={() =>
                act(async () => {
                  const c = await request<{ code: string }>('/classes', { name, subject });
                  setInvite(c.code);
                  setName('');
                  setSubject('');
                }, 'Class created.')
              }
            />
            {invite && (
              <Body>
                Enrollment code: {invite}
                {'\n'}Share with your students. Valid for 7 days.
              </Body>
            )}
          </>
        ) : (
          <>
            <Body>Enter the enrollment code from your teacher.</Body>
            <Field
              label="Enrollment code"
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setPreview(undefined);
              }}
              autoCapitalize="characters"
            />
            <Button
              title="Find class"
              busy={busy}
              onPress={() =>
                act(async () => setPreview(await request('/classes/preview', { code })))
              }
            />
            {preview && (
              <View style={s.stack}>
                <Heading>{preview.name}</Heading>
                <Body>{preview.subject}</Body>
                <Button
                  title="Confirm and join"
                  busy={busy}
                  onPress={() =>
                    act(async () => {
                      await request('/classes/join', { code, classId: preview.id });
                      setPreview(undefined);
                      setCode('');
                    }, 'You joined the class.')
                  }
                />
              </View>
            )}
          </>
        )}
      </Card>
    </View>
  );
}
export function ClassDetail({ classId }: { classId: string }) {
  const { profile, open, act, busy } = useApp();
  const { data: classes } = useRemote<Classroom[]>('/classes');
  const { data: all, error } = useRemote<Assessment[]>('/assessments');
  const c = classes?.find((x) => x.id === classId);
  const [code, setCode] = useState<string | null>();
  return (
    <View style={s.stack}>
      <Label>{c?.subject || 'Classroom'}</Label>
      <Heading>{c?.name || 'Your class'}</Heading>
      <Body>{c?.description}</Body>
      {profile.role === 'teacher' && (
        <Card>
          <Row
            title="Class roster"
            detail={`${c?.member_count || 0} students`}
            icon="person.2.fill"
            onPress={() => open('roster', classId)}
          />
          <Button
            title="Generate new enrollment code"
            secondary
            busy={busy}
            onPress={() =>
              act(async () => {
                const r = await request<{ code: string }>(`/classes/${classId}/code`, {});
                setCode(r.code);
              }, 'Previous enrollment code replaced.')
            }
          />
          {code && (
            <>
              <Text selectable style={s.heading}>
                {code}
              </Text>
              <Body>Valid for 7 days.</Body>
              <Button
                title="Revoke code"
                danger
                busy={busy}
                onPress={() =>
                  act(async () => {
                    await request(`/classes/${classId}/code`, { revoke: true });
                    setCode(null);
                  }, 'Enrollment code revoked.')
                }
              />
            </>
          )}
          <Button title="Prepare an assessment" onPress={() => open('create-draft', classId)} />
        </Card>
      )}
      <Heading>Assessments & announcements</Heading>
      <RemoteState error={error} loading={!all && !error} />
      {all
        ?.filter((a) => a.class_id === classId)
        .map((a) => (
          <AssessmentCard key={a.id} a={a} />
        ))}
      {all && !all.some((a) => a.class_id === classId) && (
        <Empty
          title="A fresh page"
          body="Class assessments and announcements will appear here when they are ready."
        />
      )}
    </View>
  );
}
export function AssessmentCard({ a }: { a: Assessment }) {
  const { profile, open } = useApp();
  const teacher = profile.role === 'teacher';
  return (
    <Card>
      <View style={[s.hstack, { justifyContent: 'space-between' }]}>
        <Icon name="doc.text" />
        <Pill tone={a.state === 'open' || a.state === 'announced' ? 'green' : 'gray'}>
          {a.state}
        </Pill>
      </View>
      <Heading>{a.title}</Heading>
      <Body>{a.announcement}</Body>
      <Text style={s.caption}>
        {dateText(a.opens_at)} – {dateText(a.closes_at)}
        {'\n'}Asia/Manila · {a.duration_minutes} minutes
      </Text>
      <Button
        title={
          teacher ? 'Review assessment' : a.state === 'open' ? 'Open assessment' : 'View details'
        }
        secondary
        onPress={() => open(teacher ? 'review' : 'quiz', a.id)}
      />
    </Card>
  );
}
export function Roster({ classId }: { classId: string }) {
  const { act, busy } = useApp();
  const { data, error } = useRemote<Profile[]>(`/classes/${classId}/members`);
  const [confirm, setConfirm] = useState('');
  return (
    <View style={s.stack}>
      <Heading>Class roster</Heading>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((p) => (
        <Card key={p.id}>
          <Row title={p.name} icon="person.2.fill" />
          {confirm === p.id ? (
            <>
              <Body>
                This student will lose class access. Existing consultation bookings remain until
                canceled.
              </Body>
              <Button
                title="Confirm removal"
                danger
                busy={busy}
                onPress={() =>
                  act(async () => {
                    await request(`/classes/${classId}/members/${p.id}`, undefined, true, 'DELETE');
                    setConfirm('');
                  }, 'Student removed.')
                }
              />
              <Button title="Keep student" secondary onPress={() => setConfirm('')} />
            </>
          ) : (
            <Button title={`Remove ${p.name}`} secondary onPress={() => setConfirm(p.id)} />
          )}
        </Card>
      ))}
      {data?.length === 0 && (
        <Empty
          title="Ready for your students"
          body="Share an enrollment code to welcome your class."
        />
      )}
    </View>
  );
}
export function Consultations() {
  const { profile, act, busy, config } = useApp();
  const { data: teachers } = useRemote<Teacher[]>('/teachers');
  const { data: bookings, error } = useRemote<Booking[]>('/consultations');
  const [teacher, setTeacher] = useState<Teacher>(),
    [date, setDate] = useState(localDate()),
    [slots, setSlots] = useState<Slot[]>([]),
    [selection, setSelection] = useState<{ slot: Slot; key: string }>(),
    [message, setMessage] = useState(''),
    [reply, setReply] = useState(''),
    [searched, setSearched] = useState(false),
    [receipt, setReceipt] = useState<Booking>(),
    [cancelId, setCancelId] = useState('');
  const choose = (slot: Slot) => {
    setSelection({ slot, key: randomUUID() });
    setReceipt(undefined);
  };
  return (
    <View style={s.stack}>
      {profile.role === 'student' && (
        <>
          <Card>
            <Label>Consultation assistant</Label>
            <Heading>A good conversation starts here.</Heading>
            <Body>Ask for a teacher, date, and time. You’ll confirm every booking yourself.</Body>
            <Pill tone={config?.aiConfigured ? 'green' : 'gray'}>
              {config?.aiConfigured
                ? 'Live AI connected'
                : 'Live AI not connected · use available times below'}
            </Pill>
            <Field
              label="Your request"
              value={message}
              onChangeText={setMessage}
              placeholder="Meet Ms. Biel tomorrow at 10 am"
              multiline
            />
            <Button
              title="Find a time with AI"
              busy={busy}
              disabled={!config?.aiConfigured}
              onPress={() =>
                act(async () => {
                  const r = await request<{ message: string; teacher?: Teacher; slots: Slot[] }>(
                    '/assistant/messages',
                    { message },
                  );
                  setReply(r.message);
                  setSlots(r.slots);
                  setTeacher(r.teacher);
                  setSelection(undefined);
                  setSearched(true);
                })
              }
            />
            {reply && <Body>{reply}</Body>}
          </Card>
          <Card>
            <Heading>Explore available times</Heading>
            <Body>All dates and times use Asia/Manila.</Body>
            <Label>Choose your teacher</Label>
            {teachers?.map((t) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: teacher?.id === t.id }}
                key={t.id}
                onPress={() => {
                  setTeacher(t);
                  setSlots([]);
                  setSelection(undefined);
                  setSearched(false);
                }}
                style={{
                  padding: 15,
                  borderRadius: 16,
                  backgroundColor: teacher?.id === t.id ? '#E8EFFA' : colors.soft,
                }}
              >
                <Text style={s.rowTitle}>{t.name}</Text>
              </Pressable>
            ))}
            <Field
              label="Starting date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
            <Button
              title="Check availability"
              busy={busy}
              disabled={!teacher}
              onPress={() =>
                act(async () => {
                  setSlots(await request(`/teachers/${teacher!.id}/slots?from=${date}&days=7`));
                  setSelection(undefined);
                  setSearched(true);
                })
              }
            />
            {searched && slots.length === 0 && (
              <Body>No available times in this week. Choose another date.</Body>
            )}
            {slots.slice(0, 24).map((slot) => (
              <Row
                key={slot.starts_at}
                title={dateText(slot.starts_at)}
                detail={slot.location}
                icon="clock"
                onPress={() => choose(slot)}
                trailing={
                  selection?.slot.starts_at === slot.starts_at ? (
                    <Icon name="checkmark.circle.fill" color={colors.blue} />
                  ) : undefined
                }
              />
            ))}
          </Card>
          {selection && teacher && (
            <Card>
              <Pill tone="blue">Awaiting your confirmation</Pill>
              <Heading>{teacher.name}</Heading>
              <Body>
                {dateText(selection.slot.starts_at)} – {dateText(selection.slot.ends_at)}
                {'\n'}Asia/Manila{'\n'}
                {selection.slot.location}
              </Body>
              <Body>
                You can cancel from your bookings. Availability is checked again when you confirm.
              </Body>
              <Button
                title="Confirm consultation"
                busy={busy}
                onPress={() =>
                  act(async () => {
                    const b = await request<Booking>('/consultations', {
                      teacherId: teacher.id,
                      starts_at: selection.slot.starts_at,
                      requestKey: selection.key,
                    });
                    setReceipt(b);
                    setSelection(undefined);
                    setSlots([]);
                    setSearched(false);
                  }, 'Consultation confirmed.')
                }
              />
              <Button
                title="Choose another time"
                secondary
                onPress={() => setSelection(undefined)}
              />
            </Card>
          )}
          {receipt && (
            <Card>
              <Icon name="checkmark.circle.fill" color={colors.green} />
              <Heading>You’re booked.</Heading>
              <Body>{dateText(receipt.starts_at)} · Asia/Manila</Body>
              <Text selectable style={s.caption}>
                Receipt {receipt.id}
              </Text>
            </Card>
          )}
        </>
      )}
      <Heading>{profile.role === 'teacher' ? 'Your consultations' : 'Your bookings'}</Heading>
      <RemoteState error={error} loading={!bookings && !error} />
      {bookings
        ?.filter((b) => b.status === 'booked')
        .map((b) => (
          <Card key={b.id}>
            <Row
              title={profile.role === 'teacher' ? b.student_name : b.teacher_name}
              detail={`${dateText(b.starts_at)} · Asia/Manila`}
              icon="calendar"
            />
            <Body>{b.location}</Body>
            {cancelId === b.id ? (
              <>
                <Body>Cancel this consultation and release its time?</Body>
                <Button
                  title="Confirm cancellation"
                  danger
                  busy={busy}
                  onPress={() =>
                    act(async () => {
                      await request(`/consultations/${b.id}/cancel`, {});
                      setCancelId('');
                    }, 'Consultation canceled.')
                  }
                />
                <Button title="Keep booking" secondary onPress={() => setCancelId('')} />
              </>
            ) : (
              <Button title="Cancel consultation" secondary onPress={() => setCancelId(b.id)} />
            )}
          </Card>
        ))}
      {bookings && !bookings.some((b) => b.status === 'booked') && (
        <Empty
          title="No bookings yet"
          body="Confirmed consultations will appear here, with their meeting details."
        />
      )}
    </View>
  );
}
export function Calendar() {
  const { data, error } = useRemote<CalendarEvent[]>('/me/calendar');
  return (
    <View style={s.stack}>
      <Card>
        <Label>Your learning rhythm</Label>
        <Heading>One day at a time.</Heading>
        <Body>Consultations and published assessments, together. All times are Asia/Manila.</Body>
      </Card>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((e) => (
        <Card key={e.id}>
          <Pill tone={e.kind === 'assessment' ? 'blue' : 'green'}>{e.kind}</Pill>
          <Heading>{e.title}</Heading>
          <Body>
            {dateText(e.starts_at)}
            {'\n'}Until {dateText(e.ends_at)}
          </Body>
        </Card>
      ))}
      {data?.length === 0 && (
        <Empty
          title="Your calendar is clear"
          body="Book a consultation or wait for your teacher’s next assessment."
        />
      )}
    </View>
  );
}
export function Notifications() {
  const { act } = useApp();
  const { data, error } = useRemote<Notice[]>('/me/notifications');
  return (
    <View style={s.stack}>
      <Heading>Updates for you</Heading>
      <Body>In-app updates are saved here. Device push notifications are not enabled.</Body>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((n) => (
        <Card key={n.id}>
          {!n.read_at && <Pill tone="blue">New</Pill>}
          <Heading>{n.title}</Heading>
          <Body>{n.body}</Body>
          <Text style={s.caption}>{dateText(n.created_at)}</Text>
          {!n.read_at && (
            <Button
              title="Mark as read"
              secondary
              onPress={() => act(() => request(`/me/notifications/${n.id}/read`, {}))}
            />
          )}
        </Card>
      ))}
      {data?.length === 0 && (
        <Empty
          title="You’re all caught up"
          body="Booking receipts, class announcements, and reminders will arrive here."
        />
      )}
    </View>
  );
}
export function Availability() {
  const { act, busy } = useApp();
  const { data, error } = useRemote<Rules>('/teachers/me/availability');
  return (
    <>
      <RemoteState error={error} loading={!data && !error} />
      {data && <AvailabilityForm initial={data} />}
    </>
  );
}
function AvailabilityForm({ initial }: { initial: Rules }) {
  const { act, busy } = useApp();
  const [rules, setRules] = useState(initial),
    [blocked, setBlocked] = useState(initial.blockedDates.join(', ')),
    [affected, setAffected] = useState(0);
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => setRules((r) => ({ ...r, [k]: v }));
  return (
    <View style={s.stack}>
      <Card>
        <Heading>Your consultation hours</Heading>
        <Body>
          Asia/Manila. Changes keep existing bookings; any affected bookings are shown after saving.
        </Body>
        <View style={[s.hstack, { justifyContent: 'space-between' }]}>
          <Text>Allow student bookings</Text>
          <Switch
            accessibilityLabel="Allow student bookings"
            value={rules.enabled}
            onValueChange={(v) => set('enabled', v)}
          />
        </View>
        <Field
          label="Meeting location or link"
          value={rules.location}
          onChangeText={(v) => set('location', v)}
        />
        {(['duration', 'buffer', 'noticeHours', 'horizonDays'] as const).map((k, i) => (
          <Field
            key={k}
            label={
              [
                'Duration (minutes)',
                'Buffer (minutes)',
                'Minimum notice (hours)',
                'Booking horizon (days)',
              ][i]
            }
            keyboardType="numeric"
            value={String(rules[k])}
            onChangeText={(v) => set(k, Number(v))}
          />
        ))}
        {[1, 2, 3, 4, 5, 6, 7].map((day, i) => {
          const win = rules.windows.find((w) => w.weekday === day);
          return (
            <View key={day} style={{ gap: 10 }}>
              <View style={[s.hstack, { justifyContent: 'space-between' }]}>
                <Text style={s.rowTitle}>
                  {
                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
                      i
                    ]
                  }
                </Text>
                <Switch
                  accessibilityLabel={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} available`}
                  value={Boolean(win)}
                  onValueChange={(v) =>
                    set(
                      'windows',
                      v
                        ? [...rules.windows, { weekday: day, start: '09:00', end: '16:00' }]
                        : rules.windows.filter((w) => w.weekday !== day),
                    )
                  }
                />
              </View>
              {win && (
                <View style={s.hstack}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="From (HH:mm)"
                      value={win.start}
                      onChangeText={(v) =>
                        set(
                          'windows',
                          rules.windows.map((w) => (w.weekday === day ? { ...w, start: v } : w)),
                        )
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Until (HH:mm)"
                      value={win.end}
                      onChangeText={(v) =>
                        set(
                          'windows',
                          rules.windows.map((w) => (w.weekday === day ? { ...w, end: v } : w)),
                        )
                      }
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
        <Field
          label="Blocked dates (YYYY-MM-DD, comma separated)"
          multiline
          value={blocked}
          onChangeText={setBlocked}
        />
        <Button
          title="Save availability"
          busy={busy}
          onPress={() =>
            act(async () => {
              const r = await request<{ affectedBookings: Booking[] }>(
                '/teachers/me/availability',
                {
                  ...rules,
                  blockedDates: blocked
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                },
                true,
                'PUT',
              );
              setAffected(r.affectedBookings.length);
            }, 'Availability saved.')
          }
        />
        {affected > 0 && (
          <Body>
            {affected} existing booking(s) fall outside these rules. They are still booked; review
            them under consultations.
          </Body>
        )}
      </Card>
    </View>
  );
}
export function Jobs() {
  const { act, busy } = useApp();
  const { data, error } = useRemote<Job[]>('/jobs');
  return (
    <View style={s.stack}>
      <Heading>Publication activity</Heading>
      <Body>Scheduled work runs on the server, even when this app is closed.</Body>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((j) => (
        <Card key={j.id}>
          <Pill tone={j.state === 'done' ? 'green' : 'gray'}>{j.state}</Pill>
          <Heading>{j.title}</Heading>
          <Body>
            {j.kind.replaceAll('_', ' ')} · {dateText(j.due_at)}
          </Body>
          {j.last_error && <Body>{j.last_error}</Body>}
          {j.state === 'failed' && (
            <Button
              title="Retry publication"
              busy={busy}
              onPress={() => act(() => request(`/jobs/${j.id}/retry`, {}), 'Retry scheduled.')}
            />
          )}
        </Card>
      ))}
      {data?.length === 0 && (
        <Empty
          title="No scheduled work yet"
          body="Approve an assessment to schedule its announcement."
        />
      )}
    </View>
  );
}
