export default async function updateLeaderboardKingsIfNeeded({ changedStudentEmail }, { base44 }) {
  try {
    // Get top 50 snapshots for efficiency (student type only)
    const allSnapshots = await base44.entities.LeaderboardSnapshot.list("-total_value", 100);
    const studentSnapshots = allSnapshots.filter(s => s.user_type === 'student');

    if (studentSnapshots.length === 0) {
      return { success: true, message: "No student snapshots found" };
    }

    // Get or create LeaderboardKings singleton
    const kings = await base44.entities.LeaderboardKings.list();
    let kingsRecord = kings.length > 0 ? kings[0] : null;

    if (!kingsRecord) {
      kingsRecord = await base44.entities.LeaderboardKings.create({
        updated_at: new Date().toISOString()
      });
    }

    // Define categories
    const categories = [
      { key: 'math', emailField: 'math_king_email', valueField: 'math_king_value', snapshotField: 'mastered_math_questions', name: '🔢 מלך החשבון', bonus: '+5 מטבעות לתרגיל' },
      { key: 'vocab', emailField: 'vocab_king_email', valueField: 'vocab_king_value', snapshotField: 'mastered_words', name: '📚 מלך האנגלית', bonus: '+5 מטבעות למילה' },
      { key: 'investment', emailField: 'investment_king_email', valueField: 'investment_king_value', snapshotField: 'investments_value', name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' },
      { key: 'login', emailField: 'login_king_email', valueField: 'login_king_value', snapshotField: 'login_streak', name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' },
      { key: 'work', emailField: 'work_king_email', valueField: 'work_king_value', snapshotField: 'work_hours', name: '💪 מלך העבודה', bonus: '+5 מטבעות לשעה' }
    ];

    const kingsUpdates = {};
    const studentsToUpdateCrowns = new Map(); // email -> { add: [], remove: [] }

    for (const category of categories) {
      // Find current top student
      const eligible = studentSnapshots.filter(s => (s[category.snapshotField] || 0) > 0);
      
      if (eligible.length === 0) {
        // No one qualifies
        const oldKingEmail = kingsRecord[category.emailField];
        if (oldKingEmail) {
          if (!studentsToUpdateCrowns.has(oldKingEmail)) {
            studentsToUpdateCrowns.set(oldKingEmail, { add: [], remove: [] });
          }
          studentsToUpdateCrowns.get(oldKingEmail).remove.push(category.key);
          kingsUpdates[category.emailField] = null;
          kingsUpdates[category.valueField] = 0;
        }
        continue;
      }

      const topStudent = eligible.reduce((max, s) => 
        (s[category.snapshotField] || 0) > (max[category.snapshotField] || 0) ? s : max
      );

      const topValue = topStudent[category.snapshotField] || 0;
      const oldKingEmail = kingsRecord[category.emailField];

      if (topStudent.student_email !== oldKingEmail) {
        // King changed!
        kingsUpdates[category.emailField] = topStudent.student_email;
        kingsUpdates[category.valueField] = topValue;

        // Remove crown from old king
        if (oldKingEmail) {
          if (!studentsToUpdateCrowns.has(oldKingEmail)) {
            studentsToUpdateCrowns.set(oldKingEmail, { add: [], remove: [] });
          }
          studentsToUpdateCrowns.get(oldKingEmail).remove.push(category.key);
        }

        // Add crown to new king
        if (!studentsToUpdateCrowns.has(topStudent.student_email)) {
          studentsToUpdateCrowns.set(topStudent.student_email, { add: [], remove: [] });
        }
        studentsToUpdateCrowns.get(topStudent.student_email).add.push({
          type: category.key,
          name: category.name,
          bonus: category.bonus
        });
      } else if (topValue !== kingsRecord[category.valueField]) {
        // Same king, different value
        kingsUpdates[category.valueField] = topValue;
      }
    }

    // Update kings record
    if (Object.keys(kingsUpdates).length > 0) {
      kingsUpdates.updated_at = new Date().toISOString();
      await base44.entities.LeaderboardKings.update(kingsRecord.id, kingsUpdates);
    }

    // Update crowns for affected students
    for (const [email, changes] of studentsToUpdateCrowns.entries()) {
      const snapshots = await base44.entities.LeaderboardSnapshot.filter({ student_email: email });
      
      if (snapshots.length > 0) {
        let crowns = snapshots[0].crowns || [];

        // Remove specified crowns
        if (changes.remove.length > 0) {
          crowns = crowns.filter(c => !changes.remove.includes(c.type));
        }

        // Add new crowns
        for (const crown of changes.add) {
          // Remove if exists, then add
          crowns = crowns.filter(c => c.type !== crown.type);
          crowns.push(crown);
        }

        await base44.entities.LeaderboardSnapshot.update(snapshots[0].id, {
          crowns,
          updated_at: new Date().toISOString()
        });
      }
    }

    return { 
      success: true, 
      message: "Kings updated",
      kingsChanged: Object.keys(kingsUpdates).length > 0,
      studentsUpdated: studentsToUpdateCrowns.size
    };
  } catch (error) {
    console.error("Error updating kings:", error);
    return { success: false, error: error.message };
  }
}