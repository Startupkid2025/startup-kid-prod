import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, BookOpen, Calendar, Clock, Users } from "lucide-react";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function GroupLessonStatus({ group, students, teachers = [], allGroups = [], onGroupChange, onSwitchToSchedule }) {
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
      {/* Group Info Card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-white font-black text-lg">{currentGroup.group_name}</div>
              {currentGroup.day_of_week !== undefined && (
                <div className="flex items-center gap-3 text-white/70 text-sm mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> יום {DAY_NAMES[currentGroup.day_of_week]}</span>
                  {currentGroup.hour && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {currentGroup.hour}</span>}
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {groupStudentEmails.length} תלמידים</span>
                </div>
              )}
              {(() => { const t = teachers.find(t => t.id === currentGroup.teacher_id); return t ? <div className="text-white/60 text-xs mt-0.5">👩‍🏫 {t.full_name}</div> : null; })()}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onSwitchToSchedule?.(currentGroup.id)}
              size="sm"
              variant="outline"
              className="bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-purple-200 gap-1"
            >
              <Calendar className="w-4 h-4" />
              יומן שיעורים
            </Button>
          </div>
        </div>
      </div>

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
                <div key={lesson.id} className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                  <p className="text-white font-medium text-sm">{lesson.lesson_name}</p>
                  <p className="text-green-200/70 text-xs mt-1">✅ אף תלמיד לא השתתף - ניתן ללמד!</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                <div key={lesson.id} className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                  <p className="text-white font-medium text-sm">{lesson.lesson_name}</p>
                  <p className="text-red-200/70 text-xs mt-1">❌ {lesson.attendedCount}/{lesson.totalStudents} תלמידים השתתפו</p>
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