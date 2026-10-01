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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { request, dateText, localDate, localDateTime, toISO } from './api';
import { GEMINI_API_KEY } from './gemini-key';
import { useApp, useRemote } from './context';
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
  colors,
  s,
  GeminiStar,
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
export function TeacherHomeScreen() {
  const { profile, open } = useApp();
  const { data: bookings, error: bookingsError } = useRemote<Booking[]>('/consultations');
  const { data: assessments } = useRemote<Assessment[]>('/assessments');
  const { data: classes } = useRemote<Classroom[]>('/classes');

  const upcoming = (bookings || []).filter(
    (b) => b.status === 'booked' && new Date(b.ends_at) > new Date(),
  );
  const drafts = (assessments || []).filter((a) => a.state === 'draft');
  const published = (assessments || []).filter((a) =>
    ['approved', 'announced', 'closed'].includes(a.state),
  );
  const activeClassrooms = classes || [];

  return (
    <View style={s.stack}>
      {/* Teacher Hero Banner */}
      <Card style={{ backgroundColor: '#EDF5F0', padding: 22, borderColor: '#D1E7DD', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Pill tone="green">Faculty Dashboard · Manila</Pill>
          <Icon name="sparkles" color={colors.green} size={24} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6, color: '#1B4332', lineHeight: 32 }}>
          Welcome back,{'\n'}{profile.name}
        </Text>
        <Body style={{ marginTop: 6, color: '#2D6A4F' }}>
          Science & Technology Faculty · Manage class drafts, office consultations, and review student quiz progress.
        </Body>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Prepare Assessment"
              onPress={() => open('create-draft')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Office Availability"
              secondary
              onPress={() => open('availability')}
            />
          </View>
        </View>
      </Card>

      {/* 4 Metric Widgets in Squircle Grid */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="person.2.fill" size={20} color={colors.green} />
            <Pill tone="green">Teaching</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8 }]}>{activeClassrooms.length}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Classes Active</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Sections enrolled</Text>
        </Card>

        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="doc.text" size={20} color={drafts.length > 0 ? '#D97706' : colors.muted} />
            <Pill tone={drafts.length > 0 ? 'gray' : 'green'}>
              {drafts.length > 0 ? 'Pending' : 'Ready'}
            </Pill>
          </View>
          <Text
            style={[
              s.number,
              { fontSize: 30, marginTop: 8, color: drafts.length > 0 ? '#D97706' : colors.ink },
            ]}
          >
            {drafts.length}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Drafts to Review</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Needs approval</Text>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="clock" size={20} color={colors.blue} />
            <Pill tone="blue">Scheduled</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8 }]}>{upcoming.length}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Consultations</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Student bookings</Text>
        </Card>

        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="checkmark.circle.fill" size={20} color={colors.green} />
            <Pill tone="green">Published</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8 }]}>{published.length}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Live Quizzes</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Class assessments</Text>
        </Card>
      </View>

      {/* Assessment Drafts Pending Review */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>Drafts Requiring Review</Heading>
        {drafts.length > 0 && <Pill tone="green">{drafts.length} Action Needed</Pill>}
      </View>
      {drafts.length === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="checkmark.circle.fill" size={24} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>All Drafts Reviewed</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                No drafts are currently pending your approval.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        drafts.slice(0, 3).map((d) => (
          <Card key={d.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pill tone="gray">{d.class_name || 'Class Draft'}</Pill>
              <Text style={{ fontSize: 11, color: colors.muted }}>Version {d.version}</Text>
            </View>
            <Heading style={{ marginTop: 6 }}>{d.title}</Heading>
            <Body numberOfLines={2}>
              {d.lesson || d.announcement || 'Draft created for classroom assessment.'}
            </Body>
            <View style={{ marginTop: 8 }}>
              <Button title="Review & Approve Draft" onPress={() => open('review', d.id)} />
            </View>
          </Card>
        ))
      )}

      {/* Office Consultation Queue */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>Today's Consultation Schedule</Heading>
        <Text style={s.caption}>Office Hours</Text>
      </View>
      <RemoteState error={bookingsError || ''} loading={!bookings && !bookingsError} />
      {!upcoming.length ? (
        <Empty
          title="No student bookings today"
          body="Confirmed 1-on-1 student consultation appointments will appear in your queue."
        />
      ) : (
        <Card>
          {upcoming.slice(0, 4).map((b) => (
            <Row
              key={b.id}
              title={b.student_name}
              detail={`${dateText(b.starts_at)} · ${b.location}`}
              icon="clock"
              onPress={() => open('book')}
            />
          ))}
        </Card>
      )}

      {/* Classes Taught Overview */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>Your Classes</Heading>
        <Text style={s.caption}>{activeClassrooms.length} Active</Text>
      </View>
      <Card>
        {activeClassrooms.length ? (
          activeClassrooms.slice(0, 3).map((c) => (
            <Row
              key={c.id}
              title={c.name}
              detail={`${c.subject} · ${c.member_count} students`}
              icon="person.2.fill"
              onPress={() => open('class', c.id)}
            />
          ))
        ) : (
          <Body>No active classrooms yet. Go to Classes tab to start one.</Body>
        )}
      </Card>
    </View>
  );
}

export function StudentHomeScreen() {
  const { profile, open } = useApp();
  const { data: bookings, error: bookingsError } = useRemote<Booking[]>('/consultations');
  const { data: assessments } = useRemote<Assessment[]>('/assessments');
  const { data: classes } = useRemote<Classroom[]>('/classes');

  const upcoming = (bookings || []).filter(
    (b) => b.status === 'booked' && new Date(b.ends_at) > new Date(),
  );
  const openAssessments = (assessments || []).filter((a) => a.state === 'open');
  const activeClassrooms = classes || [];

  return (
    <View style={s.stack}>
      {/* Student Hero Banner */}
      <Card style={{ backgroundColor: '#EBF3FE', padding: 22, borderColor: '#D0E2FF', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Pill tone="blue">Student Scholar Portal</Pill>
          <Icon name="graduationcap.fill" color={colors.blue} size={24} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6, color: '#0A2540', lineHeight: 32 }}>
          Hello, {profile.name} 👋
        </Text>
        <Body style={{ marginTop: 6, color: '#1E3A8A' }}>
          Grade 10 · Newton Section. Check your open assignments, ask lesson questions, and book faculty consultations.
        </Body>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Book Consultation"
              onPress={() => open('book')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Notifications"
              secondary
              onPress={() => open('notifications')}
            />
          </View>
        </View>
      </Card>

      {/* 4 Metric Widgets in Squircle Grid */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="doc.text" size={20} color={openAssessments.length > 0 ? colors.blue : colors.muted} />
            <Pill tone={openAssessments.length > 0 ? 'blue' : 'gray'}>
              {openAssessments.length > 0 ? 'Due' : 'None'}
            </Pill>
          </View>
          <Text
            style={[
              s.number,
              { fontSize: 30, marginTop: 8, color: openAssessments.length > 0 ? colors.blue : colors.ink },
            ]}
          >
            {openAssessments.length}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Open Quizzes</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Ready to take</Text>
        </Card>

        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="calendar" size={20} color={colors.green} />
            <Pill tone="green">Upcoming</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8 }]}>{upcoming.length}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Consultations</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>With teachers</Text>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="person.2.fill" size={20} color={colors.ink} />
            <Pill tone="gray">Enrolled</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8 }]}>{activeClassrooms.length}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>My Classes</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Classrooms</Text>
        </Card>

        <Card style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Icon name="sparkles" size={20} color="#7C3AED" />
            <Pill tone="gray">AI Tutor</Pill>
          </View>
          <Text style={[s.number, { fontSize: 30, marginTop: 8, color: '#7C3AED' }]}>24/7</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>Study Assistant</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>Always available</Text>
        </Card>
      </View>

      {/* Active Quizzes Available to Take */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>Active Quizzes & Assessments</Heading>
        {openAssessments.length > 0 && <Pill tone="blue">{openAssessments.length} Active</Pill>}
      </View>
      {!openAssessments.length ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="checkmark.circle.fill" size={24} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>All Caught Up!</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                You have completed all assigned assessments for now.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        openAssessments.slice(0, 3).map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pill tone="blue">{a.class_name || 'Science Assessment'}</Pill>
              <Text style={{ fontSize: 11, color: colors.muted }}>{a.duration_minutes || 20} mins</Text>
            </View>
            <Heading style={{ marginTop: 6 }}>{a.title}</Heading>
            <Body numberOfLines={2}>
              {a.announcement || 'Answer all questions independently.'}
            </Body>
            <View style={{ marginTop: 8 }}>
              <Button title="Start Quiz Now" onPress={() => open('quiz', a.id)} />
            </View>
          </Card>
        ))
      )}

      {/* Booked Consultations */}
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 8 }]}>
        <Heading>My Teacher Consultations</Heading>
        <Text style={s.caption}>Schedule</Text>
      </View>
      <RemoteState error={bookingsError || ''} loading={!bookings && !bookingsError} />
      {!upcoming.length ? (
        <Empty
          title="No scheduled consultations"
          body="Need help with a topic? Book a 1-on-1 consultation slot with your teacher."
        />
      ) : (
        <Card>
          {upcoming.slice(0, 3).map((b) => (
            <Row
              key={b.id}
              title={b.teacher_name}
              detail={`${dateText(b.starts_at)} · ${b.location}`}
              icon="calendar"
              onPress={() => open('book')}
            />
          ))}
        </Card>
      )}

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
}

