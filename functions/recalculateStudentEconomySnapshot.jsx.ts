import { base44 } from "@/api/base44Client";

// Import AVATAR_ITEMS for item prices
const AVATAR_ITEMS = {
  // Body colors (8) - Tax reduction
  "body_blue": { price: 0, taxReduction: 0.1 },
  "body_pink": { price: 200, taxReduction: 0.2 },
  "body_purple": { price: 400, taxReduction: 0.3 },
  "body_green": { price: 600, taxReduction: 0.4 },
  "body_orange": { price: 800, taxReduction: 0.5 },
  "body_red": { price: 1000, taxReduction: 0.6 },
  "body_gold": { price: 1500, taxReduction: 0.7 },
  "body_rainbow": { price: 2000, taxReduction: 0.8 },
  
  // Eyes (8) - Word/hourly bonus
  "eyes_sparkle": { price: 0, wordBonus: 1 },
  "eyes_determined": { price: 300, wordBonus: 2 },
  "eyes_heart": { price: 500, wordBonus: 3 },
  "eyes_star": { price: 700, wordBonus: 4 },
  "eyes_cool": { price: 1000, hourlyBonus: 5 },
  "eyes_laser": { price: 1200, hourlyBonus: 8 },
  "eyes_cyber": { price: 1500, hourlyBonus: 10 },
  "eyes_diamond": { price: 2000, hourlyBonus: 15 },
  
  // Mouths (8) - Word bonus + dividend tax reduction
  "mouth_smile": { price: 0, wordBonus: 1, dividendTaxReduction: 1 },
  "mouth_happy": { price: 250, wordBonus: 2, dividendTaxReduction: 2 },
  "mouth_confident": { price: 400, wordBonus: 3, dividendTaxReduction: 3 },
  "mouth_cat": { price: 550, wordBonus: 4, dividendTaxReduction: 4 },
  "mouth_wink": { price: 700, wordBonus: 5, dividendTaxReduction: 5 },
  "mouth_laugh": { price: 900, wordBonus: 7, dividendTaxReduction: 7 },
  "mouth_cool": { price: 1100, wordBonus: 10, dividendTaxReduction: 10 },
  "mouth_boss": { price: 1500, wordBonus: 15, dividendTaxReduction: 15 },
  
  // Hats (8) - Hourly bonus
  "hat_cap": { price: 300, hourlyBonus: 2 },
  "hat_party": { price: 450, hourlyBonus: 3 },
  "hat_tophat": { price: 600, hourlyBonus: 5 },
  "hat_graduate": { price: 800, hourlyBonus: 7 },
  "hat_cowboy": { price: 1000, hourlyBonus: 10 },
  "hat_crown": { price: 1300, hourlyBonus: 15 },
  "hat_wizard": { price: 1600, hourlyBonus: 20 },
  "hat_diamond": { price: 2500, hourlyBonus: 30 },
  
  // Accessories (8) - Hourly bonus
  "accessory_phone": { price: 400, hourlyBonus: 3 },
  "accessory_tie": { price: 600, hourlyBonus: 5 },
  "accessory_briefcase": { price: 800, hourlyBonus: 8 },
  "accessory_laptop": { price: 1000, hourlyBonus: 10 },
  "accessory_suit": { price: 1300, hourlyBonus: 15 },
  "accessory_rocket": { price: 1600, hourlyBonus: 20 },
  "accessory_trophy": { price: 2000, hourlyBonus: 25 },
  "accessory_diamond_brief": { price: 3000, hourlyBonus: 35 },
  
  // Shoes (8) - Math bonus
  "shoes_sneakers": { price: 0, mathBonus: 0 },
  "shoes_running": { price: 350, mathBonus: 1 },
  "shoes_boots": { price: 500, mathBonus: 2 },
  "shoes_heels": { price: 700, mathBonus: 3 },
  "shoes_dress": { price: 1000, mathBonus: 4 },
  "shoes_rocket": { price: 1400, mathBonus: 5 },
  "shoes_fire": { price: 1800, mathBonus: 7 },
  "shoes_diamond": { price: 2500, mathBonus: 10 },
  
  // Backgrounds (8) - Passive income
  "background_basic": { price: 0, passiveIncome: 0 },
  "background_apartment": { price: 400, passiveIncome: 10 },
  "background_villa": { price: 700, passiveIncome: 20 },
  "background_penthouse": { price: 1000, passiveIncome: 30 },
  "background_mansion": { price: 1500, passiveIncome: 50 },
  "background_island": { price: 2000, passiveIncome: 70 },
  "background_space": { price: 2500, passiveIncome: 100 },
  "background_universe": { price: 3500, passiveIncome: 150 },
  
  // Jewelry (6) - Special bonuses
  "jewelry_watch": { price: 600, specialBonus: "time" },
  "jewelry_necklace": { price: 900, specialBonus: "words" },
  "jewelry_ring": { price: 1200, specialBonus: "math" },
  "jewelry_crown_small": { price: 1500, specialBonus: "quiz" },
  "jewelry_amulet": { price: 2000, specialBonus: "investment" },
  "jewelry_infinity": { price: 3000, specialBonus: "all" }
};

