import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { localDate, request } from './api';
import { useApp, useRemote } from './context';
import { Body, Button, Card, Heading, Label, Pill, colors } from './ui';
import type { CalendarEvent, ConsultationRequest } from './types';

const accent = '#811212';
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const eventTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  minute: '2-digit',
});
const shortDate = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
});
const longDate = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const monthDate = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});
const shortDateUtc = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});
const eventClockParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function keyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addDays(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return keyFromDate(date);
}

function mondayOf(key: string) {
  const day = dateFromKey(key).getUTCDay();
  return addDays(key, -((day + 6) % 7));
}

function monthOf(key: string) {
  return `${key.slice(0, 7)}-01`;
}

function addMonths(key: string, amount: number) {
  const date = dateFromKey(monthOf(key));
  date.setUTCMonth(date.getUTCMonth() + amount);
  return keyFromDate(date);
}

function monthDays(key: string) {
  const date = dateFromKey(monthOf(key));
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function monthGrid(key: string) {
  const first = monthOf(key);
  const offset = (dateFromKey(first).getUTCDay() + 6) % 7;
  const cells = Math.ceil((offset + monthDays(first)) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => addDays(first, index - offset));
}

function monthLabel(key: string) {
  return monthDate.format(dateFromKey(key));
}

function periodRangeLabel(start: string) {
  const end = addDays(start, 13);
  const startDate = dateFromKey(start);
  const endDate = dateFromKey(end);
  const withYear = startDate.getUTCFullYear() !== endDate.getUTCFullYear();
  const format = (date: Date) =>
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' as const } : {}),
    }).format(date);
  return `${format(startDate)} – ${format(endDate)}`;
}

function weekRangeLabel(start: string) {
  return `${shortDateUtc.format(dateFromKey(start))} – ${shortDateUtc.format(dateFromKey(addDays(start, 6)))}`;
}

function dateKeyForTimestamp(value: string) {
  return localDate(new Date(value));
}

function formatTime(value: string) {
  return eventTime.format(new Date(value));
}

