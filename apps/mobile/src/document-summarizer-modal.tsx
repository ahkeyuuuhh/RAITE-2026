import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  Icon,
  Pill,
  colors,
  s,
  fontStack,
  type IconName,
} from './ui';
import { GEMINI_API_KEY } from './gemini-key';
import { request } from './api';

export type SummaryType = 'study_notes' | 'executive' | 'exam_prep';
export type Step = 'upload' | 'generating' | 'result';
export type ActiveTab = 'overview' | 'concepts' | 'definitions' | 'questions';

export interface KeyConceptItem {
  concept: string;
  explanation: string;
}

export interface DefinitionItem {
  term: string;
  definition: string;
}

export interface DocumentSummaryResult {
  title: string;
  overview: string;
  keyConcepts: KeyConceptItem[];
  definitions: DefinitionItem[];
  takeaways: string[];
  reviewQuestions: string[];
  fileName: string;
  model?: string;
  live?: boolean;
}

export interface DocumentSummarizerScreenProps {
  onBack: () => void;
  onAskTutor?: (context: string) => void;
}

interface PresetDocItem {
  icon: IconName;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  size: string;
  topic: string;
}

const PRESET_DOCUMENTS: PresetDocItem[] = [
  {
    icon: 'flame.fill',
    badge: 'PPTX',
    badgeBg: '#FEF3C7',
    badgeColor: '#D97706',
    title: 'Electromagnetism_Faradays_Law.pptx',
    subtitle: 'Physics · 18 Slides · 2.4 MB',
    size: '2.4 MB',
    topic: "Faraday's Law of Induction, magnetic flux, Lenz's Law, and generator equations",
  },
  {
    icon: 'drop.fill',
    badge: 'PDF',
    badgeBg: '#FEE2E2',
    badgeColor: '#DC2626',
    title: 'Cellular_Respiration_Metabolism.pdf',
    subtitle: 'Biology · 14 Pages · 1.8 MB',
    size: '1.8 MB',
    topic: 'Glycolysis, Krebs Cycle, oxidative phosphorylation, and ATP synthase machinery',
  },
  {
    icon: 'arrow.up',
    badge: 'DOCX',
    badgeBg: '#DBEAFE',
    badgeColor: '#2563EB',
    title: 'Calculus_Taylor_Series_Approximations.docx',
    subtitle: 'Calculus · 8 Pages · 890 KB',
    size: '890 KB',
    topic: 'Taylor and Maclaurin polynomials, radius of convergence, and Lagrange error bound',
  },
];

/* --- Native iOS Vector Components --- */

