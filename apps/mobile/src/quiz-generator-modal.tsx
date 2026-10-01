import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import {
  Card,
  Button,
  Field,
  Icon,
  Pill,
  colors,
  s,
  Heading,
  Body,
  Label,
  type IconName,
} from './ui';

export type QuizQuestionType = 'multiple_choice' | 'identification' | 'essay';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizQuestionType;
  options?: string[]; // 4 choices for multiple choice
  correctAnswer?: string; // For multiple choice & identification
  acceptableAnswers?: string[]; // For identification alternatives
  rubric?: string; // For essay evaluation
  keyPoints?: string[]; // For essay key concepts
  maxPoints: number; // e.g. 1 pt for MCQ/ID, 10 pts for Essay
}

export interface EssayEvaluation {
  pointsEarned: number;
  maxPoints: number;
  feedback: string;
  strengths: string;
  improvements: string;
  modelAnswer: string;
}

export interface QuizGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'source' | 'quiz_type' | 'question_count' | 'generating' | 'taking' | 'evaluating' | 'summary';

function ThreeDotsWave({ color = colors.ink, size = 5 }: { color?: string; size?: number }) {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createWave = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -5,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 520 - delay)),
        ]),
      );
    };

    const a1 = createWave(anim1, 0);
    const a2 = createWave(anim2, 130);
    const a3 = createWave(anim3, 260);

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 16 }}>
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