/**
 * Recalculate Student Economy Snapshot - The Single Source of Truth
 * 
 * This function calculates the complete financial state of a student based on ALL their activities.
 * It's event-driven and should be called whenever a student's financial state changes.
 * 
 * @param {string} studentEmail - The student's email
 * @param {string} reason - Why this calculation was triggered (for logging)
 * @returns {Promise<Object>} The updated snapshot
 */
export async function recalculateStudentEconomySnapshot(studentEmail, reason = "manual") {
  console.log(`\n💰 Recalculating economy snapshot for ${studentEmail} (reason: ${reason})`);
  
  try {
    console.log('1️⃣ Starting data fetch...');
    
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
    
    console.log('2️⃣ Data fetched successfully:', { users: users.length, wordProgress: wordProgress.length, mathProgress: mathProgress.length, participations: participations.length, quizProgress: quizProgress.length, investments: investments.length });
    
    if (users.length === 0) {
      throw new Error(`User not found: ${studentEmail}`);
    }
    
    const user = users[0];
    console.log('3️⃣ User loaded:', { email: user.email, full_name: user.full_name });
    
    console.log('4️⃣ Calculating income breakdown...');

    // ========================================
    // INCOME BREAKDOWN
    // ========================================
    const income = {
      base_signup: 500,
      lessons: (user.total_lessons || 0) * 100,
      vocabulary: wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0),
      math: mathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0),
      surveys: participations.filter(p => p.survey_completed === true).length * 70,
      quizzes: quizProgress.reduce((sum, q) => sum + (q.coins_earned || 0), 0),
      work: user.total_work_earnings || 0,
      collaboration: user.total_collaboration_coins || 0,
      login_streak: user.total_login_streak_coins || 0,
      passive_income: user.total_passive_income || 0,
      admin_bonus: user.total_admin_coins || 0,
      investment_profit_realized: user.total_realized_investment_profit || 0
    };
    
    // Profile tasks
    if (user.completed_instagram_follow) income.instagram_follow = 50;
    if (user.completed_youtube_subscribe) income.youtube_subscribe = 50;
    if (user.completed_facebook_follow) income.facebook_follow = 50;
    if (user.completed_discord_join) income.discord_join = 50;
    if (user.completed_share) income.share_bonus = 100;
    
    // Profile details
    if (user.age) income.profile_age = 20;
    if (user.bio && user.bio.length > 10) income.profile_bio = 30;
    if (user.phone_number) income.profile_phone = 20;
    
    const totalIncome = Object.values(income).reduce((sum, val) => sum + val, 0);
    console.log('5️⃣ Income calculated:', totalIncome);
    
    console.log('6️⃣ Calculating expense breakdown...');
    
    // ========================================
    // EXPENSE BREAKDOWN (NO INCOME TAX, NO DIVIDEND TAX)
    // ========================================
    const expenses = {
      inflation: user.total_inflation_lost || 0,
      capital_gains_tax: user.total_capital_gains_tax || 0,
      investment_fees: user.total_investment_fees || 0,
      item_sale_losses: user.total_item_sale_losses || 0
    };
    
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    console.log('7️⃣ Expenses calculated:', totalExpenses);
    
    console.log('8️⃣ Processing purchased items...');
    
    // ========================================
    // ITEMS VALUE
    // ========================================
    let purchasedItems = user.purchased_items;
    if (typeof purchasedItems === 'string') {
      try {
        purchasedItems = JSON.parse(purchasedItems);
      } catch (e) {
        purchasedItems = [];
      }
    }
    if (!Array.isArray(purchasedItems)) {
      purchasedItems = [];
    }
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item && item.price) {
        itemsValue += item.price;
      }
    });
    
    // ========================================
    // INVESTMENTS
    // ========================================
    const investmentsSpent = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const investmentsValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
    const investmentProfitUnrealized = investmentsValue - investmentsSpent;
    
    // ========================================
    // CALCULATE COINS_CASH (Source of Truth)
    // ========================================
    // Formula: Total Income - Total Expenses - Items Spent - Investments Spent
    const coinsCash = Math.round(totalIncome - totalExpenses - itemsValue - investmentsSpent);
    
    // ========================================
    // TOTAL ASSETS
    // ========================================
    const totalAssets = coinsCash + investmentsValue + itemsValue;
    
    // ========================================
    // CREATE OR UPDATE SNAPSHOT
    // ========================================
    const snapshotData = {
      student_email: studentEmail,
      full_name: user.full_name,
      first_name: user.first_name || user.full_name.split(' ')[0],
      last_name: user.last_name || user.full_name.split(' ').slice(1).join(' '),
      user_type: user.user_type || 'student',
      coins_cash: coinsCash,
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_assets: totalAssets,
      income_breakdown: JSON.stringify(income),
      expense_breakdown: JSON.stringify(expenses),
      investment_profit_unrealized: investmentProfitUnrealized,
      investment_profit_realized: user.total_realized_investment_profit || 0,
      capital_gains_tax_paid: user.total_capital_gains_tax || 0,
      fees_paid: user.total_investment_fees || 0,
      inflation_loss: user.total_inflation_lost || 0,
      last_calculated_at: new Date().toISOString(),
      snapshot_version: 2,
      equipped_items: JSON.stringify(user.equipped_items || {}),
      purchased_items: JSON.stringify(purchasedItems)
    };
    
    // Check if snapshot exists
    const existingSnapshots = await base44.entities.StudentEconomySnapshot.filter({ 
      student_email: studentEmail 
    });
    
    let snapshot;
    if (existingSnapshots.length > 0) {
      // Update existing
      snapshot = await base44.entities.StudentEconomySnapshot.update(
        existingSnapshots[0].id,
        snapshotData
      );
      console.log(`✅ Updated snapshot for ${studentEmail}`);
    } else {
      // Create new
      snapshot = await base44.entities.StudentEconomySnapshot.create(snapshotData);
      console.log(`✅ Created snapshot for ${studentEmail}`);
    }
    
    // Log summary
    console.log(`  💰 Coins Cash: ${coinsCash}`);
    console.log(`  📈 Investments: ${investmentsValue} (profit: ${investmentProfitUnrealized})`);
    console.log(`  🎨 Items: ${itemsValue}`);
    console.log(`  🏆 Total Assets: ${totalAssets}`);
    console.log(`  📊 Income: ${totalIncome} | Expenses: ${totalExpenses}`);
    
    return snapshot;
    
  } catch (error) {
    console.error(`❌ Error recalculating snapshot for ${studentEmail}:`, error);
    throw error;
  }
}

export default recalculateStudentEconomySnapshot;