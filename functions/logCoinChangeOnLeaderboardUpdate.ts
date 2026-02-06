import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, old_data } = await req.json();

        // Check if coins changed
        const oldCoins = old_data?.coins || 0;
        const newCoins = data?.coins || 0;

        if (oldCoins === newCoins) {
            return Response.json({ 
                success: true, 
                message: 'No coin change detected' 
            });
        }

        const amount = newCoins - oldCoins;
        const studentEmail = data.student_email;

        // Try to determine reason from context - add [סינכרון לידרבורד] prefix
        let reason = "[סינכרון לידרבורד] סיבה לא ידועה";
        
        // Check common fields to guess reason
        if (data.total_work_earnings !== old_data?.total_work_earnings) {
            reason = "[סינכרון לידרבורד] עבודה";
        } else if (data.total_login_streak_coins !== old_data?.total_login_streak_coins) {
            reason = "[סינכרון לידרבורד] בונוס כניסה יומית";
        } else if (data.total_collaboration_coins !== old_data?.total_collaboration_coins) {
            reason = "[סינכרון לידרבורד] שיתוף פעולה";
        } else if (data.total_passive_income !== old_data?.total_passive_income) {
            reason = "[סינכרון לידרבורד] הכנסה פסיבית";
        } else if (data.total_inflation_lost !== old_data?.total_inflation_lost) {
            reason = "[סינכרון לידרבורד] אינפלציה";
        } else if (data.total_income_tax !== old_data?.total_income_tax) {
            reason = "[סינכרון לידרבורד] מס הכנסה";
        } else if (data.total_credit_interest !== old_data?.total_credit_interest) {
            reason = "[סינכרון לידרבורד] ריבית אשראי";
        } else if (data.total_investment_fees !== old_data?.total_investment_fees) {
            reason = "[סינכרון לידרבורד] עמלות השקעות";
        } else if (data.total_realized_investment_profit !== old_data?.total_realized_investment_profit) {
            reason = "[סינכרון לידרבורד] רווחי השקעות";
        } else if (data.total_admin_coins !== old_data?.total_admin_coins) {
            reason = "[סינכרון לידרבורד] עדכון ידני";
        } else if (amount === 100) {
            reason = "[סינכרון לידרבורד] השתתפות בשיעור";
        } else if (amount === 20) {
            reason = "[סינכרון לידרבורד] סקר שיעור";
        } else if (amount === 3) {
            reason = "[סינכרון לידרבורד] לייק/תגובה";
        } else if (amount > 0 && amount <= 15) {
            reason = "[סינכרון לידרבורד] אנגלית/חשבון";
        }

        // Create log entry using service role to avoid RLS
        await base44.asServiceRole.entities.CoinLog.create({
            student_email: studentEmail,
            amount: amount,
            reason: reason,
            previous_balance: oldCoins,
            new_balance: newCoins,
            metadata: {
                timestamp: new Date().toISOString()
            }
        });

        return Response.json({ 
            success: true,
            logged: {
                email: studentEmail,
                amount,
                reason,
                oldCoins,
                newCoins
            }
        });
    } catch (error) {
        console.error('Error logging coin change:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});