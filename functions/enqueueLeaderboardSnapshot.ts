export default async function enqueueLeaderboardSnapshot({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Check for recent pending entry (last 2 minutes to prevent spam)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const existing = await base44.entities.LeaderboardSnapshotQueue.filter({ 
      student_email: studentEmail 
    });

    const recentPending = existing.find(e => 
      e.status === 'pending' && 
      e.created_at && 
      e.created_at > twoMinutesAgo
    );

    if (recentPending) {
      return { success: true, message: "Already queued recently" };
    }

    // Update existing entry if done/failed, or create new
    const doneOrFailed = existing.find(e => e.status === 'done' || e.status === 'failed');
    
    if (doneOrFailed) {
      await base44.entities.LeaderboardSnapshotQueue.update(doneOrFailed.id, {
        status: 'pending',
        attempts: 0,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      await base44.entities.LeaderboardSnapshotQueue.create({
        student_email: studentEmail,
        status: 'pending',
        attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return { success: true, message: "Queued for processing" };
  } catch (error) {
    console.error("Error enqueueing snapshot:", error);
    return { success: false, error: error.message };
  }
}