import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Auto-enroll all students in a group for a scheduled lesson.
 * Called by a scheduled automation every 5 minutes.
 * Idempotent: uses enrollment_processed_at as a lock flag.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin-triggered and scheduled (service-role) calls
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAdmin = true;
    } catch (_) {
      // Called from scheduler without user context — allow via service role
    }

    const now = new Date();
    // Jerusalem timezone offset: +2 (standard) or +3 (DST).
    // We use a simple approach: convert now to IL date string.
    const ilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const ilTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    const todayIL = ilFormatter.format(now);                  // "YYYY-MM-DD"
    const currentTimeIL = ilTimeFormatter.format(now);         // "HH:MM"

    const b = base44.asServiceRole;

    // 1. Fetch all scheduled lessons for today that are not cancelled and not no_class
    const todayLessons = await b.entities.ScheduledLesson.filter({
      scheduled_date: todayIL,
      is_cancelled: false,
      no_class: false,
    });

    if (!todayLessons || todayLessons.length === 0) {
      return Response.json({ processed: 0, message: 'No lessons today' });
    }

    let processed = 0;
    let skipped = 0;
    const details = [];

    for (const sl of todayLessons) {
      // Must have a lesson_id and start_time to enroll
      if (!sl.lesson_id || !sl.start_time) {
        details.push({ id: sl.id, reason: 'missing lesson_id or start_time' });
        continue;
      }

      // 2. Lock check: already processed?
      if (sl.enrollment_processed_at) {
        skipped++;
        continue;
      }

      // 3. Time check: only process if start_time <= currentTimeIL
      // Compare "HH:MM" strings lexicographically
      if (sl.start_time > currentTimeIL) {
        details.push({ id: sl.id, reason: `not yet — starts at ${sl.start_time}, now ${currentTimeIL}` });
        continue;
      }

      // 4. Fetch group to get student list
      let group;
      try {
        group = await b.entities.Group.get(sl.group_id);
      } catch (_) {
        details.push({ id: sl.id, reason: `group ${sl.group_id} not found` });
        continue;
      }

      const studentEmails = group?.student_emails || [];
      if (studentEmails.length === 0) {
        // Mark as processed even if no students — prevents retry
        await b.entities.ScheduledLesson.update(sl.id, {
          enrollment_processed_at: now.toISOString()
        });
        details.push({ id: sl.id, reason: 'group has no students — marked done' });
        processed++;
        continue;
      }

      // 5. Fetch existing participations for this lesson to avoid duplicates
      const existingParticipations = await b.entities.LessonParticipation.filter({
        lesson_id: sl.lesson_id,
        lesson_date: sl.scheduled_date,
      });

      const alreadyEnrolled = new Set(
        (existingParticipations || []).map(p => p.student_email)
      );

      // 6. Create missing participation records
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

      // 7. Set the lock flag so this scheduled lesson won't be processed again
      await b.entities.ScheduledLesson.update(sl.id, {
        enrollment_processed_at: now.toISOString()
      });

      details.push({
        id: sl.id,
        lesson_id: sl.lesson_id,
        group: group.group_name,
        enrolled: toCreate.length,
        already_had: alreadyEnrolled.size,
      });
      processed++;
    }

    return Response.json({
      success: true,
      processed,
      skipped,
      total_today: todayLessons.length,
      details,
    });

  } catch (error) {
    console.error('autoEnrollLessonParticipation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});