async function callGeminiDirect(
  message: string,
  history: { role: string; content: string }[] = [],
): Promise<{ reply: string; model: string } | null> {
  const apiKey = GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  const contents = [
    ...history.slice(-6).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
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
                  text: 'You are ClassAssist AI Agent, an encouraging, articulate, and academically rigorous study companion for Philippine students. Explain concepts step-by-step with clear examples. CRITICAL FORMATTING: Never use markdown bold double asterisks (**) anywhere in your response. Never output **. Use plain text or quotation marks instead.',
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

export function StudentAgentScreen({ onBack }: { onBack?: () => void } = {}) {
  const { open } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPromptsSheet, setShowPromptsSheet] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ live: boolean; model: string } | null>(null);
  const [statusChecking, setStatusChecking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
      tag: '🧬 Biology',
      title: 'Cellular Respiration',
      prompt: 'Explain the 3 stages of Cellular Respiration in simple terms with ATP yields.',
    },
    {
      tag: '📐 Algebra',
      title: 'Factoring vs Quadratic Formula',
      prompt: 'How do I know when to use the quadratic formula versus factoring? Give a decision rule.',
    },
    {
      tag: '⚡ Physics',
      title: 'Newton’s 3 Laws',
      prompt: 'Give everyday Philippine examples for each of Newton’s three laws of motion.',
    },
    {
      tag: '🌿 Botany',
      title: 'Photosynthesis Stages',
      prompt: 'Break down the light-dependent reactions and Calvin cycle step-by-step.',
    },
    {
      tag: '🤝 Consultation',
      title: 'Prepare Consultation Questions',
      prompt: 'Help me draft 3 smart, respectful discussion questions for my teacher consultation.',
    },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isThinking) return;

    setInput('');
    setShowPromptsSheet(false);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: text,
      time: timeStr,
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
      let replyModel = 'gemini-3.1-flash-lite';
      let isLive = true;

      // 1. Prioritize direct Google Gemini call (avoids tunnel/LAN abort errors)
      const direct = await callGeminiDirect(text, history);
      if (direct?.reply) {
        replyText = direct.reply.replace(/\*\*/g, '');
        replyModel = direct.model;
        isLive = true;
      } else {
        // 2. Fallback to backend API server
        const res = await request<{ reply: string; model: string; live: boolean }>(
          '/ai/chat',
          { message: text, history },
          false,
        );
        if (res?.reply) {
          replyText = res.reply.replace(/\*\*/g, '');
          replyModel = res.model || 'gemini-3.1-flash-lite';
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
      setAiStatus((prev) => ({ ...prev, live: isLive, model: replyModel }));
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: `⚠️ Notice: ${err?.message || 'Unable to reach ClassAssist AI server'}.\n\nPlease ensure your device is connected to the internet.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'system-notice',
        live: false,
      };
      setMessages((prev) => [...prev, errMsg]);
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

  const handleMicPress = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setInput('Can you explain this lesson step-by-step?');
      setTimeout(() => setIsListening(false), 1500);
    }
  };

  const handleWaveformPress = () => {
    // If input is empty, waveform triggers a quick audio consultation prompt
    handleSend('Hello Gemini! Give me a quick summary of my next study priorities.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
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
          accessibilityLabel="Back / Menu"
          style={({ pressed }) => [
            { padding: 4, borderRadius: 8 },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Icon name="line.2.horizontal" size={24} color={colors.ink} />
        </Pressable>
      </View>

      {/* GEMINI SETUP GUIDE DRAWER */}
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
              <Icon name="sparkles" size={16} color="#6366F1" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E1B4B' }}>
                Google Gemini API Setup
              </Text>
            </View>
            <Pressable onPress={() => setShowGuide(false)}>
              <Icon name="xmark" size={16} color="#6B7280" />
            </Pressable>
          </View>

          <Text style={{ fontSize: 13, lineHeight: 19, color: '#374151', marginBottom: 10 }}>
            Status:{' '}
            <Text style={{ fontWeight: '700', color: aiStatus?.live ? '#059669' : '#D97706' }}>
              {aiStatus?.live ? 'Live Google Gemini Connected' : 'Offline Preview Mode'}
            </Text>
            {'\n'}To connect your key, add <Text style={{ fontFamily: 'monospace' }}>GEMINI_API_KEY=AIzaSy...</Text> in your root <Text style={{ fontWeight: '600' }}>.env</Text> file.
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

      {/* 2. MAIN CENTER CANVAS: (Matches Screenshot: Centered 4-Point Star + "Where should we start?") */}
      {messages.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          {/* Iconic Gemini 4-Point Gradient Star */}
          <GeminiStar size={56} />

          {/* Clean Centered Title (Exact phrasing and typography from screenshot) */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '400',
              color: colors.ink,
              marginTop: 22,
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
              <View
                key={m.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  minWidth: 80,
                  backgroundColor: '#007AFF',
                  borderRadius: 20,
                  borderBottomRightRadius: 4,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 15, lineHeight: 22, color: '#FFFFFF', fontWeight: '500' }}>
                  {m.content}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.75)', marginTop: 4, alignSelf: 'flex-end' }}>
                  {m.time}
                </Text>
              </View>
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
                    <GeminiStar size={16} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E1B4B' }}>Gemini</Text>
                    <View style={{ backgroundColor: m.live ? '#ECFDF5' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: m.live ? '#059669' : '#D97706' }}>
                        {m.live ? 'Gemini Flash' : 'Preview'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{m.time}</Text>
                </View>

                <Text style={{ fontSize: 14, lineHeight: 22, color: '#1F2937' }}>
                  {(m.content || '').replace(/\*\*/g, '')}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                  <Pressable
                    onPress={() => handleCopy(m.id, m.content)}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: copiedId === m.id ? '#DCFCE7' : '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Icon name={copiedId === m.id ? 'checkmark' : 'doc.on.doc'} size={12} color={copiedId === m.id ? '#15803D' : '#4B5563'} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: copiedId === m.id ? '#15803D' : '#4B5563' }}>
                      {copiedId === m.id ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => open('book')}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Icon name="calendar" size={12} color="#4F46E5" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#4F46E5' }}>
                      Ask Teacher in Consultation
                    </Text>
                  </Pressable>
                </View>
              </View>
            ),
          )}

          {isThinking && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#F8FAFC', borderRadius: 20, borderBottomLeftRadius: 4, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <GeminiStar size={20} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#4338CA' }}>Gemini is thinking…</Text>
              </View>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
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

      {/* 3. FLOATING CAPSULE INPUT DOCK (Exact Screenshot Structure: [+] [Ask Gemini] [Mic] [Waveform/Send]) */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 36,
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {/* Left: [+] Add / Prompts button */}
        <Pressable
          onPress={() => setShowPromptsSheet((prev) => !prev)}
          accessibilityLabel="Add / Quick Prompts"
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Icon name="plus" size={22} color="#6B7280" />
        </Pressable>

        {/* Center: TextInput */}
        <TextInput
          placeholder="Ask anything..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            maxHeight: 80,
            fontSize: 16,
            color: colors.ink,
            paddingVertical: 4,
          }}
        />

        {/* Right: Microphone Button */}
        <Pressable
          onPress={handleMicPress}
          accessibilityLabel="Voice Input"
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { opacity: 0.6 },
            isListening && { backgroundColor: '#FEE2E2' },
          ]}
        >
          <Icon name="mic" size={21} color={isListening ? '#DC2626' : '#6B7280'} />
        </Pressable>

        {/* Far Right: Circular Waveform (|||) or Send Arrow Button */}
        <Pressable
          onPress={() => (input.trim() ? handleSend() : handleWaveformPress())}
          disabled={isThinking}
          accessibilityLabel={input.trim() ? 'Send' : 'Live Voice Session'}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() ? '#007AFF' : '#1E3A8A', // Deep blue circular button matching screenshot
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          {isThinking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : input.trim() ? (
            <Icon name="arrow.up" size={18} color="#FFFFFF" />
          ) : (
            <Icon name="waveform" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
);
}

export function Home() {
  const { profile } = useApp();
  return profile.role === 'teacher' ? <TeacherHomeScreen /> : <StudentHomeScreen />;
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
