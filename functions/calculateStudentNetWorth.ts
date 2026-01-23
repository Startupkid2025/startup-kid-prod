import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Avatar items prices (sync with frontend AVATAR_ITEMS)
const ITEM_PRICES = {
  "body_blue": 0, "body_pink": 200, "body_purple": 400,
  "body_green": 600, "body_orange": 800, "body_red": 1000,
  "body_gold": 1500, "body_rainbow": 2000,
  "eyes_sparkle": 0, "eyes_determined": 300, "eyes_heart": 500,
  "eyes_star": 700, "eyes_cool": 1000, "eyes_laser": 1200,
  "eyes_cyber": 1500, "eyes_diamond": 2000,
  "mouth_smile": 0, "mouth_happy": 250, "mouth_confident": 400,
  "mouth_cat": 550, "mouth_wink": 700, "mouth_laugh": 900,
  "mouth_cool": 1100, "mouth_boss": 1500,
  "hat_cap": 300, "hat_party": 450, "hat_tophat": 600,
  "hat_graduate": 800, "hat_cowboy": 1000, "hat_crown": 1300,
  "hat_wizard": 1600, "hat_diamond": 2500,
  "accessory_phone": 400, "accessory_tie": 600, "accessory_briefcase": 800,
  "accessory_laptop": 1000, "accessory_suit": 1300, "accessory_rocket": 1600,
  "accessory_trophy": 2000, "accessory_diamond_brief": 3000,
  "shoes_sneakers": 0, "shoes_running": 350, "shoes_boots": 500,
  "shoes_heels": 700, "shoes_dress": 1000, "shoes_rocket": 1400,
  "shoes_fire": 1800, "shoes_diamond": 2500,
  "background_basic": 0, "background_apartment": 400, "background_villa": 700,
  "background_penthouse": 1000, "background_mansion": 1500, "background_island": 2000,
  "background_space": 2500, "background_universe": 3500,
  "jewelry_watch": 600, "jewelry_necklace": 900, "jewelry_ring": 1200,
  "jewelry_crown_small": 1500, "jewelry_amulet": 2000, "jewelry_infinity": 3000
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body for pagination params
    const { page = 1, pageSize = 20 } = await req.json().catch(() => ({ page: 1, pageSize: 20 }));
    const skip = (page - 1) * pageSize;

    // Fetch total count first (without pagination)
    const allLeaderboardEntries = await base44.entities.LeaderboardEntry.list();

    // Get all users to check roles
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminEmails = new Set(allUsers.filter(u => u.role === 'admin').map(u => u.email));

    // Filter students only (exclude admins and non-students)
    const allStudents = allLeaderboardEntries.filter(entry => 
      entry.user_type === 'student' && !adminEmails.has(entry.student_email)
    );

    const total_students = allStudents.length;

    // Sort by total_networth descending
    allStudents.sort((a, b) => (b.total_networth || 0) - (a.total_networth || 0));

    // Get paginated subset
    const students = allStudents.slice(skip, skip + pageSize);

    // Helper function to load all records with pagination
    const listAll = async (entityHandler, pageSize = 1000) => {
      let all = [];
      let skip = 0;
      while (true) {
        const page = await entityHandler.list('-created_date', pageSize, skip);
        all = all.concat(page);
        if (page.length < pageSize) break;
        skip += pageSize;
      }
      return all;
    };

    // Fetch all required data using service role for access to all students
    const allInvestments = await listAll(base44.asServiceRole.entities.Investment);
    const allWordProgress = await listAll(base44.asServiceRole.entities.WordProgress);
    const allMathProgress = await listAll(base44.asServiceRole.entities.MathProgress);

    // Build investment map for faster lookup
    const investmentsByEmail = new Map();
    allInvestments.forEach(inv => {
      if (!investmentsByEmail.has(inv.student_email)) {
        investmentsByEmail.set(inv.student_email, []);
      }
      investmentsByEmail.get(inv.student_email).push(inv);
    });

    // Build word progress map
    const wordProgressByEmail = new Map();
    allWordProgress.forEach(w => {
      if (!wordProgressByEmail.has(w.student_email)) {
        wordProgressByEmail.set(w.student_email, []);
      }
      wordProgressByEmail.get(w.student_email).push(w);
    });

    // Build math progress map
    const mathProgressByEmail = new Map();
    allMathProgress.forEach(m => {
      if (!mathProgressByEmail.has(m.student_email)) {
        mathProgressByEmail.set(m.student_email, []);
      }
      mathProgressByEmail.get(m.student_email).push(m);
    });

    // Calculate net worth for each student
    const studentsWithNetWorth = students.map(student => {
      // Calculate mastered words and math questions (aligns with Vocabulary1.js and MathGames1.js)
      const studentWordProgress = wordProgressByEmail.get(student.student_email) || [];
      const masteredWords = studentWordProgress.filter(w => w.mastered).length;

      const studentMathProgress = mathProgressByEmail.get(student.student_email) || [];
      // Count math questions that have correct_streak > 0 or are mastered (aligns with MathGames1.js)
      const masteredMathQuestions = studentMathProgress.filter(m => m.mastered || m.correct_streak > 0).length;

      // Use pre-calculated total_networth from LeaderboardEntry
      const netWorth = student.total_networth || 0;

      // Calculate investments value for display
      const studentInvestments = investmentsByEmail.get(student.student_email) || [];
      const investmentsValue = studentInvestments.reduce((sum, inv) => {
        return sum + (inv.current_value || 0);
      }, 0);

      return {
        email: student.student_email,
        full_name: student.full_name,
        first_name: student.first_name,
        last_name: student.last_name,
        coins: coins,
        ai_tech_level: student.ai_tech_level || 1,
        personal_skills_level: student.personal_skills_level || 1,
        money_business_level: student.money_business_level || 1,
        total_lessons: student.total_lessons || 0,
        login_streak: student.login_streak || 0,
        mastered_words: masteredWords,
        mastered_math_questions: masteredMathQuestions,
        items_value: itemsValue,
        investments_value: investmentsValue,
        net_worth: netWorth,
        purchased_items_count: (student.purchased_items || []).length,
        investments_count: studentInvestments.length
      };
    });

    return Response.json({
      success: true,
      total_students: total_students,
      page: page,
      pageSize: pageSize,
      students: studentsWithNetWorth
    });

  } catch (error) {
    console.error('Error calculating net worth:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});