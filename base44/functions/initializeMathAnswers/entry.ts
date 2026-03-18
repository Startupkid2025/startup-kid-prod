import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all students
    const allUsers = await base44.asServiceRole.entities.User.list();
    const students = allUsers.filter(u => u.user_type === 'student');

    // Get all math progress
    const allMathProgress = await base44.asServiceRole.entities.MathProgress.list();

    let updated = 0;
    const errors = [];

    for (const student of students) {
      try {
        // Count math questions with coins_earned > 0
        const studentMathProgress = allMathProgress.filter(m => m.student_email === student.email);
        const correctAnswers = studentMathProgress.filter(m => (m.coins_earned || 0) > 0).length;

        // Update user
        await base44.asServiceRole.entities.User.update(student.id, {
          total_correct_math_answers: correctAnswers
        });

        updated++;
      } catch (error) {
        console.error(`Error updating ${student.email}:`, error);
        errors.push({ email: student.email, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `עודכן ${updated} תלמידים`,
      total_students: students.length,
      updated: updated,
      errors: errors
    });

  } catch (error) {
    console.error('Error initializing math answers:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});