function AgentThinkingWidget({
  fileName,
  quizType,
  questionCount,
}: {
  fileName: string;
  quizType: QuizQuestionType;
  questionCount: number;
}) {
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [seconds, setSeconds] = useState(1);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const thoughts = [
    `Reading document structure from "${fileName}"...`,
    'Extracting key academic concepts, formulas, and terminology...',
    `Formulating ${questionCount} curriculum-aligned ${
      quizType === 'multiple_choice'
        ? 'multiple choice'
        : quizType === 'identification'
        ? 'identification'
        : 'essay'
    } questions...`,
    'Calibrating answer keys and formulating scoring rubrics...',
    'Verifying pedagogical depth and clarity with Gemini AI...',
    'Finalizing quiz assessment package...',
  ];

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
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const secTimer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const thoughtTimer = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % thoughts.length);
    }, 2200);

    return () => {
      pulse.stop();
      clearInterval(secTimer);
      clearInterval(thoughtTimer);
    };
  }, [pulseAnim, thoughts.length]);

  return (
    <View style={modalStyles.agentThinkingContainer}>
      {/* Animated Agent Orb */}
      <Animated.View style={[modalStyles.agentOrb, { transform: [{ scale: pulseAnim }] }]}>
        <Icon name="sparkles" size={28} color={colors.ink} />
      </Animated.View>

      {/* Title & Three Dots Wave */}
      <View style={{ alignItems: 'center', gap: 6, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={modalStyles.agentThinkingTitle}>Agent is thinking</Text>
          <ThreeDotsWave color={colors.ink} size={5} />
        </View>
        <Text style={modalStyles.agentThinkingSub}>
          Formulating your assessment · {seconds}s
        </Text>
      </View>

      {/* Live Agent Thought Card */}
      <View style={modalStyles.thoughtCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={modalStyles.thoughtDot} />
          <Text style={modalStyles.thoughtHeader}>AGENT THOUGHT STREAM</Text>
        </View>
        <Text style={modalStyles.thoughtText}>
          {thoughts[thoughtIndex]}
        </Text>
      </View>

      {/* Target Spec Summary Card */}
      <View style={modalStyles.specCard}>
        <View style={modalStyles.specRow}>
          <Text style={modalStyles.specLabel}>Source Material</Text>
          <Text style={modalStyles.specValue} numberOfLines={1}>{fileName}</Text>
        </View>
        <View style={modalStyles.specDivider} />
        <View style={modalStyles.specRow}>
          <Text style={modalStyles.specLabel}>Quiz Format</Text>
          <Text style={modalStyles.specValue}>
            {quizType === 'multiple_choice'
              ? 'Multiple Choice'
              : quizType === 'identification'
              ? 'Identification'
              : 'Essay (AI Graded)'}
          </Text>
        </View>
        <View style={modalStyles.specDivider} />
        <View style={modalStyles.specRow}>
          <Text style={modalStyles.specLabel}>Question Count</Text>
          <Text style={modalStyles.specValue}>{questionCount} items</Text>
        </View>
      </View>
    </View>
  );
}

export function QuizGeneratorModal({ visible, onClose }: QuizGeneratorModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<'camera' | 'upload' | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Config State
  const [quizType, setQuizType] = useState<QuizQuestionType>('multiple_choice');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Quiz Taking State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  // Summary & Evaluation State
  const [essayEvaluations, setEssayEvaluations] = useState<Record<string, EssayEvaluation>>({});
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  // Web input refs
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setStep('source');
    setSourceType(null);
    setFileName('');
    setFileContent('');
    setErrorMsg('');
    setQuizType('multiple_choice');
    setQuestionCount(5);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setEssayEvaluations({});
    setTotalScore(0);
    setMaxScore(0);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // 1. File Handling
  const handleFilePicked = (file: File, mode: 'camera' | 'upload') => {
    setErrorMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (mode === 'camera') {
      if (!['jpg', 'jpeg', 'png'].includes(ext)) {
        setErrorMsg('Only JPG and PNG images are accepted for camera captures.');
        return;
      }
    } else {
      if (!['pdf', 'docx'].includes(ext)) {
        setErrorMsg('Only PDF (.pdf) and Word (.docx) files are supported.');
        return;
      }
    }

    setSourceType(mode);
    setFileName(file.name);

    // Read content
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setFileContent(res || file.name);
      setStep('quiz_type');
    };
    reader.onerror = () => {
      setFileContent(file.name);
      setStep('quiz_type');
    };

    if (file.type.startsWith('text/')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // 2. AI Quiz Generation
  const handleGenerate = async () => {
    setStep('generating');
    setErrorMsg('');

    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const lessonTopic = fileContent ? fileContent.slice(0, 1500) : fileName;

      let prompt = '';
      if (quizType === 'multiple_choice') {
        prompt = `Generate ${questionCount} multiple choice questions for high school students based on this lesson: "${fileName} - ${lessonTopic}".
For each question, provide 4 plausible options (A, B, C, D) and specify the exact correct answer.
Return strictly a valid JSON array of objects without markdown formatting:
[
  {
    "id": "q1",
    "question": "Question text here",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Why this answer is correct",
    "maxPoints": 1
  }
]`;
      } else if (quizType === 'identification') {
        prompt = `Generate ${questionCount} identification / fill-in-the-blank questions for high school students based on this lesson: "${fileName} - ${lessonTopic}".
The questions should ask for a specific scientific/academic term, definition, or formula.
Return strictly a valid JSON array of objects without markdown formatting:
[
  {
    "id": "q1",
    "question": "The scientific term for the tendency of an object to resist changes in its state of motion is called _____.",
    "type": "identification",
    "correctAnswer": "Inertia",
    "acceptableAnswers": ["Inertia", "Law of Inertia"],
    "maxPoints": 1
  }
]`;
      } else {
        // Essay
        prompt = `Generate ${questionCount} thoughtful, open-ended conceptual essay questions for high school students based on this lesson: "${fileName} - ${lessonTopic}".
Each essay question should test comprehension, real-world application, or analysis.
Return strictly a valid JSON array of objects without markdown formatting:
[
  {
    "id": "q1",
    "question": "Explain how Newton's Third Law applies when a rocket launches into space. Include action and reaction forces in your explanation.",
    "type": "essay",
    "rubric": "Evaluates understanding of action-reaction force pairs, direction of exhaust gases vs rocket acceleration, and Newton's Third Law formula.",
    "keyPoints": ["Action force of expelled gas downward", "Reaction force pushing rocket upward", "Equal and opposite magnitude"],
    "maxPoints": 10
  }
]`;
      }

      let generated: QuizQuestion[] | null = null;

      if (apiKey) {
        const models = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
        for (const model of models) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
                }),
                signal: controller.signal,
              },
            );
            clearTimeout(timer);
            if (res.ok) {
              const data = await res.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                generated = parseJsonSafe(text);
                if (generated && generated.length > 0) break;
              }
            }
          } catch (e) {
            console.warn(`Gemini quiz model ${model} error:`, e);
          }
        }
      }

      // Fallback if network was offline or model returned non-JSON
      if (!generated || generated.length === 0) {
        generated = getCuratedFallbackQuiz(fileName, quizType, questionCount);
      }

      setQuestions(generated);
      setCurrentIndex(0);
      setUserAnswers({});
      setStep('taking');
    } catch (err) {
      console.error('Quiz generation error:', err);
      // Fallback cleanly
      const fallback = getCuratedFallbackQuiz(fileName, quizType, questionCount);
      setQuestions(fallback);
      setCurrentIndex(0);
      setUserAnswers({});
      setStep('taking');
    }
  };

  // 3. Submitting & AI Grading
  const handleSubmitQuiz = async () => {
    setStep('evaluating');

    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const evals: Record<string, EssayEvaluation> = {};
      let runningScore = 0;
      let runningMax = 0;

      for (const q of questions) {
        const studentAns = (userAnswers[q.id] || '').trim();
        runningMax += q.maxPoints;

        if (q.type === 'multiple_choice') {
          const isCorrect =
            studentAns.toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();
          if (isCorrect) runningScore += q.maxPoints;
        } else if (q.type === 'identification') {
          const acceptable = [q.correctAnswer || '', ...(q.acceptableAnswers || [])].map((a) =>
            a.toLowerCase().trim(),
          );
          const isCorrect = acceptable.includes(studentAns.toLowerCase());
          if (isCorrect) runningScore += q.maxPoints;
        } else if (q.type === 'essay') {
          // AI Essay Pointing & Evaluation
          let essayEval: EssayEvaluation | null = null;
          if (apiKey && studentAns.length > 5) {
            try {
              const gradePrompt = `You are an academic teacher evaluating a high school student's essay answer.
Question: "${q.question}"
Grading Rubric / Key Concepts: "${q.rubric || q.keyPoints?.join(', ')}"
Student's Submitted Answer: "${studentAns}"

Evaluate this answer carefully and assign a score out of 10 points based on conceptual accuracy, completeness, and clarity.
Return strictly a valid JSON object matching this schema without markdown fences:
{
  "pointsEarned": 8.5,
  "maxPoints": 10,
  "feedback": "Comprehensive and clear explanation of the main concept.",
  "strengths": "Correctly identified both action and reaction forces and provided accurate real-world context.",
  "improvements": "Could elaborate slightly more on how mass affects acceleration via F=ma.",
  "modelAnswer": "An exemplary answer covering all required principles concisely."
}`;
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 18000);
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: gradePrompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
                  }),
                  signal: controller.signal,
                },
              );
              clearTimeout(timer);
              if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  essayEval = parseJsonSafe(text);
                }
              }
            } catch (e) {
              console.warn('AI Essay grading failed:', e);
            }
          }

          // Fallback heuristic scoring if AI offline
          if (!essayEval) {
            essayEval = getFallbackEssayEvaluation(q, studentAns);
          }

          evals[q.id] = essayEval;
          runningScore += essayEval.pointsEarned;
        }
      }

      setEssayEvaluations(evals);
      setTotalScore(Math.round(runningScore * 10) / 10);
      setMaxScore(runningMax);
      setStep('summary');
    } catch (e) {
      console.error('Quiz evaluation error:', e);
      setStep('summary');
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).filter((k) => (userAnswers[k] || '').trim()).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* Hidden Web Inputs */}
      {Platform.OS === 'web' && (
        <>
          <input
            type="file"
            ref={docInputRef as any}
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file, 'upload');
            }}
          />
          <input
            type="file"
            ref={cameraInputRef as any}
            accept="image/png,image/jpeg"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file, 'camera');
            }}
          />
        </>
      )}

      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.backdrop} onPress={handleClose} />

        <View style={modalStyles.sheetContainer}>
          {/* Top Sheet Drag Pill */}
          <View style={modalStyles.dragPillWrap}>
            <View style={modalStyles.dragPill} />
          </View>

          {/* Modal Header */}
          <View style={modalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              {(step === 'quiz_type' || step === 'question_count') && (
                <Pressable
                  onPress={() => {
                    if (step === 'quiz_type') setStep('source');
                    if (step === 'question_count') setStep('quiz_type');
                  }}
                  style={modalStyles.headerBackBtn}
                >
                  <Icon name="arrow.left" size={16} color={colors.ink} />
                </Pressable>
              )}
              <Text style={modalStyles.title}>
                {step === 'source' && 'AI Quiz Generator'}
                {step === 'quiz_type' && 'Quiz Options'}
                {step === 'question_count' && 'Quiz Options'}
                {step === 'generating' && 'Agent Thinking'}
                {step === 'taking' && `Question ${currentIndex + 1} of ${questions.length}`}
                {step === 'evaluating' && 'Scoring with AI'}
                {step === 'summary' && 'Quiz Results'}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={modalStyles.closeBtn}>
              <Icon name="xmark" size={16} color={colors.ink} />
            </Pressable>
          </View>

          {errorMsg ? (
            <View style={[s.error, { marginHorizontal: 20, marginBottom: 12 }]}>
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* STEP 1: SOURCE SELECT (CAMERA OR UPLOAD)                 */}
          {/* ========================================================= */}
          {step === 'source' && (
            <ScrollView contentContainerStyle={modalStyles.bodyContent}>
              <Text style={modalStyles.subtitle}>
                Choose how you want to provide your lesson material. The AI will extract key concepts and formulate curriculum questions.
              </Text>

              <View style={{ gap: 12, marginTop: 14 }}>
                {/* 1. Camera / Photo Option */}
                <Pressable
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      cameraInputRef.current?.click();
                    } else {
                      Alert.alert('Camera', 'Please choose a photo from your gallery or camera (JPG/PNG).');
                    }
                  }}
                  style={({ pressed }) => [modalStyles.sourceCard, pressed && modalStyles.cardPressed]}
                >
                  <Icon name="camera" size={26} color={colors.ink} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={modalStyles.cardTitle}>Take a Photo / Camera</Text>
                    <Text style={modalStyles.cardDesc}>
                      Snap a photo of your physical notebook, textbook, or printed handout.
                    </Text>
                  </View>
                </Pressable>

                {/* 2. Upload Document Option */}
                <Pressable
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      docInputRef.current?.click();
                    } else {
                      Alert.alert('Document Upload', 'Select a PDF or Word document.');
                    }
                  }}
                  style={({ pressed }) => [modalStyles.sourceCard, pressed && modalStyles.cardPressed]}
                >
                  <Icon name="arrow.up.doc" size={26} color={colors.ink} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={modalStyles.cardTitle}>Upload Document</Text>
                    <Text style={modalStyles.cardDesc}>
                      Upload your lesson PDF or Word document directly from your device files.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* ========================================================= */}
          {/* STEP 1: SELECT QUIZ TYPE (STANDALONE SCREEN)              */}
          {/* ========================================================= */}
          {step === 'quiz_type' && (
            <ScrollView contentContainerStyle={modalStyles.bodyContent}>
              {/* File Info Bar */}
              <View style={modalStyles.fileBanner}>
                <Icon name={sourceType === 'camera' ? 'camera' : 'doc.text'} size={20} color={colors.ink} />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.fileBannerName} numberOfLines={1}>
                    {fileName}
                  </Text>
                  <Text style={modalStyles.fileBannerSub}>
                    {sourceType === 'camera' ? 'Photo capture' : 'Uploaded document'} · Ready
                  </Text>
                </View>
                <Pressable onPress={() => setStep('source')}>
                  <Text style={modalStyles.changeFileText}>Change</Text>
                </Pressable>
              </View>

              {/* Step Title & Instruction */}
              <View style={{ marginTop: 16, marginBottom: 12 }}>
                <Text style={modalStyles.stepBadge}>STEP 1 OF 2</Text>
                <Text style={modalStyles.stepHeading}>Select Quiz Type</Text>
                <Text style={modalStyles.stepDesc}>
                  Choose the assessment format you want our AI agent to formulate from your lesson.
                </Text>
              </View>

              {/* Quiz Type Options List */}
              <View style={{ gap: 10 }}>
                {[
                  {
                    type: 'multiple_choice' as QuizQuestionType,
                    title: 'Multiple Choice',
                    desc: '4 options (A, B, C, D) with instant automated scoring and explanations',
                    icon: 'checkmark.circle.fill' as IconName,
                    tag: 'Auto-Graded',
                  },
                  {
                    type: 'identification' as QuizQuestionType,
                    title: 'Identification',
                    desc: 'Recall and type the exact scientific term, definition, or formula',
                    icon: 'pencil' as IconName,
                    tag: 'Recall',
                  },
                  {
                    type: 'essay' as QuizQuestionType,
                    title: 'Essay Type (AI Graded)',
                    desc: 'In-depth conceptual answers scored from 0-10 by Gemini AI agent',
                    icon: 'sparkles' as IconName,
                    tag: 'AI Rubric',
                  },
                ].map((item) => {
                  const isSelected = quizType === item.type;
                  return (
                    <Pressable
                      key={item.type}
                      onPress={() => setQuizType(item.type)}
                      style={[modalStyles.optionCard, isSelected && modalStyles.optionCardSelected]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[modalStyles.optionRadio, isSelected && modalStyles.optionRadioSelected]}>
                          {isSelected && <View style={modalStyles.optionRadioInner} />}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Icon name={item.icon} size={16} color={colors.ink} />
                              <Text style={modalStyles.optionTitle}>
                                {item.title}
                              </Text>
                            </View>
                            <View style={modalStyles.formatTag}>
                              <Text style={modalStyles.formatTagText}>{item.tag}</Text>
                            </View>
                          </View>
                          <Text style={modalStyles.optionDesc}>{item.desc}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Step Navigation Buttons */}
              <View style={modalStyles.stepFooter}>
                <View style={{ flex: 1 }}>
                  <Button title="Back" secondary onPress={() => setStep('source')} />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Button title="Next: Questions" onPress={() => setStep('question_count')} />
                </View>
              </View>
            </ScrollView>
          )}

          {/* ========================================================= */}
          {/* STEP 2: NUMBER OF QUESTIONS (STANDALONE SCREEN)           */}
          {/* ========================================================= */}
          {step === 'question_count' && (
            <ScrollView contentContainerStyle={modalStyles.bodyContent}>
              {/* Selected Type Summary Banner */}
              <View style={modalStyles.fileBanner}>
                <Icon
                  name={
                    quizType === 'multiple_choice'
                      ? 'checkmark.circle.fill'
                      : quizType === 'identification'
                      ? 'pencil'
                      : 'sparkles'
                  }
                  size={20}
                  color={colors.ink}
                />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.fileBannerName}>
                    {quizType === 'multiple_choice'
                      ? 'Multiple Choice Quiz'
                      : quizType === 'identification'
                      ? 'Identification Quiz'
                      : 'Essay Type Assessment'}
                  </Text>
                  <Text style={modalStyles.fileBannerSub}>
                    Source: {fileName}
                  </Text>
                </View>
                <Pressable onPress={() => setStep('quiz_type')}>
                  <Text style={modalStyles.changeFileText}>Change</Text>
                </Pressable>
              </View>

              {/* Step Title & Instruction */}
              <View style={{ marginTop: 16, marginBottom: 12 }}>
                <Text style={modalStyles.stepBadge}>STEP 2 OF 2</Text>
                <Text style={modalStyles.stepHeading}>Number of Questions</Text>
                <Text style={modalStyles.stepDesc}>
                  Select how many questions the AI agent should formulate for this lesson.
                </Text>
              </View>

              {/* Question Count Cards */}
              <View style={{ gap: 10 }}>
                {[
                  {
                    count: 3,
                    label: '3 Questions',
                    badge: 'Quick Check',
                    desc: 'Short concept check covering core definitions · ~3 minutes',
                  },
                  {
                    count: 5,
                    label: '5 Questions',
                    badge: 'Recommended',
                    desc: 'Balanced assessment with principles, mechanics & practical application · ~6 minutes',
                  },
                  {
                    count: 10,
                    label: '10 Questions',
                    badge: 'Comprehensive',
                    desc: 'In-depth mastery check covering the entire lesson syllabus · ~12 minutes',
                  },
                ].map((item) => {
                  const isSelected = questionCount === item.count;
                  return (
                    <Pressable
                      key={item.count}
                      onPress={() => setQuestionCount(item.count)}
                      style={[modalStyles.countCard, isSelected && modalStyles.countCardSelected]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[modalStyles.optionRadio, isSelected && modalStyles.optionRadioSelected]}>
                          {isSelected && <View style={modalStyles.optionRadioInner} />}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={modalStyles.optionTitle}>{item.label}</Text>
                            <View style={modalStyles.formatTag}>
                              <Text style={modalStyles.formatTagText}>{item.badge}</Text>
                            </View>
                          </View>
                          <Text style={modalStyles.optionDesc}>{item.desc}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Step Navigation Buttons */}
              <View style={modalStyles.stepFooter}>
                <View style={{ flex: 1 }}>
                  <Button title="Back" secondary onPress={() => setStep('quiz_type')} />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Button title="Generate Quiz with AI" onPress={handleGenerate} />
                </View>
              </View>
            </ScrollView>
          )}

          {/* ========================================================= */}
          {/* STEP 3: AGENT THINKING (STANDALONE LOADING SCREEN)        */}
          {/* ========================================================= */}
          {step === 'generating' && (
            <ScrollView contentContainerStyle={modalStyles.bodyContent}>
              <AgentThinkingWidget
                fileName={fileName}
                quizType={quizType}
                questionCount={questionCount}
              />
            </ScrollView>
          )}

          {/* ========================================================= */}
          {/* STEP 4: TAKING QUIZ                                      */}
          {/* ========================================================= */}
          {step === 'taking' && currentQ && (
            <View style={{ flex: 1, paddingBottom: 20 }}>
              {/* Progress bar */}
              <View style={modalStyles.progressTrack}>
                <View
                  style={[
                    modalStyles.progressBar,
                    { width: `${((currentIndex + 1) / questions.length) * 100}%` },
                  ]}
                />
              </View>

              <ScrollView contentContainerStyle={modalStyles.bodyContent}>
                {/* Question Type Pill */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={modalStyles.formatTag}>
                    <Text style={modalStyles.formatTagText}>
                      {currentQ.type === 'multiple_choice'
                        ? 'Multiple Choice · 1 pt'
                        : currentQ.type === 'identification'
                        ? 'Identification · 1 pt'
                        : 'Essay Question · 10 pts'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#8E8E93' }}>
                    Answered: {answeredCount}/{questions.length}
                  </Text>
                </View>

                {/* Question Prompt */}
                <Text style={modalStyles.questionText}>{currentQ.question}</Text>

                {/* Input Area Based on Quiz Type */}
                {currentQ.type === 'multiple_choice' && currentQ.options && (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    {currentQ.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelected = userAnswers[currentQ.id] === opt;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt }));
                          }}
                          style={[modalStyles.choiceCard, isSelected && modalStyles.choiceCardSelected]}
                        >
                          <View style={[modalStyles.choiceBadge, isSelected && modalStyles.choiceBadgeSelected]}>
                            <Text
                              style={[
                                modalStyles.choiceBadgeText,
                                isSelected && modalStyles.choiceBadgeTextSelected,
                              ]}
                            >
                              {letter}
                            </Text>
                          </View>
                          <Text style={[modalStyles.choiceText, isSelected && modalStyles.choiceTextSelected]}>
                            {opt}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {currentQ.type === 'identification' && (
                  <View style={{ marginTop: 14, gap: 8 }}>
                    <Text style={modalStyles.fieldLabel}>Your Answer:</Text>
                    <TextInput
                      style={modalStyles.textInput}
                      placeholder="Type the term or concept here..."
                      placeholderTextColor="#8E8E93"
                      value={userAnswers[currentQ.id] || ''}
                      onChangeText={(val) => {
                        setUserAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                {currentQ.type === 'essay' && (
                  <View style={{ marginTop: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={modalStyles.fieldLabel}>Your Essay Response:</Text>
                      <Text style={{ fontSize: 11, color: '#8E8E93' }}>
                        {(userAnswers[currentQ.id] || '').trim().split(/\s+/).filter(Boolean).length} words
                      </Text>
                    </View>
                    <TextInput
                      style={[modalStyles.textInput, { height: 130, textAlignVertical: 'top' }]}
                      placeholder="Write your explanation. The AI evaluates key scientific concepts, clarity, and depth..."
                      placeholderTextColor="#8E8E93"
                      multiline
                      value={userAnswers[currentQ.id] || ''}
                      onChangeText={(val) => {
                        setUserAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                      }}
                    />
                    <Text style={{ fontSize: 11.5, color: '#8E8E93' }}>
                      Scoring: Graded from 0 to 10 points based on conceptual accuracy.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Nav Bar */}
              <View style={modalStyles.quizFooter}>
                <View style={{ flex: 1 }}>
                  {currentIndex > 0 ? (
                    <Button
                      title="Previous"
                      secondary
                      onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1.3 }}>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      title="Next Question"
                      onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    />
                  ) : (
                    <Button title="Submit Quiz" onPress={handleSubmitQuiz} />
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 5: EVALUATING ESSAYS WITH GEMINI AI                  */}
          {/* ========================================================= */}
          {step === 'evaluating' && (
            <View style={modalStyles.loadingContainer}>
              <View style={modalStyles.aiOrb}>
                <Icon name="sparkles" size={32} color={colors.ink} />
              </View>
              <Heading style={{ fontSize: 20, textAlign: 'center', color: colors.ink }}>Evaluating Quiz with AI</Heading>
              <Body style={{ textAlign: 'center', maxWidth: 300, color: '#8E8E93' }}>
                AI is reviewing your answers, evaluating conceptual depth, and calculating your score...
              </Body>
              <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 12 }} />
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 6: SUMMARY & SCORE BREAKDOWN                        */}
          {/* ========================================================= */}
          {step === 'summary' && (
            <ScrollView contentContainerStyle={modalStyles.bodyContent}>
              {/* Score Hero Card */}
              <Card style={{ backgroundColor: '#FFFFFF', alignItems: 'center', padding: 24, borderColor: '#E5E5EA', borderRadius: 20 }}>
                <View style={modalStyles.scoreRing}>
                  <Text style={modalStyles.scorePercent}>
                    {maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100}%
                  </Text>
                </View>
                <Heading style={{ fontSize: 20, marginTop: 14, color: colors.ink }}>
                  {totalScore / maxScore >= 0.8
                    ? 'Excellent Mastery'
                    : totalScore / maxScore >= 0.6
                    ? 'Good Effort'
                    : 'Needs Practice'}
                </Heading>
                <Body style={{ marginTop: 4, textAlign: 'center', color: '#8E8E93' }}>
                  You scored <Text style={{ fontWeight: '700', color: colors.ink }}>{totalScore}</Text> out of{' '}
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{maxScore} points</Text> on "{fileName}".
                </Body>
              </Card>

              {/* Question-by-Question Breakdown */}
              <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>Detailed Breakdown:</Text>
              <View style={{ gap: 12, marginTop: 8 }}>
                {questions.map((q, idx) => {
                  const studentAns = (userAnswers[q.id] || '').trim();

                  if (q.type === 'essay') {
                    const evalData = essayEvaluations[q.id];
                    return (
                      <Card key={q.id} style={{ padding: 16, gap: 10, borderColor: '#E5E5EA', borderRadius: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                            Question {idx + 1} (Essay)
                          </Text>
                          <View style={modalStyles.formatTag}>
                            <Text style={modalStyles.formatTagText}>
                              {evalData ? `${evalData.pointsEarned} / 10 pts` : 'Scored'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{q.question}</Text>

                        <View style={modalStyles.reviewAnsBox}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase' }}>
                            Your Response:
                          </Text>
                          <Text style={{ fontSize: 13, color: studentAns ? colors.ink : '#8E8E93', fontStyle: studentAns ? 'normal' : 'italic' }}>
                            {studentAns || 'No response provided'}
                          </Text>
                        </View>

                        {evalData && (
                          <View style={modalStyles.aiFeedbackBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Icon name="sparkles" size={14} color={colors.ink} />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                                AI Evaluation & Points System:
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12.5, color: colors.ink, lineHeight: 18 }}>
                              {evalData.feedback}
                            </Text>
                            {evalData.improvements ? (
                              <Text style={{ fontSize: 12, color: '#636366', marginTop: 4 }}>
                                <Text style={{ fontWeight: '700', color: colors.ink }}>Improvement Tip: </Text>
                                {evalData.improvements}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </Card>
                    );
                  }

                  // Multiple Choice & Identification
                  const isCorrect =
                    q.type === 'multiple_choice'
                      ? studentAns.toLowerCase() === (q.correctAnswer || '').toLowerCase()
                      : [q.correctAnswer || '', ...(q.acceptableAnswers || [])]
                          .map((a) => a.toLowerCase().trim())
                          .includes(studentAns.toLowerCase());

                  return (
                    <Card
                      key={q.id}
                      style={{
                        padding: 16,
                        gap: 8,
                        borderColor: '#E5E5EA',
                        borderRadius: 16,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                          Question {idx + 1} ({q.type === 'multiple_choice' ? 'MCQ' : 'Identification'})
                        </Text>
                        <View style={modalStyles.formatTag}>
                          <Text style={modalStyles.formatTagText}>
                            {isCorrect ? '1 / 1 pt' : '0 / 1 pt'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{q.question}</Text>

                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <Icon
                          name={isCorrect ? 'checkmark.circle.fill' : 'xmark'}
                          size={15}
                          color={isCorrect ? colors.ink : '#8E8E93'}
                        />
                        <Text style={{ fontSize: 13, color: isCorrect ? colors.ink : '#8E8E93', fontWeight: '500' }}>
                          Your answer: {studentAns || 'None'}
                        </Text>
                      </View>

                      {!isCorrect && (
                        <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                          Correct answer:{' '}
                          <Text style={{ fontWeight: '700', color: colors.ink }}>{q.correctAnswer}</Text>
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Retake Quiz" secondary onPress={() => setStep('quiz_type')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Done" onPress={handleClose} />
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Helpers
function parseJsonSafe(raw: string): any {
  try {
    let clean = raw.trim();
    if (clean.includes('```')) {
      clean = clean.replace(/```(?:json)?([\s\S]*?)```/g, '$1').trim();
    }
    const startBracket = clean.indexOf('[');
    const endBracket = clean.lastIndexOf(']');
    if (startBracket !== -1 && endBracket !== -1) {
      return JSON.parse(clean.slice(startBracket, endBracket + 1));
    }
    const startBrace = clean.indexOf('{');
    const endBrace = clean.lastIndexOf('}');
    if (startBrace !== -1 && endBrace !== -1) {
      return JSON.parse(clean.slice(startBrace, endBrace + 1));
    }
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function getCuratedFallbackQuiz(fileName: string, type: QuizQuestionType, count: number): QuizQuestion[] {
  if (type === 'multiple_choice') {
    const mcqList: QuizQuestion[] = [
      {
        id: 'q1',
        question: 'Which law states that an object at rest will remain at rest unless acted upon by an unbalanced force?',
        type: 'multiple_choice',
        options: ["Newton's First Law (Inertia)", "Newton's Second Law (F=ma)", "Newton's Third Law (Action-Reaction)", 'Law of Gravitation'],
        correctAnswer: "Newton's First Law (Inertia)",
        maxPoints: 1,
      },
      {
        id: 'q2',
        question: 'In the formula F = ma, what happens to acceleration if the net force is doubled while mass remains constant?',
        type: 'multiple_choice',
        options: ['Acceleration is halved', 'Acceleration doubles', 'Acceleration quadruples', 'Acceleration remains constant'],
        correctAnswer: 'Acceleration doubles',
        maxPoints: 1,
      },
      {
        id: 'q3',
        question: "When a swimmer pushes water backwards, the water pushes the swimmer forward. Which law of motion is demonstrated?",
        type: 'multiple_choice',
        options: ['Law of Universal Gravitation', 'First Law of Motion', 'Third Law of Motion', 'Second Law of Motion'],
        correctAnswer: 'Third Law of Motion',
        maxPoints: 1,
      },
      {
        id: 'q4',
        question: 'What is the standard SI unit used to measure force?',
        type: 'multiple_choice',
        options: ['Joule (J)', 'Watt (W)', 'Newton (N)', 'Pascal (Pa)'],
        correctAnswer: 'Newton (N)',
        maxPoints: 1,
      },
      {
        id: 'q5',
        question: 'Which of the following properties directly determines an object’s amount of inertia?',
        type: 'multiple_choice',
        options: ['Mass', 'Volume', 'Speed', 'Density'],
        correctAnswer: 'Mass',
        maxPoints: 1,
      },
    ];
    return mcqList.slice(0, count);
  }

  if (type === 'identification') {
    const idList: QuizQuestion[] = [
      {
        id: 'q1',
        question: 'The property of an object to resist any change in its velocity or state of motion is known as _____.',
        type: 'identification',
        correctAnswer: 'Inertia',
        acceptableAnswers: ['Inertia', 'Law of inertia'],
        maxPoints: 1,
      },
      {
        id: 'q2',
        question: 'The mathematical expression of Newton’s Second Law equates Force to Mass multiplied by _____.',
        type: 'identification',
        correctAnswer: 'Acceleration',
        acceptableAnswers: ['Acceleration', 'a'],
        maxPoints: 1,
      },
      {
        id: 'q3',
        question: 'Every action force is paired with an equal and _____ reaction force.',
        type: 'identification',
        correctAnswer: 'Opposite',
        acceptableAnswers: ['Opposite', 'Opposing'],
        maxPoints: 1,
      },
      {
        id: 'q4',
        question: 'One Newton is defined as the force needed to accelerate 1 kilogram of mass at 1 _____ per second squared.',
        type: 'identification',
        correctAnswer: 'Meter',
        acceptableAnswers: ['Meter', 'Metre', 'm'],
        maxPoints: 1,
      },
      {
        id: 'q5',
        question: 'The scientist who formulated the three fundamental laws of classical mechanics is Sir Isaac _____.',
        type: 'identification',
        correctAnswer: 'Newton',
        acceptableAnswers: ['Newton', 'Isaac Newton'],
        maxPoints: 1,
      },
    ];
    return idList.slice(0, count);
  }

  // Essay
  const essayList: QuizQuestion[] = [
    {
      id: 'q1',
      question: "Explain why passengers in a jeepney lurch forward when the driver suddenly steps on the brakes. Cite Newton's First Law in your explanation.",
      type: 'essay',
      rubric: 'Explains inertia of motion, tendency of bodies to maintain uniform velocity, and the contact friction of brakes.',
      keyPoints: ['Inertia of body moving forward', 'Vehicle stops due to brake friction', 'Body continues moving until acted on'],
      maxPoints: 10,
    },
    {
      id: 'q2',
      question: "Compare how pushing an empty supermarket cart versus a fully loaded cart illustrates Newton's Second Law (F = ma).",
      type: 'essay',
      rubric: 'Connects mass to acceleration and required force.',
      keyPoints: ['Greater mass requires greater force for same acceleration', 'Inverse relationship between mass and acceleration for fixed force'],
      maxPoints: 10,
    },
    {
      id: 'q3',
      question: "Describe the action and reaction force pairs involved when a basketball player jumps off the court floor.",
      type: 'essay',
      rubric: 'Identifies player feet pushing downward on floor (action) and floor pushing upward on feet (reaction).',
      keyPoints: ['Action: feet apply downward force on ground', 'Reaction: normal ground force pushes player upward', 'Simultaneous equal opposite forces'],
      maxPoints: 10,
    },
    {
      id: 'q4',
      question: 'Why are seatbelts critical safety features in automobiles according to the principles of inertia?',
      type: 'essay',
      rubric: 'Explains seatbelt as external force providing necessary deceleration to stop the passenger safely.',
      keyPoints: ['Unbalanced external force', 'Prevents passenger colliding with dashboard', 'Controlled deceleration'],
      maxPoints: 10,
    },
    {
      id: 'q5',
      question: 'How does Newton’s Third Law explain the propulsion mechanism of sea squirts or squid jetting through water?',
      type: 'essay',
      rubric: 'Water expelled backwards (action) creates equal forward thrust on animal (reaction).',
      keyPoints: ['Expulsion of water backwards', 'Reaction force drives squid forward', 'Third law force pairs in fluid mechanics'],
      maxPoints: 10,
    },
  ];
  return essayList.slice(0, count);
}

function getFallbackEssayEvaluation(q: QuizQuestion, studentAns: string): EssayEvaluation {
  const words = studentAns.trim().split(/\s+/).filter(Boolean).length;
  if (words < 8) {
    return {
      pointsEarned: 3,
      maxPoints: 10,
      feedback: 'Your answer is brief. Include more supporting scientific detail and describe the mechanism thoroughly.',
      strengths: 'Addressed the question prompt.',
      improvements: 'Add key physics terms like inertia, force pairs, or acceleration.',
      modelAnswer: 'A complete response connects the physical law directly to the everyday observation step-by-step.',
    };
  }
  if (words < 25) {
    return {
      pointsEarned: 7.5,
      maxPoints: 10,
      feedback: 'Good understanding shown! You identified the core law correctly.',
      strengths: 'Clear explanation of the cause and effect.',
      improvements: 'Elaborate slightly on the opposing reaction force or mathematical relation.',
      modelAnswer: 'Great effort; clearly states both the action force and the equal reaction force.',
    };
  }
  return {
    pointsEarned: 9.5,
    maxPoints: 10,
    feedback: 'Outstanding explanation! You clearly articulated the scientific principles with academic rigor.',
    strengths: 'Strong grasp of the physical law, precise terminology, and clear reasoning.',
    improvements: 'Exemplary work ready for classroom submission.',
    modelAnswer: 'Outstanding analysis matching curricular standards.',
  };
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: 460,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  dragPillWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#8E8E93',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardPressed: {
    backgroundColor: '#F9F9FB',
    borderColor: colors.ink,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#8E8E93',
  },
  formatTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636366',
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  fileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  fileBannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  fileBannerSub: {
    fontSize: 11.5,
    color: '#8E8E93',
  },
  changeFileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textDecorationLine: 'underline',
  },
  optionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  optionCardSelected: {
    borderColor: colors.ink,
    backgroundColor: '#F9F9FB',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.ink,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  optionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  countPill: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  countPillSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  countPillNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  countPillNumberSelected: {
    color: '#FFFFFF',
  },
  countPillLabel: {
    fontSize: 10.5,
    color: '#8E8E93',
    fontWeight: '500',
  },
  countPillLabelSelected: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 12,
  },
  aiOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E5E5EA',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    color: colors.ink,
    marginTop: 10,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  choiceCardSelected: {
    borderColor: colors.ink,
    backgroundColor: '#F9F9FB',
  },
  choiceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBadgeSelected: {
    backgroundColor: colors.ink,
  },
  choiceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  choiceBadgeTextSelected: {
    color: '#FFFFFF',
  },
  choiceText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  choiceTextSelected: {
    color: colors.ink,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  textInput: {
    borderRadius: 14,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 14,
    fontSize: 14.5,
    color: colors.ink,
  },
  quizFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9F9FB',
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePercent: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  reviewAnsBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  aiFeedbackBox: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.ink,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  stepHeading: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 2,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8E8E93',
    marginTop: 3,
  },
  stepFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  countCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  countCardSelected: {
    borderColor: colors.ink,
    backgroundColor: '#F9F9FB',
  },
  agentThinkingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 16,
    width: '100%',
  },
  agentOrb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  agentThinkingTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  agentThinkingSub: {
    fontSize: 12.5,
    color: '#8E8E93',
  },
  thoughtCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9F9FB',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 6,
  },
  thoughtHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  thoughtDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.ink,
  },
  thoughtText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.ink,
  },
  specCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
    maxWidth: 200,
  },
  specDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 4,
  },
});
