import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json().catch(() => ({}));
    
    const getDateKeyJerusalem = (date = new Date()) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(date);
    };
    
    const dateKey = payload.dateKey || getDateKeyJerusalem();
    console.log(`🔄 Running daily market update for date: ${dateKey}`);
    
    // Helper: retry on 429 with backoff
    const withRetry = async (fn, maxRetries = 4) => {
      let delay = 2000;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          const is429 = err?.status === 429 || String(err?.message).includes('429') || String(err?.message).includes('Rate limit');
          if (is429 && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 2, 20000);
          } else {
            throw err;
          }
        }
      }
    };

    // Process array in parallel batches
    const processBatch = async (items, batchSize, fn, delayMs = 150) => {
      let count = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => withRetry(() => fn(item))));
        count += batch.length;
        if (i + batchSize < items.length) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      return count;
    };

    // ========== STEP 1: Create/Get Daily Market Performance ==========
    const existingMarket = await base44.asServiceRole.entities.DailyMarketPerformance.filter({ date: dateKey });
    
    let marketChanges;
    if (existingMarket.length > 0) {
      console.log(`✅ Market data already exists for ${dateKey}`);
      const m = existingMarket[0];
      marketChanges = {
        government_bonds: m.government_bonds_change || 0,
        real_estate: m.real_estate_change || 0,
        gold: m.gold_change || 0,
        stock_market: m.stock_market_change || 0,
        tech_startup: m.tech_startup_change || 0,
        crypto: m.crypto_change || 0
      };
    } else {
      console.log(`📊 Creating new market data for ${dateKey}`);
      marketChanges = {
        government_bonds: parseFloat((Math.random() * 1).toFixed(2)),
        gold: parseFloat((Math.random() * 1.4 - 0.3).toFixed(2)),
        real_estate: parseFloat((Math.random() * 3.7 - 1.5).toFixed(2)),
        stock_market: parseFloat((Math.random() * 7.5 - 3).toFixed(2)),
        crypto: parseFloat((Math.random() * 32 - 15).toFixed(2)),
        tech_startup: parseFloat((Math.random() * 76 - 35).toFixed(2))
      };
      
      await base44.asServiceRole.entities.DailyMarketPerformance.create({
        date: dateKey,
        government_bonds_change: marketChanges.government_bonds,
        real_estate_change: marketChanges.real_estate,
        gold_change: marketChanges.gold,
        stock_market_change: marketChanges.stock_market,
        tech_startup_change: marketChanges.tech_startup,
        crypto_change: marketChanges.crypto
      });
      console.log(`✅ Created market data:`, marketChanges);
    }
    
    // ========== STEP 2: Fetch all data in parallel ==========
    const fetchAll = async (entity) => {
      const all = [];
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities[entity].list(undefined, 100, skip);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 100) break;
        skip += 100;
      }
      return all;
    };

    const [allInvestments, allUsers, allLeaderboard] = await Promise.all([
      fetchAll('Investment'),
      fetchAll('User'),
      fetchAll('LeaderboardEntry')
    ]);
    
    // ========== STEP 3: Update Investments in batches ==========
    const investmentsToUpdate = allInvestments.filter(inv => inv.last_updated_date_key !== dateKey);
    console.log(`📈 ${investmentsToUpdate.length} investments to update`);
    
    const updatedCount = await processBatch(investmentsToUpdate, 5, async (investment) => {
      const changePercent = marketChanges[investment.business_type] || 0;
      const newValue = Math.round(investment.current_value * (1 + changePercent / 100));
      investment.current_value = newValue;
      await base44.asServiceRole.entities.Investment.update(investment.id, {
        current_value: newValue,
        daily_change_percent: changePercent,
        last_updated: new Date().toISOString(),
        last_updated_date_key: dateKey,
        unrealized_profit: newValue - (investment.invested_amount || 0)
      });
    }, 200);
    
    console.log(`✅ Updated ${updatedCount} investments`);
    
    // ========== STEP 4: Build per-email maps ==========
    const BUSINESS_TYPES = ['tech_startup', 'real_estate', 'crypto', 'stock_market', 'government_bonds', 'gold'];
    const invValueByEmail = {};
    const invInvestedByEmail = {};
    const invCountByEmail = {};
    const invCountByTypeByEmail = {};
    const invValueByTypeByEmail = {};
    const invInvestedByTypeByEmail = {};

    for (const inv of allInvestments) {
      const email = inv.student_email;
      if (!invValueByEmail[email]) {
        invValueByEmail[email] = 0; invInvestedByEmail[email] = 0; invCountByEmail[email] = 0;
        invCountByTypeByEmail[email] = {}; invValueByTypeByEmail[email] = {}; invInvestedByTypeByEmail[email] = {};
        BUSINESS_TYPES.forEach(t => { invCountByTypeByEmail[email][t] = 0; invValueByTypeByEmail[email][t] = 0; invInvestedByTypeByEmail[email][t] = 0; });
      }
      invValueByEmail[email] += inv.current_value || 0;
      invInvestedByEmail[email] += inv.invested_amount || 0;
      invCountByEmail[email] += 1;
      const t = inv.business_type;
      if (t && BUSINESS_TYPES.includes(t)) {
        invCountByTypeByEmail[email][t] += 1;
        invValueByTypeByEmail[email][t] += inv.current_value || 0;
        invInvestedByTypeByEmail[email][t] += inv.invested_amount || 0;
      }
    }

    const lbByEmail = {};
    for (const lb of allLeaderboard) lbByEmail[lb.student_email] = lb;

    // ========== STEP 5: Update users + leaderboard in batches ==========
    const studentsToUpdate = allUsers.filter(u => u.user_type === 'student' || !u.user_type);
    console.log(`👥 Processing ${studentsToUpdate.length} users`);

    const usersUpdated = await processBatch(studentsToUpdate, 3, async (user) => {
      const currentCoins = user.coins || 0;
      const newInvestmentsValue = Math.round(invValueByEmail[user.email] || 0);
      const itemsValue = user.items_value || 0;
      const totalNetworth = Math.round(currentCoins + newInvestmentsValue + itemsValue);
      const emptyTypes = {};
      BUSINESS_TYPES.forEach(t => { emptyTypes[t] = 0; });

      await base44.asServiceRole.entities.User.update(user.id, {
        total_networth: totalNetworth,
        investments_value: newInvestmentsValue,
        total_invested_amount: Math.round(invInvestedByEmail[user.email] || 0),
        investment_count_total: invCountByEmail[user.email] || 0,
        investment_count_by_type: invCountByTypeByEmail[user.email] || emptyTypes,
        investment_value_by_type: invValueByTypeByEmail[user.email] || emptyTypes,
        investment_invested_by_type: invInvestedByTypeByEmail[user.email] || emptyTypes,
        last_portfolio_snapshot_date_key: dateKey
      });

      const leaderboardData = { total_networth: totalNetworth, investments_value: newInvestmentsValue, coins: currentCoins };
      const lb = lbByEmail[user.email];
      if (lb) {
        await base44.asServiceRole.entities.LeaderboardEntry.update(lb.id, leaderboardData);
      } else {
        await base44.asServiceRole.entities.LeaderboardEntry.create({
          student_email: user.email,
          full_name: user.full_name || user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          ...leaderboardData
        });
      }
    }, 300);

    console.log(`✅ Updated net worth for ${usersUpdated} users`);
    
    return Response.json({
      success: true,
      date: dateKey,
      marketCreated: existingMarket.length === 0,
      investmentsUpdated: updatedCount,
      usersUpdated
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});