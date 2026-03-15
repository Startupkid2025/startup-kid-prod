import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, BookOpen } from "lucide-react";

export default function GroupLessonStatus({ group, students, allGroups = [], onGroupChange }) {
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(group?.id);

  useEffect(() => {
    loadData();
  }, [group, selectedGroupId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allLessons, allParticipations] = await Promise.all([
        base44.entities.Lesson.list(),
        base44.entities.LessonParticipation.list()
      ]);
      setLessons(allLessons);
      setParticipations(allParticipations);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const currentGroup = selectedGroupId ? allGroups.find(g => g.id === selectedGroupId) || group : group;

  // Get only actual students in this group (not admins/teachers/parents)
  const groupStudentEmails = (currentGroup.student_emails || []).filter(email => {
    const user = students.find(s => s.email === email);
    return user && user.user_type === 'student' && user.role !== 'admin';
  });

  // Check lesson status for the group
  const getLessonStatus = (lesson) => {
    // Find participations for this lesson by group students
    const lessonParticipations = participations.filter(p => 
      p.lesson_id === lesson.id && 
      groupStudentEmails.includes(p.student_email) &&
      p.attended === true
    );

    const attendedCount = lessonParticipations.length;
    const totalStudents = groupStudentEmails.length;

    if (attendedCount === 0) {
      return { status: 'available', attendedCount, totalStudents, attendedStudents: [] };
    } else {
      // Get names of students who attended
      const attendedStudents = lessonParticipations.map(p => {
        const user = students.find(s => s.email === p.student_email);
        return user?.full_name || p.student_email;
      });
      return { status: 'unavailable', attendedCount, totalStudents, attendedStudents };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  // Separate lessons into available and unavailable
  const availableLessons = [];
  const unavailableLessons = [];

  lessons.forEach(lesson => {
    const status = getLessonStatus(lesson);
    if (status.status === 'available') {
      availableLessons.push({ ...lesson, ...status });
    } else {
      unavailableLessons.push({ ...lesson, ...status });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          סטטוס שיעורים ({groupStudentEmails.length} תלמידים)
        </h3>
        {allGroups.length > 1 && (
          <select
            value={selectedGroupId || group.id}
            onChange={(e) => {
              const newGroupId = e.target.value;
              setSelectedGroupId(newGroupId);
              onGroupChange?.(newGroupId);
            }}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
          >
            {allGroups.map(g => (
              <option key={g.id} value={g.id} className="bg-gray-800">
                {g.group_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Available Lessons */}
      <Card className="bg-green-500/20 backdrop-blur-md border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-200 text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            שיעורים שניתן ללמד ({availableLessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableLessons.length === 0 ? (
            <p className="text-green-200/70 text-sm">כל השיעורים כבר נלמדו על ידי לפחות תלמיד אחד</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="bg-green-500/20 rounded-lg p-3 border border-green-500/30"
                >
                  <p className="text-white font-medium text-sm">{lesson.lesson_name}</p>
                  <p className="text-green-200/70 text-xs mt-1">
                    ✅ אף תלמיד לא השתתף - ניתן ללמד!
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unavailable Lessons */}
      <Card className="bg-red-500/20 backdrop-blur-md border-red-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-200 text-base flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            שיעורים שכבר נלמדו ({unavailableLessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unavailableLessons.length === 0 ? (
            <p className="text-red-200/70 text-sm">אין שיעורים שנלמדו עדיין</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unavailableLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="bg-red-500/20 rounded-lg p-3 border border-red-500/30"
                >
                  <p className="text-white font-medium text-sm">{lesson.lesson_name}</p>
                  <p className="text-red-200/70 text-xs mt-1">
                    ❌ {lesson.attendedCount}/{lesson.totalStudents} תלמידים השתתפו
                  </p>
                  <p className="text-red-200/50 text-[10px] mt-0.5">
                    {lesson.attendedStudents.slice(0, 3).join(', ')}
                    {lesson.attendedStudents.length > 3 && ` ועוד ${lesson.attendedStudents.length - 3}...`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}