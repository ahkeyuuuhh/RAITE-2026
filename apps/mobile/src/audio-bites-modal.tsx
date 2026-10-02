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
  duration: string;
  hosts: string;
}

const INSPIRATION_TAGS = [
  "Newton's 3 Laws",
  'Photosynthesis & Light',
  'Big-O Complexity',
  'Derivatives & Limits',
  'Philippine Constitution',
  'Cellular Respiration',
  'Quantum Superposition',
  'Keynesian Multiplier',
];

const CATEGORIES = [
  'All',
  'Physics',
  'Biology',
  'Calculus',
  'Computer Science',
  'Social Science',
  'Biochemistry',
];

const PRESET_TOPICS: PresetTopicItem[] = [
  {
    icon: 'flame.fill',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    title: "Newton's 3 Laws & Momentum",
    subject: 'Physics',
    desc: 'Why inertia rules the universe, action equals reaction, and how momentum conserves kinetic motion.',
    duration: '2:15',
    hosts: 'Alex & Sam',
  },
  {
    icon: 'drop.fill',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    title: 'Photosynthesis & Solar Sugar',
    subject: 'Biology',
    desc: 'How thylakoid membranes and the Calvin cycle trap sunlight to synthesize glucose fuel.',
    duration: '1:55',
    hosts: 'Alex & Sam',
  },
  {
    icon: 'arrow.up',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'Derivatives & Tangent Lines',
    subject: 'Calculus',
    desc: 'Instantaneous rates of change, slopes, and limits made visual, intuitive, and exam-ready.',
    duration: '2:30',
    hosts: 'Solo Mentor',
  },
  {
    icon: 'gearshape',
    iconBg: '#EDE9FE',
    iconColor: '#7C3AED',
    title: 'Big-O Complexity Demystified',
    subject: 'Computer Science',
    desc: 'From O(1) instant hash lookups to O(n!) catastrophic explosions in algorithmic runtime.',
    duration: '2:05',
    hosts: 'Alex & Sam',
  },
  {
    icon: 'building.columns.fill',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    title: 'Philippine Bill of Rights',
    subject: 'Social Science',
    desc: 'Article III constitutional essentials: due process of law, free expression, and search warrants.',
    duration: '2:40',
    hosts: 'Prof. Rivera',
  },
  {
    icon: 'sparkles',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    title: 'Cellular Respiration in 2 Mins',
    subject: 'Biochemistry',
    desc: 'Glycolysis, Krebs citric acid cycle, and the mitochondrial ATP synthase turbine.',
    duration: '2:10',
    hosts: 'Alex & Sam',
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

function AppleMiniPlayIcon({
  size = 12,
  color = '#1C1C1E',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path
        d="M7 4.24 C7 2.65 8.76 1.69 10.1 2.54 L20.26 8.98 C21.5 9.77 21.5 11.57 20.26 12.36 L10.1 18.8 C8.76 19.65 7 18.69 7 17.1 V4.24 Z"
        fill={color}
      />
    </Svg>
  );
}

function VerifiedBadge({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="11" fill="#F97316" />
      <Path
        d="M7.5 12.2 L10.5 15.2 L16.8 8.8"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AppleShuffleIcon({
  size = 22,
  color = '#1C1C1E',
  active = false,
}: {
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const c = active ? '#5E5CE6' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 4h4v4M16 20h4v-4M4 20h4c3.5 0 5-12 12-12M4 4h4c3.5 0 5 12 12 12"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AppleRepeatIcon({
  size = 22,
  color = '#1C1C1E',
  active = false,
}: {
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const c = active ? '#5E5CE6' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 2l4 4-4 4"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 11V9a4 4 0 014-4h14"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M7 22l-4-4 4-4"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 13v2a4 4 0 01-4 4H3"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const WAVEFORM_HEIGHTS = [
  16, 26, 38, 22, 14, 30, 42, 28, 20, 36,
  24, 18, 32, 40, 26, 16, 28, 38, 22, 14,
  34, 42, 28, 18, 30, 24, 38, 20, 14, 26,
  36, 22, 16, 30, 24, 34, 20, 16, 26, 18,
];

function AppleShareIcon({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M12 3v13m0-13l-4 4m4-4l4 4"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SpotifyFlagIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AppleFullScreenIcon({ size = 12, color = '#007AFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [sleepTimer, setSleepTimer] = useState<number | 'end' | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'iPhone Speaker' | 'AirPods Pro' | 'ClassAssist Hub'>('iPhone Speaker');
  const [showActionSheet, setShowActionSheet] = useState(false);

  const filteredTopics = PRESET_TOPICS.filter(
    (item) => selectedCategory === 'All' || item.subject === selectedCategory,
  );

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const timerRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lyricsScrollRef = useRef<ScrollView>(null);
  const inlineLyricsScrollRef = useRef<ScrollView>(null);

  // Apple Music artwork spring animation: 1.0 when playing, 0.96 when paused
  const artworkScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.spring(artworkScale, {
      toValue: isPlaying ? 1.0 : 0.96,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, artworkScale]);

  // Auto-scroll Live Lyrics when segment advances (Full Screen View)
  useEffect(() => {
    if (viewTab === 'lyrics' && lyricsScrollRef.current) {
      lyricsScrollRef.current.scrollTo({
        y: Math.max(0, activeSegIdx * 68 - 100),
        animated: true,
      });
    }
  }, [activeSegIdx, viewTab]);

  // Auto-scroll Live Lyrics when segment advances (Inline Player View)
  useEffect(() => {
    if (viewTab === 'player' && inlineLyricsScrollRef.current) {
      inlineLyricsScrollRef.current.scrollTo({
        y: Math.max(0, activeSegIdx * 62 - 40),
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
          } else if (isRepeat) {
            playSegmentTTS(0);
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
            if (isRepeat) {
              return 0;
            }
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
  }, [isPlaying, podcast, playbackSpeed, activeSegIdx, isRepeat]);

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

  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next && podcast && podcast.segments.length > 1) {
        const randIdx = Math.floor(Math.random() * podcast.segments.length);
        seekToSec(podcast.segments[randIdx].timeOffsetSec);
      }
      return next;
    });
  };

  const handleWaveformSeek = (e: any) => {
    if (!podcast) return;
    const rect = (e.currentTarget as any)?.getBoundingClientRect?.();
    if (rect && rect.width > 0) {
      const clickX = e.nativeEvent.pageX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      seekToSec(Math.round(pct * podcast.totalSeconds));
    }
  };

  const handleSpotifySeek = (e: any) => {
    if (!podcast) return;
    const rect = (e.currentTarget as any)?.getBoundingClientRect?.();
    if (rect && rect.width > 0) {
      const clickX = e.nativeEvent.pageX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      seekToSec(Math.round(pct * podcast.totalSeconds));
    }
  };

  const progressPct = podcast && podcast.totalSeconds > 0 ? currentSec / podcast.totalSeconds : 0;
  const activeBarsCount = Math.round(progressPct * WAVEFORM_HEIGHTS.length);

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

    if (selectedTopic) {
      setTopic(selectedTopic);
    }

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
    <SafeAreaView
      style={[styles.canvas, viewTab === 'lyrics' && styles.canvasSpotify]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* 1. iOS SHEET PULL-DOWN HANDLE */}
      {viewTab !== 'lyrics' && <View style={styles.sheetHandle} />}

      {/* 2. NAVIGATION BAR */}
      {viewTab === 'lyrics' && podcast ? (
        /* Spotify Live Lyrics Header */
        <View style={styles.spotifyNavBar}>
          {/* Left: Down Chevron (Collapse back to player) */}
          <Pressable
            onPress={() => setViewTab('player')}
            accessibilityLabel="Collapse lyrics"
            style={({ pressed }) => [
              styles.spotifyNavBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icon name="chevron.down" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Center: Track & Artist Header */}
          <View style={styles.spotifyNavCenter}>
            <Text style={styles.spotifyNavTitle} numberOfLines={1}>
              {podcast.title}
            </Text>
            <Text style={styles.spotifyNavArtist} numberOfLines={1}>
              {podcast.hosts.join(' & ')} · {podcast.subject}
            </Text>
          </View>

          {/* Right: Spotify Flag Icon */}
          <Pressable
            onPress={() => setShowActionSheet(true)}
            accessibilityLabel="Lyrics options"
            style={({ pressed }) => [
              styles.spotifyNavBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <SpotifyFlagIcon size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        /* iOS Clean Navigation Bar */
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

          {/* Center: Apple Podcasts Header / Studio Pill */}
          <View style={styles.navHeaderCenter}>
            {podcast ? (
              <>
                <Text style={styles.navEyebrow}>NOW PLAYING</Text>
                <Text style={styles.navSubject} numberOfLines={1}>
                  {podcast.subject}
                </Text>
              </>
            ) : (
              <View style={styles.studioNavPill}>
                <View style={styles.studioNavDot} />
                <Text style={styles.studioNavPillText}>AUDIO BITES STUDIO</Text>
              </View>
            )}
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
      )}

      {/* 3. CONTENT AREA */}
      {!podcast ? (
        /* ==================== iOS CREATION SCREEN (STUDIO & DISCOVERY) ==================== */
        <ScrollView
          contentContainerStyle={styles.creationScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* iOS Large Title & Subtitle */}
          <View style={styles.heroHeader}>
            <View style={styles.heroEyebrowRow}>
              <Icon name="sparkles" size={13} color="#007AFF" />
              <Text style={styles.heroEyebrow}>AI STUDY CAST</Text>
            </View>
            <Text style={styles.heroTitle}>Audio Bites</Text>
            <Text style={styles.heroSubtitle}>
              Turn any topic, chapter, or lecture into a crisp 2-minute masterclass.
            </Text>
          </View>

          {/* 1. ELEVATED STUDIO COMPOSER CARD */}
          <View style={styles.studioComposerCard}>
            <View style={styles.composerCardHeader}>
              <View style={styles.composerHeaderLeft}>
                <View style={styles.composerMicBadge}>
                  <Icon name="mic" size={16} color="#007AFF" />
                </View>
                <Text style={styles.composerTitle}>Produce New Masterclass</Text>
              </View>
              <View style={styles.composerDurationBadge}>
                <Text style={styles.composerDurationText}>⏱ ~2 MINS</Text>
              </View>
            </View>

            {/* Inset Text Input with Clear Button */}
            <View style={styles.composerInputContainer}>
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="What do you want to learn? (e.g., Photosynthesis, Newton's Laws, Big-O...)"
                placeholderTextColor="#8E8E93"
                multiline
                style={styles.topicTextInput}
              />
              {topic.length > 0 && (
                <Pressable
                  onPress={() => setTopic('')}
                  style={styles.clearInputBtn}
                  hitSlop={8}
                >
                  <Icon name="xmark" size={10} color="#64748B" />
                </Pressable>
              )}
            </View>

            {/* Quick Inspiration Chips */}
            <View style={styles.quickTagsContainer}>
              <View style={styles.quickTagsHeader}>
                <Icon name="sparkles" size={11} color="#8E8E93" />
                <Text style={styles.quickTagsLabel}>Quick Inspiration</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 2, paddingRight: 8 }}
              >
                {INSPIRATION_TAGS.map((tag, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setTopic(tag)}
                    style={({ pressed }) => [
                      styles.quickTagPill,
                      topic === tag && styles.quickTagPillActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickTagPillText,
                        topic === tag && styles.quickTagPillTextActive,
                      ]}
                    >
                      + {tag}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Native iOS Segmented Format Selector */}
            <View style={styles.formatSection}>
              <Text style={styles.formatLabel}>PODCAST FORMAT</Text>
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
            </View>

            {/* Apple High-Contrast Action Button */}
            <Pressable
              onPress={() => generatePodcast()}
              disabled={isGenerating || !topic.trim()}
              style={({ pressed }) => [
                styles.primaryAppleButton,
                (!topic.trim() || isGenerating) && styles.primaryAppleButtonDisabled,
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="waveform" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryAppleButtonText}>Synthesizing 2-Min Masterclass…</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="sparkles" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryAppleButtonText}>Produce 2-Min Masterclass</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* 2. CURATED DISCOVERY & PLAYLISTS */}
          <View style={styles.discoveryHeaderRow}>
            <Text style={styles.discoveryTitle}>CURATED STUDY BITES</Text>
            <View style={styles.discoveryBadge}>
              <Text style={styles.discoveryBadgeText}>1-TAP LISTEN</Text>
            </View>
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Featured Spotlight Card (Only in 'All' Tab) */}
          {selectedCategory === 'All' && PRESET_TOPICS.length > 0 && (
            <Pressable
              onPress={() => {
                setTopic(PRESET_TOPICS[0].title);
                generatePodcast(PRESET_TOPICS[0].title);
              }}
              style={({ pressed }) => [
                styles.spotlightHeroCard,
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              <View style={styles.spotlightBadgeRow}>
                <View style={styles.spotlightStarPill}>
                  <AppleStarIcon filled size={11} color="#D97706" />
                  <Text style={styles.spotlightStarText}>FEATURED MASTERCLASS</Text>
                </View>
                <View style={styles.spotlightDurationPill}>
                  <Icon name="clock" size={11} color="#8E8E93" />
                  <Text style={styles.spotlightDurationText}>{PRESET_TOPICS[0].duration} MIN</Text>
                </View>
              </View>

              <Text style={styles.spotlightTitle}>{PRESET_TOPICS[0].title}</Text>
              <Text style={styles.spotlightDesc} numberOfLines={2}>
                {PRESET_TOPICS[0].desc}
              </Text>

              <View style={styles.spotlightFooter}>
                <View style={styles.spotlightHostRow}>
                  <View style={styles.hostAvatar}>
                    <Icon name="person.2.fill" size={12} color="#4F46E5" />
                  </View>
                  <Text style={styles.spotlightHostText}>
                    {PRESET_TOPICS[0].hosts} • {PRESET_TOPICS[0].subject}
                  </Text>
                </View>

                <View style={styles.spotlightPlayBtn}>
                  <AppleMiniPlayIcon size={11} color="#FFFFFF" />
                  <Text style={styles.spotlightPlayBtnText}>Listen Now</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* iOS Inset Grouped Table View */}
          <View style={styles.insetGroupedTable}>
            {filteredTopics.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  setTopic(item.title);
                  generatePodcast(item.title);
                }}
                style={({ pressed }) => [
                  styles.tableRow,
                  idx < filteredTopics.length - 1 && styles.tableRowBorder,
                  pressed && { backgroundColor: '#F9F9FB' },
                ]}
              >
                {/* Squircle Pastel Icon */}
                <View style={[styles.tableRowIconSquare, { backgroundColor: item.iconBg }]}>
                  <Icon name={item.icon} size={20} color={item.iconColor} />
                </View>

                {/* Details Column */}
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <View style={styles.tableRowMetaRow}>
                    <View style={styles.metaSubjectPill}>
                      <Text style={styles.metaSubjectText}>{item.subject}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaDuration}>{item.duration}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaHost}>{item.hosts}</Text>
                  </View>

                  <Text style={styles.tableRowTitle}>{item.title}</Text>
                  <Text style={styles.tableRowSubtitle} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>

                {/* Circular Quick Play Button */}
                <View style={styles.tableRowPlayCircle}>
                  <AppleMiniPlayIcon size={12} color="#1C1C1E" />
                </View>
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
          {/* CONTAINER-LESS LIVE SCRIPT / LYRICS DISPLAY (Replaces Album Art) */}
          <View style={styles.inlineLyricsContainer}>
            {/* Header row with LIVE SCRIPT indicator & Full Screen button */}
            <View style={styles.inlineLyricsHeaderRow}>
              <View style={styles.inlineLyricsBadgeRow}>
                <View style={[styles.liveIndicatorDot, { backgroundColor: isPlaying ? '#10B981' : '#8E8E93' }]} />
                <Text style={styles.inlineLyricsBadge}>LIVE SCRIPT</Text>
              </View>

              <Pressable
                onPress={() => setViewTab('lyrics')}
                accessibilityLabel="Open full screen lyrics"
                style={({ pressed }) => [
                  styles.fullScreenButton,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
              >
                <AppleFullScreenIcon size={12} color="#007AFF" />
                <Text style={styles.fullScreenButtonText}>Full Screen</Text>
              </Pressable>
            </View>

            {/* Seamless Lyrics Text Flow (Strictly NO Background) */}
            <ScrollView
              ref={inlineLyricsScrollRef}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              style={styles.inlineLyricsScrollView}
              contentContainerStyle={styles.inlineLyricsScrollContent}
            >
              {podcast.segments.map((seg, idx) => {
                const isActive = idx === activeSegIdx;
                const isPast = idx < activeSegIdx;
                const isUpcoming = idx > activeSegIdx;

                return (
                  <Pressable
                    key={seg.id || idx}
                    onPress={() => {
                      seekToSec(seg.timeOffsetSec);
                      if (!isPlaying) togglePlay();
                    }}
                    style={({ pressed }) => [
                      styles.inlineLyricLine,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineLyricText,
                        isActive && styles.inlineLyricTextActive,
                        isPast && styles.inlineLyricTextPast,
                        isUpcoming && styles.inlineLyricTextUpcoming,
                      ]}
                    >
                      {seg.text}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* TITLE & CHANNEL HEADER (Centered with Verified Badge) */}
          <View style={styles.titleStackCentered}>
            <Text style={styles.episodeTitleCentered} numberOfLines={2}>
              {podcast.title}
            </Text>
            <View style={styles.channelRow}>
              <Text style={styles.channelText} numberOfLines={1}>
                {podcast.hosts.join(' & ')} · {podcast.subject} Cast
              </Text>
              <VerifiedBadge size={15} />
            </View>
          </View>

          {/* INTERACTIVE WAVEFORM AUDIO SCRUBBER */}
          <View style={styles.waveformContainer}>
            <Pressable
              onPress={handleWaveformSeek}
              style={styles.waveformHitbox}
            >
              <View style={styles.waveformBarsRow}>
                {WAVEFORM_HEIGHTS.map((h, idx) => {
                  const isActive = idx < activeBarsCount;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.waveformBar,
                        {
                          height: h,
                          backgroundColor: isActive ? '#5E5CE6' : '#E2E8F0',
                        },
                        isActive && idx === activeBarsCount - 1 && isPlaying && styles.waveformBarPlayingHead,
                      ]}
                    />
                  );
                })}
              </View>
            </Pressable>

            {/* Time Indicators (Current Time & Total Duration) */}
            <View style={styles.waveformTimeRow}>
              <Text style={styles.waveformTimeCurrent}>
                {formatTimer(currentSec)}
              </Text>
              <Text style={styles.waveformTimeTotal}>
                {formatTimer(podcast.totalSeconds)}
              </Text>
            </View>
          </View>

          {/* 5-BUTTON TRANSPORT CONTROLS ROW */}
          <View style={styles.transportRowFive}>
            {/* 1. Shuffle Button */}
            <Pressable
              onPress={toggleShuffle}
              accessibilityLabel="Shuffle segments"
              style={({ pressed }) => [
                styles.transportSideButton,
                isShuffle && styles.transportSideButtonActive,
                pressed && { opacity: 0.5 },
              ]}
            >
              <AppleShuffleIcon size={22} active={isShuffle} color={isShuffle ? '#5E5CE6' : '#1C1C1E'} />
            </Pressable>

            {/* 2. Skip Back 15s */}
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

            {/* 3. Primary Purple Center Play / Pause Button */}
            <Pressable
              onPress={togglePlay}
              accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
              style={({ pressed }) => [
                styles.transportButtonPlayPurple,
                pressed && { transform: [{ scale: 0.93 }] },
              ]}
            >
              <ApplePlayPauseIcon isPlaying={isPlaying} size={28} color="#FFFFFF" />
            </Pressable>

            {/* 4. Skip Forward 15s */}
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

            {/* 5. Repeat Button */}
            <Pressable
              onPress={() => setIsRepeat((prev) => !prev)}
              accessibilityLabel="Repeat audio"
              style={({ pressed }) => [
                styles.transportSideButton,
                isRepeat && styles.transportSideButtonActive,
                pressed && { opacity: 0.5 },
              ]}
            >
              <AppleRepeatIcon size={22} active={isRepeat} color={isRepeat ? '#5E5CE6' : '#1C1C1E'} />
            </Pressable>
          </View>

          {/* AUXILIARY BAR (Speed Toggle, Sleep Timer, Save, Notes, New Topic) */}
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

            {/* Favorite Pill */}
            <Pressable
              onPress={() => setIsFavorite((prev) => !prev)}
              style={({ pressed }) => [
                styles.actionPillSmall,
                isFavorite && { backgroundColor: '#FEF3C7' },
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppleStarIcon filled={isFavorite} size={13} color={isFavorite ? '#D97706' : '#8E8E93'} />
              <Text style={[styles.actionPillSmallText, isFavorite && { color: '#D97706', fontWeight: '700' }]}>
                {isFavorite ? 'Saved' : 'Save'}
              </Text>
            </Pressable>

            {/* Copy Transcript Pill */}
            <Pressable
              onPress={handleCopyTranscript}
              style={({ pressed }) => [
                styles.actionPillSmall,
                copied && { backgroundColor: '#DCFCE7' },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Icon
                name={copied ? 'checkmark' : 'doc.on.doc'}
                size={12}
                color={copied ? '#16A34A' : '#8E8E93'}
              />
              <Text style={[styles.actionPillSmallText, copied && { color: '#16A34A', fontWeight: '700' }]}>
                {copied ? 'Copied' : 'Notes'}
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
        /* ==================== SPOTIFY FULL-SCREEN LIVE SCRIPT / LYRICS ==================== */
        <View style={styles.spotifyLyricsContainer}>
          <ScrollView
            ref={lyricsScrollRef}
            contentContainerStyle={styles.spotifyLyricsScroll}
            showsVerticalScrollIndicator={false}
          >
            {podcast.segments.map((seg, idx) => {
              const isPastOrActive = idx <= activeSegIdx;
              return (
                <Pressable
                  key={seg.id || idx}
                  onPress={() => {
                    seekToSec(seg.timeOffsetSec);
                    if (!isPlaying) togglePlay();
                  }}
                  style={({ pressed }) => [
                    styles.spotifyLyricLine,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.spotifyLyricText,
                      isPastOrActive
                        ? styles.spotifyLyricTextActive
                        : styles.spotifyLyricTextUpcoming,
                    ]}
                  >
                    {seg.text}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SPOTIFY ANCHORED BOTTOM SCRUBBER & CONTROLS */}
          <View style={styles.spotifyBottomBar}>
            {/* Interactive Progress Scrubber */}
            <Pressable
              onPress={handleSpotifySeek}
              style={styles.spotifyScrubberHitbox}
            >
              <View style={styles.spotifyScrubberTrack}>
                <View
                  style={[
                    styles.spotifyScrubberProgress,
                    { width: `${Math.max(0, Math.min(100, progressPct * 100))}%` },
                  ]}
                />
                <View
                  style={[
                    styles.spotifyScrubberThumb,
                    { left: `${Math.max(0, Math.min(97, progressPct * 100))}%` },
                  ]}
                />
              </View>
            </Pressable>

            {/* Scrubber Timestamps */}
            <View style={styles.spotifyTimeRow}>
              <Text style={styles.spotifyTimeText}>{formatTimer(currentSec)}</Text>
              <Text style={styles.spotifyTimeText}>
                -{formatTimer(Math.max(0, podcast.totalSeconds - currentSec))}
              </Text>
            </View>

            {/* Controls: Artwork Switcher, Big White Play/Pause Circle, Share */}
            <View style={styles.spotifyControlsRow}>
              {/* Left: Switch back to Artwork/Player */}
              <Pressable
                onPress={() => setViewTab('player')}
                accessibilityLabel="Return to artwork"
                style={({ pressed }) => [
                  styles.spotifySideControlBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Icon name="waveform" size={20} color="#FFFFFF" />
              </Pressable>

              {/* Center: Large White Play/Pause Button with Purple Icon */}
              <Pressable
                onPress={togglePlay}
                accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
                style={({ pressed }) => [
                  styles.spotifyPlayBtnWhite,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <ApplePlayPauseIcon isPlaying={isPlaying} size={26} color="#7856E3" />
              </Pressable>

              {/* Right: Share Button */}
              <Pressable
                onPress={handleCopyTranscript}
                accessibilityLabel="Share transcript"
                style={({ pressed }) => [
                  styles.spotifySideControlBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <AppleShareIcon size={20} color="#FFFFFF" />
              </Pressable>
            </View>
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
  canvasSpotify: {
    backgroundColor: '#7856E3',
  },
  spotifyNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#7856E3',
  },
  spotifyNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyNavCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  spotifyNavTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: fontStack,
    textAlign: 'center',
  },
  spotifyNavArtist: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: fontStack,
    textAlign: 'center',
    marginTop: 2,
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
  studioNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  studioNavDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  studioNavPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#1C1C1E',
  },

  /* Creation Screen */
  creationScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 60,
  },
  heroHeader: {
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#000000',
    fontFamily: fontStack,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: fontStack,
  },

  /* 1. Elevated Studio Composer Card */
  studioComposerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 26,
  },
  composerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  composerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerMicBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  composerDurationBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F2F2F7',
  },
  composerDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  composerInputContainer: {
    backgroundColor: '#F6F6F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 12,
    marginBottom: 12,
    position: 'relative',
  },
  topicTextInput: {
    minHeight: 68,
    fontSize: 14,
    lineHeight: 20,
    color: '#1C1C1E',
    fontFamily: fontStack,
    textAlignVertical: 'top',
    padding: 0,
    paddingRight: 24,
    margin: 0,
  },
  clearInputBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Quick Inspiration Chips */
  quickTagsContainer: {
    marginBottom: 14,
  },
  quickTagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  quickTagsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  quickTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  quickTagPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickTagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  quickTagPillTextActive: {
    color: '#FFFFFF',
  },

  /* Format Selector */
  formatSection: {
    marginBottom: 14,
  },
  formatLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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

  /* Primary Button */
  primaryAppleButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryAppleButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  primaryAppleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  /* 2. Curated Discovery Section */
  discoveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  discoveryTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  discoveryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  discoveryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryScroll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Spotlight Hero Card */
  spotlightHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  spotlightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  spotlightStarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 9999,
    backgroundColor: '#FEF3C7',
  },
  spotlightStarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  spotlightDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  spotlightTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  spotlightDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 14,
  },
  spotlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightHostText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  spotlightPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  spotlightPlayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Inset Grouped Table */
  insetGroupedTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  tableRowIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaSubjectPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  metaSubjectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  metaDot: {
    fontSize: 10,
    color: '#C7C7CC',
  },
  metaDuration: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  metaHost: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tableRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  tableRowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  tableRowPlayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Player Screen */
  playerScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  albumArtContainer: {
    width: '100%',
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
    top: -50,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
  },
  albumAuroraBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.35)',
  },
  artworkInnerStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  artworkIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  artworkTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 25,
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

  /* Titles (Centered Style with Verified Badge) */
  titleStackCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  episodeTitleCentered: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#1C1C1E',
    fontFamily: fontStack,
    textAlign: 'center',
    lineHeight: 28,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  channelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: fontStack,
  },

  /* Waveform Scrubber */
  waveformContainer: {
    marginVertical: 18,
    paddingHorizontal: 4,
  },
  waveformHitbox: {
    paddingVertical: 10,
    justifyContent: 'center',
  },
  waveformBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 9999,
    minHeight: 8,
  },
  waveformBarPlayingHead: {
    backgroundColor: '#7C3AED',
    transform: [{ scaleY: 1.15 }],
  },
  waveformTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  waveformTimeCurrent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  waveformTimeTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },

  /* 5-Button Transport Controls */
  transportRowFive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 14,
  },
  transportSideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportSideButtonActive: {
    backgroundColor: 'rgba(94, 92, 230, 0.12)',
  },
  transportButtonSecondary: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportButtonPlayPurple: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#5E5CE6', // Vibrant Apple Purple
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 6,
  },

  /* Auxiliary Row */
  auxiliaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  actionPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 9999,
    backgroundColor: '#E5E5EA',
  },
  actionPillSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
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

  /* Container-less Inline Live Lyrics Section (Strictly NO Background) */
  inlineLyricsContainer: {
    width: '100%',
    minHeight: 220,
    maxHeight: 280,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inlineLyricsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  inlineLyricsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  inlineLyricsBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  fullScreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  fullScreenButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  inlineLyricsScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inlineLyricsScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  inlineLyricLine: {
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  inlineLyricText: {
    fontFamily: fontStack,
    fontSize: 18,
    lineHeight: 26,
    color: '#8E8E93',
  },
  inlineLyricTextActive: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.3,
  },
  inlineLyricTextPast: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#8E8E93',
    opacity: 0.65,
  },
  inlineLyricTextUpcoming: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: '#8E8E93',
    opacity: 0.45,
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

  /* Spotify Full-Screen Live Lyrics Screen */
  spotifyLyricsContainer: {
    flex: 1,
    backgroundColor: '#7856E3',
  },
  spotifyLyricsScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 170,
  },
  spotifyLyricLine: {
    paddingVertical: 10,
    marginVertical: 2,
    borderRadius: 8,
  },
  spotifyLyricText: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '800',
    fontFamily: fontStack,
    letterSpacing: -0.3,
  },
  spotifyLyricTextActive: {
    color: '#FFFFFF',
  },
  spotifyLyricTextUpcoming: {
    color: '#22123D',
  },

  /* Spotify Anchored Bottom Bar */
  spotifyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#7856E3',
  },
  spotifyScrubberHitbox: {
    paddingVertical: 8,
  },
  spotifyScrubberTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    justifyContent: 'center',
  },
  spotifyScrubberProgress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  spotifyScrubberThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  spotifyTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  spotifyTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: fontStack,
  },
  spotifyControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  spotifySideControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyPlayBtnWhite: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
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
