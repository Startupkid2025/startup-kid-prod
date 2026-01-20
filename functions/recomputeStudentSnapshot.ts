import { AVATAR_ITEMS } from '../components/avatar/TamagotchiAvatar.js';

export default async function recomputeStudentSnapshot({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Fetch student-specific data efficiently
    const [leaderboardEntry, wordProgress, mathProgress, investments, participations] = await Promise.all([
      base44.entities.LeaderboardEntry.filter({ student_email: studentEmail }),
      base44.entities.WordProgress.filter({ student_email: studentEmail }),
      base44.entities.MathProgress.filter({ student_email: studentEmail }),
      base44.entities.Investment.filter({ student_email: studentEmail }),
      base44.entities.LessonParticipation.filter({ student_email: studentEmail })
    ]);

    const entry = leaderboardEntry[0];
    if (!entry) {
      return { success: false, error: "No LeaderboardEntry found" };
    }

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
    const loginStreak = entry.login_streak || 0;
    const lastLoginDate = entry.last_login_date || null;
    
    // Calculate total income (זהה ל-💰 סה"כ הכנסות ברוטו)
    const vocabEarnings = wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
    const mathEarnings = mathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
    const quizEarnings = entry.total_quiz_coins || 0;
    const surveyEarnings = participations.filter(p => p.survey_completed === true).length * 70;
    
    // Investment profit
    const investmentsSpent = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const investmentProfitUnrealized = investmentsValue - investmentsSpent;
    
    const totalIncome = 
      500 + // base_signup
      ((aiTechLessons + socialSkillsLessons + moneyBusinessLessons) * 100) + // lessons
      vocabEarnings + // vocabulary
      mathEarnings + // math
      surveyEarnings + // surveys
      quizEarnings + // quizzes
      workEarnings + // work
      (entry.age ? 20 : 0) + // profile_age
      ((entry.bio && entry.bio.length > 10) ? 30 : 0) + // profile_bio
      (entry.phone_number ? 20 : 0) + // profile_phone
      (entry.completed_instagram_follow ? 50 : 0) + // instagram
      (entry.completed_youtube_subscribe ? 50 : 0) + // youtube
      (entry.completed_facebook_follow ? 50 : 0) + // facebook
      (entry.completed_discord_join ? 50 : 0) + // discord
      (entry.completed_share ? 100 : 0) + // share
      (entry.total_collaboration_coins || 0) + // collaboration
      (entry.total_login_streak_coins || 0) + // login_streak
      (entry.total_passive_income || 0) + // passive_income
      (entry.total_admin_coins || 0) + // admin_bonus
      (entry.total_realized_investment_profit || 0) + // realized profit
      investmentProfitUnrealized; // unrealized profit

    // UPSERT snapshot
    const existingSnapshot = await base44.entities.LeaderboardSnapshot.filter({ 
      student_email: studentEmail 
    });

    const snapshotData = {
      student_email: studentEmail,
      full_name: entry.full_name,
      first_name: entry.first_name || "",
      last_name: entry.last_name || "",
      user_type: entry.user_type || "student",
      coins,
      purchased_items: purchasedItems,
      equipped_items: entry.equipped_items || {},
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_value: totalValue,
      total_income: totalIncome,
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
      crowns: [], // Will be updated by updateKingsForStudent
      updated_at: new Date().toISOString()
    };

    if (existingSnapshot.length > 0) {
      await base44.entities.LeaderboardSnapshot.update(existingSnapshot[0].id, snapshotData);
    } else {
      await base44.entities.LeaderboardSnapshot.create(snapshotData);
    }

    return { 
      success: true, 
      message: "Snapshot recomputed",
      stats: {
        totalValue,
        masteredWords,
        masteredMathQuestions,
        investmentsValue,
        loginStreak,
        workHours
      }
    };
  } catch (error) {
    console.error("Error recomputing snapshot:", error);
    return { success: false, error: error.message };
  }
}