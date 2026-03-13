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
        const studentEmail = data.email;

        // Try to determine reason from context
        let reason = "עדכון ידני";
        
        // Check common user fields to guess reason
        if (data.total_work_earnings !== old_data?.total_work_earnings) {
            reason = "עבודה";
        } else if (data.total_login_streak_coins !== old_data?.total_login_streak_coins) {
            reason = "בונוס כניסה יומית";
        } else if (data.total_collaboration_coins !== old_data?.total_collaboration_coins) {
            reason = "שיתוף פעולה";
        } else if (data.total_passive_income !== old_data?.total_passive_income) {
            reason = "הכנסה פסיבית";
        } else if (data.total_inflation_lost !== old_data?.total_inflation_lost) {
            reason = "אינפלציה";
        } else if (data.total_income_tax !== old_data?.total_income_tax) {
            reason = "מס הכנסה";
        } else if (data.total_credit_interest !== old_data?.total_credit_interest) {
            reason = "ריבית אשראי";
        } else if (data.total_math_earnings !== old_data?.total_math_earnings) {
            reason = "תרגילי חשבון";
        } else if (data.total_investment_fees !== old_data?.total_investment_fees) {
            reason = "עמלות השקעות";
        } else if (data.investments_value !== old_data?.investments_value) {
            reason = "רכישה/מכירה של השקעה";
        } else if (data.items_value !== old_data?.items_value) {
            reason = "רכישה/מכירה של פריט";
        } else if (amount === 100) {
            reason = "השתתפות בשיעור";
        } else if (amount === 20) {
            reason = "סקר שיעור";
        } else if (amount === 3) {
            reason = "לייק/תגובה";
        } else if (amount > 0 && amount <= 15) {
            reason = "אנגלית/חשבון";
        } else if (amount === 500) {
            reason = "תלמיד חדש - מתנת קבלה";
        }

        // Create log entry using service role
        await base44.asServiceRole.entities.CoinLog.create({
            student_email: studentEmail,
            amount: amount,
            reason: reason,
            previous_balance: oldCoins,
            new_balance: newCoins,
            metadata: {
                timestamp: new Date().toISOString(),
                source: 'User entity'
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