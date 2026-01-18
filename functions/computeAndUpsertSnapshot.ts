import { AVATAR_ITEMS } from '../components/avatar/TamagotchiAvatar.js';

export default async function computeAndUpsertSnapshot({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Load primary data source - LeaderboardEntry (always accessible)
    const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
      student_email: studentEmail 
    });

    if (leaderboardEntries.length === 0) {
      return { success: false, error: "No LeaderboardEntry found for student" };
    }

    const entry = leaderboardEntries[0];
    const userType = entry.user_type || 'student';

    // Fetch student-specific data in parallel
    const [wordProgress, mathProgress, investments, participations] = await Promise.all([
      base44.entities.WordProgress.filter({ student_email: studentEmail }),
      base44.entities.MathProgress.filter({ student_email: studentEmail }),
      base44.entities.Investment.filter({ student_email: studentEmail }),
      base44.entities.LessonParticipation.filter({ student_email: studentEmail })
    ]);

    // Calculate stats
    const masteredWords = wordProgress.filter(w => w.mastered).length;
    const masteredMathQuestions = mathProgress.filter(m => (m.total_attempts || 0) > 0).length;
    const investmentsValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);

    // Calculate items value
    const purchasedItems = entry.purchased_items || [];
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) {
        itemsValue += item.price || 0;
      }
    });

    // Get lesson counts by category
    const attendedParticipations = participations.filter(p => p.attended);
    const lessonIds = [...new Set(attendedParticipations.map(p => p.lesson_id))];
    
    let aiTechLessons = 0;
    let socialSkillsLessons = 0;
    let moneyBusinessLessons = 0;

    if (lessonIds.length > 0) {
      const lessons = await base44.entities.Lesson.list();
      const lessonMap = new Map();
      lessons.forEach(l => lessonMap.set(l.id, l));

      attendedParticipations.forEach(p => {
        const lesson = lessonMap.get(p.lesson_id);
        if (!lesson) return;
        if (lesson.category === 'ai_tech') aiTechLessons++;
        if (lesson.category === 'personal_skills' || lesson.category === 'social_skills') socialSkillsLessons++;
        if (lesson.category === 'money_business') moneyBusinessLessons++;
      });
    }

    const coins = entry.coins || 0;
    const totalValue = coins + itemsValue + investmentsValue;

    const collaborationCount = Math.floor((entry.total_collaboration_coins || 0) / 25);
    const workHours = entry.total_work_hours || 0;
    const workEarnings = entry.total_work_earnings || 0;
    
    // Get login streak from User if possible (more accurate), fallback to LeaderboardEntry
    let loginStreak = entry.login_streak || 0;
    let lastLoginDate = entry.last_login_date || null;
    
    try {
      const allUsers = await base44.entities.User.list();
      const userRecord = allUsers.find(u => u.email === studentEmail);
      if (userRecord) {
        loginStreak = userRecord.login_streak || 0;
        lastLoginDate = userRecord.last_login_date || null;
      }
    } catch (e) {
      // Fallback to LeaderboardEntry data
      console.log("Using LeaderboardEntry data for login streak");
    }

    // Normalize daily collaborations
    const normalizeResult = await base44.functions.normalizeDailyCollabs({ 
      collabs: entry.daily_collaborations || [] 
    });
    const dailyCollaborations = normalizeResult.success ? normalizeResult.result : [];

    // UPSERT snapshot
    const existingSnapshot = await base44.entities.LeaderboardSnapshot.filter({ 
      student_email: studentEmail 
    });

    const snapshotData = {
      student_email: studentEmail,
      full_name: entry.full_name,
      first_name: entry.first_name || "",
      last_name: entry.last_name || "",
      user_type: userType,
      coins,
      purchased_items: purchasedItems,
      equipped_items: entry.equipped_items || {},
      daily_collaborations: dailyCollaborations,
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_value: totalValue,
      mastered_words: masteredWords,
      mastered_math_questions: masteredMathQuestions,
      login_streak: loginStreak,
      collaboration_count: collaborationCount,
      work_hours: workHours,
      work_earnings: workEarnings,
      last_login_date: lastLoginDate,
      ai_tech_lessons: aiTechLessons,
      social_skills_lessons: socialSkillsLessons,
      money_business_lessons: moneyBusinessLessons,
      crowns: existingSnapshot.length > 0 ? existingSnapshot[0].crowns || [] : [],
      updated_at: new Date().toISOString()
    };

    if (existingSnapshot.length > 0) {
      await base44.entities.LeaderboardSnapshot.update(existingSnapshot[0].id, snapshotData);
    } else {
      await base44.entities.LeaderboardSnapshot.create(snapshotData);
    }

    return { 
      success: true, 
      message: "Snapshot computed and saved",
      stats: { totalValue, masteredWords, masteredMathQuestions }
    };
  } catch (error) {
    console.error("Error computing snapshot:", error);
    return { success: false, error: error.message };
  }
}