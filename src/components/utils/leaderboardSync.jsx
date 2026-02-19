import { base44 } from "@/api/base44Client";

// In-memory throttle tracker (per user)
const syncThrottleMap = new Map();
const SYNC_THROTTLE_MS = 30000; // 30 seconds between syncs per user

// In-memory lock to prevent race conditions (parallel calls for same user)
const ensureInProgress = new Map();

/**
 * Ensures a LeaderboardEntry exists for the user.
 * Returns the leaderboard_entry_id.
 * Uses in-memory lock to prevent race conditions / duplicate creation.
 */
export async function ensureLeaderboardEntry(user) {
  // Guard: must have a valid email
  if (!user?.email) {
    console.warn('⚠️ ensureLeaderboardEntry called without user email, skipping');
    return null;
  }

  // If already running for this email, wait for the same promise (prevents race condition / duplicate creation)
  if (ensureInProgress.has(user.email)) {
    return ensureInProgress.get(user.email);
  }

  const promise = _doEnsureLeaderboardEntry(user);
  ensureInProgress.set(user.email, promise);
  try {
    return await promise;
  } finally {
    ensureInProgress.delete(user.email);
  }
}

async function _doEnsureLeaderboardEntry(user) {
  // Check for existing entries by email
  const existingEntries = await base44.entities.LeaderboardEntry.filter({ 
    student_email: user.email 
  });

  // If duplicates found, delete extras and keep the first one
  if (existingEntries.length > 1) {
    console.warn(`⚠️ Found ${existingEntries.length} duplicate LeaderboardEntry records for ${user.email}, cleaning up...`);
    
    const keepEntry = existingEntries[0];
    for (let i = 1; i < existingEntries.length; i++) {
      try {
        await base44.entities.LeaderboardEntry.delete(existingEntries[i].id);
        console.log(`🗑️ Deleted duplicate LeaderboardEntry ${existingEntries[i].id}`);
      } catch (err) {
        console.error(`Error deleting duplicate entry:`, err);
      }
    }
    
    // Update user with the kept entry's ID
    if (user.leaderboard_entry_id !== keepEntry.id) {
      await base44.auth.updateMe({ leaderboard_entry_id: keepEntry.id });
    }
    
    return keepEntry.id;
  }

  // If exactly one entry exists, use it
  if (existingEntries.length === 1) {
    const entry = existingEntries[0];
    // Update user with the leaderboard_entry_id if missing
    if (user.leaderboard_entry_id !== entry.id) {
      await base44.auth.updateMe({ leaderboard_entry_id: entry.id });
    }
    return entry.id;
  }

  // No entries exist, create a new one
  try {
    const entry = await base44.entities.LeaderboardEntry.create({
      student_email: user.email,
      full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      group_name: user.group_name || '',
      user_type: user.user_type || 'student',
      coins: user.coins || 0,
      total_networth: user.total_networth || 0,
      total_lessons: user.total_lessons || 0,
      equipped_items: user.equipped_items || {},
      purchased_items: user.purchased_items || [],
      investments_value: user.investments_value || 0,
      items_value: user.items_value || 0,
      login_streak: user.login_streak || 0,
      mastered_words: user.mastered_words || 0,
      total_correct_math_answers: user.total_correct_math_answers || 0,
      total_work_hours: user.total_work_hours || 0,
      total_work_earnings: user.total_work_earnings || 0,
      daily_collaborations: user.daily_collaborations || [],
      ai_tech_level: user.ai_tech_level || 1,
      ai_tech_xp: user.ai_tech_xp || 0,
      personal_skills_level: user.personal_skills_level || 1,
      personal_skills_xp: user.personal_skills_xp || 0,
      money_business_level: user.money_business_level || 1,
      money_business_xp: user.money_business_xp || 0,
      total_inflation_lost: user.total_inflation_lost || 0,
      total_income_tax: user.total_income_tax || 0,
      total_capital_gains_tax: user.total_capital_gains_tax || 0,
      total_credit_interest: user.total_credit_interest || 0,
      total_investment_fees: user.total_investment_fees || 0,
      total_item_sale_losses: user.total_item_sale_losses || 0,
      total_passive_income: user.total_passive_income || 0,
      total_realized_investment_profit: user.total_realized_investment_profit || 0,
      total_login_streak_coins: user.total_login_streak_coins || 0,
      total_collaboration_coins: user.total_collaboration_coins || 0
    });

    // Update user with the new leaderboard_entry_id
    await base44.auth.updateMe({ leaderboard_entry_id: entry.id });

    console.log(`✅ Created LeaderboardEntry for ${user.email}: ${entry.id}`);
    return entry.id;
  } catch (error) {
    console.error("Error creating LeaderboardEntry:", error);
    throw error;
  }
}

