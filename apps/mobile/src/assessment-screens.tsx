import React, { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { request, dateText, localDateTime, toISO } from './api';
import { useApp, useRemote } from './context';
import { Body, Button, Card, Empty, Field, Heading, Icon, Label, Pill, Row, colors, s } from './ui';
import { RemoteState } from './screens';
import type { Assessment, Attempt, Classroom } from './types';

export function CreateDraft({ classId }: { classId?: string }) {
  const { act, busy, config, open } = useApp();
  const { data: classes } = useRemote<Classroom[]>('/classes');
  const [selected, setSelected] = useState(classId || ''),
    [lesson, setLesson] = useState(''),
    [objectives, setObjectives] = useState(''),
    [sample, setSample] = useState(false);
  const [announce, setAnnounce] = useState(
      localDateTime(new Date(Date.now() + 60000).toISOString()),
    ),
    [opens, setOpens] = useState(localDateTime(new Date(Date.now() + 10 * 60000).toISOString())),
    [closes, setCloses] = useState(localDateTime(new Date(Date.now() + 40 * 60000).toISOString()));
  return (
    <View style={s.stack}>
      <Card>
        <Label>Teacher studio</Label>
        <Heading>Turn a lesson into a starting point.</Heading>
        <Body>
          Create five multiple-choice questions. You’ll review every question, answer, and date
          before anything is published.
        </Body>
        <Pill tone={sample ? 'gray' : 'blue'}>
          {sample ? 'Saved sample · not live AI' : 'AI-generated draft · review required'}
        </Pill>
      </Card>
      <Card>
        <Label>Choose a class</Label>
        {classes?.map((c) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === c.id }}
            key={c.id}
            onPress={() => setSelected(c.id)}
            style={{
              backgroundColor: selected === c.id ? '#E8EFFA' : colors.soft,
              padding: 16,
              borderRadius: 16,
            }}
          >
            <Text style={s.rowTitle}>{c.name}</Text>
          </Pressable>
        ))}
        <Field
          label="Lesson material"
          multiline
          style={{ height: 220 }}
          value={lesson}
          onChangeText={(v) => {
            setLesson(v);
            setSample(false);
          }}
          placeholder="Paste a short lesson you have permission to use. Separate paragraphs with a blank line."
        />
        {config.sampleEnabled && (
          <Button
            title="Load saved sample lesson"
            secondary
            busy={busy}
            onPress={() =>
              act(async () => {
                const r = await request<{ lesson: string }>('/sample-lesson');
                setLesson(r.lesson);
                setSample(true);
              })
            }
          />
        )}
        <Field
          label="Learning objectives (optional)"
          value={objectives}
          onChangeText={setObjectives}
          multiline
        />
      </Card>
      <Card>
        <Heading>Plan the learning window</Heading>
        <Body>
          Asia/Manila · YYYY-MM-DD HH:mm{'\n'}Announcement, opening, and closing are separate.
        </Body>
        <Field label="Announce at" value={announce} onChangeText={setAnnounce} />
        <Field label="Open at" value={opens} onChangeText={setOpens} />
        <Field label="Close at" value={closes} onChangeText={setCloses} />
        <Button
          title={sample ? 'Create saved sample draft' : 'Generate five-question draft'}
          disabled={!selected || lesson.trim().length < 60 || (!sample && !config?.aiConfigured)}
          busy={busy}
          onPress={() =>
            act(async () => {
              const a = await request<Assessment>(`/classes/${selected}/assessment-drafts`, {
                sample,
                lesson,
                objectives,
                schedule: {
                  announce_at: toISO(announce),
                  opens_at: toISO(opens),
                  closes_at: toISO(closes),
                  duration_minutes: 30,
                },
              });
              open('review', a.id);
            }, 'Draft ready for your review.')
          }
        />
        {!config?.aiConfigured && !sample && (
          <Body>
            Live AI is not connected. You can explore the review workflow with the labeled saved
            sample.
          </Body>
        )}
      </Card>
    </View>
  );
}
export function Review({ id }: { id: string }) {
  const { data, error } = useRemote<Assessment>(`/assessments/${id}`);
  return (
    <>
      <RemoteState error={error} loading={!data && !error} />
      {data && <ReviewForm key={`${id}:${data.version}`} initial={data} />}
    </>
  );
}
function ReviewForm({ initial }: { initial: Assessment }) {
  const { act, busy, open } = useApp();
  const [draft, setDraft] = useState(initial),
    [dirty, setDirty] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [canceling, setCanceling] = useState(false);
  const [announce, setAnnounce] = useState(localDateTime(initial.announce_at)),
    [opens, setOpens] = useState(localDateTime(initial.opens_at)),
    [closes, setCloses] = useState(localDateTime(initial.closes_at));
  const editable = !(initial.state === 'announced' && new Date(initial.opens_at) <= new Date());
  const change = (patch: Partial<Assessment>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setConfirmed(false);
  };
  const changeQ = (i: number, patch: Partial<NonNullable<Assessment['questions']>[number]>) =>
    change({ questions: draft.questions!.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  return (
    <View style={s.stack}>
      <Card>
        <Pill tone={initial.source === 'saved_sample' ? 'gray' : 'blue'}>
          {initial.source === 'saved_sample'
            ? 'Saved sample draft · not live AI'
            : 'AI-generated draft · verify accuracy'}
        </Pill>
        <Heading>Make it yours.</Heading>
        <Body>
          Check the lesson alignment, answer key, and delivery details. Approval applies only to
          this exact version.
        </Body>
        <Pill>
          {initial.state} · version {initial.version}
        </Pill>
        <Field
          label="Assessment title"
          value={draft.title}
          editable={editable}
          onChangeText={(v) => change({ title: v })}
        />
        <Button
          title="View student submissions"
          secondary
          onPress={() => open('submissions', initial.id)}
        />
      </Card>
      <Card>
        <Heading>Source lesson</Heading>
        <Body>Paragraphs are numbered from 1 and separated by a blank line.</Body>
        <Field
          label="Lesson"
          multiline
          style={{ height: 240 }}
          value={draft.lesson || ''}
          editable={editable}
          onChangeText={(v) => change({ lesson: v })}
        />
      </Card>
      {draft.questions?.map((q, i) => (
        <Card key={q.id}>
          <Label>Question {i + 1} of 5</Label>
          <Field
            label={`Question ${i + 1}`}
            value={q.prompt}
            multiline
            editable={editable}
            onChangeText={(v) => changeQ(i, { prompt: v })}
          />
          <Body>Select the correct answer. This key is private to the teacher.</Body>
          {q.options.map((o, j) => (
            <View key={o.id} style={s.hstack}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={`Question ${i + 1} correct answer ${j + 1}`}
                accessibilityState={{ selected: q.correctOptionId === o.id }}
                disabled={!editable}
                onPress={() => changeQ(i, { correctOptionId: o.id })}
                style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon
                  name={q.correctOptionId === o.id ? 'checkmark.circle.fill' : 'plus'}
                  color={q.correctOptionId === o.id ? colors.green : colors.muted}
                />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Field
                  label={`Option ${j + 1}`}
                  value={o.text}
                  editable={editable}
                  onChangeText={(v) =>
                    changeQ(i, {
                      options: q.options.map((p) => (p.id === o.id ? { ...p, text: v } : p)),
                    })
                  }
                />
              </View>
            </View>
          ))}
          <Field
            label="Answer explanation"
            value={q.explanation}
            editable={editable}
            multiline
            onChangeText={(v) => changeQ(i, { explanation: v })}
          />
          <Field
            label="Source paragraph number"
            value={String(q.sourceParagraph)}
            editable={editable}
            keyboardType="numeric"
            onChangeText={(v) => changeQ(i, { sourceParagraph: Number(v) })}
          />
        </Card>
      ))}
      <Card>
        <Heading>Publication details</Heading>
        <Pill>Audience: active members of this class</Pill>
        <Field
          label="Announcement"
          multiline
          value={draft.announcement}
          editable={editable}
          onChangeText={(v) => change({ announcement: v })}
        />
        <Body>Asia/Manila · YYYY-MM-DD HH:mm</Body>
        {[
          ['Announce at', announce, setAnnounce],
          ['Open at', opens, setOpens],
          ['Close at', closes, setCloses],
        ].map(([label, value, set]) => (
          <Field
            key={String(label)}
            label={String(label)}
            value={String(value)}
            editable={editable}
            onChangeText={(v) => {
              (set as (v: string) => void)(v);
              setDirty(true);
              setConfirmed(false);
            }}
          />
        ))}
        <Field
          label="Time limit (minutes)"
          value={String(draft.duration_minutes)}
          keyboardType="numeric"
          editable={editable}
          onChangeText={(v) => change({ duration_minutes: Number(v) })}
        />
        {dirty && (
          <Body>
            Unsaved changes. Saving revokes any previous approval and pending publication.
          </Body>
        )}
        {editable && (
          <Button
            title="Save reviewed changes"
            disabled={!dirty}
            busy={busy}
            onPress={() =>
              act(async () => {
                const a = await request<Assessment>(
                  `/assessment-drafts/${draft.id}`,
                  {
                    ...draft,
                    expectedVersion: draft.version,
                    announce_at: toISO(announce),
                    opens_at: toISO(opens),
                    closes_at: toISO(closes),
                  },
                  true,
                  'PATCH',
                );
                setDraft(a);
                setDirty(false);
                setConfirmed(false);
              }, 'Changes saved. Review and approve this version.')
            }
          />
        )}
        {draft.state === 'draft' && (
          <>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              onPress={() => setConfirmed(!confirmed)}
              style={[s.hstack, { paddingVertical: 12 }]}
            >
              <Icon
                name={confirmed ? 'checkmark.circle.fill' : 'plus'}
                color={confirmed ? colors.green : colors.muted}
              />
              <Text style={[s.body, { flex: 1 }]}>
                I reviewed the questions, answer key, class audience, and schedule.
              </Text>
            </Pressable>
            <Button
              title="Approve and schedule"
              disabled={dirty || !confirmed}
              busy={busy}
              onPress={() =>
                act(async () => {
                  const a = await request<Assessment>(`/publication-bundles/${draft.id}/approve`, {
                    version: draft.version,
                    digest: draft.digest,
                  });
                  setDraft({ ...a, digest: draft.digest });
                  setConfirmed(false);
                }, 'Approved. The server will publish at the scheduled time.')
              }
            />
          </>
        )}
        {editable &&
          draft.state !== 'canceled' &&
          (canceling ? (
            <>
              <Body>Cancel this draft and its pending publication?</Body>
              <Button
                title="Confirm cancellation"
                danger
                busy={busy}
                onPress={() =>
                  act(async () => {
                    const a = await request<Assessment>(
                      `/publication-bundles/${draft.id}/cancel`,
                      {},
                    );
                    setDraft(a);
                    setCanceling(false);
                  }, 'Assessment canceled.')
                }
              />
              <Button title="Keep assessment" secondary onPress={() => setCanceling(false)} />
            </>
          ) : (
            <Button title="Cancel assessment" secondary onPress={() => setCanceling(true)} />
          ))}
      </Card>
    </View>
  );
}
export function Quiz({ id }: { id: string }) {
  const { act, busy } = useApp();
  const { data: a, error } = useRemote<Assessment>(`/assessments/${id}`);
  const { data: receipts } = useRemote<Attempt[]>('/me/attempts');
  const [attempt, setAttempt] = useState<Attempt>(),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false),
    [offset, setOffset] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const receipt = receipts?.find((r) => r.assessment_id === id && r.submitted_at);
    if (receipt) setAttempt(receipt);
  }, [receipts, id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!a) return <RemoteState error={error} loading={!error} />;
  const expired = attempt ? now + offset >= +new Date(attempt.deadline) : false;
  return (
    <View style={s.stack}>
      <Card>
        <Label>Knowledge check</Label>
        <Heading>{a.title}</Heading>
        <Body>{a.announcement}</Body>
        <Body>
          {dateText(a.opens_at)} – {dateText(a.closes_at)}
          {'\n'}Asia/Manila · {a.duration_minutes} minutes
        </Body>
        <Body>
          Your answers are saved only when the server confirms. This app does not record your
          screen, camera, or clipboard.
        </Body>
        {!attempt && (
          <Button
            title="Begin or resume assessment"
            disabled={a.state !== 'open'}
            busy={busy}
            onPress={() =>
              act(async () => {
                const r = await request<{ attempt: Attempt; server_time: string }>(
                  `/assessments/${id}/attempts`,
                  {},
                );
                setAttempt(r.attempt);
                setAnswers(r.attempt.responses);
                setOffset(+new Date(r.server_time) - Date.now());
              })
            }
          />
        )}
      </Card>
      {attempt?.submitted_at ? (
        <Card>
          <Icon name="checkmark.circle.fill" size={36} color={colors.green} />
          <Heading>All handed in.</Heading>
          <Body>Your answers have been received. Your teacher can now review them.</Body>
          <Text selectable style={s.caption}>
            Receipt: {attempt.id}
            {'\n'}Submitted {dateText(attempt.submitted_at)}
          </Text>
        </Card>
      ) : (
        attempt && (
          <>
            <Card>
              <Pill tone={dirty ? 'gray' : 'green'}>
                {dirty ? 'Unsaved changes' : 'Saved on server'}
              </Pill>
              <Heading>
                {expired
                  ? 'Time is up'
                  : `${Math.max(0, Math.ceil((+new Date(attempt.deadline) - now - offset) / 60000))} minutes remaining`}
              </Heading>
              {expired && (
                <Body>
                  Your previously saved answers are retained. New changes and submission are closed.
                </Body>
              )}
            </Card>
            {a.questions?.map((q, i) => (
              <Card key={q.id}>
                <Label>Question {i + 1} of 5</Label>
                <Heading>{q.prompt}</Heading>
                {q.options.map((o, j) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={o.text}
                    accessibilityState={{
                      selected: answers[q.id] === o.id,
                      disabled: expired || busy,
                    }}
                    key={o.id}
                    disabled={expired || busy}
                    onPress={() => {
                      setAnswers((prev) => ({ ...prev, [q.id]: o.id }));
                      setDirty(true);
                      setConfirm(false);
                    }}
                    style={[
                      s.hstack,
                      {
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: answers[q.id] === o.id ? '#E7EFFC' : colors.soft,
                        borderWidth: 1,
                        borderColor: answers[q.id] === o.id ? '#779ED6' : colors.line,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.muted, fontWeight: '600' }}>
                      {String.fromCharCode(65 + j)}
                    </Text>
                    <Text style={[s.body, { flex: 1, color: colors.ink }]}>{o.text}</Text>
                  </Pressable>
                ))}
              </Card>
            ))}
            <Card>
              <Body>{Object.keys(answers).length} of 5 answered</Body>
              <Button
                title="Save answers"
                secondary
                busy={busy}
                disabled={!dirty || expired}
                onPress={() =>
                  act(async () => {
                    setAttempt(
                      await request(
                        `/attempts/${attempt.id}/responses`,
                        { responses: answers },
                        true,
                        'PUT',
                      ),
                    );
                    setDirty(false);
                  }, 'Answers saved.')
                }
              />
              {confirm ? (
                <>
                  <Body>Submit these answers? You cannot change them after submission.</Body>
                  <Button
                    title="Confirm final submission"
                    busy={busy}
                    disabled={expired}
                    onPress={() =>
                      act(async () => {
                        setAttempt(
                          await request(`/attempts/${attempt.id}/submit`, { responses: answers }),
                        );
                        setDirty(false);
                      }, 'Submission received.')
                    }
                  />
                  <Button title="Keep reviewing" secondary onPress={() => setConfirm(false)} />
                </>
              ) : (
                <Button
                  title="Review and submit"
                  disabled={expired || Object.keys(answers).length !== 5}
                  onPress={() => setConfirm(true)}
                />
              )}
            </Card>
          </>
        )
      )}
    </View>
  );
}
export function Submissions({ id }: { id: string }) {
  const { data, error } = useRemote<Attempt[]>(`/assessments/${id}/submissions`);
  const { data: assessment } = useRemote<Assessment>(`/assessments/${id}`);
  return (
    <View style={s.stack}>
      <Heading>Student responses</Heading>
      <Body>
        Responses are available for teacher review. Scores are not automatically released.
      </Body>
      <RemoteState error={error} loading={!data && !error} />
      {data?.map((a) => (
        <Card key={a.id}>
          <Heading>{a.student_name}</Heading>
          <Pill tone={a.submitted_at ? 'green' : 'gray'}>
            {a.submitted_at ? 'Submitted' : 'In progress / saved'}
          </Pill>
          <Text style={s.caption}>
            {a.submitted_at ? dateText(a.submitted_at) : `Deadline ${dateText(a.deadline)}`} ·
            version {a.version}
          </Text>
          {assessment?.questions?.map((q, i) => (
            <View key={q.id} style={{ gap: 4 }}>
              <Text style={s.rowTitle}>
                {i + 1}. {q.prompt}
              </Text>
              <Body>
                {q.options.find((o) => o.id === a.responses[q.id])?.text || 'No saved answer'}
              </Body>
            </View>
          ))}
        </Card>
      ))}
      {data?.length === 0 && (
        <Empty
          title="Ready when they are"
          body="Student attempts and submissions will appear here."
        />
      )}
    </View>
  );
}