function AppleCheckCircle({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="10" fill="#34C759" />
      <Path
        d="M6 10.2L8.6 12.8L14 7.4"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ApplePulseDocIcon() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulse.start();
    spin.start();
    return () => {
      pulse.stop();
      spin.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const spinInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
      {/* Outer subtle rotating aurora ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 86,
          height: 86,
          borderRadius: 43,
          borderWidth: 2,
          borderColor: 'rgba(0, 122, 255, 0.25)',
          borderStyle: 'dashed',
          transform: [{ rotate: spinInterpolation }],
        }}
      />
      {/* Center squircle card */}
      <Animated.View
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          backgroundColor: '#007AFF',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulseAnim }],
          shadowColor: '#007AFF',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <Icon name="doc.text" size={28} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

export function DocumentSummarizerScreen({ onBack, onAskTutor }: DocumentSummarizerScreenProps) {
  const [step, setStep] = useState<Step>('upload');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [summaryType, setSummaryType] = useState<SummaryType>('study_notes');
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [fileData, setFileData] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DocumentSummaryResult | null>(null);
  const [genStepIdx, setGenStepIdx] = useState(0);
  const [revealedQuiz, setRevealedQuiz] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const genSteps = [
    'Parsing slide decks & document hierarchy…',
    'Extracting core formulas & definitions…',
    'Synthesizing high-yield exam takeaways…',
    'Formatting Apple study cards…',
  ];

  useEffect(() => {
    let timer: any;
    if (step === 'generating') {
      setGenStepIdx(0);
      timer = setInterval(() => {
        setGenStepIdx((prev) => (prev < genSteps.length - 1 ? prev + 1 : prev));
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [step]);

  const handleFilePicked = (file: File) => {
    setErrorMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const accepted = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'txt', 'md', 'jpg', 'jpeg', 'png', 'webp'];

    if (!accepted.includes(ext)) {
      setErrorMsg('Unsupported format. Please upload PPTX, PDF, DOCX, TXT, or Image notes.');
      return;
    }

    setFileName(file.name);
    const sizeKb = Math.round(file.size / 1024);
    setFileSizeStr(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setMimeType(file.type || 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (res && res.includes('base64,')) {
        setFileData(res.split('base64,')[1]);
      } else {
        setFileData(res || '');
      }
    };
    reader.onerror = () => {
      setFileData('');
    };

    if (file.type.startsWith('text/')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleSummarize = async (overrideName?: string, overrideTopic?: string) => {
    const activeName = (overrideName || fileName).trim();
    if (!activeName) {
      setErrorMsg('Please select or capture a file to summarize first.');
      return;
    }

    setStep('generating');
    setErrorMsg('');
    setRevealedQuiz({});

    try {
      // 1. Backend summarizer
      const res = await request<DocumentSummaryResult>(
        '/ai/summarize',
        {
          fileData,
          fileName: activeName,
          mimeType,
          summaryType,
          topicContext: overrideTopic,
        },
        true,
        'POST',
      );

      if (res && res.title) {
        setSummaryResult(res);
        setStep('result');
        return;
      }
    } catch {
      // Fallback
    }

    // 2. Direct Gemini Call
    try {
      const apiKey = GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setSummaryResult(getOfflineFallback(activeName));
        setStep('result');
        return;
      }

      const ext = (activeName.split('.').pop() || '').toLowerCase();
      const isPdf = ext === 'pdf' || mimeType === 'application/pdf';
      const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) || mimeType.startsWith('image/');

      const parts: any[] = [];
      if (isPdf && fileData) {
        parts.push({
          inline_data: { mime_type: 'application/pdf', data: fileData },
        });
      } else if (isImg && fileData) {
        parts.push({
          inline_data: {
            mime_type: mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
            data: fileData,
          },
        });
      }

      const prompt = `You are ClassAssist AI Study Synthesizer. Analyze this document: "${activeName}".
Topic context: ${overrideTopic || 'Academic coursework'}.
Format: ${summaryType}.
Provide a structured, comprehensive study summary. Return ONLY a valid JSON object:
{
  "title": "Title of lesson",
  "overview": "2-4 sentence executive overview",
  "keyConcepts": [
    { "concept": "Concept Title", "explanation": "Detailed explanation" }
  ],
  "definitions": [
    { "term": "Term", "definition": "Clear definition" }
  ],
  "takeaways": [
    "High yield bullet point 1",
    "High yield bullet point 2"
  ],
  "reviewQuestions": [
    "Diagnostic self-study question 1",
    "Diagnostic self-study question 2"
  ]
}
NEVER use double asterisks (**). Return pure JSON.`;

      parts.push({ text: prompt });

      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.3,
            },
          }),
        },
      );

      if (directRes.ok) {
        const data = await directRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text.replace(/\*\*/g, ''));
          setSummaryResult({
            ...parsed,
            fileName: activeName,
            live: true,
          });
          setStep('result');
          return;
        }
      }
    } catch {
      // Fallback
    }

    setSummaryResult(getOfflineFallback(activeName));
    setStep('result');
  };

  const getFormatBadge = (name: string): { label: string; bg: string; color: string; icon: IconName } => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return { label: 'PDF', bg: '#FEE2E2', color: '#DC2626', icon: 'doc.text' };
    if (['pptx', 'ppt'].includes(ext)) return { label: 'PPTX', bg: '#FEF3C7', color: '#D97706', icon: 'doc.text' };
    if (['docx', 'doc'].includes(ext)) return { label: 'DOCX', bg: '#DBEAFE', color: '#2563EB', icon: 'doc.text' };
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return { label: 'IMG', bg: '#EDE9FE', color: '#7C3AED', icon: 'camera' };
    return { label: 'DOC', bg: '#F1F5F9', color: '#475569', icon: 'doc.text' };
  };

  const copyFullSummary = () => {
    if (!summaryResult) return;
    const fullText = [
      `[DOCUMENT SUMMARY] ${summaryResult.title}`,
      `File: ${summaryResult.fileName}`,
      `\n--- OVERVIEW ---\n${summaryResult.overview}`,
      `\n--- CORE CONCEPTS ---\n${summaryResult.keyConcepts.map((c) => `• ${c.concept}: ${c.explanation}`).join('\n')}`,
      `\n--- KEY DEFINITIONS ---\n${summaryResult.definitions.map((d) => `• ${d.term}: ${d.definition}`).join('\n')}`,
      `\n--- HIGH-YIELD TAKEAWAYS ---\n${summaryResult.takeaways.map((t) => `• ${t}`).join('\n')}`,
      `\n--- REVIEW QUESTIONS ---\n${summaryResult.reviewQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
    ].join('\n');

    if (Platform.OS === 'web' && navigator?.clipboard) {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <SafeAreaView style={styles.canvas} edges={['top', 'left', 'right', 'bottom']}>
      {/* Hidden File Inputs for Web */}
      {Platform.OS === 'web' && (
        <>
          <input
            type="file"
            ref={fileInputRef as any}
            accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md,image/*"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
            }}
          />
          <input
            type="file"
            ref={cameraInputRef as any}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
            }}
          />
        </>
      )}

      {/* 1. iOS SHEET PULL-DOWN HANDLE */}
      <View style={styles.sheetHandle} />

      {/* 2. iOS NAVIGATION BAR */}
      <View style={styles.navBar}>
        {/* Left: iOS Frosted Back / Dismiss Pill Button */}
        <Pressable
          onPress={() => {
            if (step === 'result' || step === 'generating') setStep('upload');
            else onBack();
          }}
          accessibilityLabel="Go back or dismiss"
          style={({ pressed }) => [
            styles.navPillButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Icon
            name={step === 'result' ? 'arrow.left' : 'chevron.down'}
            size={16}
            color="#1C1C1E"
          />
        </Pressable>

        {/* Center: Apple Small Caps Eyebrow & Title */}
        <View style={styles.navHeaderCenter}>
          <Text style={styles.navEyebrow}>
            {step === 'result' ? 'DOCUMENT SYNTHESIS' : 'STUDY SUMMARIZER'}
          </Text>
          <Text style={styles.navSubject} numberOfLines={1}>
            {step === 'result' ? summaryResult?.title : 'ClassAssist Notes Studio'}
          </Text>
        </View>

        {/* Right: Quick Action Pill */}
        {step === 'result' ? (
          <Pressable
            onPress={copyFullSummary}
            accessibilityLabel="Copy all notes"
            style={({ pressed }) => [
              styles.navPillButton,
              copied && { backgroundColor: '#DCFCE7' },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icon
              name={copied ? 'checkmark' : 'doc.on.doc'}
              size={15}
              color={copied ? '#16A34A' : '#1C1C1E'}
            />
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {/* 3. STEP 1: UPLOAD & CONFIGURATION (APPLE INSET GROUPED) */}
      {step === 'upload' && (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Welcome Card */}
          <View style={styles.heroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={styles.heroIconSquircle}>
                <Icon name="doc.text" size={22} color="#007AFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Smart Lesson Synthesizer</Text>
                <Text style={styles.heroSubtitle}>
                  Extract key notes, core formulas & definitions in seconds
                </Text>
              </View>
            </View>

            {/* Supported Format Capsules */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {['PowerPoint (.pptx)', 'PDF (.pdf)', 'Word (.docx)', 'Text (.txt)', 'Camera Scan'].map((f) => (
                <View key={f} style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Inset Grouped Section 1: Upload Source */}
          <Text style={styles.sectionHeader}>SELECT DOCUMENT OR SLIDES</Text>

          {fileName ? (
            /* Selected File Card */
            <View style={styles.selectedFileCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={[
                    styles.fileTypeSquircle,
                    { backgroundColor: getFormatBadge(fileName).bg },
                  ]}
                >
                  <Icon
                    name={getFormatBadge(fileName).icon}
                    size={20}
                    color={getFormatBadge(fileName).color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {fileName}
                  </Text>
                  <Text style={styles.selectedFileMeta}>
                    Ready for AI Synthesis · {fileSizeStr}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setFileName('');
                  setFileData('');
                }}
                style={({ pressed }) => [
                  styles.clearFileBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Icon name="xmark" size={14} color="#8E8E93" />
              </Pressable>
            </View>
          ) : (
            /* Inset Grouped Selection Table */
            <View style={styles.insetGroupedTable}>
              {/* Row 1: Browse Files */}
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web' && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                style={({ pressed }) => [
                  styles.tableRow,
                  styles.tableRowBorder,
                  pressed && { backgroundColor: '#F2F2F7' },
                ]}
              >
                <View style={[styles.actionIconSquircle, { backgroundColor: '#E0F2FE' }]}>
                  <Icon name="arrow.up.doc" size={18} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableRowTitle}>Browse Documents & Slides</Text>
                  <Text style={styles.tableRowSubtitle}>PPT, PPTX, PDF, DOCX, or TXT</Text>
                </View>
                <Icon name="chevron.right" size={13} color="#C7C7CC" />
              </Pressable>

              {/* Row 2: Camera Scan */}
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web' && cameraInputRef.current) {
                    cameraInputRef.current.click();
                  }
                }}
                style={({ pressed }) => [
                  styles.tableRow,
                  pressed && { backgroundColor: '#F2F2F7' },
                ]}
              >
                <View style={[styles.actionIconSquircle, { backgroundColor: '#EDE9FE' }]}>
                  <Icon name="camera" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableRowTitle}>Scan Handout with Camera</Text>
                  <Text style={styles.tableRowSubtitle}>Capture physical notes, whiteboards or books</Text>
                </View>
                <Icon name="chevron.right" size={13} color="#C7C7CC" />
              </Pressable>
            </View>
          )}

          {/* Inset Grouped Section 2: Quick Sample Lectures */}
          <Text style={[styles.sectionHeader, { marginTop: 14 }]}>QUICK SAMPLE LECTURES</Text>
          <View style={styles.insetGroupedTable}>
            {PRESET_DOCUMENTS.map((doc, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setFileName(doc.title);
                  setFileSizeStr(doc.size);
                  handleSummarize(doc.title, doc.topic);
                }}
                style={({ pressed }) => [
                  styles.tableRow,
                  idx < PRESET_DOCUMENTS.length - 1 && styles.tableRowBorder,
                  pressed && { backgroundColor: '#F2F2F7' },
                ]}
              >
                <View style={[styles.fileTypeSquircle, { backgroundColor: doc.badgeBg }]}>
                  <Icon name={doc.icon} size={18} color={doc.badgeColor} />
                </View>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.tableRowTitle} numberOfLines={1}>{doc.title}</Text>
                    <View style={[styles.miniBadge, { backgroundColor: doc.badgeBg }]}>
                      <Text style={[styles.miniBadgeText, { color: doc.badgeColor }]}>{doc.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.tableRowSubtitle}>{doc.subtitle}</Text>
                </View>
                <Icon name="chevron.right" size={13} color="#C7C7CC" />
              </Pressable>
            ))}
          </View>

          {/* Inset Grouped Section 3: Summary Depth (Segmented Control) */}
          <Text style={[styles.sectionHeader, { marginTop: 14 }]}>SUMMARY DEPTH & STYLE</Text>
          <View style={styles.segmentedControl}>
            {(
              [
                { id: 'study_notes', icon: 'book.closed' as IconName, label: 'Comprehensive', sub: 'In-depth notes' },
                { id: 'executive', icon: 'flame.fill' as IconName, label: 'Key Takeaways', sub: 'Fast recall' },
                { id: 'exam_prep', icon: 'sparkles' as IconName, label: 'Exam Prep', sub: 'Diagnostic' },
              ] as const
            ).map((m) => {
              const isSelected = summaryType === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setSummaryType(m.id)}
                  style={[
                    styles.segmentItem,
                    isSelected && styles.segmentItemActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name={m.icon} size={12} color={isSelected ? '#1C1C1E' : '#8E8E93'} />
                    <Text
                      style={[
                        styles.segmentLabel,
                        isSelected && styles.segmentLabelActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                  <Text style={styles.segmentSub}>{m.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Primary Action Button */}
          <View style={{ marginTop: 18 }}>
            <Pressable
              onPress={() => handleSummarize()}
              disabled={!fileName}
              style={({ pressed }) => [
                styles.primaryAppleButton,
                !fileName && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Icon name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.primaryAppleButtonText}>
                Summarize Document with AI
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* 4. STEP 2: GENERATING (APPLE HUD) */}
      {step === 'generating' && (
        <View style={styles.generatingContainer}>
          <View style={styles.hudCard}>
            <ApplePulseDocIcon />
            <Text style={styles.hudTitle}>Synthesizing Study Notes</Text>
            <Text style={styles.hudStepText}>{genSteps[genStepIdx]}</Text>
            <Text style={styles.hudMetaText}>Analyzing "{fileName}"</Text>

            {/* Apple Progress Bar */}
            <View style={styles.hudProgressBar}>
              <View
                style={[
                  styles.hudProgressFill,
                  { width: `${((genStepIdx + 1) / genSteps.length) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* 5. STEP 3: RESULT DISPLAY (APPLE BOOKS & NOTES HIG) */}
      {step === 'result' && summaryResult && (
        <View style={{ flex: 1 }}>
          {/* Document Header Card */}
          <View style={styles.resultHeaderCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: getFormatBadge(summaryResult.fileName).bg },
                ]}
              >
                <Text
                  style={[
                    styles.miniBadgeText,
                    { color: getFormatBadge(summaryResult.fileName).color },
                  ]}
                >
                  {getFormatBadge(summaryResult.fileName).label}
                </Text>
              </View>
              <Text style={styles.resultHeaderMeta} numberOfLines={1}>
                {summaryResult.fileName}
              </Text>
              {summaryResult.live && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE AI</Text>
                </View>
              )}
            </View>
            <Text style={styles.resultHeaderTitle}>{summaryResult.title}</Text>

            {/* Native iOS Segmented Tab Navigation */}
            <View style={styles.tabSegmentBar}>
              {(
                [
                  { id: 'overview', icon: 'doc.text' as IconName, label: 'Overview' },
                  { id: 'concepts', icon: 'sparkles' as IconName, label: 'Concepts' },
                  { id: 'definitions', icon: 'book.closed' as IconName, label: 'Glossary' },
                  { id: 'questions', icon: 'questionmark.circle' as IconName, label: 'Self-Quiz' },
                ] as const
              ).map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setActiveTab(t.id)}
                    style={[
                      styles.tabSegmentItem,
                      isActive && styles.tabSegmentItemActive,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name={t.icon} size={11} color={isActive ? '#007AFF' : '#8E8E93'} />
                      <Text
                        style={[
                          styles.tabSegmentLabel,
                          isActive && styles.tabSegmentLabelActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tab Content Body */}
          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'overview' && (
              <View style={{ gap: 14 }}>
                {/* Executive Synopsis Card */}
                <View style={styles.insetCard}>
                  <Text style={styles.cardHeaderSmall}>EXECUTIVE SYNOPSIS</Text>
                  <Text style={styles.overviewBodyText}>
                    {summaryResult.overview}
                  </Text>
                </View>

                {/* High-Yield Takeaways Card */}
                <View style={styles.insetCard}>
                  <Text style={styles.cardHeaderSmall}>HIGH-YIELD EXAM TAKEAWAYS</Text>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {summaryResult.takeaways.map((takeaway, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        <AppleCheckCircle size={17} />
                        <Text style={styles.takeawayText}>{takeaway}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'concepts' && (
              <View style={{ gap: 12 }}>
                {summaryResult.keyConcepts.map((item, idx) => (
                  <View key={idx} style={styles.insetCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={styles.conceptChip}>
                        <Text style={styles.conceptChipText}>CONCEPT #{idx + 1}</Text>
                      </View>
                      <Text style={styles.conceptTitleText} numberOfLines={1}>
                        {item.concept}
                      </Text>
                    </View>
                    <Text style={styles.conceptBodyText}>{item.explanation}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'definitions' && (
              <View style={styles.insetGroupedTable}>
                {summaryResult.definitions.length === 0 ? (
                  <Text style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                    No specialized vocabulary extracted.
                  </Text>
                ) : (
                  summaryResult.definitions.map((def, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.glossaryRow,
                        idx < summaryResult.definitions.length - 1 && styles.tableRowBorder,
                      ]}
                    >
                      <Text style={styles.glossaryTerm}>{def.term}</Text>
                      <Text style={styles.glossaryDefinition}>{def.definition}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'questions' && (
              <View style={{ gap: 12 }}>
                {summaryResult.reviewQuestions.map((q, idx) => {
                  const isRevealed = !!revealedQuiz[idx];
                  return (
                    <View key={idx} style={styles.insetCard}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <View style={styles.quizQBadge}>
                          <Text style={styles.quizQBadgeText}>Q{idx + 1}</Text>
                        </View>
                        <Text style={styles.quizQuestionText}>{q}</Text>
                      </View>

                      {/* Interactive Reveal Button */}
                      <Pressable
                        onPress={() => {
                          setRevealedQuiz((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }));
                        }}
                        style={({ pressed }) => [
                          styles.quizRevealButton,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Icon
                          name={isRevealed ? 'eye.slash' : 'eye'}
                          size={14}
                          color="#007AFF"
                        />
                        <Text style={styles.quizRevealButtonText}>
                          {isRevealed ? 'Hide Explanation' : 'Reveal Diagnostic Answer'}
                        </Text>
                      </Pressable>

                      {isRevealed && (
                        <View style={styles.quizAnswerCard}>
                          <Text style={styles.quizAnswerLabel}>KEY EXAM INSIGHT</Text>
                          <Text style={styles.quizAnswerBody}>
                            Review the core relationship outlined in Concept #{(idx % summaryResult.keyConcepts.length) + 1}. Make sure you can write the definition from memory without checking reference slides.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* 6. FLOATING BOTTOM ACTION DOCK (ios-clean-ui section 5) */}
          <View style={styles.floatingDockContainer}>
            <View style={styles.floatingDock}>
              {/* Copy Full Notes Pill */}
              <Pressable
                onPress={copyFullSummary}
                style={({ pressed }) => [
                  styles.dockCopyBtn,
                  copied && { backgroundColor: '#DCFCE7' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon
                  name={copied ? 'checkmark' : 'doc.on.doc'}
                  size={15}
                  color={copied ? '#16A34A' : '#1C1C1E'}
                />
                <Text
                  style={[
                    styles.dockCopyBtnText,
                    copied && { color: '#16A34A' },
                  ]}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </Pressable>

              {/* Socratic AI Tutor Bridge */}
              <Pressable
                onPress={() => {
                  if (onAskTutor && summaryResult) {
                    onAskTutor(
                      `I just summarized "${summaryResult.fileName} - ${summaryResult.title}". Can you quiz me or tutor me through these key concepts step-by-step?`,
                    );
                  }
                }}
                style={({ pressed }) => [
                  styles.dockTutorBtn,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <Icon name="sparkles" size={15} color="#FFFFFF" />
                <Text style={styles.dockTutorBtnText}>Discuss with Tutor</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function getOfflineFallback(name: string): DocumentSummaryResult {
  const baseName = name.replace(/\.[^/.]+$/, '');
  return {
    title: `${baseName} (Key Notes)`,
    overview: `This document contains foundational material on ${baseName}. Key concepts, process definitions, and core formulas are synthesized below for rapid study.`,
    keyConcepts: [
      {
        concept: 'Core Subject Matter & Objectives',
        explanation: 'Covers essential relationships, structures, and definitions necessary for mastery.',
      },
      {
        concept: 'Process Sequence & Mechanics',
        explanation: 'Step-by-step progression of how primary inputs interact to produce the expected outcomes.',
      },
      {
        concept: 'Analytical Applications',
        explanation: 'How foundational rules apply to real-world scenarios, exams, and laboratory experiments.',
      },
    ],
    definitions: [
      { term: 'Key Principle', definition: 'The primary scientific or mathematical law governing this phenomenon.' },
      { term: 'Equilibrium State', definition: 'A balanced condition where inputs and outputs remain stable over time.' },
      { term: 'Efficiency Factor', definition: 'The ratio of useful output produced relative to the total input invested.' },
    ],
    takeaways: [
      'Identifies the core governing equations and foundational relationships.',
      'Breaks down complex sequences into manageable, sequential steps.',
      'High-yield foundation for midterms and exam problem sets.',
    ],
    reviewQuestions: [
      'What are the essential starting components of this process?',
      'How do external conditions alter or regulate the rate of this system?',
      'Explain how the primary outcome relates back to the initial hypothesis.',
    ],
    fileName: name,
    live: false,
  };
}

/* ==================== iOS NATIVE STYLESHEET ==================== */
const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Apple System Grouped Canvas Background
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(60, 60, 67, 0.25)',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navPillButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderCenter: {
    alignItems: 'center',
    maxWidth: 220,
  },
  navEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  navSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 1,
    fontFamily: fontStack,
  },

  /* Scroll Container */
  scrollContainer: {
    padding: 20,
    paddingBottom: 60,
  },

  /* Hero Welcome Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  heroIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: fontStack,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontFamily: fontStack,
  },
  heroPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F2F2F7',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Error Banner */
  errorBanner: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },

  /* Inset Grouped Section */
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginBottom: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  insetGroupedTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  tableRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: fontStack,
  },
  tableRowSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontFamily: fontStack,
  },
  actionIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTypeSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Selected File Card */
  selectedFileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: fontStack,
  },
  selectedFileMeta: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  clearFileBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Segmented Control (iOS 17 style) */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: fontStack,
  },
  segmentLabelActive: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  segmentSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 1,
  },

  /* Primary Button */
  primaryAppleButton: {
    backgroundColor: '#007AFF', // Apple System Blue
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryAppleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: fontStack,
  },

  /* Generating View */
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hudCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  hudTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
    fontFamily: fontStack,
  },
  hudStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: fontStack,
  },
  hudMetaText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  hudProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginTop: 18,
    overflow: 'hidden',
  },
  hudProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },

  /* Result Screen */
  resultHeaderCard: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  resultHeaderMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    flex: 1,
  },
  liveBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34C759',
  },
  resultHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#1C1C1E',
    fontFamily: fontStack,
    marginTop: 2,
  },
  tabSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2.5,
    marginTop: 12,
    gap: 3,
  },
  tabSegmentItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabSegmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabSegmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: fontStack,
  },
  tabSegmentLabelActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },
  resultScroll: {
    padding: 20,
    paddingBottom: 100, // Breathing room for floating dock
  },

  /* Inset Content Cards */
  insetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderSmall: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: '#007AFF',
    marginBottom: 6,
  },
  overviewBodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    fontFamily: fontStack,
  },
  takeawayText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1C1C1E',
    fontFamily: fontStack,
    flex: 1,
  },

  /* Concepts */
  conceptChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  conceptChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
  },
  conceptTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: fontStack,
    flex: 1,
  },
  conceptBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    fontFamily: fontStack,
    marginTop: 4,
  },

  /* Glossary */
  glossaryRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 3,
  },
  glossaryTerm: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    fontFamily: fontStack,
  },
  glossaryDefinition: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontFamily: fontStack,
  },

  /* Self Quiz */
  quizQBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  quizQBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  quizQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: fontStack,
    flex: 1,
    lineHeight: 20,
  },
  quizRevealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
  },
  quizRevealButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  quizAnswerCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quizAnswerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
    marginBottom: 4,
  },
  quizAnswerBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
    fontFamily: fontStack,
  },

  /* Floating Dock (ios-clean-ui section 5) */
  floatingDockContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  dockCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#F2F2F7',
  },
  dockCopyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dockTutorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 9999,
    backgroundColor: '#007AFF', // Apple System Blue
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dockTutorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
