import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  PanResponder,
  Animated,
  StyleSheet,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { Icon, colors } from './ui';

export interface SlideCommitProps {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  onConfirm?: () => Promise<void> | void;
  onDone?: () => void;
  onError?: (err: unknown) => void;
  trackColor?: string;
  handleColor?: string;
  successColor?: string;
  dangerColor?: string;
  height?: number;
  radius?: number;
  disabled?: boolean;
}

const PAD = 4;

export function SlideCommit({
  label = 'Slide to verify',
  doneLabel = 'Verified',
  errorLabel = 'Verification failed',
  onConfirm,
  onDone,
  onError,
  trackColor = '#1C1C1E',
  handleColor = '#FFFFFF',
  successColor = '#24754B',
  dangerColor = '#FF3B30',
  height = 56,
  radius = 28,
  disabled = false,
}: SlideCommitProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');

  const handleSize = height - PAD * 2;
  const travel = Math.max(1, trackWidth - PAD * 2 - handleSize);

  const pan = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = pan.addListener(({ value }) => {
      currentX.current = value;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const triggerError = useCallback(
    (err: unknown) => {
      setPhase('error');
      onError?.(err);

      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      // Return home
      setTimeout(() => {
        Animated.spring(pan, {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: false,
        }).start(() => {
          setPhase('idle');
        });
      }, 900);
    },
    [onError, pan, shakeAnim]
  );

  const handleCommit = useCallback(async () => {
    setPhase('pending');
    try {
      if (onConfirm) {
        await Promise.resolve(onConfirm());
      }
      setPhase('done');
      // Expand to full capsule on success
      Animated.spring(expandAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: false,
      }).start();

      onDone?.();
    } catch (err) {
      triggerError(err);
    }
  }, [onConfirm, onDone, triggerError, expandAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && phase === 'idle',
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && phase === 'idle' && Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        pan.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(0, Math.min(travel, g.dx));
        pan.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const finalX = Math.max(0, Math.min(travel, g.dx));
        if (finalX >= travel * 0.75) {
          // Snap forward to commit
          Animated.spring(pan, {
            toValue: travel,
            friction: 7,
            tension: 80,
            useNativeDriver: false,
          }).start(() => {
            handleCommit();
          });
        } else {
          // Spring back home
          Animated.spring(pan, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Center label opacity fades as handle slides across
  const labelOpacity = pan.interpolate({
    inputRange: [0, Math.max(1, travel * 0.55)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Track progress fill width behind handle
  const fillWidth = pan.interpolate({
    inputRange: [0, travel],
    outputRange: [handleSize + PAD * 2, trackWidth || 100],
    extrapolate: 'clamp',
  });

  const isComplete = phase === 'done';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          height,
          borderRadius: radius,
          transform: [{ translateX: shakeAnim }],
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View
        onLayout={onLayout}
        style={[
          styles.track,
          {
            height,
            borderRadius: radius,
            backgroundColor:
              phase === 'error'
                ? dangerColor
                : isComplete
                  ? successColor
                  : trackColor,
          },
        ]}
      >
        {/* Subtle filled path following handle */}
        {!isComplete && phase !== 'error' && (
          <Animated.View
            style={[
              styles.trailFill,
              {
                width: fillWidth,
                borderRadius: radius,
              },
            ]}
          />
        )}

        {/* Center Guide Label */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.labelContainer,
            {
              opacity: isComplete || phase === 'error' ? 0 : labelOpacity,
            },
          ]}
        >
          <Text style={styles.labelText}>{label}</Text>
        </Animated.View>

        {/* Done / Error Label */}
        {(isComplete || phase === 'error') && (
          <View pointerEvents="none" style={styles.labelContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isComplete && <Icon name="checkmark" size={18} color="#FFFFFF" />}
              <Text style={[styles.labelText, { color: '#FFFFFF', fontWeight: '700' }]}>
                {isComplete ? doneLabel : errorLabel}
              </Text>
            </View>
          </View>
        )}

        {/* Sliding Capsule Handle */}
        {!isComplete && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.handle,
              {
                width: handleSize,
                height: handleSize,
                borderRadius: handleSize / 2,
                backgroundColor: handleColor,
                transform: [{ translateX: pan }],
              },
            ]}
          >
            {phase === 'pending' ? (
              <ActivityIndicator color={trackColor} size="small" />
            ) : (
              <Icon name="arrow.right" size={20} color={trackColor} />
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
    marginVertical: 8,
  },
  track: {
    width: '100%',
    justifyContent: 'center',
    padding: PAD,
    position: 'relative',
    overflow: 'hidden',
  },
  trailFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  labelContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: -0.2,
  },
  handle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
});
