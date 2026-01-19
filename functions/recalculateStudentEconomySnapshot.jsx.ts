import { base44 } from "@/api/base44Client";

const AVATAR_ITEMS = {
  "body_blue": { price: 0 }, "body_pink": { price: 200 }, "body_purple": { price: 400 }, "body_green": { price: 600 },
  "body_orange": { price: 800 }, "body_red": { price: 1000 }, "body_gold": { price: 1500 }, "body_rainbow": { price: 2000 },

  "eyes_sparkle": { price: 0 }, "eyes_determined": { price: 300 }, "eyes_heart": { price: 500 }, "eyes_star": { price: 700 },
  "eyes_cool": { price: 1000 }, "eyes_laser": { price: 1200 }, "eyes_cyber": { price: 1500 }, "eyes_diamond": { price: 2000 },

  "mouth_smile": { price: 0 }, "mouth_happy": { price: 250 }, "mouth_confident": { price: 400 }, "mouth_cat": { price: 550 },
  "mouth_wink": { price: 700 }, "mouth_laugh": { price: 900 }, "mouth_cool": { price: 1100 }, "mouth_boss": { price: 1500 },

  "hat_cap": { price: 300 }, "hat_party": { price: 450 }, "hat_tophat": { price: 600 }, "hat_graduate": { price: 800 },
  "hat_cowboy": { price: 1000 }, "hat_crown": { price: 1300 }, "hat_wizard": { price: 1600 }, "hat_diamond": { price: 2500 },

  "accessory_phone": { price: 400 }, "accessory_tie": { price: 600 }, "accessory_briefcase": { price: 800 }, "accessory_laptop": { price: 1000 },
  "accessory_suit": { price: 1300 }, "accessory_rocket": { price: 1600 }, "accessory_trophy": { price: 2000 }, "accessory_diamond_brief": { price: 3000 },

  "shoes_sneakers": { price: 0 }, "shoes_running": { price: 350 }, "shoes_boots": { price: 500 }, "shoes_heels": { price: 700 },
  "shoes_dress": { price: 1000 }, "shoes_rocket": { price: 1400 }, "shoes_fire": { price: 1800 }, "shoes_diamond": { price: 2500 },

  "background_basic": { price: 0 }, "background_apartment": { price: 400 }, "background_villa": { price: 700 }, "background_penthouse": { price: 1000 },
  "background_mansion": { price: 1500 }, "background_island": { price: 2000 }, "background_space": { price: 2500 }, "background_universe": { price: 3500 },

  "jewelry_watch": { price: 600 }, "jewelry_necklace": { price: 900 }, "jewelry_ring": { price: 1200 },
  "jewelry_crown_small": { price: 1500 }, "jewelry_amulet": { price: 2000 }, "jewelry_infinity": { price: 3000 }
};

