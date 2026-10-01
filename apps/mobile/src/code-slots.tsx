import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { Icon, colors } from './ui';

export interface CodeSlotsProps {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  status?: 'idle' | 'error' | 'success';
  mask?: boolean;
  caret?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  accentColor?: string;
  inkColor?: string;
  slotColor?: string;
  digitColor?: string;
  dangerColor?: string;
  slotSize?: number;
  height?: number;
  gap?: number;
  radius?: number;
}

const digitsOf = (raw?: string) => String(raw ?? '').replace(/\D/g, '');

export function CodeSlots({
  length = 6,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  status = 'idle',
  mask = false,
  caret = true,
  disabled = false,
  autoFocus = false,
  accentColor = colors.blue, // #0064D9
  inkColor = colors.ink, // #1C1C1E
  slotColor = '#F4F4F7',
  digitColor = '#1C1C1E',
  dangerColor = '#FF3B30',
  slotSize = 46,
  height = 54,
  gap = 8,
  radius = 12,
}: CodeSlotsProps) {
  const [internalCode, setInternalCode] = useState(() => digitsOf(value ?? defaultValue).slice(0, length));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Sync external controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInternalCode(digitsOf(value).slice(0, length));
    }
  }, [value, length]);

  const activeIndex = Math.min(internalCode.length, length - 1);

  // Caret blinking animation
  const caretOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!caret || !focused || disabled || status === 'success') {
      caretOpacity.setValue(0);
      return;
    }
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(caretOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [caret, focused, disabled, status, caretOpacity]);

  // Shake animation for error
  const shakeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (status === 'error') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [status, shakeAnim]);

  // Success check animation
  const successScale = useRef(new Animated.Value(0)).current;
  const successTranslate = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    if (status === 'success') {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(successTranslate, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      successScale.setValue(0);
      successTranslate.setValue(8);
    }
  }, [status, successScale, successTranslate]);

  const handleTextChange = useCallback(
    (text: string) => {
      const clean = digitsOf(text).slice(0, length);
      setInternalCode(clean);
      onChange?.(clean);
      if (clean.length === length) {
        onComplete?.(clean);
      }
    },
    [length, onChange, onComplete]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter verification code"
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={[styles.slotsRow, { gap }]}
      >
        {Array.from({ length }).map((_, i) => {
          const char = internalCode[i] ?? '';
          const isActive = focused && i === activeIndex;
          const isFilled = Boolean(char);

          return (
            <SlotView
              key={i}
              index={i}
              char={mask && char ? '•' : char}
              isActive={isActive}
              isFilled={isFilled}
              slotSize={slotSize}
              height={height}
              radius={radius}
              slotColor={slotColor}
              accentColor={accentColor}
              digitColor={digitColor}
              dangerColor={dangerColor}
              status={status}
              showCaret={caret && isActive && !isFilled && status !== 'success'}
              caretOpacity={caretOpacity}
            />
          );
        })}

        {/* Success wash overlay */}
        {status === 'success' && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.successWash,
              {
                borderRadius: radius,
                backgroundColor: accentColor,
                opacity: successScale,
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: successScale },
                  { translateY: successTranslate },
                ],
              }}
            >
              <Icon name="checkmark" size={Math.round(slotSize * 0.6)} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        )}
      </Pressable>

      {/* Hidden Native Input */}
      <TextInput
        ref={inputRef}
        value={internalCode}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled && status !== 'success'}
        style={styles.hiddenInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Animated.View>
  );
}

function SlotView({
  char,
  isActive,
  isFilled,
  slotSize,
  height,
  radius,
  slotColor,
  accentColor,
  digitColor,
  dangerColor,
  status,
  showCaret,
  caretOpacity,
}: {
  index: number;
  char: string;
  isActive: boolean;
  isFilled: boolean;
  slotSize: number;
  height: number;
  radius: number;
  slotColor: string;
  accentColor: string;
  digitColor: string;
  dangerColor: string;
  status: 'idle' | 'error' | 'success';
  showCaret: boolean;
  caretOpacity: Animated.Value;
}) {
  // Digit entry spring transition
  const digitAnim = useRef(new Animated.Value(char ? 1 : 0)).current;

  useEffect(() => {
    if (char) {
      digitAnim.setValue(0);
      Animated.spring(digitAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      digitAnim.setValue(0);
    }
  }, [char, digitAnim]);

  const digitTranslateY = digitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const digitScale = digitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const borderColor =
    status === 'error'
      ? dangerColor
      : isActive
        ? accentColor
        : isFilled
          ? '#D6D6DD'
          : '#E5E5EA';

  const backgroundColor =
    status === 'error'
      ? '#FDF2F2'
      : isFilled
        ? '#FFFFFF'
        : slotColor;

  return (
    <View
      style={[
        styles.slot,
        {
          width: slotSize,
          height,
          borderRadius: radius,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {Boolean(char) && (
        <Animated.Text
          style={[
            styles.digit,
            {
              color: status === 'error' ? dangerColor : digitColor,
              fontSize: Math.round(slotSize * 0.48),
              opacity: digitAnim,
              transform: [
                { translateY: digitTranslateY },
                { scale: digitScale },
              ],
            },
          ]}
        >
          {char}
        </Animated.Text>
      )}

      {showCaret && (
        <Animated.View
          style={[
            styles.caret,
            {
              backgroundColor: accentColor,
              opacity: caretOpacity,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  digit: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  caret: {
    width: 2,
    height: '48%',
    borderRadius: 1,
  },
  successWash: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
