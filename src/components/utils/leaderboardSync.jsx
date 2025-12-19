import { base44 } from "@/api/base44Client";

/**
 * Syncs specific fields to LeaderboardEntry for public visibility
 * This ensures all users can see each other's stats even without User entity access
 */
export async function syncLeaderboardEntry(studentEmail, patch) {
  try {
    const entries = await base44.entities.LeaderboardEntry.filter({ 
      student_email: studentEmail 
    });
    
    if (entries && entries.length > 0) {
      await base44.entities.LeaderboardEntry.update(entries[0].id, patch);
    }
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}