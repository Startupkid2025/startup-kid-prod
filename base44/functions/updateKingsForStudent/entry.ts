import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Checks if a specific student should become king in any category,
 * and updates crowns accordingly.
 * Converted from legacy export-default format to Deno.serve.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { studentEmail } = body;

    if (!studentEmail) {
      return Response.json({ success: false, error: 'studentEmail is required' }, { status: 400 });
    }

    const snapshots = await b.entities.LeaderboardSnapshot.filter({
      student_email: studentEmail,
    });

    if (snapshots.length === 0) {
      return Response.json({ success: false, error: 'No snapshot found for student' });
    }

    const studentSnapshot = snapshots[0];

    const kings = await b.entities.LeaderboardKings.list();
    let kingsRecord = kings.length > 0 ? kings[0] : null;

    if (!kingsRecord) {
      kingsRecord = await b.entities.LeaderboardKings.create({
        updated_at: new Date().toISOString(),
      });
    }

    const categories = [
      { type: 'math', kingEmail: 'math_king_email', kingValue: 'math_king_value', studentValue: studentSnapshot.mastered_math_questions, name: '🔢 מלך החשבון', bonus: '+5 מטבעות לתרגיל' },
      { type: 'vocab', kingEmail: 'vocab_king_email', kingValue: 'vocab_king_value', studentValue: studentSnapshot.mastered_words, name: '📚 מלך האנגלית', bonus: '+5 מטבעות למילה' },
      { type: 'investment', kingEmail: 'investment_king_email', kingValue: 'investment_king_value', studentValue: studentSnapshot.investments_value, name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' },
      { type: 'login', kingEmail: 'login_king_email', kingValue: 'login_king_value', studentValue: studentSnapshot.login_streak, name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' },
      { type: 'work', kingEmail: 'work_king_email', kingValue: 'work_king_value', studentValue: studentSnapshot.work_hours, name: '💪 מלך העבודה', bonus: '+5 מטבעות לשעה' },
    ];

    const updates: Record<string, any> = {};
    const snapshotsToUpdate: any[] = [];

    for (const category of categories) {
      const currentKingEmail = kingsRecord[category.kingEmail];
      const currentKingValue = kingsRecord[category.kingValue] || 0;

      if (category.studentValue <= 0) {
        if (currentKingEmail === studentEmail) {
          const allSnapshots = await b.entities.LeaderboardSnapshot.list();
          const eligible = allSnapshots.filter((s: any) =>
            s.student_email !== studentEmail &&
            s.user_type === 'student' &&
            (category.type === 'math' ? s.mastered_math_questions :
             category.type === 'vocab' ? s.mastered_words :
             category.type === 'investment' ? s.investments_value :
             category.type === 'login' ? s.login_streak :
             s.work_hours) > 0
          );

          if (eligible.length > 0) {
            const newKing = eligible.reduce((max: any, s: any) => {
              const val = category.type === 'math' ? s.mastered_math_questions :
                          category.type === 'vocab' ? s.mastered_words :
                          category.type === 'investment' ? s.investments_value :
                          category.type === 'login' ? s.login_streak : s.work_hours;
              const maxVal = category.type === 'math' ? max.mastered_math_questions :
                            category.type === 'vocab' ? max.mastered_words :
                            category.type === 'investment' ? max.investments_value :
                            category.type === 'login' ? max.login_streak : max.work_hours;
              return val > maxVal ? s : max;
            });

            const newKingValue = category.type === 'math' ? newKing.mastered_math_questions :
                                category.type === 'vocab' ? newKing.mastered_words :
                                category.type === 'investment' ? newKing.investments_value :
                                category.type === 'login' ? newKing.login_streak : newKing.work_hours;

            updates[category.kingEmail] = newKing.student_email;
            updates[category.kingValue] = newKingValue;
            snapshotsToUpdate.push({ email: newKing.student_email, addCrown: { type: category.type, name: category.name, bonus: category.bonus } });
          } else {
            updates[category.kingEmail] = null;
            updates[category.kingValue] = 0;
          }
          snapshotsToUpdate.push({ email: studentEmail, removeCrown: category.type });
        }
        continue;
      }

      if (category.studentValue > currentKingValue) {
        updates[category.kingEmail] = studentEmail;
        updates[category.kingValue] = category.studentValue;
        if (currentKingEmail && currentKingEmail !== studentEmail) {
          snapshotsToUpdate.push({ email: currentKingEmail, removeCrown: category.type });
        }
        snapshotsToUpdate.push({ email: studentEmail, addCrown: { type: category.type, name: category.name, bonus: category.bonus } });
      } else if (currentKingEmail === studentEmail && category.studentValue !== currentKingValue) {
        updates[category.kingValue] = category.studentValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await b.entities.LeaderboardKings.update(kingsRecord.id, updates);
    }

    for (const update of snapshotsToUpdate) {
      const snap = await b.entities.LeaderboardSnapshot.filter({ student_email: update.email });
      if (snap.length > 0) {
        let newCrowns = [...(snap[0].crowns || [])];
        if (update.removeCrown) {
          newCrowns = newCrowns.filter((c: any) => c.type !== update.removeCrown);
        }
        if (update.addCrown) {
          newCrowns = newCrowns.filter((c: any) => c.type !== update.addCrown.type);
          newCrowns.push(update.addCrown);
        }
        await b.entities.LeaderboardSnapshot.update(snap[0].id, { crowns: newCrowns, updated_at: new Date().toISOString() });
      }
    }

    return Response.json({ success: true, message: 'Kings updated', changedCount: snapshotsToUpdate.length });
  } catch (error) {
    console.error('updateKingsForStudent error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
