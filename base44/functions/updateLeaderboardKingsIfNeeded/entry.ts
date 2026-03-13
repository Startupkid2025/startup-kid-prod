import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scans all student snapshots and recalculates kings for every category.
 * Converted from legacy export-default format to Deno.serve.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;

    const allSnapshots = await b.entities.LeaderboardSnapshot.list();
    const studentSnapshots = (allSnapshots || []).filter((s: any) => s.user_type === 'student');

    if (studentSnapshots.length === 0) {
      return Response.json({ success: true, message: 'No student snapshots found' });
    }

    const kings = await b.entities.LeaderboardKings.list();
    let kingsRecord = kings.length > 0 ? kings[0] : null;

    if (!kingsRecord) {
      kingsRecord = await b.entities.LeaderboardKings.create({
        updated_at: new Date().toISOString(),
      });
    }

    const categories = [
      { key: 'math', emailField: 'math_king_email', valueField: 'math_king_value', snapshotField: 'mastered_math_questions', name: '🔢 מלך החשבון', bonus: '+5 מטבעות לתרגיל' },
      { key: 'vocab', emailField: 'vocab_king_email', valueField: 'vocab_king_value', snapshotField: 'mastered_words', name: '📚 מלך האנגלית', bonus: '+5 מטבעות למילה' },
      { key: 'investment', emailField: 'investment_king_email', valueField: 'investment_king_value', snapshotField: 'investments_value', name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' },
      { key: 'login', emailField: 'login_king_email', valueField: 'login_king_value', snapshotField: 'login_streak', name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' },
      { key: 'work', emailField: 'work_king_email', valueField: 'work_king_value', snapshotField: 'work_hours', name: '💪 מלך העבודה', bonus: '+5 מטבעות לשעה' },
    ];

    const kingsUpdates: Record<string, any> = {};
    const studentsToUpdateCrowns = new Map<string, { add: any[]; remove: string[] }>();

    for (const category of categories) {
      const eligible = studentSnapshots.filter((s: any) => (s[category.snapshotField] || 0) > 0);

      if (eligible.length === 0) {
        const oldKingEmail = kingsRecord[category.emailField];
        if (oldKingEmail) {
          if (!studentsToUpdateCrowns.has(oldKingEmail)) {
            studentsToUpdateCrowns.set(oldKingEmail, { add: [], remove: [] });
          }
          studentsToUpdateCrowns.get(oldKingEmail)!.remove.push(category.key);
          kingsUpdates[category.emailField] = null;
          kingsUpdates[category.valueField] = 0;
        }
        continue;
      }

      const topStudent = eligible.reduce((max: any, s: any) =>
        (s[category.snapshotField] || 0) > (max[category.snapshotField] || 0) ? s : max
      );

      const topValue = topStudent[category.snapshotField] || 0;
      const oldKingEmail = kingsRecord[category.emailField];

      if (topStudent.student_email !== oldKingEmail) {
        kingsUpdates[category.emailField] = topStudent.student_email;
        kingsUpdates[category.valueField] = topValue;

        if (oldKingEmail) {
          if (!studentsToUpdateCrowns.has(oldKingEmail)) {
            studentsToUpdateCrowns.set(oldKingEmail, { add: [], remove: [] });
          }
          studentsToUpdateCrowns.get(oldKingEmail)!.remove.push(category.key);
        }

        if (!studentsToUpdateCrowns.has(topStudent.student_email)) {
          studentsToUpdateCrowns.set(topStudent.student_email, { add: [], remove: [] });
        }
        studentsToUpdateCrowns.get(topStudent.student_email)!.add.push({
          type: category.key,
          name: category.name,
          bonus: category.bonus,
        });
      } else if (topValue !== kingsRecord[category.valueField]) {
        kingsUpdates[category.valueField] = topValue;
      }
    }

    if (Object.keys(kingsUpdates).length > 0) {
      kingsUpdates.updated_at = new Date().toISOString();
      await b.entities.LeaderboardKings.update(kingsRecord.id, kingsUpdates);
    }

    for (const [email, changes] of studentsToUpdateCrowns.entries()) {
      const snapshots = await b.entities.LeaderboardSnapshot.filter({ student_email: email });
      if (snapshots.length > 0) {
        let crowns = snapshots[0].crowns || [];
        if (changes.remove.length > 0) {
          crowns = crowns.filter((c: any) => !changes.remove.includes(c.type));
        }
        for (const crown of changes.add) {
          crowns = crowns.filter((c: any) => c.type !== crown.type);
          crowns.push(crown);
        }
        await b.entities.LeaderboardSnapshot.update(snapshots[0].id, {
          crowns,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Kings updated',
      kingsChanged: Object.keys(kingsUpdates).length > 0,
      studentsUpdated: studentsToUpdateCrowns.size,
    });
  } catch (error) {
    console.error('updateLeaderboardKingsIfNeeded error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
