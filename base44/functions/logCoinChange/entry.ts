import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { student_email, amount, reason, metadata } = await req.json();

        if (!student_email || amount === undefined || !reason) {
            return Response.json({ 
                success: false, 
                error: 'Missing required fields: student_email, amount, reason' 
            }, { status: 400 });
        }

        // Get current user data to record previous balance
        const users = await base44.asServiceRole.entities.User.filter({ email: student_email });
        if (users.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        const user = users[0];
        const previousBalance = user.coins || 0;
        const newBalance = previousBalance + amount;

        // Update user coins
        await base44.asServiceRole.entities.User.update(user.id, {
            coins: newBalance
        });

        // Create log entry
        await base44.asServiceRole.entities.CoinLog.create({
            student_email,
            amount,
            reason,
            previous_balance: previousBalance,
            new_balance: newBalance,
            metadata: metadata || {}
        });

        // Update leaderboard
        const leaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ 
            student_email 
        });
        
        if (leaderboardEntries.length > 0) {
            await base44.asServiceRole.entities.LeaderboardEntry.update(
                leaderboardEntries[0].id,
                { coins: newBalance }
            );
        }

        return Response.json({ 
            success: true,
            previous_balance: previousBalance,
            new_balance: newBalance,
            amount
        });
    } catch (error) {
        console.error('Error logging coin change:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});