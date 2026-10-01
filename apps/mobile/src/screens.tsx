import React, { useState } from 'react';
import { Text, View, Pressable, Switch, ActivityIndicator } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { request, dateText, localDate, localDateTime, toISO } from './api';
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
export function Home() {
  const { profile, open } = useApp();
  const { data: bookings, error } = useRemote<Booking[]>('/consultations');
  const { data: assessments } = useRemote<Assessment[]>('/assessments');
  const { data: classes } = useRemote<Classroom[]>('/classes');
  const upcoming = (bookings || []).filter(
    (b) => b.status === 'booked' && new Date(b.ends_at) > new Date(),
  );
  const drafts = (assessments || []).filter((a) => a.state === 'draft');
  const teacher = profile.role === 'teacher';
  return (
    <View style={s.stack}>
      <Card style={{ backgroundColor: '#E9EFEC', padding: 24 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pill tone="green">A little less admin.</Pill>
          <Icon name="sparkles" color={colors.green} size={28} />
        </View>
        <Text
          style={{
            fontSize: 30,
            lineHeight: 35,
            fontWeight: '700',
            letterSpacing: -1,
            color: '#263D32',
          }}
        >
          More room{'\n'}for learning.
        </Text>
        <Body>
          {teacher
            ? 'Your classes, conversations, and next steps. All in one calm place.'
            : 'A question to ask. Something new to learn. Your school day, made simpler.'}
        </Body>
        <Button
          title={teacher ? 'Prepare an assessment' : 'Find a consultation'}
          secondary
          onPress={() => open(teacher ? 'create-draft' : 'book')}
        />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Icon name="calendar" />
          <Text style={s.number}>{upcoming.length}</Text>
          <Body>upcoming{'\n'}consultations</Body>
        </Card>
        <Card style={{ flex: 1 }}>
          <Icon name="doc.text" />
          <Text style={s.number}>
            {teacher ? drafts.length : (assessments || []).filter((a) => a.state === 'open').length}
          </Text>
          <Body>
            {teacher ? 'drafts to' : 'assessments'}
            {'\n'}
            {teacher ? 'review' : 'open now'}
          </Body>
        </Card>
      </View>
      <View style={[s.hstack, { justifyContent: 'space-between', marginTop: 6 }]}>
        <Heading>On your schedule</Heading>
        <Text style={s.caption}>Asia/Manila</Text>
      </View>
      <RemoteState error={error} loading={!bookings && !error} />
      {bookings &&
        (!upcoming.length ? (
          <Empty
            title="A little breathing room"
            body="Your confirmed consultations will appear here."
          />
        ) : (
          <Card>
            {upcoming.slice(0, 3).map((b) => (
              <Row
                key={b.id}
                title={teacher ? b.student_name : b.teacher_name}
                detail={`${dateText(b.starts_at)} · ${b.location}`}
                icon="clock"
                onPress={() => open('book')}
              />
            ))}
          </Card>
        ))}
      <Heading>Your classroom</Heading>
      <Card>
        {classes?.length ? (
          classes
            .slice(0, 2)
            .map((c) => (
              <Row
                key={c.id}
                title={c.name}
                detail={`${c.subject} · ${c.member_count} students`}
                icon="person.2.fill"
                onPress={() => open('class', c.id)}
              />
            ))
        ) : (
          <Body>Create or join a class to get started.</Body>
        )}
      </Card>
      <Card>
        <View style={s.hstack}>
          <Ring
            value={
              (assessments || []).filter((a) =>
                ['approved', 'announced', 'closed'].includes(a.state),
              ).length
            }
            total={assessments?.length || 0}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Heading>{teacher ? 'Thoughtfully prepared' : 'Keep showing up'}</Heading>
            <Body>
              {teacher
                ? 'Review every draft before it reaches your students.'
                : 'Small questions can lead to big discoveries.'}
            </Body>
          </View>
        </View>
      </Card>
    </View>
  );
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
            <Pill tone={config.aiConfigured ? 'green' : 'gray'}>
              {config.aiConfigured
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
              disabled={!config.aiConfigured}
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
