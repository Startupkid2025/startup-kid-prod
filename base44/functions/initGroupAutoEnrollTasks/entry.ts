import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * One-time initialization: creates a GroupAutoEnrollTask for every
 * existing Group that doesn't already have one.
 *
 * Run manually from the Base44 dashboard or via API call once.
 * After this, new groups get their tasks created from the frontend.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    // Resolve today in Israel timezone
    const now = new Date();
    const ilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const todayIL = ilFormatter.format(now); // "YYYY-MM-DD"

    // Fetch all groups and existing tasks
    const [allGroups, allTasks] = await Promise.all([
      b.entities.Group.list(),
      b.entities.GroupAutoEnrollTask.list(),
    ]);

    // Build set of group_ids that already have a task
    const existingGroupIds = new Set((allTasks || []).map((t: any) => t.group_id));

    const created: any[] = [];
    const skipped: string[] = [];

    for (const group of allGroups) {
      if (existingGroupIds.has(group.id)) {
        skipped.push(group.group_name || group.id);
        continue;
      }

      // day_of_week and hour may be stored on the group or missing
      const dayOfWeek = group.day_of_week ?? 0;
      const hour = group.hour || '17:00';

      // Calculate the next occurrence of this group's day
      const nextDate = getNextOccurrenceFromToday(dayOfWeek, todayIL);

      await b.entities.GroupAutoEnrollTask.create({
        group_id: group.id,
        group_name: group.group_name || '',
        day_of_week: dayOfWeek,
        check_time: hour,
        next_check_date: nextDate,
        status: 'scheduled',
        retry_count: 0,
        last_check_at: '',
        last_result: '',
        enrolled_count: 0,
        error_message: '',
      });

      created.push({
        group_id: group.id,
        group_name: group.group_name,
        day_of_week: dayOfWeek,
        check_time: hour,
        next_check_date: nextDate,
      });
    }

    return Response.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      details: { created, skipped },
    });

  } catch (error) {
    console.error('initGroupAutoEnrollTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});


/**
 * Returns the next occurrence of `dayOfWeek` on or after `todayStr`.
 * If today IS that day, returns today (so same-day lessons are checked).
 */
function getNextOccurrenceFromToday(dayOfWeek: number, todayStr: string): string {
  const [year, month, day] = todayStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // If today is already the right day, use today
  if (date.getDay() === dayOfWeek) {
    return todayStr;
  }

  // Otherwise advance to the next matching day
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== dayOfWeek);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
