import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { userEmail } = body;

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Fetch user
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    const safeNum = (val) => typeof val === 'number' ? val : 0;

    // Fetch all data needed for balance calculation (sequential to avoid CPU limit)
    const wordProgress = await base44.asServiceRole.entities.WordProgress.filter({ student_email: userEmail });
    await new Promise(r => setTimeout(r, 150));
    const mathProgress = await base44.asServiceRole.entities.MathProgress.filter({ student_email: userEmail });
    await new Promise(r => setTimeout(r, 150));
    const participations = await base44.asServiceRole.entities.LessonParticipation.filter({ student_email: userEmail });
    await new Promise(r => setTimeout(r, 150));
    const quizProgress = await base44.asServiceRole.entities.QuizProgress.filter({ student_email: userEmail });
    await new Promise(r => setTimeout(r, 150));
    const investments = await base44.asServiceRole.entities.Investment.filter({ student_email: userEmail });

    // Profile completion coins
    let profileCompletionCoins = 0;
    if (user.age) profileCompletionCoins += 20;
    if (user.bio && user.bio.length > 10) profileCompletionCoins += 30;
    if (user.phone_number) profileCompletionCoins += 20;

    // Social missions coins
    let socialMissionsCoins = 0;
    if (user.completed_instagram_follow) socialMissionsCoins += 50;
    if (user.completed_youtube_subscribe) socialMissionsCoins += 50;
    if (user.completed_facebook_follow) socialMissionsCoins += 50;
    if (user.completed_discord_join) socialMissionsCoins += 50;
    if (user.completed_share) socialMissionsCoins += 100;

    // Income
    const income = {
      base: safeNum(user.base_coins ?? user.base ?? 500),
      lessonsCoins: safeNum(user.total_lessons_coins ?? ((user.total_lessons || 0) * 100)),
      vocabulary: wordProgress.reduce((sum, w) => sum + safeNum(w.coins_earned), 0),
      math: mathProgress.reduce((sum, m) => sum + safeNum(m.coins_earned), 0),
      surveys: safeNum(user.survey_coins ?? user.total_survey_coins) || (participations.filter(p => p.survey_completed).length * 70),
      quizzes: quizProgress.reduce((sum, q) => sum + safeNum(q.coins_earned), 0),
      collaboration: safeNum(user.total_collaboration_coins),
      loginStreakIncome: safeNum(user.total_login_streak_coins),
      workEarnings: safeNum(user.total_work_earnings),
      passiveIncome: safeNum(user.total_passive_income),
      adminCoins: safeNum(user.total_admin_coins),
      profileCompletion: profileCompletionCoins,
      socialMissions: socialMissionsCoins,
    };

    // Losses
    const losses = {
      inflation: safeNum(user.total_inflation_lost),
      capitalGainsTax: safeNum(user.total_capital_gains_tax),
      investmentFees: safeNum(user.total_investment_fees),
      itemSaleLosses: safeNum(user.total_item_sale_losses),
      creditInterest: safeNum(user.total_credit_interest),
    };

    const purchasedItems = user.purchased_items || [];
    const itemsValue = purchasedItems.reduce((sum, itemId) => sum + (AVATAR_ITEM_PRICES[itemId] || 0), 0);

    const investmentsSpent = investments.reduce((sum, inv) => sum + safeNum(inv.invested_amount), 0);
    const investmentsValue = investments.reduce((sum, inv) => sum + safeNum(inv.current_value), 0);

    const realizedProfit = safeNum(user.total_realized_investment_profit);
    const unrealized = investmentsValue - investmentsSpent;
    income.investmentProfits = unrealized + realizedProfit;

    const totalIncome = Object.values(income).reduce((sum, val) => sum + safeNum(val), 0);
    const totalLosses = Object.values(losses).reduce((sum, val) => sum + safeNum(val), 0);

    let balancedCoins = Math.round(totalIncome - totalLosses - itemsValue - investmentsValue);

    // If coins would go negative, add the deficit to admin_coins so the balance is always >= 0
    let adjustedAdminCoins = safeNum(user.total_admin_coins);
    if (balancedCoins < 0) {
      adjustedAdminCoins += Math.abs(balancedCoins);
      balancedCoins = 0;
    }

    const total_networth = balancedCoins + investmentsValue + itemsValue;

    // Update user
    await base44.asServiceRole.entities.User.update(user.id, {
      coins: balancedCoins,
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_networth: total_networth,
      last_calculated_at: new Date().toISOString()
    });

    // Update leaderboard entry
    const leaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ student_email: userEmail });
    if (leaderboardEntries.length > 0) {
      await base44.asServiceRole.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
        coins: balancedCoins,
        investments_value: investmentsValue,
        items_value: itemsValue,
        total_networth: total_networth,
      });
    }

    console.log(`✅ Balanced economy for ${userEmail}: coins=${balancedCoins}, networth=${total_networth}`);

    return Response.json({
      success: true,
      email: userEmail,
      full_name: user.full_name,
      oldCoins: user.coins || 0,
      newCoins: balancedCoins,
      diff: balancedCoins - (user.coins || 0),
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_networth,
      totalIncome,
      totalLosses,
    });

  } catch (error) {
    console.error('Error balancing student economy:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});