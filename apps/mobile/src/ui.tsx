import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
export const colors = {
  bg: '#F2F2F7',
  ink: '#1C1C1E',
  muted: '#68686F',
  soft: '#F6F6F9',
  blue: '#0064D9',
  green: '#24754B',
  line: '#E7E7ED',
};
export type IconName =
  | 'house.fill'
  | 'calendar'
  | 'person.2.fill'
  | 'sparkles'
  | 'bell'
  | 'chevron.right'
  | 'checkmark.circle.fill'
  | 'plus'
  | 'arrow.up'
  | 'clock'
  | 'doc.text'
  | 'gearshape'
  | 'arrow.left'
  | 'xmark'
  | 'graduationcap.fill'
  | 'person.fill'
  | 'envelope.fill'
  | 'lock.fill'
  | 'shield.fill'
  | 'arrow.right'
  | 'building.columns.fill'
  | 'checkmark'
  | 'doc.on.doc'
  | 'arrow.counterclockwise'
  | 'questionmark.circle'
  | 'line.2.horizontal'
  | 'mic'
  | 'waveform'
  | 'chevron.down'
  | 'pencil';
const paths: Record<IconName, string> = {
  'line.2.horizontal': 'M4 9h16M4 15h16',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm5 7a5 5 0 0 1-10 0M12 17v4m-4 0h8',
  waveform: 'M7 10v4M12 5v14M17 9v6',
  'chevron.down': 'm6 9 6 6 6-6',
  pencil: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  'doc.on.doc': 'M8 8h10v12H8zM6 16H4V4h12v2',
  'arrow.counterclockwise': 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0-5v5h5',
  'questionmark.circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6h.01M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
  'house.fill': 'M3 10.5 12 3l9 7.5M5 9v12h5v-7h4v7h5V9',
  calendar: 'M5 3v4m14-4v4M3 10h18M7 14h2m6 0h2M7 18h2m6 0h2',
  'person.2.fill':
    'M3 21v-2a5 5 0 0 1 10 0v2m3-8a4 4 0 0 1 5 4v3M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m9-2a3 3 0 0 0 0-6',
  sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3a2 2 0 0 0 4 0',
  'chevron.right': 'm9 5 7 7-7 7',
  'checkmark.circle.fill': 'm7 12 3 3 7-7',
  plus: 'M12 4v16M4 12h16',
  'arrow.up': 'M12 20V4m-6 6 6-6 6 6',
  clock: 'M12 7v5l4 2',
  'doc.text': 'M7 3h8l4 4v14H5V3Zm2 7h6m-6 4h6m-6 4h4',
  gearshape:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  'arrow.left': 'M20 12H4m6-6-6 6 6 6',
  xmark: 'm6 6 12 12M6 18 18 6',
  'graduationcap.fill': 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5',
  'person.fill':
    'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  'envelope.fill':
    'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm2 0 7 5 7-5',
  'lock.fill':
    'M7 11V7a5 5 0 0 1 10 0v4m-12 0h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  'shield.fill': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'arrow.right': 'M4 12h16m-6-6 6 6-6 6',
  'building.columns.fill': 'M4 10h16M4 14h16M4 18h16M2 22h20M12 2 2 7h20z',
  checkmark: 'm5 12 5 5L20 7',
};
// iOS uses genuine system SF Symbols. Android uses small original vector fallbacks
// following the same monochrome visual language (no Lucide/Material font dependency).
const sfSymbolMap: Partial<Record<IconName, any>> = {
  'line.2.horizontal': 'line.3.horizontal',
  mic: 'mic',
  waveform: 'waveform',
  'chevron.down': 'chevron.down',
  pencil: 'pencil',
  'doc.on.doc': 'doc.on.doc',
  'arrow.counterclockwise': 'arrow.counterclockwise',
  'questionmark.circle': 'questionmark.circle',
};

export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  if (Platform.OS === 'ios')
    return (
      <SymbolView
        name={sfSymbolMap[name] || name}
        tintColor={color}
        size={size}
        style={{ width: size, height: size }}
      />
    );
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'calendar' && <Rect x={3} y={5} width={18} height={17} rx={3} />}
      {['clock', 'checkmark.circle.fill'].includes(name) && <Circle cx={12} cy={12} r={10} />}
      <Path d={paths[name]} />
    </Svg>
  );
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
export function Heading({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.heading, style]}>{children}</Text>;
}
export function Body({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[s.body, style]}>
      {children}
    </Text>
  );
}
export function Pill({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode;
  tone?: 'gray' | 'green' | 'blue';
}) {
  return (
    <View
      style={[
        s.pill,
        { backgroundColor: tone === 'green' ? '#EAF5EF' : tone === 'blue' ? '#EAF1FD' : '#EEEEF3' },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: tone === 'green' ? colors.green : tone === 'blue' ? colors.blue : colors.muted,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: '#FCECEB' },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : '#fff'} />
      ) : (
        <Text
          style={[s.buttonText, secondary && { color: colors.ink }, danger && { color: '#B12A25' }]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#82828A"
        {...props}
        style={[s.input, props.multiline && { height: 120, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Icon name="sparkles" color={colors.muted} />
      <Heading>{title}</Heading>
      <Body>{body}</Body>
    </Card>
  );
}
export function Row({
  title,
  detail,
  icon,
  onPress,
  trailing,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={s.row}>
      {icon && (
        <View style={s.iconBox}>
          <Icon name={icon} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {detail && <Text style={s.caption}>{detail}</Text>}
      </View>
      {trailing || (onPress && <Icon name="chevron.right" size={16} color={colors.muted} />)}
    </Pressable>
  );
}
export function Ring({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.min(1, value / total) : 0;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
        <Circle cx={32} cy={32} r={27} fill="none" stroke="#E8E8EE" strokeWidth={5} />
        <Circle
          cx={32}
          cy={32}
          r={27}
          fill="none"
          stroke={colors.green}
          strokeWidth={5}
          strokeDasharray={`${pct * 169.65} 169.65`}
          strokeLinecap="round"
          rotation={-90}
          origin="32,32"
        />
      </Svg>
      <Text style={{ fontSize: 15, fontWeight: '700' }}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}
export const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.035)',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  heading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  pill: { borderRadius: 50, paddingVertical: 7, paddingHorizontal: 11, alignSelf: 'flex-start' },
  button: {
    minHeight: 50,
    borderRadius: 50,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondary: { backgroundColor: '#EFEFF4' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: {
    borderRadius: 16,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 50,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
  },
  fieldLabel: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10, minHeight: 56 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
  iconBox: {
    height: 44,
    width: 44,
    borderRadius: 15,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hstack: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stack: { gap: 16 },
  number: { fontSize: 32, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
  error: { backgroundColor: '#FCECEB', padding: 15, borderRadius: 16 },
  errorText: { color: '#9F2925', fontSize: 14, lineHeight: 21 },
  success: { backgroundColor: '#EAF5EF', padding: 15, borderRadius: 16 },
  successText: { color: colors.green, fontSize: 14, lineHeight: 21 },
});

export function GeminiStar({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4285F4" />
          <Stop offset="35%" stopColor="#9B72CF" />
          <Stop offset="70%" stopColor="#D96570" />
          <Stop offset="100%" stopColor="#F4B400" />
        </LinearGradient>
      </Defs>
      <Path
        d="M24 2 C24 14.15 14.15 24 2 24 C14.15 24 24 33.85 24 46 C24 33.85 33.85 24 46 24 C33.85 24 24 14.15 24 2 Z"
        fill="url(#geminiGrad)"
      />
    </Svg>
  );
}
