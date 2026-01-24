import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { AVATAR_ITEM_PRICES } from '../constants/avatarItems.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { userEmail } = await req.json();

    let usersToProcess = [];
    if (userEmail) {
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      usersToProcess = users;
    } else {
      const allUsers = await base44.asServiceRole.entities.User.list();
      usersToProcess = allUsers.filter(u => u.user_type === 'student');
    }

    const results = [];

    for (const user of usersToProcess) {
      try {
        // Calculate items value
        const purchasedItems = user.purchased_items || [];
        const itemsValue = purchasedItems.reduce((sum, itemId) => {
          return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
        }, 0);

        // Calculate investments value
        const investments = await base44.asServiceRole.entities.Investment.filter({ 
          student_email: user.email 
        });
        const investmentsValue = investments.reduce((sum, inv) => {
          return sum + (inv.current_value || 0);
        }, 0);

        // Calculate net worth: coins + investments_value + items_value
        const coins = user.coins || 0;
        const netWorth = coins + investmentsValue + itemsValue;

        // Update user with all three fields
        await base44.asServiceRole.entities.User.update(user.id, {
          investments_value: investmentsValue,
          items_value: itemsValue,
          total_networth: netWorth,
          last_calculated_at: new Date().toISOString()
        });

        results.push({
          email: user.email,
          full_name: user.full_name,
          coins,
          items_value: itemsValue,
          investments_value: investmentsValue,
          total_networth: netWorth,
          success: true
        });
      } catch (error) {
        results.push({
          email: user.email,
          error: error.message,
          success: false
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      message: `Recalculated ${successCount} users, ${failCount} failed`,
      results
    });

  } catch (error) {
    console.error('Error recalculating net worth:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});