import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get the payload from the automation
    const { event, data } = await req.json();
    
    if (!event || event.type !== 'delete' || event.entity_name !== 'User') {
      return Response.json({ 
        success: false, 
        error: 'Invalid event type' 
      }, { status: 400 });
    }

    const deletedUserEmail = data?.email;
    
    if (!deletedUserEmail) {
      return Response.json({ 
        success: false, 
        error: 'No email found in deleted user data' 
      }, { status: 400 });
    }

    // Delete corresponding LeaderboardEntry
    const leaderboardEntries = await base44.asServiceRole.entities.LeaderboardEntry.filter({
      student_email: deletedUserEmail
    });

    if (leaderboardEntries && leaderboardEntries.length > 0) {
      for (const entry of leaderboardEntries) {
        await base44.asServiceRole.entities.LeaderboardEntry.delete(entry.id);
      }
      
      return Response.json({ 
        success: true, 
        message: `Deleted ${leaderboardEntries.length} LeaderboardEntry record(s) for ${deletedUserEmail}` 
      });
    }

    return Response.json({ 
      success: true, 
      message: `No LeaderboardEntry found for ${deletedUserEmail}` 
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});