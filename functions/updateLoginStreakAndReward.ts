export default async function updateLoginStreakAndReward({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Get user data
    const allUsers = await base44.entities.User.list();
    const user = allUsers.find(u => u.email === studentEmail);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const lastLoginDate = user.last_login_date ? user.last_login_date.split('T')[0] : null;

    // If already logged in today, do nothing
    if (lastLoginDate === today) {
      return { success: true, message: "Already logged in today", streak: user.login_streak || 0 };
    }

    // Calculate yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;

    if (lastLoginDate === yesterdayStr) {
      // Continued streak!
      newStreak = (user.login_streak || 0) + 1;
    }
    // Otherwise streak resets to 1

    // Calculate reward: 5 coins per day, capped at 100
    const reward = Math.min(5 * newStreak, 100);

    // Update user
    await base44.entities.User.update(user.id, {
      login_streak: newStreak,
      last_login_date: new Date().toISOString(),
      coins: (user.coins || 0) + reward,
      total_login_streak_coins: (user.total_login_streak_coins || 0) + reward
    });

    // Sync to LeaderboardEntry for public visibility
    const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
      student_email: studentEmail 
    });

    if (leaderboardEntries.length > 0) {
      await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
        login_streak: newStreak,
        last_login_date: new Date().toISOString(),
        coins: (user.coins || 0) + reward,
        total_login_streak_coins: (user.total_login_streak_coins || 0) + reward
      });
    }

    // Enqueue snapshot update for this student only
    await base44.functions.enqueueLeaderboardSnapshot({ studentEmail });

    return { 
      success: true, 
      message: "Streak updated",
      streak: newStreak,
      reward,
      isNewStreak: newStreak === 1 && lastLoginDate !== null
    };
  } catch (error) {
    console.error("Error updating login streak:", error);
    return { success: false, error: error.message };
  }
}