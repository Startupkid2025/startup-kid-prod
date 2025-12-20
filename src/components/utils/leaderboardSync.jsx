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
      completed: c.completed === true
    }));
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
    
    // Normalize daily_collaborations if present in patch
    if (patch.daily_collaborations) {
      patch.daily_collaborations = normalizeDailyCollabs(patch.daily_collaborations);
    }
    
    if (entries && entries.length > 0) {
      await base44.entities.LeaderboardEntry.update(entries[0].id, patch);
    }
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}