import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    console.log('🔍 Fetching all LeaderboardEntry records...');
    
    // Fetch all leaderboard entries
    let allEntries = [];
    let skip = 0;
    const limit = 100;
    
    while (true) {
      const batch = await base44.asServiceRole.entities.LeaderboardEntry.list('', limit, skip);
      if (batch.length === 0) break;
      allEntries = allEntries.concat(batch);
      skip += limit;
    }
    
    console.log(`✅ Found ${allEntries.length} total entries`);
    
    // Group by student_email
    const emailMap = new Map();
    allEntries.forEach(entry => {
      const email = entry.student_email;
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(entry);
    });
    
    // Find duplicates
    let duplicatesFound = 0;
    let entriesDeleted = 0;
    const duplicateEmails = [];
    
    for (const [email, entries] of emailMap.entries()) {
      if (entries.length > 1) {
        duplicatesFound++;
        duplicateEmails.push({ email, count: entries.length });
        
        console.log(`⚠️ Found ${entries.length} entries for ${email}`);
        
        // Keep the first entry (oldest), delete the rest
        const keepEntry = entries[0];
        
        for (let i = 1; i < entries.length; i++) {
          try {
            await base44.asServiceRole.entities.LeaderboardEntry.delete(entries[i].id);
            console.log(`🗑️ Deleted duplicate entry ${entries[i].id} for ${email}`);
            entriesDeleted++;
          } catch (err) {
            console.error(`❌ Error deleting entry ${entries[i].id}:`, err);
          }
        }
        
        // Update user with correct leaderboard_entry_id
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              leaderboard_entry_id: keepEntry.id
            });
            console.log(`✅ Updated user ${email} with leaderboard_entry_id: ${keepEntry.id}`);
          }
        } catch (err) {
          console.error(`❌ Error updating user ${email}:`, err);
        }
      }
    }
    
    console.log(`✅ Cleanup complete: ${duplicatesFound} users had duplicates, deleted ${entriesDeleted} duplicate entries`);
    
    return Response.json({
      success: true,
      totalEntries: allEntries.length,
      duplicatesFound,
      entriesDeleted,
      duplicateEmails
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});