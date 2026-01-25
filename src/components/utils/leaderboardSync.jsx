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
      await base44.entities.LeaderboardEntry.update(entries[0].id, cleanPatch);
      console.log(`✅ Synced LeaderboardEntry for ${studentEmail}`);
      return;
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

    const created = await base44.entities.LeaderboardEntry.create({
      student_email: studentEmail,
      full_name: fullName,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      user_type: user.user_type || "student",
      coins: cleanPatch.coins ?? user.coins ?? 0,
      login_streak: cleanPatch.login_streak ?? user.login_streak ?? 0,
      last_login_date: cleanPatch.last_login_date ?? user.last_login_date ?? null,
      total_networth: cleanPatch.total_networth ?? user.total_networth ?? 0,
      profile_completion_coins: profileCompletionCoins,
      ...cleanPatch
    });

    console.log(`🆕 Created LeaderboardEntry for ${studentEmail}`);
    return created;
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}