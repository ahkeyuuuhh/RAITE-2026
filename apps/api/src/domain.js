import { z } from 'zod';
import { DateTime } from 'luxon';
import { createHash } from 'node:crypto';
export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const fail = (code, message, status = 400) => {
  throw new AppError(code, message, status);
};
export const uuid = z.string().uuid();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const availabilitySchema = z
  .object({
    timezone: z.literal('Asia/Manila'),
    duration: z.number().int().min(10).max(120),
    buffer: z.number().int().min(0).max(60),
    noticeHours: z.number().min(0).max(168),
    horizonDays: z.number().int().min(1).max(60),
    location: z.string().trim().min(1).max(200),
    enabled: z.boolean(),
    windows: z
      .array(
        z
          .object({ weekday: z.number().int().min(1).max(7), start: time, end: time })
          .refine((w) => w.start < w.end, 'Window end must follow start'),
      )
      .max(21),
    blockedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(120),
  })
  .refine(
    (r) =>
      r.windows.every((a, i) =>
        r.windows.every(
          (b, j) => i === j || a.weekday !== b.weekday || a.end <= b.start || b.end <= a.start,
        ),
      ),
    'Availability windows must not overlap',
  );
export const defaults = {
  timezone: 'Asia/Manila',
  duration: 20,
  buffer: 10,
  noticeHours: 1,
  horizonDays: 14,
  location: 'Science faculty room',
  enabled: true,
  windows: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: '09:00', end: '16:00' })),
  blockedDates: [],
};
export function slotsFor(rules, from, days, busy = [], now = new Date()) {
  if (!rules.enabled) return [];
  const today = DateTime.fromJSDate(now).setZone(rules.timezone).startOf('day');
  const first = DateTime.fromISO(from, { zone: rules.timezone });
  if (!first.isValid || first < today || first > today.plus({ days: rules.horizonDays })) return [];
  const slots = [];
  for (let d = 0; d < days; d++) {
    const day = first.plus({ days: d });
    if (
      day > today.plus({ days: rules.horizonDays }) ||
      rules.blockedDates.includes(day.toISODate())
    )
      continue;
    for (const window of rules.windows.filter((w) => w.weekday === day.weekday)) {
      const [h, m] = window.start.split(':').map(Number),
        [eh, em] = window.end.split(':').map(Number);
      const end = day.set({ hour: eh, minute: em });
      for (
        let start = day.set({ hour: h, minute: m });
        start.plus({ minutes: rules.duration + rules.buffer }) <= end;
        start = start.plus({ minutes: rules.duration + rules.buffer })
      ) {
        const finish = start.plus({ minutes: rules.duration }),
          occupied = finish.plus({ minutes: rules.buffer });
        if (start.toMillis() < +now + rules.noticeHours * 3600000) continue;
        if (
          busy.some(
            (b) =>
              start.toMillis() < +new Date(b.occupied_until || b.ends_at) &&
              occupied.toMillis() > +new Date(b.starts_at),
          )
        )
          continue;
        slots.push({
          starts_at: start.toUTC().toISO(),
          ends_at: finish.toUTC().toISO(),
          occupied_until: occupied.toUTC().toISO(),
          location: rules.location,
          timezone: rules.timezone,
        });
      }
    }
  }
  return slots;
}
export const questionSchema = z
  .object({
    id: z.string().min(1).max(60),
    prompt: z.string().trim().min(5).max(1500),
    options: z
      .array(z.object({ id: z.string().min(1).max(60), text: z.string().trim().min(1).max(500) }))
      .length(4),
    correctOptionId: z.string(),
    explanation: z.string().min(1).max(2000),
    sourceParagraph: z.number().int().positive(),
  })
  .superRefine((q, ctx) => {
    if (
      new Set(q.options.map((o) => o.id)).size !== 4 ||
      new Set(q.options.map((o) => o.text.toLowerCase())).size !== 4 ||
      !q.options.some((o) => o.id === q.correctOptionId)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Use four unique choices and one valid correct answer.',
      });
  });
export const bundleSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    lesson: z.string().trim().min(60).max(16000),
    questions: z.array(questionSchema).length(5),
    announcement: z.string().trim().min(3).max(2000),
    announce_at: z.iso.datetime({ offset: true }),
    opens_at: z.iso.datetime({ offset: true }),
    closes_at: z.iso.datetime({ offset: true }),
    duration_minutes: z.number().int().min(1).max(180),
  })
  .superRefine((b, ctx) => {
    if (!(
      Date.parse(b.announce_at) <= Date.parse(b.opens_at) &&
      Date.parse(b.opens_at) < Date.parse(b.closes_at)
    ))
      ctx.addIssue({
        code: 'custom',
        message: 'Announcement must precede opening, and closing must follow opening.',
      });
    const count = paragraphs(b.lesson).length;
    if (
      new Set(b.questions.map((q) => q.id)).size !== 5 ||
      b.questions.some((q) => q.sourceParagraph > count)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Question IDs must be unique and source paragraphs must exist.',
      });
  });
export const paragraphs = (lesson) =>
  lesson
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
export const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function bundleDigest(b) {
  return digest({
    title: b.title,
    lesson: b.lesson,
    questions: b.questions,
    announcement: b.announcement,
    class_id: b.class_id,
    announce_at: new Date(b.announce_at).toISOString(),
    opens_at: new Date(b.opens_at).toISOString(),
    closes_at: new Date(b.closes_at).toISOString(),
    duration_minutes: b.duration_minutes,
    version: b.version,
    audience: 'active_members',
  });
}
export function studentAssessment(a, now = new Date()) {
  const open =
    a.state === 'announced' && +new Date(a.opens_at) <= +now && +now < +new Date(a.closes_at);
  return {
    id: a.id,
    class_id: a.class_id,
    class_name: a.class_name,
    title: a.title,
    version: a.version,
    announcement: a.announcement,
    opens_at: a.opens_at,
    closes_at: a.closes_at,
    duration_minutes: a.duration_minutes,
    state: open ? 'open' : +now >= +new Date(a.closes_at) ? 'closed' : 'scheduled',
    questions: open
      ? a.questions.map(({ id, prompt, options }) => ({ id, prompt, options }))
      : undefined,
  };
}
