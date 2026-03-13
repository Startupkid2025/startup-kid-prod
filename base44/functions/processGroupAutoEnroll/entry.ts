import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Automated Group Enrollment Dispatcher
 *
 * Scheduled to run every 5 minutes via Base44 automation.
 *
 * For each GroupAutoEnrollTask whose next_check_date is today
 * and check_time <= current time (Israel):
 *
 * 1. Look for a ScheduledLesson for that group on next_check_date
 * 2. If found (with lesson_id, not cancelled, not no_class):
 *    → Enroll all group students (reuses autoEnrollLessonParticipation logic)
 *    → Advance next_check_date to the group's next regular day_of_week
 *    → Reset retry_count to 0
 * 3. If not found (or cancelled/no_class):
 *    → Set next_check_date to tomorrow (retry daily)
 *    → Increment retry_count
 * 4. New groups are picked up automatically when their task is created.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    const now = new Date();

    // ── Timezone: Jerusalem ──
    const ilDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const ilTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    const todayIL = ilDateFormatter.format(now);       // "YYYY-MM-DD"
    const currentTimeIL = ilTimeFormatter.format(now);  // "HH:MM"

    // ── 1. Fetch all active tasks due today ──
    const allTasks = await b.entities.GroupAutoEnrollTask.filter({
      next_check_date: todayIL,
    });

    // Only process tasks with status "scheduled" or "retrying"
    const dueTasks = (allTasks || []).filter(
      t => (t.status === 'scheduled' || t.status === 'retrying') && t.check_time <= currentTimeIL
    );

    if (dueTasks.length === 0) {
      return Response.json({ processed: 0, message: 'No tasks due right now' });
    }

    let processed = 0;
    let retried = 0;
    const details: any[] = [];

    for (const task of dueTasks) {
      try {
        // ── 2. Look for a ScheduledLesson for this group on check date ──
        const scheduledLessons = await b.entities.ScheduledLesson.filter({
          group_id: task.group_id,
          scheduled_date: task.next_check_date,
        });

        // Find a valid lesson (has lesson_id, not cancelled, not no_class)
        const validLesson = (scheduledLessons || []).find(
          sl => sl.lesson_id && !sl.is_cancelled && !sl.no_class
        );

        if (validLesson) {
          // ── 3a. Lesson found → Enroll all students ──

          // Skip if already processed by autoEnrollLessonParticipation
          if (validLesson.enrollment_processed_at) {
            // Already enrolled — just advance the schedule
            const nextDate = getNextOccurrence(task.day_of_week, todayIL);
            await b.entities.GroupAutoEnrollTask.update(task.id, {
              status: 'scheduled',
              next_check_date: nextDate,
              retry_count: 0,
              last_check_at: now.toISOString(),
              last_result: 'already_processed',
              error_message: '',
            });
            details.push({ task_id: task.id, group: task.group_name, result: 'already_processed' });
            processed++;
            continue;
          }

          // Fetch group to get student list
          let group;
          try {
            group = await b.entities.Group.get(task.group_id);
          } catch (_) {
            await updateTaskError(b, task, now, `Group ${task.group_id} not found`);
            details.push({ task_id: task.id, result: 'error', reason: 'group not found' });
            continue;
          }

          const studentEmails = group?.student_emails || [];

          if (studentEmails.length === 0) {
            // No students — mark lesson as processed, advance schedule
            await b.entities.ScheduledLesson.update(validLesson.id, {
              enrollment_processed_at: now.toISOString(),
            });
            const nextDate = getNextOccurrence(task.day_of_week, todayIL);
            await b.entities.GroupAutoEnrollTask.update(task.id, {
              status: 'scheduled',
              next_check_date: nextDate,
              retry_count: 0,
              last_check_at: now.toISOString(),
              last_result: 'enrolled',
              enrolled_count: 0,
              error_message: '',
            });
            details.push({ task_id: task.id, group: task.group_name, result: 'no_students' });
            processed++;
            continue;
          }

          // Fetch existing participations to avoid duplicates
          const existingParticipations = await b.entities.LessonParticipation.filter({
            lesson_id: validLesson.lesson_id,
            lesson_date: validLesson.scheduled_date,
          });

          const alreadyEnrolled = new Set(
            (existingParticipations || []).map((p: any) => p.student_email)
          );

          const toCreate = studentEmails.filter((email: string) => !alreadyEnrolled.has(email));

          if (toCreate.length > 0) {
            const records = toCreate.map((email: string) => ({
              lesson_id: validLesson.lesson_id,
              student_email: email,
              lesson_date: validLesson.scheduled_date,
              attended: false,
              watched_recording: false,
              survey_completed: false,
            }));
            await b.entities.LessonParticipation.bulkCreate(records);
          }

          // Set the lock flag on the ScheduledLesson
          await b.entities.ScheduledLesson.update(validLesson.id, {
            enrollment_processed_at: now.toISOString(),
          });

          // Advance task to next regular occurrence
          const nextDate = getNextOccurrence(task.day_of_week, todayIL);
          await b.entities.GroupAutoEnrollTask.update(task.id, {
            status: 'scheduled',
            next_check_date: nextDate,
            retry_count: 0,
            last_check_at: now.toISOString(),
            last_result: 'enrolled',
            enrolled_count: toCreate.length,
            error_message: '',
          });

          details.push({
            task_id: task.id,
            group: task.group_name,
            result: 'enrolled',
            new_enrollments: toCreate.length,
            already_had: alreadyEnrolled.size,
            next_check: nextDate,
          });
          processed++;

        } else {
          // ── 3b. No valid lesson found → Retry tomorrow ──
          const tomorrow = addDays(task.next_check_date, 1);
          const newRetryCount = (task.retry_count || 0) + 1;

          await b.entities.GroupAutoEnrollTask.update(task.id, {
            status: 'retrying',
            next_check_date: tomorrow,
            retry_count: newRetryCount,
            last_check_at: now.toISOString(),
            last_result: 'no_lesson',
            error_message: `No valid lesson found for ${task.next_check_date}. Retry #${newRetryCount} scheduled for ${tomorrow}.`,
          });

          details.push({
            task_id: task.id,
            group: task.group_name,
            result: 'no_lesson_retry',
            retry_count: newRetryCount,
            next_check: tomorrow,
          });
          retried++;
        }
      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError);
        await updateTaskError(b, task, now, taskError.message || 'Unknown error');
        details.push({ task_id: task.id, result: 'error', reason: taskError.message });
      }
    }

    return Response.json({
      success: true,
      date: todayIL,
      time: currentTimeIL,
      total_due: dueTasks.length,
      processed,
      retried,
      details,
    });

  } catch (error) {
    console.error('processGroupAutoEnroll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});


// ── Helper: calculate next occurrence of a day_of_week after a given date ──
function getNextOccurrence(dayOfWeek: number, afterDateStr: string): string {
  const [year, month, day] = afterDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Advance at least 1 day, then find the next matching day_of_week
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== dayOfWeek);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Helper: add N days to a YYYY-MM-DD string ──
function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Helper: update task with error status ──
async function updateTaskError(b: any, task: any, now: Date, message: string) {
  try {
    const tomorrow = addDays(task.next_check_date, 1);
    await b.entities.GroupAutoEnrollTask.update(task.id, {
      status: 'retrying',
      next_check_date: tomorrow,
      retry_count: (task.retry_count || 0) + 1,
      last_check_at: now.toISOString(),
      last_result: 'error',
      error_message: message,
    });
  } catch (_) {
    console.error('Failed to update task error status:', _);
  }
}
