import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react"; // Removed UserCheck, UserX, Calendar, Award as they are no longer used in the new table layout

export default function LessonStudentsList({ lesson, participations, students }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quizProgress, setQuizProgress] = useState([]);

  React.useEffect(() => {
    loadQuizProgress();
  }, [lesson]);

  const loadQuizProgress = async () => {
    try {
      const { base44 } = await import("@/api/base44Client");
      const allProgress = await base44.entities.QuizProgress.filter({
        lesson_id: lesson.id
      });
      setQuizProgress(allProgress);
    } catch (error) {
      console.error("Error loading quiz progress:", error);
    }
  };

  const lessonParticipations = participations.filter(p => p.lesson_id === lesson.id);
  
  // This participantsData structure is well-suited for the new getCellContent function
  const participantsData = lessonParticipations.map(participation => {
    const student = students.find(s => s.email === participation.student_email);
    const quiz = quizProgress.find(q => q.student_email === participation.student_email);
    return {
      ...participation, // Contains watched_recording, notes, survey_completed, etc.
      studentName: student?.full_name || participation.student_email,
      studentFirstName: student?.first_name || "",
      studentLastName: student?.last_name || "",
      quizScore: quiz?.score,
      quizTotal: quiz?.total_questions,
      quizCompleted: quiz?.completed
    };
  });

  const attendedCount = participantsData.filter(p => p.attended).length;
  const missedCount = participantsData.filter(p => !p.attended).length;

  const columns = [
    { key: "full_name", label: "שם התלמיד" },
    { key: "attended", label: "נוכחות" },
    { key: "watched_recording", label: "צפה בהקלטה" },
    { key: "quiz_score", label: "ציון חידון" },
    { key: "survey", label: "סקר" },
    { key: "notes", label: "הערות" }
  ];

  // Modified getCellContent to work with 'participant' from participantsData
  const getCellContent = (participant, column) => {
    switch (column.key) {
      case "full_name":
        if (participant.studentFirstName && participant.studentLastName) {
          return (
            <div className="flex flex-col items-end text-right">
              <span className="font-semibold">{participant.studentFirstName}</span>
              <span className="text-white/70 text-xs">{participant.studentLastName}</span>
            </div>
          );
        }
        return participant.studentName;
      
      case "attended":
        return participant.attended ? (
          <span className="text-green-400">✓ נוכח</span>
        ) : (
          <span className="text-red-400">✗ לא נוכח</span>
        );
      
      case "watched_recording":
        // If the student attended live, watching the recording is generally not relevant or a 'compensation'
        if (participant.attended) { 
          return <span className="text-white/50">-</span>;
        }
        // Only check watched_recording status if they did NOT attend live
        return participant.watched_recording ? (
          <span className="text-blue-400">✓ צפה</span>
        ) : (
          <span className="text-orange-400">✗ לא צפה</span>
        );
      
      case "quiz_score":
        if (!participant.quizCompleted) return <span className="text-white/50">לא ביצע</span>;
        const percentage = Math.round((participant.quizScore / participant.quizTotal) * 100);
        return (
          <span className={percentage >= 80 ? "text-green-400" : percentage >= 60 ? "text-yellow-400" : "text-red-400"}>
            {participant.quizScore}/{participant.quizTotal} ({percentage}%)
          </span>
        );
      
      case "survey":
        return participant.survey_completed ? (
          <span className="text-green-400">✓ מולא</span>
        ) : (
          <span className="text-orange-400">✗ לא מולא</span>
        );
      
      case "notes":
        if (!participant.notes) {
          return <span className="text-white/50">-</span>;
        }
        return <span className="text-white/80 line-clamp-1">{participant.notes}</span>; // Added line-clamp for potentially long notes
      
      default:
        return null;
    }
  };

  if (participantsData.length === 0) {
    return (
      <div className="text-center py-4 text-white/60 text-sm">
        אין עדיין תלמידים שהשתתפו בשיעור זה
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        className="w-full text-white hover:bg-white/10"
      >
        <div className="flex items-center justify-between w-full">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="font-medium">
            {participantsData.length} תלמידים • {attendedCount} נוכחים • {missedCount} נעדרים
          </span>
        </div>
      </Button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-4 space-y-2" // space-y-2 will be overridden by direct grid styling here.
        >
          {/* Table Header */}
          <div className="grid grid-cols-6 text-sm font-medium text-white/70 p-2 rounded-t-lg bg-white/5 border border-b-0 border-white/10 text-right">
            {columns.map(column => (
              <div key={column.key} className="text-right">{column.label}</div>
            ))}
          </div>

          {/* Table Rows */}
          {participantsData.map((participant, index) => (
            <div 
              key={participant.id} 
              // Apply conditional styling for attended status and border radii
              className={`grid grid-cols-6 items-center text-sm p-3 border border-white/10 ${
                index === participantsData.length - 1 ? 'rounded-b-lg' : 'border-b-0'
              } ${
                participant.attended
                  ? 'bg-green-500/10'
                  : 'bg-orange-500/10'
              } text-right`}
            >
              {columns.map(column => (
                <div key={column.key} className="text-right">
                  {getCellContent(participant, column)}
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}