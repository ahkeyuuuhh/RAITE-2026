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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
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

export type PodcastFormat = 'duo' | 'solo' | 'speed';
export type ViewTab = 'player' | 'lyrics';

export interface PodcastSegment {
  id: string;
  speaker: string;
  text: string;
  timeOffsetSec: number;
}

export interface PodcastChapter {
  title: string;
  timeOffsetSec: number;
}

export interface PodcastResult {
  title: string;
  subject: string;
  duration: string;
  totalSeconds: number;
  tagline: string;
  hosts: string[];
  segments: PodcastSegment[];
  chapters: PodcastChapter[];
  takeaways: string[];
  live?: boolean;
}

export interface AudioBitesScreenProps {
  onBack: () => void;
  onAskTutor?: (context: string) => void;
}

interface PresetTopicItem {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subject: string;
  desc: string;
}

const PRESET_TOPICS: PresetTopicItem[] = [
  {
    icon: 'flame.fill',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    title: "Newton's 3 Laws & Momentum",
    subject: 'Physics',
    desc: 'Why inertia rules the universe and action equals reaction.',
  },
  {
    icon: 'drop.fill',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    title: 'Photosynthesis & Solar Sugar',
    subject: 'Biology',
    desc: 'How thylakoids and the Calvin cycle trap light.',
  },
  {
    icon: 'arrow.up',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'Derivatives & Tangent Lines',
    subject: 'Calculus',
    desc: 'Instantaneous rates of change made visual and intuitive.',
  },
  {
    icon: 'gearshape',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    title: 'Big-O Complexity Demystified',
    subject: 'Computer Science',
    desc: 'From O(1) instant lookups to O(n!) catastrophic explosions.',
  },
  {
    icon: 'building.columns.fill',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    title: 'Philippine Bill of Rights',
    subject: 'Social Science',
    desc: 'Article III essentials: due process, free speech, and warrants.',
  },
  {
    icon: 'sparkles',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    title: 'Cellular Respiration in 2 Mins',
    subject: 'Biochemistry',
    desc: 'Glycolysis, Krebs cycle, and the ATP synthase turbine.',
  },
];

/* --- Native iPhone Vector Controls --- */

