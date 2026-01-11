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
      console.log(`✅ Synced LeaderboardEntry for ${studentEmail}:`, cleanPatch);
    } else {
      console.warn(`⚠️ No LeaderboardEntry found for ${studentEmail} - sync skipped`);
    }
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}