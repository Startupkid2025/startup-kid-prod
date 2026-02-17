import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get oldest 2500 logs using pagination
    const logsToDelete = [];
    let skip = 0;
    const limit = 500; // Fetch in batches
    
    while (logsToDelete.length < 2500) {
      const batch = await base44.asServiceRole.entities.CoinLog.list('created_date', limit, skip);
      
      if (batch.length === 0) break; // No more logs
      
      const remaining = 2500 - logsToDelete.length;
      logsToDelete.push(...batch.slice(0, remaining));
      
      if (batch.length < limit) break; // Last batch
      skip += limit;
    }
    
    if (logsToDelete.length === 0) {
      return Response.json({ 
        message: 'לא נמצאו רשומות למחיקה', 
        total_logs: 0 
      });
    }

    // Delete in batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < logsToDelete.length; i += batchSize) {
      const batch = logsToDelete.slice(i, i + batchSize);
      await Promise.all(batch.map(log => 
        base44.asServiceRole.entities.CoinLog.delete(log.id)
      ));
    }

    return Response.json({ 
      success: true,
      deleted_count: logsToDelete.length
    });
  } catch (error) {
    console.error('Error deleting old coin logs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});