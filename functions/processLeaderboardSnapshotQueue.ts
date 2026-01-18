export default async function processLeaderboardSnapshotQueue({}, { base44 }) {
  try {
    // Get up to 10 pending entries (oldest first)
    const allPending = await base44.entities.LeaderboardSnapshotQueue.filter({ 
      status: 'pending' 
    });

    // Sort by created_at (oldest first)
    const sorted = allPending.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    const toProcess = sorted.slice(0, 10);

    if (toProcess.length === 0) {
      return { success: true, message: "Queue empty", processed: 0 };
    }

    const results = [];
    let kingsNeedUpdate = false;

    for (const entry of toProcess) {
      // Mark as processing
      await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
        status: 'processing',
        updated_at: new Date().toISOString()
      });

      try {
        // Compute snapshot
        const computeResult = await base44.functions.computeAndUpsertSnapshot({ 
          studentEmail: entry.student_email 
        });

        if (!computeResult.success) {
          throw new Error(computeResult.error);
        }

        kingsNeedUpdate = true;

        // Mark as done
        await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
          status: 'done',
          updated_at: new Date().toISOString(),
          attempts: (entry.attempts || 0) + 1,
          last_error: null
        });

        results.push({ 
          email: entry.student_email, 
          success: true 
        });

      } catch (error) {
        console.error(`Error processing ${entry.student_email}:`, error);
        
        const attempts = (entry.attempts || 0) + 1;

        if (attempts >= 3) {
          // Max retries reached
          await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
            status: 'failed',
            last_error: error.message,
            updated_at: new Date().toISOString(),
            attempts
          });
        } else {
          // Retry - return to pending
          await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
            status: 'pending',
            last_error: error.message,
            updated_at: new Date().toISOString(),
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

    // Update kings if any snapshots changed
    if (kingsNeedUpdate) {
      try {
        await base44.functions.updateLeaderboardKingsIfNeeded({ 
          changedStudentEmail: null // Check all
        });
      } catch (error) {
        console.error("Error updating kings:", error);
        // Don't fail the whole process
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