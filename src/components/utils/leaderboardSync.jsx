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

    // Helper: determine if this should exist in leaderboard
    const shouldCreateEntry =
      cleanPatch?.user_type === "student" ||
      cleanPatch?.is_student === true;

    if (entries && entries.length > 0) {
      await base44.entities.LeaderboardEntry.update(entries[0].id, cleanPatch);
      console.log(`✅ Synced LeaderboardEntry for ${studentEmail}:`, cleanPatch);
      return;
    }

    // No entry found:
    // If we are sure it's a student → create it
    if (shouldCreateEntry) {
      const fullName =
        cleanPatch.full_name ||
        `${cleanPatch.first_name || ""} ${cleanPatch.last_name || ""}`.trim() ||
        studentEmail;

      const created = await base44.entities.LeaderboardEntry.create({
        student_email: studentEmail,
        full_name: fullName,
        coins: cleanPatch.coins ?? 0,
        ...cleanPatch
      });

      console.log(`🆕 Created LeaderboardEntry for ${studentEmail}`);
      return created;
    }

    // Otherwise: expected behavior (admin/owner/teacher/parent etc.)
    // No warn, no error.
    // console.debug(`Skipping LeaderboardEntry sync (not a student): ${studentEmail}`);
    return;
  } catch (error) {
    console.error("Error syncing LeaderboardEntry:", error);
  }
}