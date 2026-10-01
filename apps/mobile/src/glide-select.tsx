import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Icon, colors } from './ui';

export interface SelectOption {
  value: string;
  label: string;
  tag?: string;
}

export interface GlideSelectProps {
  options?: (string | SelectOption)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, item: SelectOption) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  showTags?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  accentColor?: string;
  surfaceColor?: string;
  highlightColor?: string;
  textColor?: string;
  radius?: number;
}

const ROW_HEIGHT = 44;
const ROW_GAP = 2;
const STEP = ROW_HEIGHT + ROW_GAP;

const norm = (o: string | SelectOption): SelectOption =>
  typeof o === 'string' ? { value: o, label: o } : o;

export function GlideSelect({
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select Philippine school...',
  label,
  helperText,
  showTags = true,
  searchable = true,
  disabled = false,
  isLoading = false,
  accentColor = colors.blue,
  surfaceColor = '#FFFFFF',
  highlightColor = '#F2F2F7',
  textColor = colors.ink,
  radius = 14,
}: GlideSelectProps) {
  const items = useMemo(() => options.map(norm), [options]);
  const [innerValue, setInnerValue] = useState(defaultValue ?? '');
  const currentValue = value !== undefined ? value : innerValue;
  const selectedIndex = items.findIndex((it) => it.value === currentValue);
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(
    selectedIndex >= 0 ? selectedIndex : null
  );

  // Animations
  const popAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const pillY = useRef(new Animated.Value(selectedIndex >= 0 ? selectedIndex * STEP : 0)).current;
  const pillOpacity = useRef(new Animated.Value(selectedIndex >= 0 ? 1 : 0)).current;
  const labelSwapAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.tag && it.tag.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Handle open / close animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(popAnim, {
        toValue: isOpen ? 1 : 0,
        duration: isOpen ? 220 : 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(chevronAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (isOpen) {
      const idx = filteredItems.findIndex((it) => it.value === currentValue);
      if (idx >= 0) {
        setActiveIndex(idx);
        pillY.setValue(idx * STEP);
        pillOpacity.setValue(1);
        // Scroll to selected item smoothly
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, idx * STEP - 80),
            animated: true,
          });
        }, 100);
      } else {
        setActiveIndex(null);
        pillOpacity.setValue(0);
      }
    }
  }, [isOpen, currentValue, filteredItems, popAnim, chevronAnim, pillY, pillOpacity]);

  // Glide pill animation when active index changes
  const glideTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      pillOpacity.setValue(1);
      Animated.spring(pillY, {
        toValue: index * STEP,
        friction: 7,
        tension: 110,
        useNativeDriver: true,
      }).start();
    },
    [pillY, pillOpacity]
  );

  // Trigger label swap animation on select
  const animateSwap = useCallback(() => {
    labelSwapAnim.setValue(0.5);
    Animated.timing(labelSwapAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [labelSwapAnim]);

  const handleSelect = useCallback(
    (item: SelectOption, index?: number) => {
      if (index !== undefined) {
        glideTo(index);
      }
      if (value === undefined) {
        setInnerValue(item.value);
      }
      onChange?.(item.value, item);
      animateSwap();
      setTimeout(() => {
        setIsOpen(false);
        setSearchQuery('');
      }, 140);
    },
    [value, onChange, glideTo, animateSwap]
  );

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const menuScale = popAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {isLoading && (
            <View style={styles.loadingIndicatorRow}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.loadingSubtext}>Loading PH schools…</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Trigger Button */}
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ expanded: isOpen }}
        disabled={disabled}
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderRadius: radius,
            borderColor: isOpen ? accentColor : '#E5E5EA',
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Animated.View
          style={[
            styles.triggerContent,
            { opacity: labelSwapAnim },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.triggerLabel,
              !selectedItem && { color: colors.muted, fontWeight: '400' },
            ]}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>

          {showTags && selectedItem?.tag && (
            <View style={styles.triggerTag}>
              <Text style={styles.triggerTagText} numberOfLines={1}>
                {selectedItem.tag}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.chevronWrap,
            { transform: [{ rotate: chevronRotate }] },
          ]}
        >
          <Icon name="chevron.right" size={14} color={isOpen ? accentColor : colors.muted} />
        </Animated.View>
      </Pressable>

      {helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Dropdown Menu Container */}
      {isOpen && (
        <Animated.View
          style={[
            styles.menu,
            {
              backgroundColor: surfaceColor,
              borderRadius: radius,
              opacity: popAnim,
              transform: [{ scale: menuScale }],
            },
          ]}
        >
          {/* Live Search Bar */}
          {searchable && (
            <View style={styles.searchRow}>
              <Icon name="sparkles" size={14} color={colors.muted} />
              <TextInput
                placeholder="Search Philippine school or university..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCorrect={false}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {isLoading && <ActivityIndicator size="small" color={accentColor} />}
            </View>
          )}

          {/* Options List with Gliding Highlight Pill */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {/* The Gliding Pill: slides dynamically behind the active row */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glidePill,
                {
                  backgroundColor: highlightColor,
                  borderRadius: Math.max(4, radius - 4),
                  opacity: pillOpacity,
                  transform: [{ translateY: pillY }],
                },
              ]}
            />

            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No exact match found</Text>
                <Text style={styles.emptyText}>
                  "{searchQuery.trim()}" is not in the recognized directory.
                </Text>

                {searchQuery.trim().length > 0 && (
                  <Pressable
                    onPress={() =>
                      handleSelect({
                        value: searchQuery.trim(),
                        label: searchQuery.trim(),
                        tag: 'Custom Institution',
                      })
                    }
                    style={({ pressed }) => [
                      styles.useCustomButton,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Icon name="checkmark" size={14} color={colors.blue} />
                    <Text style={styles.useCustomText} numberOfLines={1}>
                      Use "{searchQuery.trim()}"
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = item.value === currentValue;
                const isActive = activeIndex === index;

                return (
                  <Pressable
                    key={`${item.value}-${index}`}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelect(item, index)}
                    onPressIn={() => glideTo(index)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.optionName,
                          { color: textColor },
                          isSelected && { color: accentColor, fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>

                      {showTags && item.tag ? (
                        <Text numberOfLines={1} style={styles.optionTag}>
                          {item.tag}
                        </Text>
                      ) : null}
                    </View>

                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Icon name="checkmark" size={14} color={accentColor} />
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Directory Count Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.menuFooterText}>
              {filteredItems.length} Philippine {filteredItems.length === 1 ? 'school' : 'schools'} available
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
    position: 'relative',
    zIndex: 90,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  loadingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingSubtext: {
    fontSize: 11,
    color: colors.muted,
  },
  helperText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: -2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8F8FA',
    borderWidth: 1.5,
    minHeight: 52,
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  triggerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    flexShrink: 1,
  },
  triggerTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EEEEF3',
    borderRadius: 6,
    maxWidth: 140,
  },
  triggerTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  chevronWrap: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECF0',
    gap: 8,
    backgroundColor: '#FAFAFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
    margin: 0,
  },
  scrollList: {
    maxHeight: 250,
  },
  scrollContent: {
    padding: 4,
    position: 'relative',
  },
  glidePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    height: ROW_HEIGHT,
    zIndex: 0,
  },
  optionRow: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    borderRadius: 8,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  optionName: {
    fontSize: 13.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  optionTag: {
    fontSize: 11,
    color: colors.muted,
    flexShrink: 0,
  },
  checkIcon: {
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  useCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#EAF1FD',
    borderRadius: 8,
  },
  useCustomText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },
  menuFooter: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFC',
    borderTopWidth: 1,
    borderTopColor: '#ECECF0',
    alignItems: 'center',
  },
  menuFooterText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
});
