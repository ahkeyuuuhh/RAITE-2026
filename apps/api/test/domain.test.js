import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults,
  slotsFor,
  bundleSchema,
  studentAssessment,
  bundleDigest,
} from '../src/domain.js';
import { sampleLesson, sampleQuestions } from '../src/fixtures.js';
const now = new Date('2026-10-01T00:00:00Z');
test('slots respect notice, occupied buffers, and blocked dates', () => {
  const rules = { ...defaults, windows: [{ weekday: 4, start: '09:00', end: '10:00' }] };
  assert.equal(slotsFor(rules, '2026-10-01', 1, [], now).length, 2);
  assert.equal(
    slotsFor({ ...rules, blockedDates: ['2026-10-01'] }, '2026-10-01', 1, [], now).length,
    0,
  );
  assert.equal(
    slotsFor(
      rules,
      '2026-10-01',
      1,
      [{ starts_at: '2026-10-01T01:20:00Z', occupied_until: '2026-10-01T01:40:00Z' }],
      now,
    ).length,
    0,
  );
  assert.equal(slotsFor({ ...rules, noticeHours: 2 }, '2026-10-01', 1, [], now).length, 0);
  assert.equal(slotsFor({ ...rules, buffer: 11 }, '2026-10-01', 1, [], now).length, 1);
});
const bundle = {
  title: 'Sample quiz',
  class_id: 'example',
  version: 1,
  lesson: sampleLesson,
  questions: sampleQuestions,
  announcement: 'Ready to learn.',
  announce_at: '2026-10-01T00:00:00Z',
  opens_at: '2026-10-01T01:00:00Z',
  closes_at: '2026-10-01T02:00:00Z',
  duration_minutes: 30,
};
test('draft validation rejects missing sources, duplicate choices, and invalid dates', () => {
  assert.ok(bundleSchema.safeParse(bundle).success);
  assert.equal(bundleSchema.safeParse({ ...bundle, closes_at: bundle.opens_at }).success, false);
  assert.equal(
    bundleSchema.safeParse({
      ...bundle,
      questions: sampleQuestions.map((q) => ({ ...q, sourceParagraph: 99 })),
    }).success,
    false,
  );
  assert.equal(
    bundleSchema.safeParse({
      ...bundle,
      questions: sampleQuestions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o, text: 'same' })),
      })),
    }).success,
    false,
  );
});
test('student serialization never returns answer keys, explanations, lesson, or draft questions', () => {
  const visible = studentAssessment(
    { ...bundle, state: 'announced' },
    new Date('2026-10-01T01:10:00Z'),
  );
  assert.equal(visible.questions.length, 5);
  for (const secret of ['correctOptionId', 'explanation', 'sourceParagraph', 'lesson'])
    assert.equal(JSON.stringify(visible).includes(secret), false);
  assert.equal(studentAssessment({ ...bundle, state: 'draft' }, now).questions, undefined);
  assert.equal(
    studentAssessment({ ...bundle, state: 'announced' }, new Date('2026-10-01T02:01:00Z'))
      .questions,
    undefined,
  );
});
test('approval digest binds content, private answers, audience, and schedule', () => {
  assert.notEqual(
    bundleDigest(bundle),
    bundleDigest({ ...bundle, announcement: 'Changed announcement' }),
  );
  assert.notEqual(bundleDigest(bundle), bundleDigest({ ...bundle, class_id: 'different' }));
  assert.notEqual(
    bundleDigest(bundle),
    bundleDigest({
      ...bundle,
      questions: sampleQuestions.map((q) => ({ ...q, correctOptionId: 'other' })),
    }),
  );
});
