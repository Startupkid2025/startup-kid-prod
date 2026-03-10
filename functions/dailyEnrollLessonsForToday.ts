import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Runs once daily at 23:00 Israel time.
 * Enrolls all students in today's scheduled lessons (LessonParticipation).
 * Idempotent: uses enrollment_processed_at as a lock flag per ScheduledLesson.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    // Resolve today's date in Israel timezone
    const now = new Date();
    const ilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const todayIL = ilFormatter.format(now); // "YYYY-MM-DD"

    // Fetch all scheduled lessons for today that are active
    const todayLessons = await b.entities.ScheduledLesson.filter({
      scheduled_date: todayIL,
      is_cancelled: false,
      no_class: false,
    });

    if (!todayLessons || todayLessons.length === 0) {
      return Response.json({ success: true, processed: 0, message: `No active lessons for ${todayIL}` });
    }

    let processed = 0;
    let skipped = 0;
    const details = [];

    for (const sl of todayLessons) {
      // Must have lesson_id to create participation records
      if (!sl.lesson_id) {
        details.push({ id: sl.id, skipped: true, reason: 'no lesson_id' });
        continue;
      }

      // Lock check — already processed, skip
      if (sl.enrollment_processed_at) {
        skipped++;
        details.push({ id: sl.id, skipped: true, reason: 'already processed' });
        continue;
      }

      // Fetch the group to get student list
      let group;
      try {
        group = await b.entities.Group.get(sl.group_id);
      } catch (_) {
        details.push({ id: sl.id, skipped: true, reason: `group ${sl.group_id} not found` });
        continue;
      }

      const studentEmails = group?.student_emails || [];

      if (studentEmails.length === 0) {
        // No students — still mark as processed so we don't retry
        await b.entities.ScheduledLesson.update(sl.id, {
          enrollment_processed_at: now.toISOString(),
        });
        details.push({ id: sl.id, enrolled: 0, reason: 'group has no students' });
        processed++;
        continue;
      }

      // Fetch existing participations for this lesson+date to avoid duplicates
      const existing = await b.entities.LessonParticipation.filter({
        lesson_id: sl.lesson_id,
        lesson_date: sl.scheduled_date,
      });

      const alreadyEnrolled = new Set((existing || []).map(p => p.student_email));

      // Only create records for students not yet enrolled
      const toCreate = studentEmails.filter(email => !alreadyEnrolled.has(email));

      if (toCreate.length > 0) {
        const records = toCreate.map(email => ({
          lesson_id: sl.lesson_id,
          student_email: email,
          lesson_date: sl.scheduled_date,
          attended: false,
          watched_recording: false,
          survey_completed: false,
        }));
        await b.entities.LessonParticipation.bulkCreate(records);
      }

      // Set the lock flag
      await b.entities.ScheduledLesson.update(sl.id, {
        enrollment_processed_at: now.toISOString(),
      });

      details.push({
        id: sl.id,
        group: group.group_name,
        lesson_id: sl.lesson_id,
        enrolled: toCreate.length,
        already_had: alreadyEnrolled.size,
      });
      processed++;
    }

    return Response.json({
      success: true,
      date: todayIL,
      total_today: todayLessons.length,
      processed,
      skipped,
      details,
    });

  } catch (error) {
    console.error('dailyEnrollLessonsForToday error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});