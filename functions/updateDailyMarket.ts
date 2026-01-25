import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already updated today
    const existingRecords = await base44.asServiceRole.entities.DailyMarketPerformance.filter({ date: today });
    if (existingRecords.length > 0) {
      return Response.json({ 
        message: 'Market already updated today',
        date: today,
        skipped: true
      });
    }

    // Generate daily market changes
    const marketChanges = {
      date: today,
      government_bonds_change: (Math.random() * 0.6 - 0.3).toFixed(2), // -0.3% to +0.3%
      real_estate_change: (Math.random() * 1.4 - 0.7).toFixed(2), // -0.7% to +0.7%
      gold_change: (Math.random() * 2 - 1).toFixed(2), // -1% to +1%
      stock_market_change: (Math.random() * 4 - 2).toFixed(2), // -2% to +2%
      restaurant_change: (Math.random() * 6 - 3).toFixed(2), // -3% to +3%
      tech_startup_change: (Math.random() * 10 - 5).toFixed(2), // -5% to +5%
      crypto_change: (Math.random() * 20 - 10).toFixed(2) // -10% to +10%
    };

    // Create daily market record
    await base44.asServiceRole.entities.DailyMarketPerformance.create(marketChanges);

    // Update all investments based on market changes
    const allInvestments = await base44.asServiceRole.entities.Investment.list();
    
    const businessTypeToChangeMap = {
      'government_bonds': parseFloat(marketChanges.government_bonds_change),
      'real_estate': parseFloat(marketChanges.real_estate_change),
      'gold': parseFloat(marketChanges.gold_change),
      'stock_market': parseFloat(marketChanges.stock_market_change),
      'tech_startup': parseFloat(marketChanges.tech_startup_change),
      'crypto': parseFloat(marketChanges.crypto_change)
    };

    let updatedCount = 0;
    for (const investment of allInvestments) {
      const changePercent = businessTypeToChangeMap[investment.business_type] || 0;
      const newValue = Math.round(investment.current_value * (1 + changePercent / 100));
      
      await base44.asServiceRole.entities.Investment.update(investment.id, {
        current_value: newValue,
        daily_change_percent: changePercent,
        last_updated: new Date().toISOString()
      });
      
      updatedCount++;
    }

    // Update net worth for all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    for (const user of allUsers) {
      if (user.user_type === 'student' || !user.user_type) {
        try {
          // Calculate net worth
          const currentCoins = user.coins || 0;
          const purchasedItems = user.purchased_items || [];
          
          let itemsValue = 0;
          // You'd need to import AVATAR_ITEMS here or calculate differently
          
          const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
          const investmentsValue = Math.round(userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0));
          
          const totalNetworth = Math.round(currentCoins + itemsValue + investmentsValue);
          
          await base44.asServiceRole.entities.User.update(user.id, {
            total_networth: totalNetworth,
            investments_value: investmentsValue
          });
        } catch (error) {
          console.error(`Error updating net worth for ${user.email}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      date: today,
      marketChanges,
      investmentsUpdated: updatedCount,
      usersUpdated: allUsers.length
    });

  } catch (error) {
    console.error('Error updating daily market:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});