import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get date key for Asia/Jerusalem timezone
    const getDateKeyJerusalem = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date());
    };
    
    const today = getDateKeyJerusalem();
    
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
      government_bonds_change: (Math.random() * 0.3).toFixed(2), // 0% to +0.3%
      real_estate_change: (Math.random() * 1.1 - 0.5).toFixed(2), // -0.5% to +0.6%
      gold_change: (Math.random() * 0.75 - 0.3).toFixed(2), // -0.3% to +0.45%
      stock_market_change: (Math.random() * 5 - 2).toFixed(2), // -2% to +3%
      crypto_change: (Math.random() * 6.5 - 3).toFixed(2), // -3% to +3.5%
      tech_startup_change: (Math.random() * 7.5 - 3.5).toFixed(2) // -3.5% to +4%
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
      const prevValue = investment.current_value;
      const newValue = Math.round(prevValue * (1 + changePercent / 100));
      const delta = newValue - prevValue;
      
      await base44.asServiceRole.entities.Investment.update(investment.id, {
        current_value: newValue,
        daily_change_percent: changePercent,
        last_updated: new Date().toISOString(),
        last_updated_date_key: today,
        unrealized_profit: (investment.unrealized_profit || 0) + delta
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

          // Upsert to LeaderboardEntry
          const existingEntry = await base44.asServiceRole.entities.LeaderboardEntry.filter({
            student_email: user.email
          });

          const leaderboardData = {
            total_networth: totalNetworth,
            investments_value: investmentsValue,
            coins: currentCoins,
            last_updated: new Date().toISOString()
          };

          if (existingEntry.length > 0) {
            // Update existing entry
            await base44.asServiceRole.entities.LeaderboardEntry.update(existingEntry[0].id, leaderboardData);
          } else {
            // Create new entry
            await base44.asServiceRole.entities.LeaderboardEntry.create({
              student_email: user.email,
              full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              ...leaderboardData
            });
          }
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