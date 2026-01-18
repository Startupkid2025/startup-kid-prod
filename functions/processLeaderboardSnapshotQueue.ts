export default async function processLeaderboardSnapshotQueue({}, { base44 }) {
  try {
    // Get up to 10 pending entries
    const pending = await base44.entities.LeaderboardSnapshotQueue.filter({ 
      status: 'pending' 
    });

    const toProcess = pending.slice(0, 10);

    if (toProcess.length === 0) {
      return { success: true, message: "Queue empty", processed: 0 };
    }

    const results = [];

    for (const entry of toProcess) {
      // Mark as processing
      await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
        status: 'processing',
        last_processed_at: new Date().toISOString()
      });

      try {
        // Recompute snapshot
        const recomputeResult = await base44.functions.recomputeStudentSnapshot({ 
          studentEmail: entry.student_email 
        });

        if (!recomputeResult.success) {
          throw new Error(recomputeResult.error);
        }

        // Update kings
        const kingsResult = await base44.functions.updateKingsForStudent({ 
          studentEmail: entry.student_email 
        });

        if (!kingsResult.success) {
          console.warn("Kings update failed:", kingsResult.error);
          // Don't fail the whole process for this
        }

        // Mark as done
        await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
          status: 'done',
          last_processed_at: new Date().toISOString(),
          attempts: (entry.attempts || 0) + 1
        });

        results.push({ 
          email: entry.student_email, 
          success: true 
        });

      } catch (error) {
        console.error(`Error processing ${entry.student_email}:`, error);
        
        const attempts = (entry.attempts || 0) + 1;

        if (attempts >= 3) {
          // Max retries reached, mark as done to prevent infinite loop
          await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
            status: 'done',
            last_error: error.message,
            last_processed_at: new Date().toISOString(),
            attempts
          });
        } else {
          // Retry - return to pending
          await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
            status: 'pending',
            last_error: error.message,
            last_processed_at: new Date().toISOString(),
            attempts
          });
        }

        results.push({ 
          email: entry.student_email, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return { 
      success: true, 
      message: `Processed ${successCount}/${toProcess.length}`,
      processed: successCount,
      results
    };
  } catch (error) {
    console.error("Error processing queue:", error);
    return { success: false, error: error.message };
  }
}