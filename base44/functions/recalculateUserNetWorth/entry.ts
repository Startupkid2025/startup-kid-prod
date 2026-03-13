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
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { userEmail } = await req.json();

    let usersToProcess = [];
    if (userEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      usersToProcess = users;
    } else {
      const allUsers = await base44.asServiceRole.entities.User.list();
      usersToProcess = allUsers.filter(u => u.user_type === 'student');
    }

    const results = [];

    for (const user of usersToProcess) {
      try {
        // Calculate items value
        const purchasedItems = user.purchased_items || [];
        const itemsValue = purchasedItems.reduce((sum, itemId) => {
          return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
        }, 0);

        // Calculate investments value + snapshot
        const investments = await base44.asServiceRole.entities.Investment.filter({ 
          student_email: user.email 
        });
        const investmentsValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
        const totalInvestedAmount = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);

        const BUSINESS_TYPES = ['tech_startup', 'real_estate', 'crypto', 'stock_market', 'government_bonds', 'gold'];
        const investmentCountByType = {};
        const investmentValueByType = {};
        const investmentInvestedByType = {};
        BUSINESS_TYPES.forEach(t => {
          investmentCountByType[t] = 0;
          investmentValueByType[t] = 0;
          investmentInvestedByType[t] = 0;
        });
        for (const inv of investments) {
          const t = inv.business_type;
          if (t && BUSINESS_TYPES.includes(t)) {
            investmentCountByType[t] = (investmentCountByType[t] || 0) + 1;
            investmentValueByType[t] = (investmentValueByType[t] || 0) + (inv.current_value || 0);
            investmentInvestedByType[t] = (investmentInvestedByType[t] || 0) + (inv.invested_amount || 0);
          }
        }

        // Calculate net worth: coins + investments_value + items_value
        const coins = user.coins || 0;
        const netWorth = coins + investmentsValue + itemsValue;

        // Update user with all fields including portfolio snapshot
        await base44.asServiceRole.entities.User.update(user.id, {
          investments_value: investmentsValue,
          items_value: itemsValue,
          total_networth: netWorth,
          total_invested_amount: totalInvestedAmount,
          investment_count_total: investments.length,
          investment_count_by_type: investmentCountByType,
          investment_value_by_type: investmentValueByType,
          investment_invested_by_type: investmentInvestedByType,
          last_calculated_at: new Date().toISOString()
        });

        results.push({
          email: user.email,
          full_name: user.full_name,
          coins,
          items_value: itemsValue,
          investments_value: investmentsValue,
          total_networth: netWorth,
          success: true
        });
      } catch (error) {
        results.push({
          email: user.email,
          error: error.message,
          success: false
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      message: `Recalculated ${successCount} users, ${failCount} failed`,
      results
    });

  } catch (error) {
    console.error('Error recalculating net worth:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});