export default async function recalculateStudentEconomySnapshot(params) {
  try {
    const { studentEmail, reason = "manual", previewOnly = false } = params || {};

    console.log("💰 recalculateStudentEconomySnapshot called with params:", {
      studentEmail,
      reason,
      previewOnly,
      ts: new Date().toISOString(),
    });

    if (!studentEmail) {
      throw new Error("Missing studentEmail parameter");
    }

    // Fetch all data in parallel
    const [
      users,
      wordProgress,
      mathProgress,
      participations,
      quizProgress,
      investments
    ] = await Promise.all([
      base44.entities.User.filter({ email: studentEmail }),
      base44.entities.WordProgress.filter({ student_email: studentEmail }),
      base44.entities.MathProgress.filter({ student_email: studentEmail }),
      base44.entities.LessonParticipation.filter({ student_email: studentEmail }),
      base44.entities.QuizProgress.filter({ student_email: studentEmail }),
      base44.entities.Investment.filter({ student_email: studentEmail })
    ]);

    if (!users || users.length === 0) {
      throw new Error(`User not found: ${studentEmail}`);
    }

    const user = users[0];

    // INCOME BREAKDOWN
    const income = {
      base_signup: 500,
      lessons: (user.total_lessons || 0) * 100,
      vocabulary: (wordProgress || []).reduce((sum, w) => sum + (w.coins_earned || 0), 0),
      math: (mathProgress || []).reduce((sum, m) => sum + (m.coins_earned || 0), 0),
      surveys: (participations || []).filter(p => p.survey_completed === true).length * 70,
      quizzes: (quizProgress || []).reduce((sum, q) => sum + (q.coins_earned || 0), 0),
      work: user.total_work_earnings || 0,
      collaboration: user.total_collaboration_coins || 0,
      login_streak: user.total_login_streak_coins || 0,
      passive_income: user.total_passive_income || 0,
      admin_bonus: user.total_admin_coins || 0,
      investment_profit_realized: user.total_realized_investment_profit || 0
    };

    if (user.completed_instagram_follow) income.instagram_follow = 50;
    if (user.completed_youtube_subscribe) income.youtube_subscribe = 50;
    if (user.completed_facebook_follow) income.facebook_follow = 50;
    if (user.completed_discord_join) income.discord_join = 50;
    if (user.completed_share) income.share_bonus = 100;

    if (user.age) income.profile_age = 20;
    if (user.bio && user.bio.length > 10) income.profile_bio = 30;
    if (user.phone_number) income.profile_phone = 20;

    const totalIncome = Object.values(income).reduce((sum, val) => sum + val, 0);

    // EXPENSE BREAKDOWN
    const expenses = {
      inflation: user.total_inflation_lost || 0,
      capital_gains_tax: user.total_capital_gains_tax || 0,
      investment_fees: user.total_investment_fees || 0,
      item_sale_losses: user.total_item_sale_losses || 0
    };

    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);

    // ITEMS VALUE
    const purchasedItems = user.purchased_items || [];
    let itemsValue = 0;
    for (const itemId of purchasedItems) {
      const item = AVATAR_ITEMS[itemId];
      if (item?.price) itemsValue += item.price;
    }

    // INVESTMENTS
    const investmentsSpent = (investments || []).reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const investmentsValue = (investments || []).reduce((sum, inv) => sum + (inv.current_value || 0), 0);
    const investmentProfitUnrealized = investmentsValue - investmentsSpent;

    // COINS CASH (Source of Truth)
    const coinsCash = Math.round(totalIncome - totalExpenses - itemsValue - investmentsSpent);

    // TOTAL ASSETS
    const totalAssets = coinsCash + investmentsValue + itemsValue;

    // SNAPSHOT DATA
    const snapshotData = {
      student_email: studentEmail,
      full_name: user.full_name,
      first_name: user.first_name || user.full_name?.split(" ")?.[0] || "",
      last_name: user.last_name || user.full_name?.split(" ")?.slice(1)?.join(" ") || "",
      user_type: user.user_type || "student",

      coins_cash: coinsCash,
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_assets: totalAssets,

      income_breakdown: income,
      expense_breakdown: expenses,

      investment_profit_unrealized: investmentProfitUnrealized,
      investment_profit_realized: user.total_realized_investment_profit || 0,

      capital_gains_tax_paid: user.total_capital_gains_tax || 0,
      fees_paid: user.total_investment_fees || 0,
      inflation_loss: user.total_inflation_lost || 0,

      last_calculated_at: new Date().toISOString(),
      snapshot_version: 2,

      equipped_items: user.equipped_items || {},
      purchased_items: purchasedItems
    };

    console.log("📊 Snapshot calculated", {
      studentEmail,
      coinsCash,
      investmentsValue,
      itemsValue,
      totalAssets,
      totalIncome,
      totalExpenses
    });

    // PREVIEW ONLY: return without writing to DB
    if (previewOnly === true) {
      console.log("👁️ Preview mode - no DB write", { studentEmail });
      return snapshotData;
    }

    // UPSERT snapshot to database
    const existing = await base44.entities.StudentEconomySnapshot.filter({ student_email: studentEmail });

    let saved;
    if (existing && existing.length > 0) {
      saved = await base44.entities.StudentEconomySnapshot.update(existing[0].id, snapshotData);
      console.log("✅ Updated StudentEconomySnapshot", { studentEmail, id: existing[0].id });
    } else {
      saved = await base44.entities.StudentEconomySnapshot.create(snapshotData);
      console.log("✅ Created StudentEconomySnapshot", { studentEmail, id: saved?.id });
    }

    return saved;

  } catch (error) {
    console.error("❌ recalculateStudentEconomySnapshot error:", {
      studentEmail: params?.studentEmail,
      error: error.message,
      stack: error.stack
    });

    return {
      ok: false,
      error: error.message,
      stack: error.stack
    };
  }
}