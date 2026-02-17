import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all CoinLogs sorted by oldest first
    const allLogs = await base44.asServiceRole.entities.CoinLog.list('created_date', 5000);
    
    if (allLogs.length <= 2500) {
      return Response.json({ 
        message: 'לא נמצאו מספיק רשומות למחיקה', 
        total_logs: allLogs.length 
      });
    }

    // Get the oldest 2500 logs
    const logsToDelete = allLogs.slice(0, 2500);
    
    // Delete them
    const deletePromises = logsToDelete.map(log => 
      base44.asServiceRole.entities.CoinLog.delete(log.id)
    );
    
    await Promise.all(deletePromises);

    return Response.json({ 
      success: true,
      deleted_count: logsToDelete.length,
      remaining_logs: allLogs.length - logsToDelete.length
    });
  } catch (error) {
    console.error('Error deleting old coin logs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});