import { DateTime } from 'luxon';
import { audit, lockPeople, one, pool, transaction } from './db.js';
import { classAccess, role, teacherAccess } from './auth.js';
import { fail } from './domain.js';

const requestSelect = `
  select r.*, student.name as student_name, teacher.name as teacher_name,
    c.name as class_name, c.subject as class_subject
  from classassist.consultation_requests r
  join classassist.profiles student on student.id=r.student_id
  join classassist.profiles teacher on teacher.id=r.teacher_id
  left join classassist.classes c on c.id=r.class_id`;

export async function listConsultationRequests(user, status) {
  const effectiveStatus = status || (user.role === 'teacher' ? 'pending' : undefined);
  if (user.role === 'teacher') {
    return (
      await pool.query(
        `${requestSelect} where r.teacher_id=$1 and ($2::text is null or r.status=$2)
        order by case when r.status='pending' then 0 else 1 end, r.requested_start`,
        [user.id, effectiveStatus || null],
      )
    ).rows;
  }
  role(user, 'student');
  return (
    await pool.query(
      `${requestSelect} where r.student_id=$1 and ($2::text is null or r.status=$2)
      order by r.created_at desc limit 100`,
      [user.id, effectiveStatus || null],
    )
  ).rows;
}

export async function createConsultationRequest(
  user,
  { teacherId, classId = null, requestedStart, requestedEnd, reason = '' },
) {
  role(user, 'student');
  if (new Date(requestedStart) <= new Date())
    fail('INVALID_REQUEST_TIME', 'Choose a future appointment time.', 400);
  if (new Date(requestedStart) >= new Date(requestedEnd))
    fail('INVALID_REQUEST_TIME', 'The appointment end must be after its start.', 400);

  return transaction(async (db) => {
    await lockPeople(db, [user.id, teacherId]);
    await teacherAccess(db, user, teacherId);
    if (classId) {
      const classroom = await classAccess(db, user, classId);
      if (classroom.teacher_id !== teacherId)
        fail('CLASS_TEACHER_MISMATCH', 'Choose a class taught by this professor.', 400);
    }
    const request = await one(
      db,
      `insert into classassist.consultation_requests
        (student_id,teacher_id,class_id,requested_start,requested_end,reason)
       values($1,$2,$3,$4,$5,$6) returning *`,
      [user.id, teacherId, classId, requestedStart, requestedEnd, reason.trim()],
    );
    await audit(db, user.id, 'consultation_request.created', request.id);
    return request;
  });
}

async function ownedPendingRequest(db, requestId, teacherId) {
  const request = await one(
    db,
    `${requestSelect} where r.id=$1 and r.teacher_id=$2 for update of r`,
    [requestId, teacherId],
  );
  if (!request) fail('NOT_FOUND', 'Appointment request not found.', 404);
  if (request.status !== 'pending')
    fail(
      'REQUEST_NOT_PENDING',
      'This request has already been handled. Refresh to see its status.',
      409,
    );
  return request;
}

