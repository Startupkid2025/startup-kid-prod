import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    console.log('🔍 Fetching all users...');
    
    // Fetch all users
    let allUsers = [];
    let skip = 0;
    const limit = 100;
    
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('', limit, skip);
      if (batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      skip += limit;
    }
    
    console.log(`✅ Found ${allUsers.length} total users`);
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const user of allUsers) {
      try {
        // Check if user already has a leaderboard entry
        const existingEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({ 
          student_email: user.email 
        });
        
        if (existingEntries.length === 0) {
          // Create new leaderboard entry
          const entry = await base44.asServiceRole.entities.LeaderboardEntry.create({
            student_email: user.email,
            full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            group_name: user.group_name || '',
            user_type: user.user_type || 'student',
            coins: user.coins || 0,
            total_networth: user.total_networth || 0,
            total_lessons: user.total_lessons || 0,
            equipped_items: user.equipped_items || {},
            purchased_items: user.purchased_items || [],
            investments_value: user.investments_value || 0,
            items_value: user.items_value || 0,
            login_streak: user.login_streak || 0,
            mastered_words: user.mastered_words || 0,
            total_correct_math_answers: user.total_correct_math_answers || 0,
            total_work_hours: user.total_work_hours || 0,
            total_work_earnings: user.total_work_earnings || 0,
            daily_collaborations: user.daily_collaborations || [],
            ai_tech_level: user.ai_tech_level || 1,
            ai_tech_xp: user.ai_tech_xp || 0,
            personal_skills_level: user.personal_skills_level || 1,
            personal_skills_xp: user.personal_skills_xp || 0,
            money_business_level: user.money_business_level || 1,
            money_business_xp: user.money_business_xp || 0,
            total_inflation_lost: user.total_inflation_lost || 0,
            total_income_tax: user.total_income_tax || 0,
            total_capital_gains_tax: user.total_capital_gains_tax || 0,
            total_credit_interest: user.total_credit_interest || 0,
            total_investment_fees: user.total_investment_fees || 0,
            total_item_sale_losses: user.total_item_sale_losses || 0,
            total_passive_income: user.total_passive_income || 0,
            total_realized_investment_profit: user.total_realized_investment_profit || 0,
            total_login_streak_coins: user.total_login_streak_coins || 0,
            total_collaboration_coins: user.total_collaboration_coins || 0
          });
          
          // Update user with leaderboard_entry_id
          await base44.asServiceRole.entities.User.update(user.id, {
            leaderboard_entry_id: entry.id
          });
          
          console.log(`✅ Created LeaderboardEntry for ${user.email}`);
          created++;
        } else {
          existing++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${user.email}:`, err);
        errors++;
      }
    }
    
    console.log(`✅ Sync complete: ${created} created, ${existing} existing, ${errors} errors`);
    
    return Response.json({
      success: true,
      totalUsers: allUsers.length,
      created,
      existing,
      errors
    });
    
  } catch (error) {
    console.error('❌ Error syncing users:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});