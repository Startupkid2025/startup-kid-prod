export default async function initializeAllSnapshots(input, { base44 }) {
  try {
    // Get all students
    const allUsers = await base44.entities.User.list();
    const students = allUsers.filter(u => u.user_type === 'student');

    console.log(`🚀 Initializing snapshots for ${students.length} students...`);

    let created = 0;
    let updated = 0;

    for (const student of students) {
      try {
        // Enqueue snapshot computation for this student
        await base44.functions.enqueueLeaderboardSnapshot({ 
          studentEmail: student.email 
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        created++;
      } catch (error) {
        console.error(`Error enqueueing snapshot for ${student.email}:`, error);
      }
    }

    // Now process the queue
    try {
      await base44.functions.processLeaderboardSnapshotQueue({});
    } catch (error) {
      console.error("Error processing queue:", error);
    }

    return { 
      success: true, 
      message: `Initialized snapshots for ${created} students`,
      created,
      updated
    };
  } catch (error) {
    console.error("Error initializing snapshots:", error);
    return { success: false, error: error.message };
  }
}