import { DateTime } from 'luxon';
import { pool, one, transaction, lockPeople, audit } from './db.js';
import { role, teacherAccess } from './auth.js';
import { defaults, fail, slotsFor } from './domain.js';

export async function availableSlots(db, user, teacherId, from, days = 7) {
  await teacherAccess(db, user, teacherId);
  const rules = (
    await one(db, 'select rules from classassist.availability where teacher_id=$1', [teacherId])
  )?.rules;
  if (!rules) return [];
  const busy = (
    await db.query(
      `select starts_at,ends_at,occupied_until from classassist.consultations
    where status='booked' and (teacher_id=$1 or student_id=$2) and occupied_until>now()`,
      [teacherId, user.id],
    )
  ).rows;
  return slotsFor(rules, from, days, busy);
}
export async function saveAvailability(user, rules) {
  role(user, 'teacher');
  return transaction(async (db) => {
    await lockPeople(db, [user.id]);
    await db.query(
      `insert into classassist.availability(teacher_id,rules) values($1,$2) on conflict(teacher_id) do update set rules=excluded.rules,updated_at=now()`,
      [user.id, rules],
    );
    const bookings = (
      await db.query(
        `select id,starts_at,ends_at from classassist.consultations where teacher_id=$1 and status='booked' and starts_at>now()`,
        [user.id],
      )
    ).rows;
    const affected = bookings.filter(
      (b) =>
        !slotsFor(
          { ...rules, noticeHours: 0 },
          DateTime.fromJSDate(b.starts_at).setZone(rules.timezone).toISODate(),
          1,
        ).some(
          (s) => +new Date(s.starts_at) === +b.starts_at && +new Date(s.ends_at) === +b.ends_at,
        ),
    );
    return { rules, affectedBookings: affected };
  });
}
export async function book(user, { teacherId, starts_at, requestKey }) {
  role(user, 'student');
  return transaction(async (db) => {
    await lockPeople(db, [user.id, teacherId]);
    await teacherAccess(db, user, teacherId);
    const existing = await one(
      db,
      'select * from classassist.consultations where student_id=$1 and request_key=$2',
      [user.id, requestKey],
    );
    if (existing) {
      if (existing.teacher_id !== teacherId || +existing.starts_at !== +new Date(starts_at))
        fail('IDEMPOTENCY_MISMATCH', 'Use a new confirmation for a different slot.', 409);
      return existing;
    }
    const date = DateTime.fromISO(starts_at).setZone('Asia/Manila').toISODate();
    const slots = await availableSlots(db, user, teacherId, date, 1);
    const slot = slots.find((s) => +new Date(s.starts_at) === +new Date(starts_at));
    if (!slot)
      fail(
        'SLOT_UNAVAILABLE',
        'That slot is no longer available. Refresh available times and choose another.',
        409,
      );
    const receipt = await one(
      db,
      `insert into classassist.consultations(teacher_id,student_id,starts_at,ends_at,occupied_until,location,timezone,request_key)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [
        teacherId,
        user.id,
        slot.starts_at,
        slot.ends_at,
        slot.occupied_until,
        slot.location,
        slot.timezone,
        requestKey,
      ],
    );
    for (const person of [user.id, teacherId]) {
      await db.query(
        `insert into classassist.calendar_events(user_id,reference_id,kind,title,starts_at,ends_at,dedupe_key) values($1,$2,'consultation','Consultation',$3,$4,$5)`,
        [person, receipt.id, slot.starts_at, slot.ends_at, `booking:${receipt.id}:${person}`],
      );
      await db.query(
        `insert into classassist.notifications(user_id,reference_id,title,body,dedupe_key) values($1,$2,'Consultation confirmed',$3,$4)`,
        [
          person,
          receipt.id,
          `${DateTime.fromISO(slot.starts_at).setZone('Asia/Manila').toFormat('MMM d, h:mm a')} · Asia/Manila · ${slot.location}`,
          `booked:${receipt.id}:${person}`,
        ],
      );
    }
    const reminder = +new Date(slot.starts_at) - 15 * 60000;
    if (reminder > Date.now())
      await db.query(
        `insert into classassist.jobs(kind,reference_id,due_at) values('consultation_reminder',$1,$2)`,
        [receipt.id, new Date(reminder)],
      );
    await audit(db, user.id, 'consultation.booked', receipt.id);
    return receipt;
  });
}
export async function cancelBooking(user, id) {
  return transaction(async (db) => {
    const initial = await one(
      db,
      'select * from classassist.consultations where id=$1 and (teacher_id=$2 or student_id=$2)',
      [id, user.id],
    );
    if (!initial) fail('NOT_FOUND', 'Consultation not found.', 404);
    await lockPeople(db, [initial.teacher_id, initial.student_id]);
    const row = await one(
      db,
      "update classassist.consultations set status='canceled' where id=$1 returning *",
      [id],
    );
    await db.query('update classassist.calendar_events set canceled=true where reference_id=$1', [
      id,
    ]);
    await db.query(
      "update classassist.jobs set state='canceled' where reference_id=$1 and state in ('pending','failed')",
      [id],
    );
    for (const person of [row.teacher_id, row.student_id])
      await db.query(
        `insert into classassist.notifications(user_id,reference_id,title,body,dedupe_key) values($1,$2,'Consultation canceled','This consultation was canceled. The time is available for rebooking.',$3) on conflict(dedupe_key) do nothing`,
        [person, id, `cancel:${id}:${person}`],
      );
    await audit(db, user.id, 'consultation.canceled', id);
    return row;
  });
}
