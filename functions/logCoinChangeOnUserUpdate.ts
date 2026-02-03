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

        // Try to determine reason from context
        let reason = "עדכון ידני";
        
        // Check common fields to guess reason
        if (data.total_work_earnings !== old_data?.total_work_earnings) {
            reason = "עבודה";
        } else if (data.total_login_streak_coins !== old_data?.total_login_streak_coins) {
            reason = "בונוס כניסה יומית";
        } else if (data.total_collaboration_coins !== old_data?.total_collaboration_coins) {
            reason = "שיתוף פעולה";
        } else if (data.purchased_items?.length > (old_data?.purchased_items?.length || 0)) {
            reason = "קנייה בחנות";
        } else if (data.total_passive_income !== old_data?.total_passive_income) {
            reason = "הכנסה פסיבית";
        } else if (data.total_inflation_lost !== old_data?.total_inflation_lost) {
            reason = "אינפלציה";
        } else if (data.total_income_tax !== old_data?.total_income_tax) {
            reason = "מס הכנסה";
        } else if (data.total_credit_interest !== old_data?.total_credit_interest) {
            reason = "ריבית אשראי";
        } else if (amount > 0 && amount % 100 === 0) {
            reason = "השתתפות בשיעור";
        }

        // Create log entry
        await base44.asServiceRole.entities.CoinLog.create({
            student_email: data.email,
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
                email: data.email,
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