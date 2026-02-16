import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // This function is called by scheduled automation (no user context)
    // Initialize client and use asServiceRole for all operations
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
        government_bonds: (Math.random() * 1).toFixed(2), // 0% to +1%, Eff = 0.5%
        gold: (Math.random() * 1.4 - 0.3).toFixed(2), // -0.3% to +1.1% ~ 0.4%, Eff = +0.399%
        real_estate: (Math.random() * 3.7 - 1.5).toFixed(2), // -1.5% to +2.2% ~ +0.35%, Eff = +0.345%
        stock_market: (Math.random() * 7.5 - 3).toFixed(2), // -3% to +4.5% ~ 0.75%, Eff ≈ +0.7267% 
        crypto: (Math.random() * 32 - 15).toFixed(2), // -15% to +17% ~ +1% , Eff = +0.575%
        tech_startup: (Math.random() * 76 - 35).toFixed(2) // -35% to +41% ~ +3% , Eff = +0.59%
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
    
    // Process in batches to avoid rate limits
    const BATCH_SIZE = 30;
    for (let i = 0; i < investmentsNeedingUpdate.length; i += BATCH_SIZE) {
      const batch = investmentsNeedingUpdate.slice(i, i + BATCH_SIZE);
      
      // Update batch in parallel
      await Promise.all(batch.map(async (investment) => {
        const changePercent = businessTypeToChangeMap[investment.business_type] || 0;
        const prevValue = investment.current_value;
        const newValue = Math.round(prevValue * (1 + changePercent / 100));
        const unrealizedProfit = newValue - (investment.invested_amount || 0);
        
        await base44.asServiceRole.entities.Investment.update(investment.id, {
          current_value: newValue,
          daily_change_percent: changePercent,
          last_updated: new Date().toISOString(),
          last_updated_date_key: dateKey,
          unrealized_profit: unrealizedProfit
        });
      }));
      
      updatedCount += batch.length;
      console.log(`✅ Updated batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updatedCount}/${investmentsNeedingUpdate.length} investments`);
      
      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < investmentsNeedingUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Completed updating ${updatedCount} investments`);
    
    // ========== STEP 3: Update Net Worth for All Users ==========
    const allUsers = await base44.asServiceRole.entities.User.list();
    const studentsToUpdate = allUsers.filter(u => u.user_type === 'student' || !u.user_type);
    let usersUpdated = 0;
    
    console.log(`👥 Processing ${studentsToUpdate.length} users`);
    
    // Process users in batches
    const USER_BATCH_SIZE = 15;
    for (let i = 0; i < studentsToUpdate.length; i += USER_BATCH_SIZE) {
      const userBatch = studentsToUpdate.slice(i, i + USER_BATCH_SIZE);
      
      await Promise.all(userBatch.map(async (user) => {
        try {
          const currentCoins = user.coins || 0;
          const equippedItems = user.equipped_items || {};
          
          // Only equipped items count
          let itemsValue = 0;
          
          const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
          const oldInvestmentsValue = user.investments_value || 0;
          const newInvestmentsValue = Math.round(userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0));
          const investmentChange = newInvestmentsValue - oldInvestmentsValue;
          
          // Log investment value change if there is one
          if (investmentChange !== 0) {
            try {
              await base44.asServiceRole.entities.CoinLog.create({
                student_email: user.email,
                amount: investmentChange,
                reason: "עדכון שווי השקעות יומי",
                previous_balance: oldInvestmentsValue,
                new_balance: newInvestmentsValue,
                metadata: {
                  timestamp: new Date().toISOString(),
                  source: 'Daily Investments Update',
                  date: dateKey,
                  type: 'investment_value_change',
                  investments_value: newInvestmentsValue,
                  items_value: itemsValue,
                  user_networth: currentCoins + itemsValue + newInvestmentsValue,
                  leaderboard_networth: currentCoins + itemsValue + newInvestmentsValue
                }
              });
            } catch (logError) {
              console.error(`Error logging investment change for ${user.email}:`, logError);
            }
          }
          
          const totalNetworth = Math.round(currentCoins + itemsValue + newInvestmentsValue);
          
          await base44.asServiceRole.entities.User.update(user.id, {
            total_networth: totalNetworth,
            investments_value: newInvestmentsValue
          });

          // Upsert to LeaderboardEntry
          const existingEntry = await base44.asServiceRole.entities.LeaderboardEntry.filter({
            student_email: user.email
          });

          const leaderboardData = {
            total_networth: totalNetworth,
            investments_value: newInvestmentsValue,
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
      }));
      
      console.log(`✅ Updated batch ${Math.floor(i / USER_BATCH_SIZE) + 1}: ${usersUpdated}/${studentsToUpdate.length} users`);
      
      // Delay between batches
      if (i + USER_BATCH_SIZE < studentsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Completed updating net worth for ${usersUpdated} users`);
    
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