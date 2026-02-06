import { base44 } from "@/api/base44Client";

/**
 * Normalizes daily_collaborations array to ensure all objects have required fields
 * Adds completed:false if missing, filters out invalid entries
 */
export function normalizeDailyCollabs(collabs) {
  if (!Array.isArray(collabs)) return [];
  
  return collabs
    .filter(c => c && typeof c === 'object' && c.email && c.date)
    .map(c => ({
      email: c.email,
      date: c.date,
      completed: c.completed === true || c.completed === 'true' || c.completed === 1
    }));
}

/**
 * Sanitizes patch object before LeaderboardEntry.update to prevent validation errors
 */
export function sanitizeLeaderboardPatch(patch) {
  const cleanPatch = { ...patch };
  
  // Normalize daily_collaborations if present
  if ('daily_collaborations' in cleanPatch) {
    cleanPatch.daily_collaborations = normalizeDailyCollabs(cleanPatch.daily_collaborations);
  }
  
  // Clean age: remove if invalid, convert to number if valid
  if ('age' in cleanPatch) {
    const age = cleanPatch.age;
    if (age === '' || age === null || age === undefined || (typeof age === 'number' && isNaN(age))) {
      delete cleanPatch.age;
    } else {
      const numAge = Number(age);
      if (isNaN(numAge)) {
        delete cleanPatch.age;
      } else {
        cleanPatch.age = numAge;
      }
    }
  }
  
  // Clean bio: remove if empty string
  if ('bio' in cleanPatch && cleanPatch.bio === '') {
    delete cleanPatch.bio;
  }
  
  // Clean phone_number: remove if empty string
  if ('phone_number' in cleanPatch && cleanPatch.phone_number === '') {
    delete cleanPatch.phone_number;
  }
  
  return cleanPatch;
}

/**
 * Syncs specific fields to LeaderboardEntry for public visibility
 * This ensures all users can see each other's stats even without User entity access
 */
export async function syncLeaderboardEntry(studentEmail, patch) {
  try {
    const entries = await base44.entities.LeaderboardEntry.filter({
      student_email: studentEmail
    });

    const cleanPatch = sanitizeLeaderboardPatch(patch);

    if (entries && entries.length > 0) {
      const entry = entries[0];
      
      // Log coin change if coins are changing
      if ('coins' in cleanPatch && cleanPatch.coins !== entry.coins) {
        const oldCoins = entry.coins ?? 0;
        const newCoins = cleanPatch.coins;
        const amount = newCoins - oldCoins;
        
        // Determine reason based on metadata or common patterns
        let reason = "עדכון מטבעות";
        const metadata = cleanPatch.metadata || {};
        
        if (cleanPatch.investments_value !== undefined && cleanPatch.investments_value !== entry.investments_value) {
          reason = "עדכון השקעות";
        } else if (amount === 10 && cleanPatch.login_streak !== undefined) {
          reason = "בונוס כניסה יומי";
        } else if (amount > 0 && amount <= 50) {
          reason = "בונוס";
        } else if (amount < 0 && Math.abs(amount) % 10 === 0) {
          reason = "הוצאה";
        }
        
        // Import and call logCoinChange
        try {
          const { logCoinChange } = await import("./coinLogger");
          await logCoinChange(studentEmail, oldCoins, newCoins, reason, {
            source: 'LeaderboardSync',
            investments_value: cleanPatch.investments_value ?? entry.investments_value ?? 0,
            user_networth: cleanPatch.total_networth ?? 0,
            leaderboard_value: cleanPatch.total_networth ?? 0,
            ...metadata
          });
        } catch (logError) {
          console.error("Error logging coin change:", logError);
        }
      }
      
      // Always recalculate total_networth when any financial field changes
      if ('coins' in cleanPatch || 'investments_value' in cleanPatch || 'items_value' in cleanPatch) {
        const coins = 'coins' in cleanPatch ? cleanPatch.coins : (entry.coins ?? 0);
        const investments_value = 'investments_value' in cleanPatch ? cleanPatch.investments_value : (entry.investments_value ?? 0);
        const items_value = 'items_value' in cleanPatch ? cleanPatch.items_value : (entry.items_value ?? 0);
        cleanPatch.total_networth = coins + investments_value + items_value;
        console.log(`💰 Updating total_networth for ${studentEmail}: ${coins} + ${investments_value} + ${items_value} = ${cleanPatch.total_networth}`);
      }
      
      await base44.entities.LeaderboardEntry.update(entries[0].id, cleanPatch);
      console.log(`✅ Synced LeaderboardEntry for ${studentEmail}`);
      return entries[0];
    }

    // No entry found - create one automatically
    // Get user data to populate initial entry
    let user = null;
    try {
      const me = await base44.auth.me();
      if (me && me.email === studentEmail) {
        user = me;
      }
    } catch (e) {
      console.log(`⚠️ Cannot create LeaderboardEntry for ${studentEmail} - no access to user data`);
      return;
    }

    if (!user) {
      console.log(`⚠️ User not found for ${studentEmail}, cannot create LeaderboardEntry`);
      return;
    }

    const fullName =
      cleanPatch.full_name ||
      user.full_name ||
      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
      studentEmail;

    // Calculate profile_completion_coins if not in patch
    let profileCompletionCoins = cleanPatch.profile_completion_coins ?? 0;
    if (profileCompletionCoins === 0) {
      if (user.age) profileCompletionCoins += 20;
      if (user.bio && user.bio.length > 10) profileCompletionCoins += 30;
      if (user.phone_number) profileCompletionCoins += 20;
    }

    // Calculate total_networth for new entry
    const coins = cleanPatch.coins ?? user.coins ?? 0;
    const investments_value = cleanPatch.investments_value ?? user.investments_value ?? 0;
    const items_value = cleanPatch.items_value ?? user.items_value ?? 0;
    const total_networth = coins + investments_value + items_value;

    const created = await base44.entities.LeaderboardEntry.create({
      student_email: studentEmail,
      full_name: fullName,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      user_type: user.user_type || "student",
      coins: coins,
      investments_value: investments_value,
      items_value: items_value,
      total_networth: total_networth,
      login_streak: cleanPatch.login_streak ?? user.login_streak ?? 0,
      last_login_date: cleanPatch.last_login_date ?? user.last_login_date ?? null,
      profile_completion_coins: profileCompletionCoins,
      ...cleanPatch
    });

    console.log(`🆕 Created LeaderboardEntry for ${studentEmail} with total_networth: ${total_networth}`);
    return created;
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}