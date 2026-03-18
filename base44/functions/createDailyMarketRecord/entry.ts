import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Lightweight function: ONLY creates the DailyMarketPerformance record.
// Runs at midnight Israel time via scheduled automation.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const getDateKeyJerusalem = () => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    };
    
    const dateKey = getDateKeyJerusalem();
    console.log(`📊 Creating daily market record for: ${dateKey}`);
    
    // Check if already exists
    const existing = await base44.asServiceRole.entities.DailyMarketPerformance.filter({ date: dateKey });
    if (existing.length > 0) {
      console.log(`✅ Market record already exists for ${dateKey}`);
      return Response.json({ success: true, date: dateKey, skipped: true });
    }
    
    // Create market data
    const marketChanges = {
      government_bonds_change: parseFloat((Math.random() * 1).toFixed(2)),
      gold_change: parseFloat((Math.random() * 1.4 - 0.3).toFixed(2)),
      real_estate_change: parseFloat((Math.random() * 3.7 - 1.5).toFixed(2)),
      stock_market_change: parseFloat((Math.random() * 7.5 - 3).toFixed(2)),
      crypto_change: parseFloat((Math.random() * 32 - 15).toFixed(2)),
      tech_startup_change: parseFloat((Math.random() * 76 - 35).toFixed(2))
    };
    
    await base44.asServiceRole.entities.DailyMarketPerformance.create({
      date: dateKey,
      ...marketChanges
    });
    
    console.log(`✅ Created market record for ${dateKey}:`, marketChanges);
    
    return Response.json({ success: true, date: dateKey, created: true, marketChanges });
    
  } catch (error) {
    console.error("❌ Error creating daily market record:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});