function AppleSkip15Icon({
  direction = 'back',
  size = 28,
  color = '#1C1C1E',
}: {
  direction?: 'back' | 'forward';
  size?: number;
  color?: string;
}) {
  const isBack = direction === 'back';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {isBack ? (
          <>
            <Path
              d="M16 6 C9.37 6 4 11.37 4 18 C4 24.63 9.37 30 16 30 C22.63 30 28 24.63 28 18 C28 12.8 24.6 8.38 20 6.8"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <Path
              d="M17 2 L13 6 L17 10"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <Path
              d="M16 6 C22.63 6 28 11.37 28 18 C28 24.63 22.63 30 16 30 C9.37 30 4 24.63 4 18 C4 12.8 7.4 8.38 12 6.8"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <Path
              d="M15 2 L19 6 L15 10"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        <SvgText
          x="16"
          y="20.5"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={color}
        >
          15
        </SvgText>
      </Svg>
    </View>
  );
}

function ApplePlayPauseIcon({
  isPlaying,
  size = 28,
  color = '#FFFFFF',
}: {
  isPlaying: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {isPlaying ? (
        <>
          <Rect x="5" y="4" width="4" height="16" rx="2" fill={color} />
          <Rect x="15" y="4" width="4" height="16" rx="2" fill={color} />
        </>
      ) : (
        <Path
          d="M7 4.24 C7 2.65 8.76 1.69 10.1 2.54 L20.26 8.98 C21.5 9.77 21.5 11.57 20.26 12.36 L10.1 18.8 C8.76 19.65 7 18.69 7 17.1 V4.24 Z"
          fill={color}
        />
      )}
    </Svg>
  );
}

function AppleLyricsIcon({ active, color = '#1C1C1E' }: { active?: boolean; color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={active ? '#007AFF' : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(0, 122, 255, 0.15)' : 'none'}
      />
      <Path d="M8 10h8M8 14h5" stroke={active ? '#007AFF' : color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function AppleAirPlayIcon({ color = '#8E8E93' }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path d="M12 15L7 21h10l-5-6z" fill={color} />
    </Svg>
  );
}

function AppleSpeakerMinIcon({ size = 15, color = '#8E8E93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M11 5L6 9H2v6h4l5 4V5z" />
    </Svg>
  );
}

function AppleSpeakerMaxIcon({ size = 15, color = '#8E8E93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M11 5L6 9H2v6h4l5 4V5z" />
      <Path
        d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AppleMoreIcon({ size = 18, color = '#1C1C1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="5" cy="12" r="2" />
      <Circle cx="12" cy="12" r="2" />
      <Circle cx="19" cy="12" r="2" />
    </Svg>
  );
}

function AppleStarIcon({ filled, size = 18, color = '#F59E0B' }: { filled?: boolean; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function AppleMoonIcon({ size = 14, color = '#8E8E93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}

function AnimatedWaveVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const bars = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(5)),
  ).current;

  useEffect(() => {
    if (!isPlaying) {
      bars.forEach((b) => {
        Animated.timing(b, {
          toValue: 5,
          duration: 220,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const loops = bars.map((bar, i) => {
      const minH = 4;
      const maxH = 10 + ((i * 7) % 24);
      const dur = 260 + (i % 5) * 60;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: maxH,
            duration: dur,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: minH,
            duration: dur,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
    });

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [isPlaying, bars]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 36, gap: 3.5, paddingHorizontal: 2 }}>
      {bars.map((barAnim, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: 3.5,
            height: barAnim,
            borderRadius: 2,
            backgroundColor: isPlaying
              ? idx % 2 === 0
                ? '#A5B4FC'
                : '#38BDF8'
              : 'rgba(255, 255, 255, 0.35)',
          }}
        />
      ))}
    </View>
  );
}

export function AudioBitesScreen({ onBack, onAskTutor }: AudioBitesScreenProps) {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<PodcastFormat>('duo');
  const [viewTab, setViewTab] = useState<ViewTab>('player');
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcast, setPodcast] = useState<PodcastResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'iPhone Speaker' | 'AirPods Pro' | 'ClassAssist Hub'>('iPhone Speaker');
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const timerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lyricsScrollRef = useRef<ScrollView>(null);

  // Apple Music artwork spring animation: 1.0 when playing, 0.88 when paused
  const artworkScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.spring(artworkScale, {
      toValue: isPlaying ? 1.0 : 0.88,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, artworkScale]);

  // Auto-scroll Live Lyrics when segment advances
  useEffect(() => {
    if (viewTab === 'lyrics' && lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTo({
        y: Math.max(0, activeSegIdx * 82 - 80),
        animated: true,
      });
    }
  }, [activeSegIdx, viewTab]);

  // Speech Synthesis handles
  const isSpeechSupported = Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopAudio = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (isSpeechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  };

  const playSegmentTTS = (segIndex: number) => {
    if (!podcast || segIndex >= podcast.segments.length) {
      stopAudio();
      return;
    }

    const seg = podcast.segments[segIndex];
    setActiveSegIdx(segIndex);
    setCurrentSec(seg.timeOffsetSec);

    if (isSpeechSupported) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(seg.text);
        utterance.rate = playbackSpeed;
        utterance.volume = volume;

        if (seg.speaker === 'Alex') {
          utterance.pitch = 1.08;
        } else if (seg.speaker === 'Sam') {
          utterance.pitch = 0.94;
        } else {
          utterance.pitch = 1.0;
        }

        utterance.onend = () => {
          if (segIndex + 1 < podcast.segments.length) {
            playSegmentTTS(segIndex + 1);
          } else {
            setIsPlaying(false);
            if (sleepTimer === 'end') {
              setSleepTimer(null);
            }
          }
        };

        utterance.onerror = () => {};

        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      if (!podcast) return;
      setIsPlaying(true);
      playSegmentTTS(activeSegIdx);
    }
  };

  // Timer advancement for UI progress bar
  useEffect(() => {
    if (isPlaying && podcast) {
      timerRef.current = setInterval(() => {
        setCurrentSec((prev) => {
          if (prev >= podcast.totalSeconds) {
            stopAudio();
            return 0;
          }
          const next = prev + 1;
          const foundIdx = podcast.segments.findIndex((s, i) => {
            const nextOffset = podcast.segments[i + 1]?.timeOffsetSec || podcast.totalSeconds;
            return next >= s.timeOffsetSec && next < nextOffset;
          });
          if (foundIdx !== -1 && foundIdx !== activeSegIdx) {
            setActiveSegIdx(foundIdx);
          }
          return next;
        });

        // Sleep timer countdown
        setSleepTimer((timer) => {
          if (typeof timer === 'number') {
            if (timer <= 1) {
              stopAudio();
              return null;
            }
            return timer - 1;
          }
          return timer;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, podcast, playbackSpeed, activeSegIdx]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const seekToSec = (targetSec: number) => {
    if (!podcast) return;
    const clamped = Math.max(0, Math.min(targetSec, podcast.totalSeconds));
    setCurrentSec(clamped);

    const foundIdx = podcast.segments.findIndex((s, i) => {
      const nextOffset = podcast.segments[i + 1]?.timeOffsetSec || podcast.totalSeconds;
      return clamped >= s.timeOffsetSec && clamped < nextOffset;
    });
    const targetIdx = foundIdx !== -1 ? foundIdx : 0;
    setActiveSegIdx(targetIdx);

    if (isPlaying) {
      playSegmentTTS(targetIdx);
    }
  };

  const skipSeconds = (delta: number) => {
    seekToSec(currentSec + delta);
  };

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currIdx = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currIdx + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (isPlaying) {
      playSegmentTTS(activeSegIdx);
    }
  };

  const handleSleepTimerToggle = () => {
    if (sleepTimer === null) {
      setSleepTimer(300); // 5 mins
    } else if (sleepTimer === 300) {
      setSleepTimer(900); // 15 mins
    } else if (sleepTimer === 900) {
      setSleepTimer('end');
    } else {
      setSleepTimer(null);
    }
  };

  const generatePodcast = async (selectedTopic?: string) => {
    const finalTopic = (selectedTopic || topic).trim();
    if (!finalTopic || isGenerating) return;

    stopAudio();
    setIsGenerating(true);
    setPodcast(null);
    setCurrentSec(0);
    setActiveSegIdx(0);
    setViewTab('player');

    try {
      const res = await request<PodcastResult>(
        '/ai/podcast',
        {
          topic: finalTopic,
          format,
          style: 'energetic',
        },
        false,
      );

      if (res && res.title && res.segments?.length > 0) {
        setPodcast(res);
      } else {
        throw new Error('Empty podcast structure');
      }
    } catch {
      const direct = await callGeminiDirectPodcast(finalTopic, format);
      if (direct) {
        setPodcast(direct);
      } else {
        setPodcast(getCuratedOfflinePodcast(finalTopic, format));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyTranscript = () => {
    if (!podcast) return;
    const lines = [
      `[AUDIO BITE] ${podcast.title} (${podcast.subject})`,
      `Duration: ${podcast.duration}`,
      `Tagline: ${podcast.tagline}\n`,
      '--- TRANSCRIPT ---',
      ...podcast.segments.map(
        (s) => `[${formatTimer(s.timeOffsetSec)}] ${s.speaker}: ${s.text}`,
      ),
      '\n--- HIGH-YIELD TAKEAWAYS ---',
      ...podcast.takeaways.map((t) => `• ${t}`),
    ].join('\n');

    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(lines);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <SafeAreaView style={styles.canvas} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. iOS SHEET PULL-DOWN HANDLE */}
      <View style={styles.sheetHandle} />

      {/* 2. iOS NAVIGATION BAR */}
      <View style={styles.navBar}>
        {/* Left: iOS Circular Frosted Close/Back Pill */}
        <Pressable
          onPress={() => {
            stopAudio();
            onBack();
          }}
          accessibilityLabel="Dismiss sheet"
          style={({ pressed }) => [
            styles.navPillButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Icon name="chevron.down" size={17} color="#1C1C1E" />
        </Pressable>

        {/* Center: Apple Podcasts "NOW PLAYING" Header */}
        <View style={styles.navHeaderCenter}>
          <Text style={styles.navEyebrow}>
            {podcast ? 'NOW PLAYING' : 'AUDIO BITES STUDIO'}
          </Text>
          <Text style={styles.navSubject} numberOfLines={1}>
            {podcast ? podcast.subject : 'ClassAssist Study Cast'}
          </Text>
        </View>

        {/* Right Action Icons: Live Lyrics Pill & More Menu */}
        {podcast ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setViewTab((prev) => (prev === 'player' ? 'lyrics' : 'player'))}
              accessibilityLabel="Toggle live lyrics"
              style={({ pressed }) => [
                styles.navPillButton,
                viewTab === 'lyrics' && { backgroundColor: '#E0E7FF' },
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppleLyricsIcon active={viewTab === 'lyrics'} color={viewTab === 'lyrics' ? '#007AFF' : '#1C1C1E'} />
            </Pressable>

            <Pressable
              onPress={() => setShowActionSheet(true)}
              accessibilityLabel="More options"
              style={({ pressed }) => [
                styles.navPillButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppleMoreIcon size={17} color="#1C1C1E" />
            </Pressable>
          </View>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {/* 3. CONTENT AREA */}
      {!podcast ? (
        /* ==================== iOS CREATION SCREEN (INSET GROUPED) ==================== */
        <ScrollView
          contentContainerStyle={styles.creationScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* iOS Section Header */}
          <Text style={styles.sectionHeader}>STUDY TOPIC OR NOTES</Text>

          {/* Inset Grouped Cell */}
          <View style={styles.insetCard}>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g., Photosynthesis vs Respiration, Newton's 3 Laws, Big-O Notation..."
              placeholderTextColor="#8E8E93"
              multiline
              style={styles.topicTextInput}
            />
          </View>

          {/* iOS Section Header */}
          <Text style={styles.sectionHeader}>PODCAST FORMAT</Text>

          {/* Native iOS Segmented Control */}
          <View style={styles.segmentedControl}>
            {(
              [
                { key: 'duo', icon: 'person.2.fill' as IconName, label: 'Duo Host', sub: 'Alex & Sam' },
                { key: 'solo', icon: 'graduationcap.fill' as IconName, label: 'Solo Mentor', sub: 'Professor' },
                { key: 'speed', icon: 'flame.fill' as IconName, label: '60s Blitz', sub: 'Fast Track' },
              ] as const
            ).map((fmt) => {
              const isSelected = format === fmt.key;
              return (
                <Pressable
                  key={fmt.key}
                  onPress={() => setFormat(fmt.key)}
                  style={[
                    styles.segmentItem,
                    isSelected && styles.segmentItemActive,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name={fmt.icon} size={12} color={isSelected ? '#1C1C1E' : '#8E8E93'} />
                    <Text
                      style={[
                        styles.segmentLabel,
                        isSelected && styles.segmentLabelActive,
                      ]}
                    >
                      {fmt.label}
                    </Text>
                  </View>
                  <Text style={styles.segmentSub}>{fmt.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Primary Action Button */}
          <View style={{ marginTop: 14 }}>
            <Pressable
              onPress={() => generatePodcast()}
              disabled={isGenerating || !topic.trim()}
              style={({ pressed }) => [
                styles.primaryAppleButton,
                (isGenerating || !topic.trim()) && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.primaryAppleButtonText}>
                {isGenerating ? 'Producing 2-Min Audio Bite…' : 'Generate 2-Min Podcast'}
              </Text>
            </Pressable>
          </View>

          {/* iOS Section Header */}
          <Text style={[styles.sectionHeader, { marginTop: 22 }]}>POPULAR STUDY BITES</Text>

          {/* iOS Inset Grouped Table View */}
          <View style={styles.insetGroupedTable}>
            {PRESET_TOPICS.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setTopic(item.title);
                  generatePodcast(item.title);
                }}
                style={({ pressed }) => [
                  styles.tableRow,
                  idx < PRESET_TOPICS.length - 1 && styles.tableRowBorder,
                  pressed && { backgroundColor: '#F2F2F7' },
                ]}
              >
                <View style={[styles.tableRowIconSquare, { backgroundColor: item.iconBg }]}>
                  <Icon name={item.icon} size={18} color={item.iconColor} />
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.tableRowTitle}>{item.title}</Text>
                    <Pill tone="blue">{item.subject}</Pill>
                  </View>
                  <Text style={styles.tableRowSubtitle} numberOfLines={1}>
                    {item.desc}
                  </Text>
                </View>

                <Icon name="chevron.right" size={13} color="#C7C7CC" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : viewTab === 'player' ? (
        /* ==================== APPLE PODCASTS NOW PLAYING SCREEN ==================== */
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.playerScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO SQUIRCLE ALBUM ART (With Spring Scale Animation) */}
          <Animated.View
            style={[
              styles.albumArtContainer,
              {
                transform: [{ scale: artworkScale }],
                shadowOpacity: isPlaying ? 0.35 : 0.12,
              },
              Platform.OS === 'web'
                ? ({
                    boxShadow: isPlaying
                      ? '0 24px 48px -10px rgba(99, 102, 241, 0.44), 0 10px 24px -6px rgba(0, 0, 0, 0.16)'
                      : '0 12px 28px -6px rgba(0, 0, 0, 0.12)',
                    transition: 'box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  } as any)
                : null,
            ]}
          >
            {/* Ambient Aurora Orbs */}
            <View style={styles.albumAuroraTop} />
            <View style={styles.albumAuroraBottom} />

            {/* Artwork Center Stack */}
            <View style={styles.artworkInnerStack}>
              <View style={styles.artworkIconCircle}>
                <Icon name="mic" size={26} color="#FFFFFF" />
              </View>

              <Text style={styles.artworkTitle} numberOfLines={2}>
                {podcast.title}
              </Text>

              <View style={styles.artworkSubjectPill}>
                <Text style={styles.artworkSubjectText}>
                  {podcast.subject.toUpperCase()} · {podcast.duration}
                </Text>
              </View>

              {/* Pulsing Animated Waveform */}
              <View style={{ marginTop: 12 }}>
                <AnimatedWaveVisualizer isPlaying={isPlaying} />
              </View>
            </View>

            {/* Bottom Brand Ribbon */}
            <View style={styles.artworkRibbon}>
              <Text style={styles.artworkRibbonText}>
                {podcast.hosts.join(' & ')} · ClassAssist Study Bites
              </Text>
            </View>
          </Animated.View>

          {/* TITLE & ARTIST ROW (Apple Style) */}
          <View style={styles.titleStack}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.episodeTitle} numberOfLines={2}>
                {podcast.title}
              </Text>
              <Text style={styles.episodeSubtitle} numberOfLines={1}>
                {podcast.tagline}
              </Text>
            </View>

            {/* Secondary Actions: Favorite Star & Copy Script */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => setIsFavorite((prev) => !prev)}
                accessibilityLabel="Favorite"
                style={({ pressed }) => [
                  styles.iconCircleAction,
                  isFavorite && { backgroundColor: '#FEF3C7' },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <AppleStarIcon filled={isFavorite} size={18} color={isFavorite ? '#D97706' : '#8E8E93'} />
              </Pressable>

              <Pressable
                onPress={handleCopyTranscript}
                accessibilityLabel="Copy transcript"
                style={({ pressed }) => [
                  styles.iconCircleAction,
                  copied && { backgroundColor: '#DCFCE7' },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Icon
                  name={copied ? 'checkmark' : 'doc.on.doc'}
                  size={16}
                  color={copied ? '#16A34A' : '#1C1C1E'}
                />
              </Pressable>
            </View>
          </View>

          {/* APPLE CONTINUOUS AUDIO SCRUBBER WITH THUMB KNOB */}
          <View style={styles.scrubberContainer}>
            <Pressable
              onPress={(e) => {
                const rect = (e.currentTarget as any)?.getBoundingClientRect?.();
                if (rect) {
                  const clickX = e.nativeEvent.pageX - rect.left;
                  const pct = Math.max(0, Math.min(1, clickX / rect.width));
                  seekToSec(Math.round(pct * podcast.totalSeconds));
                }
              }}
              style={styles.scrubberHitbox}
            >
              <View style={styles.scrubberTrack}>
                <View
                  style={[
                    styles.scrubberProgress,
                    {
                      width: `${Math.min(100, (currentSec / podcast.totalSeconds) * 100)}%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.scrubberThumb,
                    {
                      left: `${Math.max(0, Math.min(97.5, (currentSec / podcast.totalSeconds) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </Pressable>

            {/* Time Indicators (Tabular Numbers) */}
            <View style={styles.scrubberTimeRow}>
              <Text style={styles.scrubberTimeText}>
                {formatTimer(currentSec)}
              </Text>
              <Text style={styles.scrubberTimeText}>
                -{formatTimer(Math.max(0, podcast.totalSeconds - currentSec))}
              </Text>
            </View>
          </View>

          {/* APPLE PODCASTS TRANSPORT CONTROLS */}
          <View style={styles.transportRow}>
            {/* Skip Back 15s */}
            <Pressable
              onPress={() => skipSeconds(-15)}
              accessibilityLabel="Skip backward 15 seconds"
              style={({ pressed }) => [
                styles.transportButtonSecondary,
                pressed && { opacity: 0.5 },
              ]}
            >
              <AppleSkip15Icon direction="back" size={32} color="#1C1C1E" />
            </Pressable>

            {/* Primary Center Play / Pause Button */}
            <Pressable
              onPress={togglePlay}
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              style={({ pressed }) => [
                styles.transportButtonPlay,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <ApplePlayPauseIcon isPlaying={isPlaying} size={30} color="#FFFFFF" />
            </Pressable>

            {/* Skip Forward 15s */}
            <Pressable
              onPress={() => skipSeconds(15)}
              accessibilityLabel="Skip forward 15 seconds"
              style={({ pressed }) => [
                styles.transportButtonSecondary,
                pressed && { opacity: 0.5 },
              ]}
            >
              <AppleSkip15Icon direction="forward" size={32} color="#1C1C1E" />
            </Pressable>
          </View>

          {/* AUXILIARY BAR (Speed Toggle, Sleep Timer, New Topic) */}
          <View style={styles.auxiliaryRow}>
            {/* Speed Toggle Pill */}
            <Pressable
              onPress={handleSpeedToggle}
              style={({ pressed }) => [
                styles.speedPill,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.speedPillText}>{playbackSpeed}×</Text>
            </Pressable>

            {/* Sleep Timer Indicator Pill */}
            <Pressable
              onPress={handleSleepTimerToggle}
              style={({ pressed }) => [
                styles.sleepPill,
                sleepTimer !== null && { backgroundColor: '#EDE9FE' },
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppleMoonIcon size={13} color={sleepTimer !== null ? '#6D28D9' : '#8E8E93'} />
              <Text
                style={[
                  styles.sleepPillText,
                  sleepTimer !== null && { color: '#6D28D9', fontWeight: '700' },
                ]}
              >
                {sleepTimer === null
                  ? 'Timer'
                  : sleepTimer === 'end'
                  ? 'End of Ep'
                  : `${Math.ceil(sleepTimer / 60)}m`}
              </Text>
            </Pressable>

            {/* Reset / New Topic */}
            <Pressable
              onPress={() => {
                stopAudio();
                setPodcast(null);
              }}
              style={({ pressed }) => [
                styles.newTopicPill,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon name="arrow.counterclockwise" size={12} color="#8E8E93" />
              <Text style={styles.newTopicText}>New</Text>
            </Pressable>
          </View>

          {/* NATIVE APPLE VOLUME SLIDER */}
          <View style={styles.volumeContainer}>
            <AppleSpeakerMinIcon size={14} color="#8E8E93" />
            <Pressable
              onPress={(e) => {
                const rect = (e.currentTarget as any)?.getBoundingClientRect?.();
                if (rect) {
                  const clickX = e.nativeEvent.pageX - rect.left;
                  const pct = Math.max(0, Math.min(1, clickX / rect.width));
                  setVolume(pct);
                }
              }}
              style={styles.volumeHitbox}
            >
              <View style={styles.volumeTrack}>
                <View style={[styles.volumeProgress, { width: `${volume * 100}%` }]} />
                <View
                  style={[
                    styles.volumeThumb,
                    { left: `${Math.max(0, Math.min(96, volume * 100))}%` },
                  ]}
                />
              </View>
            </Pressable>
            <AppleSpeakerMaxIcon size={15} color="#8E8E93" />
          </View>

          {/* AIRPLAY AUDIO ROUTE DOCK */}
          <View style={styles.bottomPillRow}>
            <Pressable
              onPress={() => setShowRouteModal(true)}
              style={({ pressed }) => [
                styles.airplayPillButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppleAirPlayIcon color="#1C1C1E" />
              <Text style={styles.airplayPillText}>{selectedRoute}</Text>
              <Icon name="chevron.down" size={11} color="#8E8E93" />
            </Pressable>
          </View>

          {/* APPLE MUSIC LIVE LYRICS PREVIEW DRAWER */}
          <Pressable
            onPress={() => setViewTab('lyrics')}
            style={({ pressed }) => [
              styles.lyricsPreviewCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppleLyricsIcon active={false} color="#007AFF" />
                <Text style={styles.lyricsPreviewLabel}>LIVE SCRIPT PREVIEW</Text>
              </View>
              <Text style={styles.lyricsTapHint}>Tap for Full Lyrics →</Text>
            </View>

            <Text style={styles.lyricsActiveLine} numberOfLines={2}>
              "{podcast.segments[activeSegIdx]?.text || podcast.tagline}"
            </Text>
            <Text style={styles.lyricsActiveSpeaker}>
              — {podcast.segments[activeSegIdx]?.speaker || 'Host'}
            </Text>
          </Pressable>

          {/* HIGH-YIELD TAKEAWAYS CARD */}
          <View style={styles.takeawaysCard}>
            <Text style={styles.takeawaysHeading}>EXAM TAKEAWAYS</Text>
            <View style={{ gap: 8 }}>
              {podcast.takeaways.map((point, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={styles.takeawayCheckBadge}>
                    <Icon name="checkmark" size={10} color="#16A34A" />
                  </View>
                  <Text style={styles.takeawayPointText}>{point}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            {onAskTutor && (
              <View style={{ marginTop: 14 }}>
                <Pressable
                  onPress={() => {
                    stopAudio();
                    onAskTutor(podcast.title);
                  }}
                  style={({ pressed }) => [
                    styles.tutorBridgeButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Icon name="sparkles" size={15} color="#007AFF" />
                  <Text style={styles.tutorBridgeButtonText}>
                    Discuss with Socratic AI Tutor
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* ==================== APPLE MUSIC LIVE LYRICS FULL SCREEN ==================== */
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={lyricsScrollRef}
            contentContainerStyle={styles.lyricsScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.lyricsScreenHeader}>LIVE TRANSCRIPT</Text>
            <Text style={styles.lyricsScreenSub}>Tap any line to jump audio immediately</Text>

            <View style={{ gap: 16, marginTop: 14 }}>
              {podcast.segments.map((seg, idx) => {
                const isActive = idx === activeSegIdx;
                const isAlex = seg.speaker === 'Alex';
                const isSam = seg.speaker === 'Sam';

                return (
                  <Pressable
                    key={seg.id || idx}
                    onPress={() => {
                      seekToSec(seg.timeOffsetSec);
                      if (!isPlaying) togglePlay();
                    }}
                    style={({ pressed }) => [
                      styles.lyricRow,
                      isActive && styles.lyricRowActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View
                        style={[
                          styles.speakerBadge,
                          {
                            backgroundColor: isAlex
                              ? '#DBEAFE'
                              : isSam
                              ? '#FEF3C7'
                              : '#DCFCE7',
                          },
                        ]}
                      >
                        <Icon
                          name={isAlex ? 'mic' : isSam ? 'sparkles' : 'graduationcap.fill'}
                          size={11}
                          color={isAlex ? '#2563EB' : isSam ? '#D97706' : '#16A34A'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.speakerName,
                          isActive && { color: '#007AFF', fontWeight: '700' },
                        ]}
                      >
                        {seg.speaker}
                      </Text>
                      <Text style={styles.speakerTime}>
                        {formatTimer(seg.timeOffsetSec)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.lyricText,
                        isActive && styles.lyricTextActive,
                      ]}
                    >
                      {seg.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* STICKY APPLE MINI NOW-PLAYING DOCK */}
          <View style={styles.miniDock}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniDockTitle} numberOfLines={1}>
                {podcast.title}
              </Text>
              <Text style={styles.miniDockTime}>
                {formatTimer(currentSec)} / {formatTimer(podcast.totalSeconds)}
              </Text>
            </View>

            {/* Play/Pause in Mini Dock */}
            <Pressable
              onPress={togglePlay}
              style={({ pressed }) => [
                styles.miniDockPlayBtn,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <ApplePlayPauseIcon isPlaying={isPlaying} size={18} color="#FFFFFF" />
            </Pressable>

            {/* Switch back to Artwork */}
            <Pressable
              onPress={() => setViewTab('player')}
              style={({ pressed }) => [
                styles.miniDockSwitchBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#007AFF' }}>
                Artwork
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ==================== iOS ACTION SHEET OVERLAY (••• MENU) ==================== */}
      {showActionSheet && (
        <View style={styles.actionSheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowActionSheet(false)}
          />
          <View style={styles.actionSheetCard}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>STUDY BITE OPTIONS</Text>

            <Pressable
              onPress={() => {
                setIsFavorite((prev) => !prev);
                setShowActionSheet(false);
              }}
              style={styles.actionSheetRow}
            >
              <AppleStarIcon filled={isFavorite} size={18} color={isFavorite ? '#D97706' : '#1C1C1E'} />
              <Text style={styles.actionSheetRowText}>
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handleCopyTranscript();
                setShowActionSheet(false);
              }}
              style={styles.actionSheetRow}
            >
              <Icon name="doc.on.doc" size={18} color="#1C1C1E" />
              <Text style={styles.actionSheetRowText}>Copy Full Transcript</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handleSleepTimerToggle();
                setShowActionSheet(false);
              }}
              style={styles.actionSheetRow}
            >
              <AppleMoonIcon size={18} color="#1C1C1E" />
              <Text style={styles.actionSheetRowText}>
                Sleep Timer: {sleepTimer === null ? 'Off' : sleepTimer === 'end' ? 'End of Episode' : `${Math.ceil(sleepTimer / 60)} min`}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                stopAudio();
                setPodcast(null);
                setShowActionSheet(false);
              }}
              style={styles.actionSheetRow}
            >
              <Icon name="arrow.counterclockwise" size={18} color="#EF4444" />
              <Text style={[styles.actionSheetRowText, { color: '#EF4444' }]}>
                Choose New Study Topic
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowActionSheet(false)}
              style={styles.actionSheetCancel}
            >
              <Text style={styles.actionSheetCancelText}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ==================== iOS AIRPLAY ROUTE MODAL ==================== */}
      {showRouteModal && (
        <View style={styles.actionSheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRouteModal(false)}
          />
          <View style={styles.actionSheetCard}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>AUDIO OUTPUT DESTINATION</Text>

            {(
              [
                { id: 'iPhone Speaker', desc: 'Built-in Speaker' },
                { id: 'AirPods Pro', desc: 'Noise Cancellation Ready' },
                { id: 'ClassAssist Hub', desc: 'Classroom Smart Desk' },
              ] as const
            ).map((item) => {
              const isSelected = selectedRoute === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedRoute(item.id);
                    setShowRouteModal(false);
                  }}
                  style={[
                    styles.actionSheetRow,
                    isSelected && { backgroundColor: '#F2F2F7' },
                  ]}
                >
                  <AppleAirPlayIcon color={isSelected ? '#007AFF' : '#1C1C1E'} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.actionSheetRowText,
                        isSelected && { color: '#007AFF', fontWeight: '700' },
                      ]}
                    >
                      {item.id}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#8E8E93' }}>{item.desc}</Text>
                  </View>
                  {isSelected && <Icon name="checkmark" size={16} color="#007AFF" />}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setShowRouteModal(false)}
              style={styles.actionSheetCancel}
            >
              <Text style={styles.actionSheetCancelText}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// Client-side Direct Gemini Fallback
async function callGeminiDirectPodcast(topic: string, format: PodcastFormat): Promise<PodcastResult | null> {
  const apiKey = GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an elite educational podcast producer for ClassAssist Audio Bites.
Create an engaging 2-minute audio study bite on: "${topic}".
Format: ${format === 'solo' ? 'Solo Mentor' : format === 'speed' ? 'Speed Blitz' : 'Duo conversation between Alex and Sam'}.

Return ONLY valid JSON matching:
{
  "title": "Episode title",
  "subject": "Subject name",
  "duration": "2:10",
  "totalSeconds": 130,
  "tagline": "One punchy sentence",
  "hosts": ["Alex", "Sam"],
  "segments": [
    { "id": "1", "speaker": "Alex", "text": "Conversational dialogue line", "timeOffsetSec": 0 },
    { "id": "2", "speaker": "Sam", "text": "Next response", "timeOffsetSec": 15 }
  ],
  "chapters": [
    { "title": "Intro", "timeOffsetSec": 0 }
  ],
  "takeaways": [
    "Exam takeaway 1",
    "Exam takeaway 2",
    "Exam takeaway 3"
  ]
}
NEVER use markdown asterisks (**) anywhere. Raw JSON only.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.6,
          },
        }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) {
        const parsed = JSON.parse(txt.replace(/\*\*/g, ''));
        return { ...parsed, live: true };
      }
    }
  } catch {}
  return null;
}

function getCuratedOfflinePodcast(topic: string, format: PodcastFormat): PodcastResult {
  const clean = topic.slice(0, 45);
  return {
    title: `${clean}: Audio Masterclass`,
    subject: 'Active Study',
    duration: '1:45',
    totalSeconds: 105,
    tagline: 'A quick breakdown of core principles to reinforce memory on the go.',
    hosts: format === 'solo' ? ['Mentor'] : ['Alex', 'Sam'],
    segments: [
      {
        id: 'seg-1',
        speaker: format === 'solo' ? 'Mentor' : 'Alex',
        text: `Welcome to ClassAssist Audio Bites! Today, we are breaking down ${clean}. Let us get right to the core mechanism.`,
        timeOffsetSec: 0,
      },
      {
        id: 'seg-2',
        speaker: format === 'solo' ? 'Mentor' : 'Sam',
        text: 'The most common trap students face on exams is memorizing formulas blindly without picturing the cause and effect.',
        timeOffsetSec: 15,
      },
      {
        id: 'seg-3',
        speaker: format === 'solo' ? 'Mentor' : 'Alex',
        text: 'Exactly! Once you map the concept to a real-world analogy, the math and definitions fall into place effortlessly.',
        timeOffsetSec: 35,
      },
      {
        id: 'seg-4',
        speaker: format === 'solo' ? 'Mentor' : 'Sam',
        text: 'Active recall beats passive slide-skimming every single time. Quiz yourself before checking the notes!',
        timeOffsetSec: 55,
      },
      {
        id: 'seg-5',
        speaker: format === 'solo' ? 'Mentor' : 'Alex',
        text: 'And that wraps up our 2-minute Audio Bite! Tap the Discuss with Tutor button below to test your understanding with guided questions.',
        timeOffsetSec: 75,
      },
    ],
    chapters: [
      { title: 'Intro & Framework', timeOffsetSec: 0 },
      { title: 'Core Mechanism', timeOffsetSec: 35 },
      { title: 'Exam Strategy & Wrap-up', timeOffsetSec: 55 },
    ],
    takeaways: [
      'Understand the foundational mechanism before memorizing formulas.',
      'Active recall practice solidifies memory retention 3x faster than re-reading.',
      'Use the Socratic AI Tutor to test yourself on edge cases and diagnostic problems.',
    ],
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

  /* Creation Screen */
  creationScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginBottom: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  insetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topicTextInput: {
    height: 75,
    fontSize: 15,
    lineHeight: 21,
    color: '#1C1C1E',
    fontFamily: fontStack,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
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
  primaryAppleButton: {
    backgroundColor: '#007AFF', // Apple System Blue
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  insetGroupedTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
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
  tableRowIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  tableRowSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },

  /* Player Screen */
  playerScroll: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 60,
  },
  albumArtContainer: {
    width: '84%',
    maxWidth: 290,
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#1E2025',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    elevation: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  albumAuroraTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
  },
  albumAuroraBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(6, 182, 212, 0.35)',
  },
  artworkInnerStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  artworkIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  artworkTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  artworkSubjectPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  artworkSubjectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  artworkRibbon: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  artworkRibbonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },

  /* Titles */
  titleStack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  episodeTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#000000',
    fontFamily: fontStack,
  },
  episodeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
    fontFamily: fontStack,
  },
  iconCircleAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Apple Scrubber */
  scrubberContainer: {
    marginBottom: 24,
  },
  scrubberHitbox: {
    height: 22,
    justifyContent: 'center',
  },
  scrubberTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    width: '100%',
    position: 'relative',
  },
  scrubberProgress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1C1C1E',
  },
  scrubberThumb: {
    position: 'absolute',
    top: -3.5,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  scrubberTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  scrubberTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },

  /* Native Apple Transport Controls */
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  transportButtonSecondary: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportButtonPlay: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },

  /* Auxiliary Row */
  auxiliaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  speedPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  speedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sleepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  sleepPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  newTopicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  newTopicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },

  /* Volume Slider */
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  volumeHitbox: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    width: '100%',
    position: 'relative',
  },
  volumeProgress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
  },
  volumeThumb: {
    position: 'absolute',
    top: -3.5,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  /* Bottom AirPlay Pill Row */
  bottomPillRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  airplayPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  airplayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  /* Live Lyrics Preview Drawer */
  lyricsPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  lyricsPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#007AFF',
  },
  lyricsTapHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  lyricsActiveLine: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 21,
    fontFamily: fontStack,
  },
  lyricsActiveSpeaker: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },

  /* Takeaways Card */
  takeawaysCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  takeawaysHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    marginBottom: 12,
  },
  takeawayCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  takeawayPointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontFamily: fontStack,
  },
  tutorBridgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tutorBridgeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },

  /* Live Lyrics Screen */
  lyricsScroll: {
    padding: 24,
    paddingBottom: 90,
  },
  lyricsScreenHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8E8E93',
  },
  lyricsScreenSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  lyricRow: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  lyricRowActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  speakerBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  speakerTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C7C7CC',
    marginLeft: 'auto',
  },
  lyricText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: fontStack,
    opacity: 0.45,
  },
  lyricTextActive: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: '#000000',
    opacity: 1,
  },

  /* Mini Dock (Bottom Sticky) */
  miniDock: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  miniDockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  miniDockTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  miniDockPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDockSwitchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },

  /* Action Sheets & Modals */
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  actionSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  actionSheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(60, 60, 67, 0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  actionSheetRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: fontStack,
  },
  actionSheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
});
