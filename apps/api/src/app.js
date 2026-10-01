import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { DateTime } from 'luxon';
import { pool, one, transaction, lockPeople, audit } from './db.js';
import { authenticate, role, classAccess } from './auth.js';
import {
  AppError,
  uuid,
  fail,
  defaults,
  availabilitySchema,
  bundleDigest,
  studentAssessment,
  digest,
} from './domain.js';
import { availableSlots, book, cancelBooking, saveAvailability } from './consultations.js';
import {
  createDraft,
  editDraft,
  approve,
  cancelAssessment,
  accessibleAssessment,
  ownedAssessment,
  startAttempt,
  saveAttempt,
} from './assessments.js';
import { aiReady, parseIntent, geminiChat } from './ai.js';
import { sampleLesson } from './fixtures.js';
export const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.WEB_ORIGIN
      ? (process.env.WEB_ORIGIN === '*' ? true : process.env.WEB_ORIGIN.split(',').map((s) => s.trim()))
      : true,
  }),
);
app.use(express.json({ limit: '96kb' }));
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }),
);
const route = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req, res));
  } catch (e) {
    next(e);
  }
};
const id = (req) => uuid.parse(req.params.id);
app.get(
  '/api/health',
  route(async () => {
    await pool.query('select 1');
    const worker = await one(pool, 'select last_seen from classassist.worker_heartbeat where id=1');
    return { ok: true, workerHealthy: Boolean(worker && Date.now() - +worker.last_seen < 15000) };
  }),
);
app.get(
  '/api/config',
  route(async () => ({
    supabaseUrl:
      process.env.SUPABASE_PUBLIC_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '',
    supabaseKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '',
    aiConfigured: aiReady(),
    sampleEnabled:
      process.env.ALLOW_SAMPLE_DRAFTS === 'true' && process.env.NODE_ENV !== 'production',
    timezone: 'Asia/Manila',
  })),
);
app.get(
  '/api/ai/status',
  route(async () => ({
    live: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  })),
);
app.post(
  '/api/ai/chat',
  route(async (req) => {
    const bodySchema = z.object({
      message: z.string().min(1).max(4000),
      history: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(4000),
          }),
        )
        .optional()
        .default([]),
    });
    const parsed = bodySchema.parse(req.body);
    return await geminiChat(parsed.message, parsed.history);
  }),
);
app.use('/api', authenticate);
app.get(
  '/api/me',
  route(async (req) => req.user),
);
app.get(
  '/api/classes',
  route(
    async (req) =>
      (
        await pool.query(
          `select c.id,c.name,c.subject,c.description,c.teacher_id,c.code_expires_at,p.name as teacher_name,
  (select count(*)::int from classassist.memberships where class_id=c.id and active) as member_count
  from classassist.classes c join classassist.profiles p on p.id=c.teacher_id where c.school_id=$1 and
  (c.teacher_id=$2 or exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$2 and m.active)) order by c.created_at`,
          [req.user.school_id, req.user.id],
        )
      ).rows,
  ),
);
app.post(
  '/api/classes',
  route(async (req) => {
    role(req.user, 'teacher');
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        subject: z.string().trim().min(2).max(100),
        description: z.string().max(500).default(''),
      })
      .parse(req.body);
    const code = randomBytes(6).toString('hex').toUpperCase();
    const row = await one(
      pool,
      `insert into classassist.classes(school_id,teacher_id,name,subject,description,code_hash,code_expires_at) values($1,$2,$3,$4,$5,$6,now()+interval '7 days') returning id,name,subject,description,code_expires_at`,
      [req.user.school_id, req.user.id, data.name, data.subject, data.description, digest(code)],
    );
    return { ...row, code };
  }),
);
const joinLimit = rateLimit({ windowMs: 60000, limit: 8 });
app.post(
  '/api/classes/preview',
  joinLimit,
  route(async (req) => {
    role(req.user, 'student');
    const code = z.string().trim().min(6).max(30).parse(req.body.code).toUpperCase();
    const row = await one(
      pool,
      `select id,name,subject from classassist.classes where school_id=$1 and code_hash=$2 and code_expires_at>now()`,
      [req.user.school_id, digest(code)],
    );
    if (!row)
      fail('INVALID_CODE', 'This code is invalid, expired, or belongs to another school.', 404);
    return row;
  }),
);
app.post(
  '/api/classes/join',
  joinLimit,
  route(async (req) => {
    role(req.user, 'student');
    const code = z.string().trim().min(6).max(30).parse(req.body.code).toUpperCase();
    const classId = uuid.parse(req.body.classId);
    return transaction(async (db) => {
      const c = await one(
        db,
        'select * from classassist.classes where id=$1 and school_id=$2 and code_hash=$3 and code_expires_at>now() for update',
        [classId, req.user.school_id, digest(code)],
      );
      if (!c) fail('INVALID_CODE', 'Code expired or changed. Preview the class again.', 404);
      const prior = await one(
        db,
        'select active from classassist.memberships where class_id=$1 and student_id=$2',
        [c.id, req.user.id],
      );
      if (prior && !prior.active)
        fail('MEMBERSHIP_REMOVED', 'Your membership was removed. Contact the teacher.', 403);
      await db.query(
        'insert into classassist.memberships(class_id,student_id) values($1,$2) on conflict do nothing',
        [c.id, req.user.id],
      );
      return { id: c.id, name: c.name };
    });
  }),
);
app.post(
  '/api/classes/:id/code',
  route(async (req) => {
    role(req.user, 'teacher');
    const classId = id(req);
    await classAccess(pool, req.user, classId, true);
    const code = req.body.revoke ? null : randomBytes(6).toString('hex').toUpperCase();
    await pool.query(
      "update classassist.classes set code_hash=$2,code_expires_at=case when $2::text is null then null else now()+interval '7 days' end where id=$1",
      [classId, code ? digest(code) : null],
    );
    return { code };
  }),
);
app.get(
  '/api/classes/:id/members',
  route(async (req) => {
    const classId = id(req);
    await classAccess(pool, req.user, classId, true);
    return (
      await pool.query(
        'select p.id,p.name,m.joined_at from classassist.memberships m join classassist.profiles p on p.id=m.student_id where class_id=$1 and active order by p.name',
        [classId],
      )
    ).rows;
  }),
);
app.delete(
  '/api/classes/:id/members/:studentId',
  route(async (req) => {
    const classId = id(req),
      studentId = uuid.parse(req.params.studentId);
    return transaction(async (db) => {
      const c = await classAccess(db, req.user, classId, true);
      await lockPeople(db, [c.teacher_id, studentId]);
      await db.query(
        'update classassist.memberships set active=false where class_id=$1 and student_id=$2',
        [classId, studentId],
      );
      return { removed: true };
    });
  }),
);
app.get(
  '/api/teachers',
  route(
    async (req) =>
      (
        await pool.query(
          `select distinct p.id,p.name from classassist.profiles p join classassist.classes c on c.teacher_id=p.id
 where p.school_id=$1 and (p.id=$2 or exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$2 and m.active)) order by p.name`,
          [req.user.school_id, req.user.id],
        )
      ).rows,
  ),
);
app.get(
  '/api/teachers/me/availability',
  route(async (req) => {
    role(req.user, 'teacher');
    return (
      (
        await one(pool, 'select rules from classassist.availability where teacher_id=$1', [
          req.user.id,
        ])
      )?.rules || { ...defaults, enabled: false }
    );
  }),
);
app.put(
  '/api/teachers/me/availability',
  route((req) => saveAvailability(req.user, availabilitySchema.parse(req.body))),
);
app.get(
  '/api/teachers/:id/slots',
  route(async (req) =>
    availableSlots(
      pool,
      req.user,
      id(req),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(req.query.from),
      z.coerce
        .number()
        .int()
        .min(1)
        .max(14)
        .parse(req.query.days || 7),
    ),
  ),
);
app.get(
  '/api/consultations',
  route(
    async (req) =>
      (
        await pool.query(
          `select b.*,p.name as teacher_name,s.name as student_name from classassist.consultations b
 join classassist.profiles p on p.id=b.teacher_id join classassist.profiles s on s.id=b.student_id where b.teacher_id=$1 or b.student_id=$1 order by b.starts_at`,
          [req.user.id],
        )
      ).rows,
  ),
);
app.post(
  '/api/consultations',
  route((req) =>
    book(
      req.user,
      z
        .object({ teacherId: uuid, starts_at: z.iso.datetime({ offset: true }), requestKey: uuid })
        .parse(req.body),
    ),
  ),
);
app.post(
  '/api/consultations/:id/cancel',
  route((req) => cancelBooking(req.user, id(req))),
);
app.post(
  '/api/assistant/messages',
  rateLimit({ windowMs: 60000, limit: 8 }),
  route(async (req) => {
    role(req.user, 'student');
    const message = z.string().trim().min(3).max(1500).parse(req.body.message);
    const teachers = (
      await pool.query(
        `select distinct p.id,p.name from classassist.profiles p join classassist.classes c on c.teacher_id=p.id join classassist.memberships m on m.class_id=c.id where m.student_id=$1 and m.active`,
        [req.user.id],
      )
    ).rows;
    const intent = await parseIntent(
      message,
      teachers,
      DateTime.now().setZone('Asia/Manila').toISO(),
    );
    if (intent.clarification || !intent.teacherId || !intent.date || !intent.time)
      return {
        message: intent.clarification || 'Please specify a teacher, date, and time in Asia/Manila.',
        slots: [],
      };
    if (!teachers.some((t) => t.id === intent.teacherId))
      return { message: 'Which of your class teachers would you like to meet?', slots: [] };
    const slots = await availableSlots(pool, req.user, intent.teacherId, intent.date, 7);
    const requested = DateTime.fromISO(`${intent.date}T${intent.time}`, {
      zone: 'Asia/Manila',
    }).toMillis();
    const exact = slots.find((s) => +new Date(s.starts_at) === requested);
    return {
      teacher: teachers.find((t) => t.id === intent.teacherId),
      message: exact
        ? 'This time is available. Review the details and confirm to book.'
        : 'That time is unavailable. Here are the next available options.',
      slots: exact ? [exact] : slots.slice(0, 5),
    };
  }),
);
app.get(
  '/api/sample-lesson',
  route(async () => ({ lesson: sampleLesson })),
);
app.get(
  '/api/assessments',
  route(async (req) => {
    const rows = (
      await pool.query(
        `select a.*,c.name as class_name from classassist.assessments a join classassist.classes c on c.id=a.class_id where c.school_id=$1 and
    (a.teacher_id=$2 or (a.state='announced' and exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$2 and m.active))) order by a.created_at desc`,
        [req.user.school_id, req.user.id],
      )
    ).rows;
    return req.user.role === 'teacher'
      ? rows.map((a) => ({ ...a, digest: bundleDigest(a) }))
      : rows.map((a) => studentAssessment(a));
  }),
);
app.post(
  '/api/classes/:id/assessment-drafts',
  rateLimit({ windowMs: 60000, limit: 5 }),
  route((req) =>
    createDraft(
      req.user,
      id(req),
      z
        .object({
          sample: z.boolean().default(false),
          lesson: z.string().min(60).max(16000),
          objectives: z.string().max(1000).default(''),
          schedule: z.object({
            announce_at: z.iso.datetime({ offset: true }),
            opens_at: z.iso.datetime({ offset: true }),
            closes_at: z.iso.datetime({ offset: true }),
            duration_minutes: z.number().int().min(1).max(180),
          }),
        })
        .parse(req.body),
    ),
  ),
);
app.get(
  '/api/assessments/:id',
  route(async (req) => {
    const a = await accessibleAssessment(pool, req.user, id(req));
    return req.user.role === 'teacher' ? { ...a, digest: bundleDigest(a) } : studentAssessment(a);
  }),
);
app.patch(
  '/api/assessment-drafts/:id',
  route((req) =>
    editDraft(
      req.user,
      id(req),
      z.number().int().positive().parse(req.body.expectedVersion),
      req.body,
    ),
  ),
);
app.post(
  '/api/publication-bundles/:id/approve',
  route((req) => {
    const b = z
      .object({ version: z.number().int().positive(), digest: z.string().length(64) })
      .parse(req.body);
    return approve(req.user, id(req), b.version, b.digest);
  }),
);
app.post(
  '/api/publication-bundles/:id/cancel',
  route((req) => cancelAssessment(req.user, id(req))),
);
app.get(
  '/api/assessments/:id/submissions',
  route(async (req) => {
    await ownedAssessment(pool, req.user, id(req));
    return (
      await pool.query(
        'select a.*,p.name as student_name from classassist.attempts a join classassist.profiles p on p.id=a.student_id where a.assessment_id=$1 order by a.started_at',
        [id(req)],
      )
    ).rows;
  }),
);
app.post(
  '/api/assessments/:id/attempts',
  route((req) => startAttempt(req.user, id(req))),
);
app.put(
  '/api/attempts/:id/responses',
  route((req) =>
    saveAttempt(
      req.user,
      id(req),
      z.record(z.string().max(60), z.string().max(60)).parse(req.body.responses),
    ),
  ),
);
app.post(
  '/api/attempts/:id/submit',
  route((req) =>
    saveAttempt(
      req.user,
      id(req),
      req.body.responses
        ? z.record(z.string().max(60), z.string().max(60)).parse(req.body.responses)
        : undefined,
      true,
    ),
  ),
);
app.get(
  '/api/me/attempts',
  route(
    async (req) =>
      (
        await pool.query(
          `select t.* from classassist.attempts t join classassist.assessments a on a.id=t.assessment_id join classassist.memberships m on m.class_id=a.class_id and m.student_id=t.student_id where t.student_id=$1 and m.active`,
          [req.user.id],
        )
      ).rows,
  ),
);
app.get(
  '/api/me/calendar',
  route(
    async (req) =>
      (
        await pool.query(
          `select e.* from classassist.calendar_events e where not canceled and
  (user_id=$1 or exists(select 1 from classassist.classes c where c.id=e.class_id and (c.teacher_id=$1 or exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$1 and m.active)))) order by starts_at`,
          [req.user.id],
        )
      ).rows,
  ),
);
app.get(
  '/api/me/notifications',
  route(
    async (req) =>
      (
        await pool.query(
          `select n.* from classassist.notifications n where user_id=$1 and (class_id is null or exists(select 1 from classassist.classes c where c.id=n.class_id and (c.teacher_id=$1 or exists(select 1 from classassist.memberships m where m.class_id=c.id and m.student_id=$1 and m.active)))) order by created_at desc limit 100`,
          [req.user.id],
        )
      ).rows,
  ),
);
app.post(
  '/api/me/notifications/:id/read',
  route(async (req) => {
    await pool.query(
      'update classassist.notifications set read_at=now() where id=$1 and user_id=$2',
      [id(req), req.user.id],
    );
    return { read: true };
  }),
);
app.get(
  '/api/jobs',
  route(async (req) => {
    role(req.user, 'teacher');
    return (
      await pool.query(
        `select j.*,a.title from classassist.jobs j join classassist.assessments a on a.id=j.reference_id where a.teacher_id=$1 order by j.due_at desc limit 50`,
        [req.user.id],
      )
    ).rows;
  }),
);
app.post(
  '/api/jobs/:id/retry',
  route(async (req) => {
    role(req.user, 'teacher');
    const job = await one(
      pool,
      `update classassist.jobs j set state='pending',attempts=0,due_at=now() from classassist.assessments a where j.id=$1 and a.id=j.reference_id and a.teacher_id=$2 and j.state='failed' and a.version=j.version and a.state in ('approved','announced') returning j.id`,
      [id(req), req.user.id],
    );
    if (!job) fail('NOT_FOUND', 'This job cannot be retried.', 404);
    return job;
  }),
);
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.issues.map((i) => i.message).join(' ') },
    });
  const status = err.status || 500;
  if (status >= 500) console.error('API error:', err.code || err.name);
  res.status(status).json({
    error: {
      code:
        err instanceof AppError
          ? err.code
          : status === 503
            ? 'SERVICE_UNAVAILABLE'
            : 'REQUEST_FAILED',
      message:
        status >= 500 && !err.status
          ? 'The service is temporarily unavailable. Please try again.'
          : err.message,
    },
  });
});