export async function approveConsultationRequest(user, requestId) {
  role(user, 'teacher');
  return transaction(async (db) => {
    const initial = await one(
      db,
      `select student_id from classassist.consultation_requests
       where id=$1 and teacher_id=$2`,
      [requestId, user.id],
    );
    if (!initial) fail('NOT_FOUND', 'Appointment request not found.', 404);
    await lockPeople(db, [user.id, initial.student_id]);
    const request = await ownedPendingRequest(db, requestId, user.id);

    const conflict = await one(
      db,
      `select 1 as conflict from classassist.calendar_events e
       where not e.canceled and e.starts_at < $3 and e.ends_at > $2
         and (e.user_id=$1 or exists (
           select 1 from classassist.classes c where c.id=e.class_id and c.teacher_id=$1
         ))
       union all
       select 1 as conflict from classassist.consultations b
       where b.teacher_id=$1 and b.status='booked'
         and b.starts_at < $3 and b.ends_at > $2
       limit 1`,
      [user.id, request.requested_start, request.requested_end],
    );
    if (conflict) fail('SCHEDULE_CONFLICT', 'This time conflicts with an existing event.', 409);

    const availability = await one(
      db,
      'select rules from classassist.availability where teacher_id=$1',
      [user.id],
    );
    const rules = availability?.rules || {};
    const buffer = Number.isInteger(rules.buffer) ? Math.max(0, rules.buffer) : 0;
    const location =
      (typeof rules.location === 'string' && rules.location.trim()) || 'To be confirmed';
    const booking = await one(
      db,
      `insert into classassist.consultations
        (teacher_id,student_id,starts_at,ends_at,occupied_until,location,timezone,request_key)
       values($1,$2,$3,$4,$4::timestamptz + make_interval(mins => $5::int),'Asia/Manila',$6)
       returning *`,
      [
        user.id,
        request.student_id,
        request.requested_start,
        request.requested_end,
        buffer,
        request.id,
      ],
    );

    const titleForTeacher = `Consultation with ${request.student_name}`;
    const titleForStudent = `Consultation with ${request.teacher_name}`;
    const teacherEvent = await one(
      db,
      `insert into classassist.calendar_events
        (user_id,class_id,reference_id,kind,title,starts_at,ends_at,dedupe_key)
       values($1,$2,$3,'consultation',$4,$5,$6,$7) returning *`,
      [
        user.id,
        request.class_id,
        booking.id,
        titleForTeacher,
        booking.starts_at,
        booking.ends_at,
        `booking:${booking.id}:${user.id}`,
      ],
    );
    await db.query(
      `insert into classassist.calendar_events
        (user_id,class_id,reference_id,kind,title,starts_at,ends_at,dedupe_key)
       values($1,$2,$3,'consultation',$4,$5,$6,$7)`,
      [
        request.student_id,
        request.class_id,
        booking.id,
        titleForStudent,
        booking.starts_at,
        booking.ends_at,
        `booking:${booking.id}:${request.student_id}`,
      ],
    );

    const appointmentStart = DateTime.fromJSDate(new Date(booking.starts_at))
      .setZone('Asia/Manila')
      .toFormat('MMM d, h:mm a');
    for (const personId of [user.id, request.student_id]) {
      await db.query(
        `insert into classassist.notifications
          (user_id,class_id,reference_id,title,body,dedupe_key)
         values($1,$2,$3,'Consultation confirmed',$4,$5)
         on conflict(dedupe_key) do nothing`,
        [
          personId,
          request.class_id,
          booking.id,
          `${appointmentStart} · Asia/Manila · ${location}`,
          `booking:${booking.id}:${personId}`,
        ],
      );
    }
    const reminderAt = new Date(new Date(booking.starts_at).getTime() - 15 * 60_000);
    if (reminderAt > new Date())
      await db.query(
        `insert into classassist.jobs(kind,reference_id,due_at)
         values('consultation_reminder',$1,$2) on conflict(kind,reference_id,version) do nothing`,
        [booking.id, reminderAt],
      );

    const updated = await one(
      db,
      `update classassist.consultation_requests set status='approved',updated_at=now()
       where id=$1 returning *`,
      [request.id],
    );
    await audit(db, user.id, 'consultation_request.approved', request.id);
    return { request: { ...request, ...updated }, booking, event: teacherEvent };
  });
}

export async function denyConsultationRequest(user, requestId) {
  role(user, 'teacher');
  return transaction(async (db) => {
    const initial = await one(
      db,
      `select student_id from classassist.consultation_requests
       where id=$1 and teacher_id=$2`,
      [requestId, user.id],
    );
    if (!initial) fail('NOT_FOUND', 'Appointment request not found.', 404);
    await lockPeople(db, [user.id, initial.student_id]);
    const request = await ownedPendingRequest(db, requestId, user.id);
    const updated = await one(
      db,
      `update classassist.consultation_requests set status='denied',updated_at=now()
       where id=$1 returning *`,
      [request.id],
    );
    await audit(db, user.id, 'consultation_request.denied', request.id);
    return { ...request, ...updated };
  });
}
