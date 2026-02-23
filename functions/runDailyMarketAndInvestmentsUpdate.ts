import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { recomputeAndPersistPortfolioSnapshot } from '../components/utils/portfolioSnapshot.js';

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
    
    // Helper: update a single item with retry on 429
    const updateWithRetry = async (fn, maxRetries = 5) => {
      let delay = 2000;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Rate limit');
          if (is429 && attempt < maxRetries) {
            console.log(`⏳ Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 30000);
          } else {
            throw err;
          }
        }
      }
    };

    // ========== STEP 2: Update Investments ==========
    // Fetch all investments in batches of 100
    const allInvestments = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Investment.list(undefined, 100, skip);
      if (!batch || batch.length === 0) break;
      allInvestments.push(...batch);
      if (batch.length < 100) break;
      skip += 100;
    }
    
    // Filter investments that need updating (use date_key to avoid timezone issues)
    const investmentsNeedingUpdate = allInvestments.filter(inv => inv.last_updated_date_key !== dateKey);
    
    console.log(`📈 Found ${investmentsNeedingUpdate.length} investments to update (total: ${allInvestments.length})`);
    
    let updatedCount = 0;
    
    // Process fully sequentially with delay between each to avoid rate limits
    for (const investment of investmentsNeedingUpdate) {
      const changePercent = businessTypeToChangeMap[investment.business_type] || 0;
      const prevValue = investment.current_value;
      const newValue = Math.round(prevValue * (1 + changePercent / 100));
      const unrealizedProfit = newValue - (investment.invested_amount || 0);

      // Also update local copy so invValueByEmail reflects new values
      investment.current_value = newValue;

      await updateWithRetry(() => base44.asServiceRole.entities.Investment.update(investment.id, {
        current_value: newValue,
        daily_change_percent: changePercent,
        last_updated: new Date().toISOString(),
        last_updated_date_key: dateKey,
        unrealized_profit: unrealizedProfit
      }));

      updatedCount++;
      if (updatedCount % 30 === 0 || updatedCount === investmentsNeedingUpdate.length) {
        console.log(`✅ Updated ${updatedCount}/${investmentsNeedingUpdate.length} investments`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Completed updating ${updatedCount} investments`);
    
    // ========== STEP 3: Update Net Worth for Affected Users ==========
    // Build investment value map per email from updated allInvestments
    const invValueByEmail = {};
    for (const inv of allInvestments) {
      if (!invValueByEmail[inv.student_email]) invValueByEmail[inv.student_email] = 0;
      invValueByEmail[inv.student_email] += inv.current_value || 0;
    }

    // Fetch all users & leaderboard entries once
    const [allUsers, allLeaderboard] = await Promise.all([
      base44.asServiceRole.entities.User.list(undefined, 200),
      base44.asServiceRole.entities.LeaderboardEntry.list(undefined, 200)
    ]);

    const lbByEmail = {};
    for (const lb of allLeaderboard) {
      lbByEmail[lb.student_email] = lb;
    }

    const studentsToUpdate = allUsers.filter(u => u.user_type === 'student' || !u.user_type);
    let usersUpdated = 0;

    console.log(`👥 Processing ${studentsToUpdate.length} users sequentially`);

    for (const user of studentsToUpdate) {
      try {
        const currentCoins = user.coins || 0;
        const newInvestmentsValue = Math.round(invValueByEmail[user.email] || 0);
        const totalNetworth = Math.round(currentCoins + newInvestmentsValue);

        await updateWithRetry(() => base44.asServiceRole.entities.User.update(user.id, {
          total_networth: totalNetworth,
          investments_value: newInvestmentsValue
        }));

        const lb = lbByEmail[user.email];
        const leaderboardData = {
          total_networth: totalNetworth,
          investments_value: newInvestmentsValue,
          coins: currentCoins
        };

        if (lb) {
          await updateWithRetry(() => base44.asServiceRole.entities.LeaderboardEntry.update(lb.id, leaderboardData));
        } else {
          await updateWithRetry(() => base44.asServiceRole.entities.LeaderboardEntry.create({
            student_email: user.email,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            ...leaderboardData
          }));
        }

        usersUpdated++;

        // Small delay between users
        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.error(`Error updating net worth for ${user.email}:`, error);
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