import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Jerusalem timezone date helper
    const DATE_TZ = "Asia/Jerusalem";
    const fmtIL = new Intl.DateTimeFormat("en-CA", {
      timeZone: DATE_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const getDateKeyJerusalem = (daysOffset = 0) => {
      const todayKey = fmtIL.format(new Date());
      const [y, m, d] = todayKey.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + daysOffset));
      return fmtIL.format(dt);
    };

    const today = getDateKeyJerusalem(0);
    const yesterday = getDateKeyJerusalem(-1);

    console.log(`🔄 Resetting login streaks - Today: ${today}, Yesterday: ${yesterday}`);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const students = allUsers.filter(u => u.user_type === 'student' || !u.user_type);

    let resetCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const lastLogin = student.last_login_date;

      // If user logged in today or yesterday, keep their streak
      if (lastLogin === today || lastLogin === yesterday) {
        skippedCount++;
        continue;
      }

      // User didn't log in yesterday - reset streak to 0
      if (student.login_streak > 0) {
        await base44.asServiceRole.entities.User.update(student.id, {
          login_streak: 0
        });

        // Sync to LeaderboardEntry
        const leaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({
          student_email: student.email
        });

        if (leaderboardEntries.length > 0) {
          await base44.asServiceRole.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            login_streak: 0
          });
        }

        console.log(`✅ Reset streak for ${student.full_name || student.email} (last login: ${lastLogin || 'never'})`);
        resetCount++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const message = `✅ Login streak reset complete: ${resetCount} students reset, ${skippedCount} kept their streak`;
    console.log(message);

    return Response.json({
      success: true,
      message,
      resetCount,
      skippedCount,
      today,
      yesterday
    });
  } catch (error) {
    console.error("Error resetting login streaks:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});