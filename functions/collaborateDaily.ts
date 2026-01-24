import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const { targetEmail } = await req.json();
    
    // Validations
    if (!targetEmail) {
      return Response.json({ success: false, error: 'targetEmail is required' }, { status: 400 });
    }
    
    if (targetEmail === me.email) {
      return Response.json({ success: false, error: 'Cannot collaborate with yourself' }, { status: 400 });
    }

    // Load both users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const meUser = allUsers.find(u => u.email === me.email);
    const targetUser = allUsers.find(u => u.email === targetEmail);

    if (!meUser || !targetUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Constants
    const reward = 25;
    const today = new Date().toISOString().split('T')[0];

    // Get collaborations
    const meCollabs = meUser.daily_collaborations || [];
    const targetCollabs = targetUser.daily_collaborations || [];

    // Check if already sent request today
    const alreadySent = meCollabs.some(c => c && c.email === targetEmail && c.date === today);
    if (alreadySent) {
      return Response.json({ 
        success: true, 
        status: 'already_sent', 
        reward,
        message: 'כבר שלחת בקשה למשתמש זה היום'
      });
    }

    // Check if target has pending request to me
    const targetHasPendingToMe = targetCollabs.some(
      c => c && c.email === me.email && c.date === today && !c.completed
    );

    if (!targetHasPendingToMe) {
      // Just send request (no mutual yet)
      const updatedMeCollabs = [
        ...meCollabs,
        { email: targetEmail, date: today, completed: false }
      ];

      await base44.asServiceRole.entities.User.update(meUser.id, {
        daily_collaborations: updatedMeCollabs
      });

      // Sync to LeaderboardEntry
      const leaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ 
        student_email: me.email 
      });
      if (leaderboardEntries.length > 0) {
        await base44.asServiceRole.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          daily_collaborations: updatedMeCollabs
        });
      }

      return Response.json({ 
        success: true, 
        status: 'request_sent', 
        reward,
        message: `שלחת בקשת שיתוף פעולה! אם גם ${targetUser.full_name} ישלח לך, תקבלו ${reward} מטבעות כל אחד`
      });
    }

    // MUTUAL COLLABORATION - both users get coins!
    
    // Update meUser: add completed collaboration
    const updatedMeCollabs = [
      ...meCollabs,
      { email: targetEmail, date: today, completed: true }
    ];

    // Update targetUser: mark existing collaboration as completed
    const updatedTargetCollabs = targetCollabs.map(c => 
      (c && c.email === me.email && c.date === today) 
        ? { ...c, completed: true } 
        : c
    );

    // Calculate new values for meUser
    const meCoins = (meUser.coins || 0) + reward;
    const meTotalCollabCoins = (meUser.total_collaboration_coins || 0) + reward;
    let meNetWorth = 0;
    if (typeof meUser.total_networth === 'number') {
      meNetWorth = meUser.total_networth + reward;
    } else {
      const meBase = (meUser.coins || 0) + (meUser.investments_value || 0) + (meUser.items_value || 0);
      meNetWorth = meBase + reward;
    }

    // Calculate new values for targetUser
    const targetCoins = (targetUser.coins || 0) + reward;
    const targetTotalCollabCoins = (targetUser.total_collaboration_coins || 0) + reward;
    let targetNetWorth = 0;
    if (typeof targetUser.total_networth === 'number') {
      targetNetWorth = targetUser.total_networth + reward;
    } else {
      const targetBase = (targetUser.coins || 0) + (targetUser.investments_value || 0) + (targetUser.items_value || 0);
      targetNetWorth = targetBase + reward;
    }

    // Update both users in User entity
    await Promise.all([
      base44.asServiceRole.entities.User.update(meUser.id, {
        coins: meCoins,
        daily_collaborations: updatedMeCollabs,
        total_collaboration_coins: meTotalCollabCoins,
        total_networth: meNetWorth
      }),
      base44.asServiceRole.entities.User.update(targetUser.id, {
        coins: targetCoins,
        daily_collaborations: updatedTargetCollabs,
        total_collaboration_coins: targetTotalCollabCoins,
        total_networth: targetNetWorth
      })
    ]);

    // Sync both users to LeaderboardEntry
    const meLeaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ 
      student_email: me.email 
    });
    const targetLeaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ 
      student_email: targetEmail 
    });

    const leaderboardUpdates = [];
    if (meLeaderboardEntries.length > 0) {
      leaderboardUpdates.push(
        base44.asServiceRole.entities.LeaderboardEntry.update(meLeaderboardEntries[0].id, {
          coins: meCoins,
          daily_collaborations: updatedMeCollabs,
          total_collaboration_coins: meTotalCollabCoins,
          total_networth: meNetWorth
        })
      );
    }
    if (targetLeaderboardEntries.length > 0) {
      leaderboardUpdates.push(
        base44.asServiceRole.entities.LeaderboardEntry.update(targetLeaderboardEntries[0].id, {
          coins: targetCoins,
          daily_collaborations: updatedTargetCollabs,
          total_collaboration_coins: targetTotalCollabCoins,
          total_networth: targetNetWorth
        })
      );
    }

    if (leaderboardUpdates.length > 0) {
      await Promise.all(leaderboardUpdates);
    }

    return Response.json({ 
      success: true, 
      status: 'mutual_completed', 
      reward,
      message: `🎉 שיתוף פעולה הדדי! ${targetUser.full_name} ואתה קיבלתם ${reward} מטבעות כל אחד! 💰✨`
    });

  } catch (error) {
    console.error('Error in collaborateDaily:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
});