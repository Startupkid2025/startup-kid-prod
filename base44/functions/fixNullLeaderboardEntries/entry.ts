import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fixes LeaderboardEntry records that have null/empty student_email
// by matching them to the user who created them (created_by field)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all leaderboard entries
    let allEntries = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.LeaderboardEntry.list('', 100, skip);
      if (batch.length === 0) break;
      allEntries = allEntries.concat(batch);
      if (batch.length < 100) break;
      skip += 100;
      await new Promise(r => setTimeout(r, 300));
    }

    // Find entries with null/empty student_email
    const nullEntries = allEntries.filter(e => !e.student_email);
    console.log(`Found ${nullEntries.length} entries with null student_email out of ${allEntries.length} total`);

    if (nullEntries.length === 0) {
      return Response.json({ success: true, message: 'No null entries found', fixed: 0, deleted: 0 });
    }

    // Fetch all users to match by email
    let allUsers = [];
    skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.User.list('', 100, skip);
      if (batch.length === 0) break;
      allUsers = allUsers.concat(batch);
      if (batch.length < 100) break;
      skip += 100;
      await new Promise(r => setTimeout(r, 300));
    }

    // Build maps for quick lookup
    const userByEmail = {};
    const userById = {};
    for (const u of allUsers) {
      if (u.email) userByEmail[u.email] = u;
      if (u.id) userById[u.id] = u;
    }

    // Build map of valid entries (with email) to detect duplicates
    const validEntryByEmail = {};
    for (const e of allEntries) {
      if (e.student_email) {
        validEntryByEmail[e.student_email] = e;
      }
    }

    let fixed = 0;
    let deleted = 0;
    let errors = 0;

    for (const entry of nullEntries) {
      try {
        // Try to find the user by created_by (email of creator)
        const creatorEmail = entry.created_by;
        const creatorUser = creatorEmail ? userByEmail[creatorEmail] : null;

        if (!creatorUser) {
          console.log(`Could not find user for entry ${entry.id} (created_by: ${creatorEmail}), deleting...`);
          await base44.asServiceRole.entities.LeaderboardEntry.delete(entry.id);
          deleted++;
          continue;
        }

        // Check if this user already has a valid entry with their email
        const existingValid = validEntryByEmail[creatorUser.email];

        if (existingValid && existingValid.id !== entry.id) {
          // A valid entry already exists for this user - delete the null duplicate
          console.log(`User ${creatorUser.email} already has valid entry ${existingValid.id}, deleting null entry ${entry.id}`);
          await base44.asServiceRole.entities.LeaderboardEntry.delete(entry.id);
          deleted++;
        } else {
          // Fix this entry with the user's data
          await base44.asServiceRole.entities.LeaderboardEntry.update(entry.id, {
            student_email: creatorUser.email,
            full_name: creatorUser.full_name || `${creatorUser.first_name || ''} ${creatorUser.last_name || ''}`.trim() || creatorUser.email,
            first_name: creatorUser.first_name || '',
            last_name: creatorUser.last_name || '',
            group_name: creatorUser.group_name || entry.group_name || '',
            user_type: creatorUser.user_type || entry.user_type || 'student',
          });
          // Mark as valid so duplicates of this user get deleted
          validEntryByEmail[creatorUser.email] = { ...entry, student_email: creatorUser.email };
          console.log(`Fixed entry ${entry.id} for user ${creatorUser.email}`);
          fixed++;
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error processing entry ${entry.id}:`, err.message);
        errors++;
      }
    }

    return Response.json({
      success: true,
      totalNullEntries: nullEntries.length,
      fixed,
      deleted,
      errors
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});