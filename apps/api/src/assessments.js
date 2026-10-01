import { pool, one, transaction, audit, lockPeople } from './db.js';
import { classAccess, role } from './auth.js';
import { fail, bundleSchema, bundleDigest, studentAssessment } from './domain.js';
import { generateDraft } from './ai.js';
import { sampleLesson, sampleQuestions } from './fixtures.js';

export async function ownedAssessment(db, user, id, lock = false) {
  role(user, 'teacher');
  const a = await one(
    db,
    `select * from classassist.assessments where id=$1 and teacher_id=$2 ${lock ? 'for update' : ''}`,
    [id, user.id],
  );
  if (!a) fail('NOT_FOUND', 'Assessment not found.', 404);
  await classAccess(db, user, a.class_id, true);
  return a;
}
export async function createDraft(user, classId, input) {
  role(user, 'teacher');
  await classAccess(pool, user, classId, true);
  const sample = input.sample === true;
  if (
    sample &&
    (process.env.ALLOW_SAMPLE_DRAFTS !== 'true' || process.env.NODE_ENV === 'production')
  )
    fail('SAMPLE_DISABLED', 'Sample drafts are unavailable.', 403);
  const lesson = sample ? sampleLesson : input.lesson;
  const content = sample
    ? {
        title: 'Photosynthesis · Knowledge check',
        questions: sampleQuestions,
        announcement:
          'Explore how plants turn sunlight into energy. Complete the five-question knowledge check during the scheduled window.',
      }
    : await generateDraft(lesson, input.objectives);
  const bundle = bundleSchema.parse({ ...content, lesson, ...input.schedule });
  return transaction(async (db) => {
    await classAccess(db, user, classId, true);
    const a = await one(
      db,
      `insert into classassist.assessments(class_id,teacher_id,title,lesson,questions,announcement,announce_at,opens_at,closes_at,duration_minutes,source)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [
        classId,
        user.id,
        bundle.title,
        lesson,
        JSON.stringify(bundle.questions),
        bundle.announcement,
        bundle.announce_at,
        bundle.opens_at,
        bundle.closes_at,
        bundle.duration_minutes,
        sample ? 'saved_sample' : 'live_ai',
      ],
    );
    await audit(db, user.id, 'assessment.drafted', a.id);
    return { ...a, digest: bundleDigest(a) };
  });
}
async function revoke(db, id) {
  await db.query(
    'update classassist.approvals set revoked_at=now() where assessment_id=$1 and revoked_at is null',
    [id],
  );
  await db.query(
    "update classassist.jobs set state='canceled' where reference_id=$1 and state in ('pending','failed')",
    [id],
  );
  await db.query('update classassist.calendar_events set canceled=true where reference_id=$1', [
    id,
  ]);
  // Superseded announcements/reminders should no longer invite students to stale work.
  await db.query('delete from classassist.notifications where reference_id=$1', [id]);
}
export async function editDraft(user, id, expectedVersion, input) {
  const b = bundleSchema.parse(input);
  return transaction(async (db) => {
    const a = await ownedAssessment(db, user, id, true);
    if (a.version !== expectedVersion)
      fail('STALE_VERSION', 'This draft changed. Reload it before saving.', 409);
    if (a.state === 'announced' && Date.now() >= +a.opens_at)
      fail('ALREADY_OPEN', 'An opened assessment cannot be edited. Create a new draft.', 409);
    await revoke(db, id);
    const updated = await one(
      db,
      `update classassist.assessments set title=$2,lesson=$3,questions=$4,announcement=$5,announce_at=$6,opens_at=$7,closes_at=$8,duration_minutes=$9,version=version+1,state='draft',approved_digest=null,announced_at=null where id=$1 returning *`,
      [
        id,
        b.title,
        b.lesson,
        JSON.stringify(b.questions),
        b.announcement,
        b.announce_at,
        b.opens_at,
        b.closes_at,
        b.duration_minutes,
      ],
    );
    await audit(db, user.id, 'assessment.edited', id);
    return { ...updated, digest: bundleDigest(updated) };
  });
}
export async function approve(user, id, version, digest) {
  return transaction(async (db) => {
    const a = await ownedAssessment(db, user, id, true);
    if (a.version !== version || bundleDigest(a) !== digest)
      fail('STALE_VERSION', 'The reviewed draft changed. Reload and review again.', 409);
    if (a.state === 'approved' || a.state === 'announced') return a;
    if (a.state !== 'draft') fail('INVALID_STATE', 'Only a draft can be approved.', 409);
    if (+a.closes_at <= Date.now() || +a.opens_at < Date.now())
      fail('INVALID_SCHEDULE', 'Choose an opening and closing time in the future.', 409);
    await db.query(
      `insert into classassist.approvals(assessment_id,version,approver_id,digest) values($1,$2,$3,$4)`,
      [id, version, user.id, digest],
    );
    await db.query(
      `insert into classassist.jobs(kind,reference_id,version,due_at) values('announce',$1,$2,$3)`,
      [id, version, a.announce_at],
    );
    const reminder = +a.opens_at - 15 * 60000;
    if (reminder > Date.now() && reminder > +a.announce_at)
      await db.query(
        `insert into classassist.jobs(kind,reference_id,version,due_at) values('assessment_reminder',$1,$2,$3)`,
        [id, version, new Date(reminder)],
      );
    const result = await one(
      db,
      "update classassist.assessments set state='approved',approved_digest=$2 where id=$1 returning *",
      [id, digest],
    );
    await audit(db, user.id, 'assessment.approved', id);
    return result;
  });
}
export async function cancelAssessment(user, id) {
  return transaction(async (db) => {
    const a = await ownedAssessment(db, user, id, true);
    if (a.state === 'announced' && +a.opens_at <= Date.now())
      fail('ALREADY_OPEN', 'An open assessment cannot be canceled.', 409);
    await revoke(db, id);
    await audit(db, user.id, 'assessment.canceled', id);
    return one(
      db,
      "update classassist.assessments set state='canceled',approved_digest=null where id=$1 returning *",
      [id],
    );
  });
}
export async function accessibleAssessment(db, user, id, lock = false) {
  const a = await one(
    db,
    `select * from classassist.assessments where id=$1 ${lock ? 'for update' : ''}`,
    [id],
  );
  if (!a) fail('NOT_FOUND', 'Assessment not found.', 404);
  await classAccess(db, user, a.class_id);
  if (user.role === 'student' && (a.state !== 'announced' || a.approved_digest !== bundleDigest(a)))
    fail('NOT_FOUND', 'Assessment not available.', 404);
  return a;
}
function isOpen(a) {
  if (a.state !== 'announced' || Date.now() < +a.opens_at || Date.now() >= +a.closes_at)
    fail('ASSESSMENT_NOT_OPEN', 'This assessment is outside its answering window.', 409);
}
export async function startAttempt(user, id) {
  role(user, 'student');
  return transaction(async (db) => {
    await lockPeople(db, [user.id]);
    const a = await accessibleAssessment(db, user, id, true);
    isOpen(a);
    const attempt = await one(
      db,
      `insert into classassist.attempts(assessment_id,version,student_id,deadline) values($1,$2,$3,$4)
      on conflict(assessment_id,version,student_id) do update set student_id=excluded.student_id returning *`,
      [
        id,
        a.version,
        user.id,
        new Date(Math.min(+a.closes_at, Date.now() + a.duration_minutes * 60000)),
      ],
    );
    return { attempt, assessment: studentAssessment(a), server_time: new Date().toISOString() };
  });
}
export async function saveAttempt(user, id, responses, submit = false) {
  role(user, 'student');
  return transaction(async (db) => {
    await lockPeople(db, [user.id]);
    const initial = await one(
      db,
      'select assessment_id from classassist.attempts where id=$1 and student_id=$2',
      [id, user.id],
    );
    if (!initial) fail('NOT_FOUND', 'Attempt not found.', 404);
    const a = await accessibleAssessment(db, user, initial.assessment_id, true);
    const attempt = await one(db, 'select * from classassist.attempts where id=$1 for update', [
      id,
    ]);
    if (attempt.submitted_at) return attempt;
    isOpen(a);
    if (a.version !== attempt.version || Date.now() >= +attempt.deadline)
      fail(
        'DEADLINE_PASSED',
        'The deadline has passed. Previously saved answers are retained.',
        409,
      );
    const answers = responses ?? attempt.responses;
    for (const [qid, option] of Object.entries(answers))
      if (!a.questions.some((q) => q.id === qid && q.options.some((o) => o.id === option)))
        fail('INVALID_ANSWER', 'An answer does not belong to this assessment.');
    if (submit && Object.keys(answers).length !== a.questions.length)
      fail('INCOMPLETE', 'Answer all five questions before submitting.');
    const saved = await one(
      db,
      `update classassist.attempts set responses=$2,submitted_at=case when $3 then now() else null end where id=$1 returning *`,
      [id, answers, submit],
    );
    if (submit) await audit(db, user.id, 'attempt.submitted', id);
    return saved;
  });
}
