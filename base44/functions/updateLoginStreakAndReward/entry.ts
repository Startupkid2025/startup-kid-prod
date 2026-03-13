import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Updates a student's login streak and awards coins.
 * Converted from legacy export-default format to Deno.serve.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const b = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { studentEmail } = body;

    if (!studentEmail) {
      return Response.json({ success: false, error: 'studentEmail is required' }, { status: 400 });
    }

    const allUsers = await b.entities.User.list();
    const user = allUsers.find(u => u.email === studentEmail);

    if (!user) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastLoginDate = user.last_login_date ? user.last_login_date.split('T')[0] : null;

    if (lastLoginDate === today) {
      return Response.json({ success: true, message: 'Already logged in today', streak: user.login_streak || 0 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastLoginDate === yesterdayStr) {
      newStreak = (user.login_streak || 0) + 1;
    }

    const reward = Math.min(5 * newStreak, 100);

    await b.entities.User.update(user.id, {
      login_streak: newStreak,
      last_login_date: new Date().toISOString(),
      coins: (user.coins || 0) + reward,
      total_login_streak_coins: (user.total_login_streak_coins || 0) + reward,
    });

    const leaderboardEntries = await b.entities.LeaderboardEntry.filter({
      student_email: studentEmail,
    });

    if (leaderboardEntries.length > 0) {
      await b.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
        login_streak: newStreak,
        last_login_date: new Date().toISOString(),
        coins: (user.coins || 0) + reward,
        total_login_streak_coins: (user.total_login_streak_coins || 0) + reward,
      });
    }

    return Response.json({
      success: true,
      message: 'Streak updated',
      streak: newStreak,
      reward,
      isNewStreak: newStreak === 1 && lastLoginDate !== null,
    });
  } catch (error) {
    console.error('updateLoginStreakAndReward error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
