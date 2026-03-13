import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get request body - optional userEmails array
    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) {
      // No body or invalid JSON, continue with all users
    }

    const { userEmails } = body;

    // Fetch users to process
    const allUsers = userEmails && userEmails.length > 0
      ? await Promise.all(userEmails.map(email => 
          base44.asServiceRole.entities.User.filter({ email }).then(users => users[0])
        )).then(users => users.filter(Boolean))
      : await base44.asServiceRole.entities.User.list();

    let updated = 0;
    let unchanged = 0;
    const errors = [];

    for (const userData of allUsers) {
      try {
        const userEmail = userData.email;

        // Fetch WordProgress for this user
        const wordProgress = await base44.asServiceRole.entities.WordProgress.filter({ 
          student_email: userEmail 
        });

        // Count mastered words
        const masteredCount = wordProgress.filter(w => w.mastered === true).length;

        // Update user if different
        if (userData.mastered_words !== masteredCount) {
          await base44.asServiceRole.entities.User.update(userData.id, {
            mastered_words: masteredCount
          });
          updated++;
        } else {
          unchanged++;
        }

      } catch (error) {
        console.error(`Error processing ${userData.email}:`, error);
        errors.push({ email: userData.email, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `סונכרן mastered_words: ${updated} עודכנו, ${unchanged} ללא שינוי`,
      updated,
      unchanged,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Error syncing mastered words:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});