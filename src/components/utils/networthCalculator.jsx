import { base44 } from "@/api/base44Client";

// Avatar items prices (sync with TamagotchiAvatar.js)
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

/**
 * Calculate net worth for a user
 * @param {string} userEmail - User's email
 * @param {object} userData - Optional user data (if already fetched)
 * @returns {Promise<number>} - Calculated net worth
 */
export async function calculateNetWorth(userEmail, userData = null) {
  try {
    // Get user data if not provided
    let user = userData;
    if (!user) {
      user = await base44.auth.me();
      if (user.email !== userEmail) {
        // If checking another user, we need their data
        // But regular users can't access other users' data
        // So this should only be called for current user or by admin
        return 0;
      }
    }

    // Calculate items value
    const purchasedItems = user.purchased_items || [];
    const itemsValue = purchasedItems.reduce((sum, itemId) => {
      return sum + (ITEM_PRICES[itemId] || 0);
    }, 0);

    // Calculate investments value
    const investments = await base44.entities.Investment.filter({ 
      student_email: userEmail 
    });
    const investmentsValue = investments.reduce((sum, inv) => {
      return sum + (inv.current_value || 0);
    }, 0);

    // Calculate net worth
    const coins = user.coins || 0;
    const netWorth = coins + itemsValue + investmentsValue;

    return netWorth;
  } catch (error) {
    console.error("Error calculating net worth:", error);
    return 0;
  }
}

/**
 * Update user's total_networth field
 * @param {string} userEmail - User's email
 * @param {object} userData - Optional user data (if already fetched)
 * @returns {Promise<number>} - Updated net worth
 */
export async function updateNetWorth(userEmail, userData = null) {
  try {
    const netWorth = await calculateNetWorth(userEmail, userData);
    
    // Update user's total_networth
    await base44.auth.updateMe({
      total_networth: netWorth
    });

    return netWorth;
  } catch (error) {
    console.error("Error updating net worth:", error);
    return 0;
  }
}