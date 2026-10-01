import { pool, one, transaction, lockPeople, audit } from './db.js';
import { bundleDigest } from './domain.js';
async function notify(db, user, classId, ref, title, body, key) {
  await db.query(
    `insert into classassist.notifications(user_id,class_id,reference_id,title,body,dedupe_key) values($1,$2,$3,$4,$5,$6) on conflict(dedupe_key) do nothing`,
    [user, classId, ref, title, body, key],
  );
}
export async function processJob(id) {
  try {
    return await transaction(async (db) => {
      const candidate = await one(
        db,
        "select * from classassist.jobs where id=$1 and state='pending' and due_at<=now()",
        [id],
      );
      if (!candidate) return false;
      // Lock the same aggregate as cancellation/edit before locking its jobs.
      let record;
      if (candidate.kind === 'consultation_reminder') {
        record = await one(db, 'select * from classassist.consultations where id=$1', [
          candidate.reference_id,
        ]);
        if (record) await lockPeople(db, [record.teacher_id, record.student_id]);
        record = await one(db, 'select * from classassist.consultations where id=$1', [
          candidate.reference_id,
        ]);
      } else
        record = await one(db, 'select * from classassist.assessments where id=$1 for update', [
          candidate.reference_id,
        ]);
      const job = await one(
        db,
        "select * from classassist.jobs where id=$1 and state='pending' and due_at<=now() for update skip locked",
        [id],
      );
      if (!job) return false;
      const finish = (state) =>
        db.query(
          'update classassist.jobs set state=$2,finished_at=now(),attempts=attempts+1,last_error=null where id=$1',
          [id, state],
        );
      if (job.kind === 'consultation_reminder') {
        if (!record || record.status !== 'booked' || +record.starts_at <= Date.now()) {
          await finish('canceled');
          return true;
        }
        for (const person of [record.teacher_id, record.student_id])
          await notify(
            db,
            person,
            null,
            record.id,
            'Consultation coming up',
            `Your consultation starts soon. ${record.location}`,
            `reminder:${record.id}:${person}`,
          );
      } else {
        const approval =
          record &&
          (await one(
            db,
            'select * from classassist.approvals where assessment_id=$1 and version=$2 and revoked_at is null',
            [record.id, job.version],
          ));
        if (
          !record ||
          record.version !== job.version ||
          !['approved', 'announced'].includes(record.state) ||
          !approval ||
          approval.digest !== bundleDigest(record) ||
          record.approved_digest !== approval.digest
        ) {
          await finish('canceled');
          return true;
        }
        if (+record.closes_at <= Date.now()) {
          await db.query("update classassist.assessments set state='expired' where id=$1", [
            record.id,
          ]);
          await notify(
            db,
            record.teacher_id,
            record.class_id,
            record.id,
            'Publication window expired',
            'This assessment closed before pending publication completed. Create a new schedule.',
            `expired:${record.id}:${job.version}`,
          );
          await finish('canceled');
          return true;
        }
        const classroom = await one(db, 'select teacher_id from classassist.classes where id=$1', [
          record.class_id,
        ]);
        if (classroom?.teacher_id !== record.teacher_id) {
          await finish('canceled');
          return true;
        }
        const members = (
          await db.query(
            'select student_id from classassist.memberships where class_id=$1 and active',
            [record.class_id],
          )
        ).rows;
        if (job.kind === 'announce') {
          await db.query(
            "update classassist.assessments set state='announced',announced_at=now() where id=$1",
            [record.id],
          );
          await db.query(
            `insert into classassist.calendar_events(class_id,reference_id,version,kind,title,starts_at,ends_at,dedupe_key) values($1,$2,$3,'assessment',$4,$5,$6,$7) on conflict(dedupe_key) do nothing`,
            [
              record.class_id,
              record.id,
              job.version,
              record.title,
              record.opens_at,
              record.closes_at,
              `quiz:${record.id}:${job.version}`,
            ],
          );
          for (const person of [record.teacher_id, ...members.map((m) => m.student_id)])
            await notify(
              db,
              person,
              record.class_id,
              record.id,
              record.title,
              record.announcement,
              `announce:${record.id}:${job.version}:${person}`,
            );
          await audit(db, null, 'assessment.published', record.id);
        } else if (record.state === 'announced' && +record.opens_at > Date.now()) {
          for (const m of members)
            await notify(
              db,
              m.student_id,
              record.class_id,
              record.id,
              'Assessment opens soon',
              record.title,
              `reminder:${record.id}:${job.version}:${m.student_id}`,
            );
        } else {
          await finish('canceled');
          return true;
        }
      }
      await finish('done');
      return true;
    });
  } catch (error) {
    await pool.query(
      `update classassist.jobs set attempts=attempts+1,state=case when attempts>=4 then 'failed' else 'pending' end,
      last_error='Temporary publication failure. Retry is available.',due_at=now()+make_interval(secs=>least(300,power(2,attempts)::int*5)) where id=$1 and state='pending'`,
      [id],
    );
    console.error('Job failed', id, error.code || error.name);
    return false;
  }
}
export async function tick() {
  await pool.query(
    'insert into classassist.worker_heartbeat(id,last_seen) values(1,now()) on conflict(id) do update set last_seen=excluded.last_seen',
  );
  const jobs = (
    await pool.query(
      "select id from classassist.jobs where state='pending' and due_at<=now() order by due_at limit 30",
    )
  ).rows;
  for (const j of jobs) await processJob(j.id);
  return jobs.length;
}
