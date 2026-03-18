export default async function updateKingsForStudent({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Get student snapshot
    const snapshots = await base44.entities.LeaderboardSnapshot.filter({
      student_email: studentEmail
    });

    if (snapshots.length === 0) {
      return { success: false, error: "No snapshot found for student" };
    }

    const studentSnapshot = snapshots[0];

    // Get or create LeaderboardKings singleton
    const kings = await base44.entities.LeaderboardKings.list();
    let kingsRecord = kings.length > 0 ? kings[0] : null;

    if (!kingsRecord) {
      kingsRecord = await base44.entities.LeaderboardKings.create({
        updated_at: new Date().toISOString()
      });
    }

    // Categories to check
    const categories = [
      {
        type: 'math',
        kingEmail: 'math_king_email',
        kingValue: 'math_king_value',
        studentValue: studentSnapshot.mastered_math_questions,
        name: '🔢 מלך החשבון',
        bonus: '+5 מטבעות לתרגיל'
      },
      {
        type: 'vocab',
        kingEmail: 'vocab_king_email',
        kingValue: 'vocab_king_value',
        studentValue: studentSnapshot.mastered_words,
        name: '📚 מלך האנגלית',
        bonus: '+5 מטבעות למילה'
      },
      {
        type: 'investment',
        kingEmail: 'investment_king_email',
        kingValue: 'investment_king_value',
        studentValue: studentSnapshot.investments_value,
        name: '💼 מלך ההשקעות',
        bonus: '+0.1% תשואה יומית'
      },
      {
        type: 'login',
        kingEmail: 'login_king_email',
        kingValue: 'login_king_value',
        studentValue: studentSnapshot.login_streak,
        name: '🔥 מלך הרצף',
        bonus: 'פי 2 על בונוס הרצף'
      },
      {
        type: 'work',
        kingEmail: 'work_king_email',
        kingValue: 'work_king_value',
        studentValue: studentSnapshot.work_hours,
        name: '💪 מלך העבודה',
        bonus: '+5 מטבעות לשעה'
      }
    ];

    const updates = {};
    const snapshotsToUpdate = [];

    for (const category of categories) {
      const currentKingEmail = kingsRecord[category.kingEmail];
      const currentKingValue = kingsRecord[category.kingValue] || 0;

      // Student value must be > 0 to become king
      if (category.studentValue <= 0) {
        // If student was king and value dropped to 0, find new king
        if (currentKingEmail === studentEmail) {
          const allSnapshots = await base44.entities.LeaderboardSnapshot.list();
          const eligible = allSnapshots.filter(s =>
            s.student_email !== studentEmail &&
            s.user_type === 'student' &&
            (category.type === 'math' ? s.mastered_math_questions :
             category.type === 'vocab' ? s.mastered_words :
             category.type === 'investment' ? s.investments_value :
             category.type === 'login' ? s.login_streak :
             s.work_hours) > 0
          );

          if (eligible.length > 0) {
            const newKing = eligible.reduce((max, s) => {
              const val = category.type === 'math' ? s.mastered_math_questions :
                          category.type === 'vocab' ? s.mastered_words :
                          category.type === 'investment' ? s.investments_value :
                          category.type === 'login' ? s.login_streak :
                          s.work_hours;
              const maxVal = category.type === 'math' ? max.mastered_math_questions :
                            category.type === 'vocab' ? max.mastered_words :
                            category.type === 'investment' ? max.investments_value :
                            category.type === 'login' ? max.login_streak :
                            max.work_hours;
              return val > maxVal ? s : max;
            });

            const newKingValue = category.type === 'math' ? newKing.mastered_math_questions :
                                category.type === 'vocab' ? newKing.mastered_words :
                                category.type === 'investment' ? newKing.investments_value :
                                category.type === 'login' ? newKing.login_streak :
                                newKing.work_hours;

            updates[category.kingEmail] = newKing.student_email;
            updates[category.kingValue] = newKingValue;

            // Add crown to new king
            snapshotsToUpdate.push({
              email: newKing.student_email,
              addCrown: { type: category.type, name: category.name, bonus: category.bonus }
            });
          } else {
            // No eligible candidates
            updates[category.kingEmail] = null;
            updates[category.kingValue] = 0;
          }

          // Remove crown from current student
          snapshotsToUpdate.push({
            email: studentEmail,
            removeCrown: category.type
          });
        }
        continue;
      }

      // Student has value > 0 - check if they beat current king
      if (category.studentValue > currentKingValue) {
        // New king!
        updates[category.kingEmail] = studentEmail;
        updates[category.kingValue] = category.studentValue;

        // Remove crown from old king if exists
        if (currentKingEmail && currentKingEmail !== studentEmail) {
          snapshotsToUpdate.push({
            email: currentKingEmail,
            removeCrown: category.type
          });
        }

        // Add crown to new king
        snapshotsToUpdate.push({
          email: studentEmail,
          addCrown: { type: category.type, name: category.name, bonus: category.bonus }
        });
      } else if (currentKingEmail === studentEmail) {
        // Student is still king, update value if changed
        if (category.studentValue !== currentKingValue) {
          updates[category.kingValue] = category.studentValue;
        }
      }
    }

    // Update kings record if needed
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await base44.entities.LeaderboardKings.update(kingsRecord.id, updates);
    }

    // Update snapshots with crowns
    for (const update of snapshotsToUpdate) {
      const snap = await base44.entities.LeaderboardSnapshot.filter({
        student_email: update.email
      });

      if (snap.length > 0) {
        const currentCrowns = snap[0].crowns || [];
        let newCrowns = [...currentCrowns];

        if (update.removeCrown) {
          newCrowns = newCrowns.filter(c => c.type !== update.removeCrown);
        }

        if (update.addCrown) {
          // Remove if exists, then add
          newCrowns = newCrowns.filter(c => c.type !== update.addCrown.type);
          newCrowns.push(update.addCrown);
        }

        await base44.entities.LeaderboardSnapshot.update(snap[0].id, {
          crowns: newCrowns,
          updated_at: new Date().toISOString()
        });
      }
    }

    return { success: true, message: "Kings updated", changedCount: snapshotsToUpdate.length };
  } catch (error) {
    console.error("Error updating kings:", error);
    return { success: false, error: error.message };
  }
}
