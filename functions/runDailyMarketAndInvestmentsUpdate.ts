import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse payload
    const payload = await req.json().catch(() => ({}));
    
    // Get date key for Asia/Jerusalem timezone
    const getDateKeyJerusalem = (date = new Date()) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    };
    
    const dateKey = payload.dateKey || getDateKeyJerusalem();
    
    console.log(`🔄 Running daily market and investments update for date: ${dateKey}`);
    
    // ========== STEP 1: Create/Get Daily Market Performance ==========
    const existingMarket = await base44.asServiceRole.entities.DailyMarketPerformance.filter({ date: dateKey });
    
    let marketChanges;
    if (existingMarket.length > 0) {
      // Market already exists for today
      console.log(`✅ Market data already exists for ${dateKey}`);
      const market = existingMarket[0];
      marketChanges = {
        government_bonds: market.government_bonds_change || 0,
        real_estate: market.real_estate_change || 0,
        gold: market.gold_change || 0,
        stock_market: market.stock_market_change || 0,
        tech_startup: market.tech_startup_change || 0,
        crypto: market.crypto_change || 0
      };
    } else {
      // Create new market data
      console.log(`📊 Creating new market data for ${dateKey}`);
      marketChanges = {
        government_bonds: (Math.random() * 0.3).toFixed(2), // 0% to +0.3%
        real_estate: (Math.random() * 1.1 - 0.5).toFixed(2), // -0.5% to +0.6%
        gold: (Math.random() * 0.75 - 0.3).toFixed(2), // -0.3% to +0.45%
        stock_market: (Math.random() * 5 - 2).toFixed(2), // -2% to +3%
        crypto: (Math.random() * 6.5 - 3).toFixed(2), // -3% to +3.5%
        tech_startup: (Math.random() * 7.5 - 3.5).toFixed(2) // -3.5% to +4%
      };
      
      await base44.asServiceRole.entities.DailyMarketPerformance.create({
        date: dateKey,
        government_bonds_change: parseFloat(marketChanges.government_bonds),
        real_estate_change: parseFloat(marketChanges.real_estate),
        gold_change: parseFloat(marketChanges.gold),
        stock_market_change: parseFloat(marketChanges.stock_market),
        tech_startup_change: parseFloat(marketChanges.tech_startup),
        crypto_change: parseFloat(marketChanges.crypto)
      });
      
      console.log(`✅ Created market data:`, marketChanges);
    }
    
    // Convert to numeric for calculations
    const businessTypeToChangeMap = {
      government_bonds: parseFloat(marketChanges.government_bonds),
      real_estate: parseFloat(marketChanges.real_estate),
      gold: parseFloat(marketChanges.gold),
      stock_market: parseFloat(marketChanges.stock_market),
      tech_startup: parseFloat(marketChanges.tech_startup),
      crypto: parseFloat(marketChanges.crypto)
    };
    
    // ========== STEP 2: Update Investments ==========
    const allInvestments = await base44.asServiceRole.entities.Investment.list();
    
    // Filter investments that need updating (use date_key to avoid timezone issues)
    const investmentsNeedingUpdate = allInvestments.filter(inv => {
      return inv.last_updated_date_key !== dateKey;
    });
    
    console.log(`📈 Found ${investmentsNeedingUpdate.length} investments to update`);
    
    let updatedCount = 0;
    for (const investment of investmentsNeedingUpdate) {
      const changePercent = businessTypeToChangeMap[investment.business_type] || 0;
      const prevValue = investment.current_value;
      const newValue = Math.round(prevValue * (1 + changePercent / 100));
      const delta = newValue - prevValue;
      
      // Calculate unrealized profit
      const unrealizedProfit = newValue - (investment.invested_amount || 0);
      
      await base44.asServiceRole.entities.Investment.update(investment.id, {
        current_value: newValue,
        daily_change_percent: changePercent,
        last_updated: new Date().toISOString(),
        last_updated_date_key: dateKey,
        unrealized_profit: unrealizedProfit
      });
      
      updatedCount++;
    }
    
    console.log(`✅ Updated ${updatedCount} investments`);
    
    // ========== STEP 3: Update Net Worth for All Users ==========
    const allUsers = await base44.asServiceRole.entities.User.list();
    let usersUpdated = 0;
    
    for (const user of allUsers) {
      if (user.user_type === 'student' || !user.user_type) {
        try {
          const currentCoins = user.coins || 0;
          const purchasedItems = user.purchased_items || [];
          
          let itemsValue = 0;
          // Items value calculation would need AVATAR_ITEMS import
          
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
            await base44.asServiceRole.entities.LeaderboardEntry.update(existingEntry[0].id, leaderboardData);
          } else {
            await base44.asServiceRole.entities.LeaderboardEntry.create({
              student_email: user.email,
              full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              ...leaderboardData
            });
          }
          
          usersUpdated++;
        } catch (error) {
          console.error(`Error updating net worth for ${user.email}:`, error);
        }
      }
    }
    
    console.log(`✅ Updated net worth for ${usersUpdated} users`);
    
    return Response.json({
      success: true,
      date: dateKey,
      marketCreated: existingMarket.length === 0,
      investmentsUpdated: updatedCount,
      usersUpdated: usersUpdated,
      marketChanges: businessTypeToChangeMap
    });
    
  } catch (error) {
    console.error("❌ Error in runDailyMarketAndInvestmentsUpdate:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});