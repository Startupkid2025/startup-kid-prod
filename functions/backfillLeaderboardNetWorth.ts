import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Avatar items prices
const AVATAR_ITEM_PRICES = {
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
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get optional userEmails from request body
    const body = await req.json().catch(() => ({}));
    const targetEmails = body.userEmails;

    // Fetch all users or filtered by emails
    let allUsers;
    if (targetEmails && Array.isArray(targetEmails) && targetEmails.length > 0) {
      // Fetch only specified users
      allUsers = [];
      for (const email of targetEmails) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length > 0) allUsers.push(users[0]);
      }
    } else {
      // Fetch all users
      allUsers = await base44.asServiceRole.entities.User.list();
    }
    
    let totalProcessed = 0;
    let updatedCount = 0;
    let createdCount = 0;
    const errors = [];

    for (const userData of allUsers) {
      try {
        totalProcessed++;
        const userEmail = userData.email;

        // Calculate items value
        const purchasedItems = userData.purchased_items || [];
        const items_value = purchasedItems.reduce((sum, itemId) => {
          return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
        }, 0);

        // Calculate investments value
        const investments = await base44.asServiceRole.entities.Investment.filter({ student_email: userEmail });
        const investments_value = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);

        // Calculate mastered words and math questions
        const wordProgress = await base44.asServiceRole.entities.WordProgress.filter({ student_email: userEmail });
        const mastered_words = wordProgress.filter(w => w.mastered === true).length;
        
        const mathProgress = await base44.asServiceRole.entities.MathProgress.filter({ student_email: userEmail });
        const mastered_math_questions = mathProgress.filter(m => m.mastered === true).length;

        // Calculate net worth: coins + investments_value + items_value
        const coins = userData.coins || 0;
        const total_networth = coins + investments_value + items_value;

        // Prepare LeaderboardEntry data - sync all important fields from User
        const leaderboardData = {
          student_email: userEmail,
          full_name: userData.full_name,
          first_name: userData.first_name,
          last_name: userData.last_name,
          total_networth: total_networth,
          coins: coins,
          investments_value: investments_value,
          items_value: items_value,
          total_lessons: userData.total_lessons || 0,
          login_streak: userData.login_streak || 0,
          total_work_hours: userData.total_work_hours || 0,
          total_work_earnings: userData.total_work_earnings || 0,
          total_collaboration_coins: userData.total_collaboration_coins || 0,
          total_login_streak_coins: userData.total_login_streak_coins || 0,
          total_correct_math_answers: userData.total_correct_math_answers || 0,
          mastered_words: mastered_words,
          mastered_math_questions: mastered_math_questions,
          equipped_items: userData.equipped_items || {},
          purchased_items: purchasedItems,
          last_login_date: userData.last_login_date,
          daily_collaborations: userData.daily_collaborations || [],
          user_type: userData.user_type || 'student',
          ai_tech_level: userData.ai_tech_level || 1,
          ai_tech_xp: userData.ai_tech_xp || 0,
          personal_skills_level: userData.personal_skills_level || 1,
          personal_skills_xp: userData.personal_skills_xp || 0,
          money_business_level: userData.money_business_level || 1,
          money_business_xp: userData.money_business_xp || 0,
          age: userData.age,
          bio: userData.bio,
          phone_number: userData.phone_number,
          total_passive_income: userData.total_passive_income || 0,
          total_inflation_lost: userData.total_inflation_lost || 0,
          total_income_tax: userData.total_income_tax || 0,
          total_dividend_tax: userData.total_dividend_tax || 0,
          total_capital_gains_tax: userData.total_capital_gains_tax || 0,
          total_credit_interest: userData.total_credit_interest || 0,
          total_investment_fees: userData.total_investment_fees || 0,
          total_item_sale_losses: userData.total_item_sale_losses || 0,
          total_realized_investment_profit: userData.total_realized_investment_profit || 0,
          completed_instagram_follow: userData.completed_instagram_follow || false,
          completed_youtube_subscribe: userData.completed_youtube_subscribe || false,
          completed_facebook_follow: userData.completed_facebook_follow || false,
          completed_discord_join: userData.completed_discord_join || false,
          completed_share: userData.completed_share || false
        };

        // Check if LeaderboardEntry exists
        const existingEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ student_email: userEmail });

        if (existingEntries.length > 0) {
          // Update existing entry
          await base44.asServiceRole.entities.LeaderboardEntry.update(existingEntries[0].id, leaderboardData);
          updatedCount++;
        } else {
          // Create new entry
          await base44.asServiceRole.entities.LeaderboardEntry.create(leaderboardData);
          createdCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing ${userData.email}:`, error);
        errors.push({ email: userData.email, error: error.message });
      }
    }

    // Collect details for the response
    const details = [];
    for (const userData of allUsers) {
      const userEmail = userData.email;
      const purchasedItems = userData.purchased_items || [];
      const items_value = purchasedItems.reduce((sum, itemId) => sum + (AVATAR_ITEM_PRICES[itemId] || 0), 0);
      const investments = await base44.asServiceRole.entities.Investment.filter({ student_email: userEmail });
      const investments_value = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      
      const wordProgress = await base44.asServiceRole.entities.WordProgress.filter({ student_email: userEmail });
      const mastered_words = wordProgress.filter(w => w.mastered === true).length;
      
      const mathProgress = await base44.asServiceRole.entities.MathProgress.filter({ student_email: userEmail });
      const mastered_math_questions = mathProgress.filter(m => m.mastered === true).length;
      
      const coins = userData.coins || 0;
      const total_networth = coins + investments_value + items_value;
      
      details.push({
        email: userEmail,
        full_name: userData.full_name,
        total_networth,
        coins,
        investments_value,
        items_value,
        total_lessons: userData.total_lessons || 0,
        total_work_hours: userData.total_work_hours || 0,
        total_collaboration_coins: userData.total_collaboration_coins || 0,
        login_streak: userData.login_streak || 0,
        total_correct_math_answers: userData.total_correct_math_answers || 0,
        mastered_words: mastered_words,
        mastered_math_questions: mastered_math_questions
      });
    }

    return Response.json({
      success: true,
      message: `Backfill completed: ${totalProcessed} processed, ${updatedCount} updated, ${createdCount} created`,
      totalProcessed,
      updatedCount,
      createdCount,
      errors,
      details
    });

  } catch (error) {
    console.error("Backfill error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});