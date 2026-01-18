export default async function enqueueLeaderboardSnapshot({ studentEmail }, { base44 }) {
  if (!studentEmail) {
    return { success: false, error: "studentEmail is required" };
  }

  try {
    // Check if already in queue
    const existing = await base44.entities.LeaderboardSnapshotQueue.filter({ 
      student_email: studentEmail 
    });

    if (existing.length > 0) {
      // Update existing entry - reset to pending if it was done
      const entry = existing[0];
      if (entry.status === 'done') {
        await base44.entities.LeaderboardSnapshotQueue.update(entry.id, {
          status: 'pending',
          requested_at: new Date().toISOString()
        });
      }
      // If pending or processing, do nothing (avoid duplicates)
      return { success: true, message: "Already queued" };
    }

    // Create new queue entry
    await base44.entities.LeaderboardSnapshotQueue.create({
      student_email: studentEmail,
      status: 'pending',
      requested_at: new Date().toISOString(),
      attempts: 0
    });

    return { success: true, message: "Queued for processing" };
  } catch (error) {
    console.error("Error enqueueing snapshot:", error);
    return { success: false, error: error.message };
  }
}