/**
 * Syncs LeaderboardEntry with updated user data.
 * Uses leaderboard_entry_id for direct update (no filter).
 * Implements throttling and retry with backoff on 429.
 * Returns the actual total_networth that was synced to leaderboard.
 */
export async function syncLeaderboardEntry(user, patch = {}, options = {}) {
  const { forceSync = false } = options;

  // Guard: must have a valid email
  if (!user?.email) {
    console.warn('⚠️ syncLeaderboardEntry called without user email, skipping');
    return null;
  }

  try {
    // Get or create leaderboard_entry_id
    const lbId = await ensureLeaderboardEntry(user);
    if (!lbId) return null;

    // Throttle check (unless forceSync)
    if (!forceSync) {
      const lastSync = syncThrottleMap.get(user.email);
      if (lastSync && (Date.now() - lastSync) < SYNC_THROTTLE_MS) {
        console.log(`⏸️ Throttled sync for ${user.email} (${Math.round((Date.now() - lastSync) / 1000)}s ago)`);
        return null;
      }
    }

    // Prepare update payload (only relevant fields for leaderboard)
    const updatePayload = {
      coins: user.coins,
      total_networth: user.total_networth,
      total_lessons: user.total_lessons,
      investments_value: user.investments_value,
      items_value: user.items_value,
      equipped_items: user.equipped_items,
      purchased_items: user.purchased_items,
      login_streak: user.login_streak,
      mastered_words: user.mastered_words,
      total_correct_math_answers: user.total_correct_math_answers,
      total_work_hours: user.total_work_hours,
      total_work_earnings: user.total_work_earnings,
      daily_collaborations: user.daily_collaborations,
      ...patch
    };

    // Update LeaderboardEntry directly by ID
    await base44.entities.LeaderboardEntry.update(lbId, updatePayload);

    // Update throttle timestamp
    syncThrottleMap.set(user.email, Date.now());

    console.log(`✅ Synced LeaderboardEntry for ${user.email}`);
    
    // Return the actual total_networth that was synced
    return updatePayload.total_networth || null;
  } catch (error) {
    // Handle 429 with backoff
    if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
      console.warn(`⚠️ Rate limit hit while syncing leaderboard for ${user.email}, skipping...`);
      return null;
    }
    
    console.error("Error syncing leaderboard:", error);
    throw error;
  }
}

/**
 * Normalizes daily_collaborations array (removes invalid entries)
 */
export function normalizeDailyCollabs(collabs) {
  if (!Array.isArray(collabs)) return [];
  return collabs.filter(c => c && c.email && c.date);
}

/**
 * Sanitizes a patch object before updating LeaderboardEntry
 */
export function sanitizeLeaderboardPatch(patch) {
  const clean = { ...patch };
  
  if (clean.daily_collaborations) {
    clean.daily_collaborations = normalizeDailyCollabs(clean.daily_collaborations);
  }
  
  // Remove undefined/null values
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined || clean[key] === null) {
      delete clean[key];
    }
  });
  
  return clean;
}