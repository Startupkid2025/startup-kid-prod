import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // This is called by entity automation when User is updated
    const { event, data, old_data } = payload;
    
    if (!data || !data.email) {
      return Response.json({ success: false, error: 'No user data' }, { status: 400 });
    }
    
    // Only sync for students/regular users
    if (data.user_type === 'parent' || data.user_type === 'teacher') {
      return Response.json({ success: true, skipped: true, reason: 'Not a student' });
    }
    
    // Prepare leaderboard data from User fields
    const leaderboardData = {
      student_email: data.email,
      full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      group_name: data.group_name,
      coins: data.coins || 0,
      total_networth: data.total_networth || 0,
      investments_value: data.investments_value || 0,
      items_value: data.items_value || 0,
      ai_tech_level: data.ai_tech_level || 1,
      ai_tech_xp: data.ai_tech_xp || 0,
      personal_skills_level: data.personal_skills_level || 1,
      personal_skills_xp: data.personal_skills_xp || 0,
      money_business_level: data.money_business_level || 1,
      money_business_xp: data.money_business_xp || 0,
      total_lessons: data.total_lessons || 0,
      equipped_items: data.equipped_items || {},
      purchased_items: data.purchased_items || [],
      total_work_earnings: data.total_work_earnings || 0,
      total_work_hours: data.total_work_hours || 0,
      total_collaboration_coins: data.total_collaboration_coins || 0,
      total_login_streak_coins: data.total_login_streak_coins || 0,
      login_streak: data.login_streak || 0,
      total_inflation_lost: data.total_inflation_lost || 0,
      total_income_tax: data.total_income_tax || 0,
      total_capital_gains_tax: data.total_capital_gains_tax || 0,
      total_credit_interest: data.total_credit_interest || 0,
      total_investment_fees: data.total_investment_fees || 0,
      total_item_sale_losses: data.total_item_sale_losses || 0,
      total_realized_investment_profit: data.total_realized_investment_profit || 0,
      total_passive_income: data.total_passive_income || 0,
      profile_completion_coins: data.profile_completion_coins || 0,
      completed_instagram_follow: data.completed_instagram_follow || false,
      completed_youtube_subscribe: data.completed_youtube_subscribe || false,
      completed_facebook_follow: data.completed_facebook_follow || false,
      completed_discord_join: data.completed_discord_join || false,
      completed_share: data.completed_share || false,
      age: data.age,
      bio: data.bio,
      phone_number: data.phone_number,
      daily_collaborations: data.daily_collaborations || [],
      last_login_date: data.last_login_date,
      total_correct_math_answers: data.total_correct_math_answers || 0,
      mastered_words: data.mastered_words || 0,
      mastered_math_questions: data.mastered_math_questions || 0,
      total_food_expense: data.total_food_expense || 0
    };
    
    // Find existing LeaderboardEntry
    const existingEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({
      student_email: data.email
    });
    
    if (existingEntries.length > 0) {
      // Update existing entry
      await base44.asServiceRole.entities.LeaderboardEntry.update(
        existingEntries[0].id,
        leaderboardData
      );
      
      return Response.json({
        success: true,
        action: 'updated',
        student_email: data.email
      });
    } else {
      // Create new entry
      await base44.asServiceRole.entities.LeaderboardEntry.create(leaderboardData);
      
      return Response.json({
        success: true,
        action: 'created',
        student_email: data.email
      });
    }
    
  } catch (error) {
    console.error('Error syncing user to leaderboard:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});