function minutesAfterMidnight(value: string) {
  const parts = eventClockParts.formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function hourLabel(minute: number) {
  const hour = Math.floor(minute / 60);
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12} ${suffix}`;
}

function formatRequestTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const left = `${shortDate.format(startDate)} · ${formatTime(start)}`;
  const right =
    dateKeyForTimestamp(start) === dateKeyForTimestamp(end)
      ? formatTime(end)
      : `${shortDate.format(endDate)} · ${formatTime(end)}`;
  return `${left} – ${right}`;
}

function eventType(event: CalendarEvent) {
  if (event.kind.toLocaleLowerCase().includes('consult')) return 'Consultation';
  if (event.kind.toLocaleLowerCase().includes('assessment')) return 'Assessment';
  if (event.kind.toLocaleLowerCase().includes('class')) return 'Class';
  return event.kind.charAt(0).toUpperCase() + event.kind.slice(1);
}

function errorText(error: unknown) {
  const message = (error as Error)?.message || '';
  if (message.includes('conflicts with an existing event'))
    return 'This time conflicts with an existing event.';
  if (message.includes('already been handled'))
    return 'This request is no longer pending. Refresh to see its latest status.';
  if (message.includes('Cannot reach Aider') || message.includes('Please sign in again.'))
    return message;
  return 'Unable to update this request. Try again.';
}

export function ProfessorCalendar() {
  const { refresh } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const { data: serverEvents, error: calendarError } = useRemote<CalendarEvent[]>('/me/calendar');
  const { data: requests, error: requestsError } = useRemote<ConsultationRequest[]>(
    '/consultation-requests?status=pending',
  );
  const today = localDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(() => mondayOf(today));
  const [monthStart, setMonthStart] = useState(() => monthOf(today));
  const [weekIndex, setWeekIndex] = useState(0);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [resolvedRequestIds, setResolvedRequestIds] = useState<string[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<CalendarEvent[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string>();
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>();
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!serverEvents) return;
    setOptimisticEvents((current) =>
      current.filter((event) => !serverEvents.some((item) => item.id === event.id)),
    );
  }, [serverEvents]);

  const visibleRequests = (requests || []).filter(
    (item) => item.status === 'pending' && !resolvedRequestIds.includes(item.id),
  );
  const events = [
    ...(serverEvents || []),
    ...optimisticEvents.filter((item) => !serverEvents?.some((event) => event.id === item.id)),
  ].filter((event) => !('canceled' in event && event.canceled));
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKeyForTimestamp(event.starts_at);
    eventsByDate.set(key, [...(eventsByDate.get(key) || []), event]);
  }
  for (const list of eventsByDate.values())
    list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const currentWeekStart = addDays(periodStart, weekIndex * 7);
  const weekdayDates = Array.from({ length: 5 }, (_, index) => addDays(currentWeekStart, index));
  const hasWeekendEvents = [5, 6].some(
    (offset) => (eventsByDate.get(addDays(currentWeekStart, offset)) || []).length > 0,
  );
  const selectedDayIsWeekend = [0, 6].includes(dateFromKey(selectedDate).getUTCDay());
  const visibleDates =
    hasWeekendEvents || selectedDayIsWeekend
      ? Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index))
      : weekdayDates;
  const visibleWeekEvents = visibleDates.flatMap((date) => eventsByDate.get(date) || []);
  const earliestEventMinute = visibleWeekEvents.length
    ? Math.min(...visibleWeekEvents.map((event) => minutesAfterMidnight(event.starts_at)))
    : 7 * 60;
  const latestEventMinute = visibleWeekEvents.length
    ? Math.max(...visibleWeekEvents.map((event) => minutesAfterMidnight(event.ends_at)))
    : 18 * 60;
  const timelineStart = Math.max(0, Math.min(7 * 60, Math.floor(earliestEventMinute / 60) * 60));
  const timelineEnd = Math.min(24 * 60, Math.max(18 * 60, Math.ceil(latestEventMinute / 60) * 60));
  const tickMinutes = Array.from(
    { length: Math.max(1, (timelineEnd - timelineStart) / 30) },
    (_, index) => timelineStart + index * 30,
  );
  const dayColumnWidth = Math.max(50, Math.min(68, Math.floor((windowWidth - 32 - 28 - 46) / 5)));
  const timelineWidth = 46 + dayColumnWidth * visibleDates.length;
  const timelineHeight = tickMinutes.length * 28;

  const goToday = () => {
    const currentDay = localDate();
    setSelectedDate(currentDay);
    setPeriodStart(mondayOf(currentDay));
    setMonthStart(monthOf(currentDay));
    setWeekIndex(0);
    setMonthPickerOpen(false);
  };

  const movePeriod = (direction: -1 | 1) => {
    const nextPeriod = addDays(periodStart, direction * 14);
    setPeriodStart(nextPeriod);
    setSelectedDate(nextPeriod);
    setMonthStart(monthOf(nextPeriod));
    setWeekIndex(0);
  };

  const toggleMonthPicker = () => {
    if (!monthPickerOpen) setMonthStart(monthOf(selectedDate));
    setMonthPickerOpen((open) => !open);
  };

  const selectPickerDate = (key: string) => {
    setSelectedDate(key);
    setPeriodStart(mondayOf(key));
    setWeekIndex(0);
    setMonthStart(monthOf(key));
    setMonthPickerOpen(false);
  };

  const selectWeek = (index: 0 | 1) => {
    setWeekIndex(index);
    const firstDay = addDays(periodStart, index * 7);
    if (selectedDate < firstDay || selectedDate > addDays(firstDay, 6)) {
      setSelectedDate(firstDay);
      setMonthStart(monthOf(firstDay));
    }
  };

  const handleRequest = async (item: ConsultationRequest, action: 'approve' | 'deny') => {
    if (activeRequestRef.current) return;
    activeRequestRef.current = item.id;
    setActiveRequestId(item.id);
    setActionError('');
    setActionMessage('');
    try {
      if (action === 'approve') {
        const result = await request<{ request: ConsultationRequest; event: CalendarEvent }>(
          `/consultation-requests/${item.id}/approve`,
          {},
        );
        setResolvedRequestIds((current) => [...new Set([...current, item.id])]);
        setOptimisticEvents((current) => [
          ...current.filter((event) => event.id !== result.event.id),
          result.event,
        ]);
        const approvedDay = dateKeyForTimestamp(result.event.starts_at);
        setSelectedDate(approvedDay);
        setPeriodStart(mondayOf(approvedDay));
        setMonthStart(monthOf(approvedDay));
        setWeekIndex(0);
        setMonthPickerOpen(false);
        setActionMessage('Appointment approved and added to your calendar.');
      } else {
        await request<ConsultationRequest>(`/consultation-requests/${item.id}/deny`, {});
        setResolvedRequestIds((current) => [...new Set([...current, item.id])]);
        setActionMessage('Appointment request declined.');
      }
      refresh();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      activeRequestRef.current = null;
      setActiveRequestId(undefined);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.pageHeader}>
        <Heading style={styles.pageTitle}>Calendar</Heading>
        <Body>Your schedule and appointments</Body>
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.periodHeadingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.periodTitle}>{periodRangeLabel(periodStart)}</Text>
            <Text style={styles.periodSubTitle}>Two-week teaching schedule</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={monthPickerOpen ? 'Close month picker' : 'Open month picker'}
            accessibilityState={{ expanded: monthPickerOpen }}
            onPress={toggleMonthPicker}
            style={styles.viewToggle}
          >
            <Text style={styles.viewToggleText}>Month</Text>
            <Text style={styles.viewChevron}>{monthPickerOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
        </View>

        <View style={styles.periodControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous two-week period"
            onPress={() => movePeriod(-1)}
            style={styles.arrowButton}
          >
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goToday} style={styles.todayButton}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next two-week period"
            onPress={() => movePeriod(1)}
            style={styles.arrowButton}
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>

        {monthPickerOpen ? (
          <View style={styles.monthPicker}>
            <View style={styles.monthPickerHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => setMonthStart((current) => addMonths(current, -1))}
                style={styles.monthArrow}
              >
                <Text style={styles.monthArrowText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{monthLabel(monthStart)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => setMonthStart((current) => addMonths(current, 1))}
                style={styles.monthArrow}
              >
                <Text style={styles.monthArrowText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.monthWeekdayRow}>
              {weekDays.map((day) => (
                <Text key={day} style={styles.monthWeekday}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthGrid(monthStart).map((key) => {
                const isSelected = key === selectedDate;
                const isToday = key === today;
                const isOutsideMonth = key.slice(0, 7) !== monthStart.slice(0, 7);
                const dayEvents = eventsByDate.get(key) || [];
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${longDate.format(dateFromKey(key))}${dayEvents.length ? `, ${dayEvents.length} scheduled events` : ''}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectPickerDate(key)}
                    style={styles.monthDayCell}
                  >
                    <View
                      style={[
                        styles.monthDayBubble,
                        isToday && !isSelected && styles.todayBubble,
                        isSelected && styles.selectedBubble,
                        isOutsideMonth && styles.outsideDayBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isSelected && styles.selectedDayNumber,
                          isOutsideMonth && !isSelected && styles.outsideDayNumber,
                        ]}
                      >
                        {dateFromKey(key).getUTCDate()}
                      </Text>
                    </View>
                    <View style={styles.monthDotRow}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <View
                          key={event.id}
                          style={[
                            styles.eventDot,
                            {
                              backgroundColor: event.kind.toLocaleLowerCase().includes('consult')
                                ? accent
                                : '#8E8E93',
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {calendarError ? (
              <Text style={styles.loadErrorText}>Month event indicators are unavailable.</Text>
            ) : !serverEvents ? (
              <ActivityIndicator color={accent} style={styles.monthLoader} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.weekSwitcher}>
          {([0, 1] as const).map((index) => {
            const weekStart = addDays(periodStart, index * 7);
            const active = weekIndex === index;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Week ${index + 1}, ${weekRangeLabel(weekStart)}`}
                accessibilityState={{ selected: active }}
                onPress={() => selectWeek(index)}
                style={[styles.weekTab, active && styles.activeWeekTab]}
              >
                <Text style={[styles.weekTabTitle, active && styles.activeWeekTabTitle]}>
                  Week {index + 1}
                </Text>
                <Text style={[styles.weekTabDates, active && styles.activeWeekTabDates]}>
                  {weekRangeLabel(weekStart)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.scheduleHeader}>
          <View style={{ flex: 1 }}>
            <Label>Weekly timetable</Label>
            <Text style={styles.selectedDate}>{longDate.format(dateFromKey(selectedDate))}</Text>
          </View>
          <Text style={styles.timeZoneLabel}>Manila time</Text>
        </View>

        {calendarError ? (
          <View style={styles.loadError}>
            <Text style={styles.loadErrorText}>We couldn’t load your calendar.</Text>
            <Button title="Try again" secondary onPress={refresh} />
          </View>
        ) : null}

        {!serverEvents && !calendarError ? (
          <ActivityIndicator
            accessibilityLabel="Loading calendar"
            color={accent}
            style={styles.loader}
          />
        ) : null}

        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={visibleDates.length > 5}
          style={styles.timetableScroll}
          contentContainerStyle={{ width: timelineWidth }}
        >
          <View style={{ width: timelineWidth }}>
            <View style={styles.timetableHeaderRow}>
              <View style={[styles.timeHeaderCell, { width: 46 }]}>
                <Text style={styles.timeZoneTiny}>GMT+8</Text>
              </View>
              {visibleDates.map((key) => {
                const isSelected = key === selectedDate;
                const date = dateFromKey(key);
                const dayName = new Intl.DateTimeFormat('en-PH', {
                  timeZone: 'UTC',
                  weekday: 'short',
                }).format(date);
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${longDate.format(date)}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedDate(key)}
                    style={[
                      styles.timetableDayHeader,
                      { width: dayColumnWidth },
                      isSelected && styles.selectedDayHeader,
                    ]}
                  >
                    <Text
                      style={[styles.timetableDayName, isSelected && styles.selectedDayHeaderText]}
                    >
                      {dayName.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.timetableDayNumber,
                        isSelected && styles.selectedDayHeaderText,
                      ]}
                    >
                      {date.getUTCDate()}
                    </Text>
                    {(eventsByDate.get(key) || []).length > 0 ? (
                      <View
                        style={[styles.headerEventDot, isSelected && styles.selectedHeaderEventDot]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.timetableBody}>
              <View style={[styles.timeLabels, { width: 46, height: timelineHeight }]}>
                {tickMinutes.map((minute, index) => (
                  <View key={minute} style={[styles.timeTick, { height: 28 }]}>
                    {minute % 60 === 0 ? (
                      <Text style={styles.timeLabel}>{hourLabel(minute)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
              {visibleDates.map((key) => (
                <View
                  key={key}
                  style={[
                    styles.dayTrack,
                    { width: dayColumnWidth, height: timelineHeight },
                    key === selectedDate && styles.selectedDayTrack,
                  ]}
                >
                  {tickMinutes.map((minute, index) => (
                    <View
                      key={minute}
                      pointerEvents="none"
                      style={[styles.timeGridLine, { top: index * 28 }]}
                    />
                  ))}
                  {(eventsByDate.get(key) || []).map((event) => {
                    const start = minutesAfterMidnight(event.starts_at);
                    const end = minutesAfterMidnight(event.ends_at);
                    const duration = Math.max(15, end - start);
                    const consultation = event.kind.toLocaleLowerCase().includes('consult');
                    return (
                      <Pressable
                        key={event.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${event.display_title || event.title}, ${formatTime(event.starts_at)} to ${formatTime(event.ends_at)}`}
                        onPress={() => setSelectedEvent(event)}
                        style={({ pressed }) => [
                          styles.eventBlock,
                          {
                            top: ((start - timelineStart) / 60) * 56,
                            height: Math.max(24, (duration / 60) * 56),
                            left: 3,
                            right: 3,
                          },
                          consultation ? styles.consultationBlock : styles.classBlock,
                          pressed && styles.pressedEventBlock,
                        ]}
                      >
                        <Text numberOfLines={2} style={styles.eventBlockTitle}>
                          {event.display_title || event.title}
                        </Text>
                        {duration >= 60 ? (
                          <Text numberOfLines={1} style={styles.eventBlockTime}>
                            {formatTime(event.starts_at)}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        {serverEvents && visibleWeekEvents.length === 0 ? (
          <Text style={styles.scheduleEmpty}>No scheduled events this week.</Text>
        ) : null}
      </Card>

      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(undefined)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEvent(undefined)}>
          <View style={styles.eventModal}>
            <View style={styles.modalTopline}>
              <Pill>{selectedEvent ? eventType(selectedEvent) : 'Event'}</Pill>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close event details"
                onPress={() => setSelectedEvent(undefined)}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>
            <Heading style={styles.modalTitle}>
              {selectedEvent?.display_title || selectedEvent?.title || ''}
            </Heading>
            {selectedEvent ? (
              <>
                <Text style={styles.modalInfo}>
                  {longDate.format(dateFromKey(dateKeyForTimestamp(selectedEvent.starts_at)))}
                </Text>
                <Text style={styles.modalInfo}>
                  {formatTime(selectedEvent.starts_at)} – {formatTime(selectedEvent.ends_at)} ·
                  Manila time
                </Text>
                {selectedEvent.class_name ? (
                  <Text style={styles.modalInfo}>
                    {selectedEvent.class_name}
                    {selectedEvent.class_subject ? ` · ${selectedEvent.class_subject}` : ''}
                  </Text>
                ) : null}
                {selectedEvent.participant_name ? (
                  <Text style={styles.modalInfo}>{selectedEvent.participant_name}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.requestsHeading}>
        <View style={{ flex: 1 }}>
          <Heading style={styles.sectionTitle}>Appointment Requests</Heading>
          <Body>Review times requested by your students.</Body>
        </View>
        {visibleRequests.length > 0 && <Pill>{visibleRequests.length} pending</Pill>}
      </View>

      {actionError ? (
        <View accessibilityRole="alert" style={styles.actionNoticeError}>
          <Text style={styles.actionErrorText}>{actionError}</Text>
        </View>
      ) : null}
      {actionMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.actionMessage}>
          {actionMessage}
        </Text>
      ) : null}

      {requestsError ? (
        <Card style={styles.requestPanel}>
          <Text style={styles.loadErrorText}>We couldn’t load appointment requests.</Text>
          <Button title="Try again" secondary onPress={refresh} />
        </Card>
      ) : !requests ? (
        <ActivityIndicator
          accessibilityLabel="Loading appointment requests"
          color={accent}
          style={styles.loader}
        />
      ) : visibleRequests.length === 0 ? (
        <Text style={styles.noRequests}>No pending appointment requests.</Text>
      ) : (
        <Card style={styles.requestPanel}>
          {visibleRequests.map((item, index) => {
            const rowBusy = activeRequestId === item.id;
            const classDetail = [item.class_name, item.class_subject]
              .filter(
                (value, valueIndex, list): value is string =>
                  Boolean(value) && list.indexOf(value) === valueIndex,
              )
              .join(' · ');
            return (
              <View key={item.id} style={[styles.requestRow, index > 0 && styles.requestDivider]}>
                <View style={styles.requestTopline}>
                  <View style={styles.requestPerson}>
                    <Text style={styles.studentName}>{item.student_name}</Text>
                    {classDetail ? <Text style={styles.classDetail}>{classDetail}</Text> : null}
                  </View>
                  <Pill>Pending</Pill>
                </View>
                <Text style={styles.requestTime}>
                  {formatRequestTime(item.requested_start, item.requested_end)}
                </Text>
                {item.reason.trim() ? (
                  <Text style={styles.requestReason}>{item.reason.trim()}</Text>
                ) : null}
                <View style={styles.actionRow}>
                  <RequestAction
                    title="Decline"
                    disabled={Boolean(activeRequestId)}
                    busy={rowBusy}
                    secondary
                    onPress={() => handleRequest(item, 'deny')}
                  />
                  <RequestAction
                    title="Approve"
                    disabled={Boolean(activeRequestId)}
                    busy={rowBusy}
                    onPress={() => handleRequest(item, 'approve')}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
}

function RequestAction({
  title,
  onPress,
  disabled,
  busy,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary ? styles.declineButton : styles.approveButton,
        (disabled || busy) && styles.disabledButton,
        pressed && { opacity: 0.7 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? accent : '#FFFFFF'} />
      ) : (
        <Text style={[styles.actionButtonText, secondary && styles.declineButtonText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = {
  page: { gap: 18, paddingBottom: 22 } as const,
  pageHeader: { gap: 3, paddingHorizontal: 2 } as const,
  pageTitle: { fontSize: 29, lineHeight: 35, letterSpacing: -0.7 } as const,
  calendarCard: { gap: 14, padding: 15, borderRadius: 22, overflow: 'hidden' } as const,
  periodHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 } as const,
  periodTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' } as const,
  periodSubTitle: { color: colors.muted, fontSize: 12, marginTop: 3 } as const,
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#F4F4F6',
  } as const,
  viewToggleText: { color: colors.ink, fontSize: 12, fontWeight: '600' } as const,
  viewChevron: { color: colors.muted, fontSize: 13, lineHeight: 15 } as const,
  periodControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  } as const,
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F6F6F8',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  arrowText: { color: colors.ink, fontSize: 27, lineHeight: 30, marginTop: -2 } as const,
  todayButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  } as const,
  todayText: { color: accent, fontSize: 12, fontWeight: '700' } as const,
  monthPicker: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ECECF0' } as const,
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  monthArrow: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' } as const,
  monthArrowText: { color: colors.ink, fontSize: 24, lineHeight: 28 } as const,
  monthTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' } as const,
  monthWeekdayRow: { flexDirection: 'row' } as const,
  monthWeekday: {
    width: `${100 / 7}%` as `${number}%`,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  } as const,
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 3 } as const,
  monthDayCell: {
    width: `${100 / 7}%` as `${number}%`,
    height: 42,
    alignItems: 'center',
    paddingTop: 1,
  } as const,
  monthDayBubble: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  todayBubble: { borderWidth: 1, borderColor: '#D8C1C1' } as const,
  selectedBubble: { backgroundColor: accent } as const,
  outsideDayBubble: { opacity: 0.5 } as const,
  dayNumber: { color: colors.ink, fontSize: 13, fontWeight: '500' } as const,
  selectedDayNumber: { color: '#FFFFFF', fontWeight: '700' } as const,
  outsideDayNumber: { color: colors.muted } as const,
  monthDotRow: {
    height: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 1,
  } as const,
  eventDot: { width: 4, height: 4, borderRadius: 2 } as const,
  monthLoader: { paddingVertical: 3 } as const,
  weekSwitcher: {
    flexDirection: 'row',
    gap: 7,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#F3F3F5',
  } as const,
  weekTab: {
    flex: 1,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 3,
    borderRadius: 11,
  } as const,
  activeWeekTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } as const,
  weekTabTitle: { color: colors.muted, fontSize: 12, fontWeight: '600' } as const,
  activeWeekTabTitle: { color: accent, fontWeight: '700' } as const,
  weekTabDates: { color: colors.muted, fontSize: 9, fontWeight: '500' } as const,
  activeWeekTabDates: { color: colors.ink } as const,
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECECF0',
    paddingTop: 12,
  } as const,
  selectedDate: { color: colors.ink, fontSize: 13, fontWeight: '600', marginTop: 3 } as const,
  timeZoneLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' } as const,
  loadError: { alignItems: 'center', gap: 8, paddingTop: 2 } as const,
  loadErrorText: { color: colors.muted, fontSize: 13, textAlign: 'center' } as const,
  loader: { paddingVertical: 9 } as const,
  timetableScroll: { maxHeight: 680, marginHorizontal: -15 } as const,
  timetableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8EC',
    paddingHorizontal: 15,
  } as const,
  timeHeaderCell: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 7 } as const,
  timeZoneTiny: { color: colors.muted, fontSize: 8, fontWeight: '600' } as const,
  timetableDayHeader: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: 10,
    marginBottom: 4,
  } as const,
  selectedDayHeader: { backgroundColor: '#F8EEEE' } as const,
  timetableDayName: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.25,
  } as const,
  timetableDayNumber: { color: colors.ink, fontSize: 13, fontWeight: '600' } as const,
  selectedDayHeaderText: { color: accent } as const,
  headerEventDot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
  } as const,
  selectedHeaderEventDot: { backgroundColor: accent } as const,
  timetableBody: { flexDirection: 'row', paddingHorizontal: 15 } as const,
  timeLabels: { alignItems: 'flex-end', paddingRight: 5 } as const,
  timeTick: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'visible',
  } as const,
  timeLabel: {
    position: 'absolute',
    top: -6,
    right: 0,
    color: colors.muted,
    fontSize: 8,
    fontWeight: '500',
  } as const,
  dayTrack: { position: 'relative', borderLeftWidth: 1, borderLeftColor: '#F0F0F2' } as const,
  selectedDayTrack: { backgroundColor: '#FFFDFD' } as const,
  timeGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#EEEEF1',
  } as const,
  eventBlock: {
    position: 'absolute',
    zIndex: 1,
    borderLeftWidth: 3,
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  } as const,
  consultationBlock: { backgroundColor: '#F5E8E8', borderLeftColor: accent } as const,
  classBlock: { backgroundColor: '#E9EDF2', borderLeftColor: '#667085' } as const,
  pressedEventBlock: { opacity: 0.72 } as const,
  eventBlockTitle: { color: colors.ink, fontSize: 9, lineHeight: 12, fontWeight: '700' } as const,
  eventBlockTime: { color: '#5B5C62', fontSize: 8, lineHeight: 10, marginTop: 1 } as const,
  scheduleEmpty: { color: colors.muted, fontSize: 13, paddingVertical: 2 } as const,
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(24, 24, 28, 0.35)',
  } as const,
  eventModal: { gap: 12, padding: 20, borderRadius: 22, backgroundColor: '#FFFFFF' } as const,
  modalTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F6',
  } as const,
  modalCloseText: { color: colors.ink, fontSize: 22, lineHeight: 25 } as const,
  modalTitle: { fontSize: 21, lineHeight: 26 } as const,
  modalInfo: { color: colors.muted, fontSize: 13, lineHeight: 19 } as const,
  requestsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
  } as const,
  sectionTitle: { fontSize: 19, lineHeight: 24, letterSpacing: -0.25 } as const,
  actionNoticeError: { paddingHorizontal: 2, paddingVertical: 2 } as const,
  actionErrorText: { color: '#9B2B2B', fontSize: 13, fontWeight: '500' } as const,
  actionMessage: { color: '#356A4B', fontSize: 13, paddingHorizontal: 2 } as const,
  noRequests: {
    color: colors.muted,
    fontSize: 13,
    paddingHorizontal: 2,
    paddingBottom: 4,
  } as const,
  requestPanel: { paddingHorizontal: 16, paddingVertical: 4, gap: 0, borderRadius: 20 } as const,
  requestRow: { gap: 9, paddingVertical: 13 } as const,
  requestDivider: { borderTopWidth: 1, borderTopColor: '#ECECF0' } as const,
  requestTopline: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 } as const,
  requestPerson: { flex: 1, gap: 2 } as const,
  studentName: { color: colors.ink, fontSize: 15, fontWeight: '700' } as const,
  classDetail: { color: colors.muted, fontSize: 12 } as const,
  requestTime: { color: accent, fontSize: 12, fontWeight: '600' } as const,
  requestReason: { color: '#55565C', fontSize: 13, lineHeight: 19 } as const,
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 2 } as const,
  actionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  } as const,
  approveButton: { backgroundColor: accent } as const,
  declineButton: { backgroundColor: '#F6F2F2', borderWidth: 1, borderColor: '#EADADA' } as const,
  disabledButton: { opacity: 0.5 } as const,
  actionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' } as const,
  declineButtonText: { color: accent } as const,
};
