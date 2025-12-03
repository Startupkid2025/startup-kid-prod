import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, UserCheck, Calendar, Plus, UserX, Edit2, Users, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function StudentRow({ 
  student, 
  lessons, 
  participations, 
  onToggleParticipation,
  onUpdateParticipation,
  onRefresh
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditStudentDialog, setShowEditStudentDialog] = useState(false); // NEW
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingParticipation, setEditingParticipation] = useState(null);
  
  // Get today's date in YYYY-MM-DD format for Israel timezone
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [lessonDate, setLessonDate] = useState(getTodayDate());
  const [wasAttended, setWasAttended] = useState(true);

  // NEW: Edit student dialog state
  const [editedStudent, setEditedStudent] = useState({
    full_name: student.full_name || "",
    user_type: student.user_type || "student"
  });

  const getParticipationForLesson = (lessonId) => {
    return participations.find(
      p => p.lesson_id === lessonId && p.student_email === student.email
    );
  };

  const handleAddParticipation = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDate(getTodayDate());
    setWasAttended(true);
    setShowDateDialog(true);
  };

  const handleEditParticipation = (lesson, participation) => {
    setSelectedLesson(lesson);
    setEditingParticipation(participation);
    setLessonDate(participation.lesson_date || getTodayDate());
    setWasAttended(participation.attended);
    setShowEditDialog(true);
  };

  const confirmAddParticipation = () => {
    if (selectedLesson && lessonDate) {
      onToggleParticipation(student, selectedLesson, lessonDate, null, wasAttended);
      setShowDateDialog(false);
      setSelectedLesson(null);
    }
  };

  const confirmEditParticipation = () => {
    if (selectedLesson && editingParticipation && lessonDate) {
      onUpdateParticipation(editingParticipation.id, lessonDate, wasAttended);
      setShowEditDialog(false);
      setEditingParticipation(null);
      setSelectedLesson(null);
    }
  };

  const handleRemoveParticipation = async (lesson, participationId) => {
    try {
      await onToggleParticipation(student, lesson, null, participationId, false);
    } catch (error) {
      if (error.response?.status === 404 || error.message?.includes('not found')) {
        console.log("Participation already deleted, refreshing data");
        if (onRefresh) onRefresh();
      } else {
        console.error("Error removing participation:", error);
      }
    }
  };

  // NEW: Handle saving student details (combines old name and user type change logic)
  const handleSaveStudentDetails = async () => {
    try {
      if (!editedStudent.full_name.trim()) {
        toast.error("יש להזין שם");
        return;
      }

      console.log("Updating student:", student.id, "with data:", editedStudent);

      // Update User entity
      const updateResult = await base44.entities.User.update(student.id, {
        full_name: editedStudent.full_name,
        user_type: editedStudent.user_type
      });
      
      console.log("Update result:", updateResult);
      
      // Update LeaderboardEntry if exists
      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
          student_email: student.email 
        });

        console.log("Found leaderboard entries:", leaderboardEntries.length);

        if (editedStudent.user_type !== 'student') {
          // Remove from leaderboard if NOT a student
          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.delete(leaderboardEntries[0].id);
            console.log("Removed from leaderboard");
          }
        } else {
          // Add/update leaderboard if a student
          const leaderboardData = {
            student_email: student.email,
            full_name: editedStudent.full_name, // Ensure full_name is updated here
            ai_tech_level: student.ai_tech_level || 1,
            ai_tech_xp: student.ai_tech_xp || 0,
            personal_dev_level: student.personal_dev_level || 1,
            personal_dev_xp: student.personal_dev_xp || 0,
            social_skills_level: student.social_skills_level || 1,
            social_skills_xp: student.social_skills_xp || 0,
            money_business_level: student.money_business_level || 1,
            money_business_xp: student.money_business_xp || 0,
            total_lessons: student.total_lessons || 0,
            coins: student.coins || 0,
            equipped_items: student.equipped_items || {},
            purchased_items: student.purchased_items || [],
            user_type: editedStudent.user_type
          };

          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, leaderboardData);
            console.log("Updated leaderboard entry");
          } else {
            await base44.entities.LeaderboardEntry.create(leaderboardData);
            console.log("Created new leaderboard entry");
          }
        }
      } catch (leaderboardError) {
        console.error("Error updating leaderboard:", leaderboardError);
      }

      toast.success("פרטי התלמיד עודכנו בהצלחה! ✨");
      setShowEditStudentDialog(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("שגיאה בעדכון פרטי התלמיד: " + (error.message || "לא ידוע"));
    }
  };


  const totalParticipations = participations.filter(
    p => p.student_email === student.email
  ).length;

  // Utility objects for user type display
  const userTypeLabels = {
    student: "תלמיד",
    parent: "הורה",
    demo: "דמו",
    teacher: "מורה"
  };

  const userTypeColors = {
    student: "bg-blue-500/20 text-blue-300",
    parent: "bg-purple-500/20 text-purple-300",
    demo: "bg-gray-500/20 text-gray-300",
    teacher: "bg-green-500/20 text-green-300"
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
        {/* Student Header */}
        <div 
          className="p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                {student.full_name?.[0] || "?"}
              </div>
              <div className="text-right min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-base sm:text-lg truncate">{student.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColors[student.user_type || "student"]}`}>
                    {userTypeLabels[student.user_type || "student"]}
                  </span>
                </div>
                <p className="text-white/60 text-xs sm:text-sm truncate">{student.email}</p>
                {student.phone_number && (
                  <p className="text-white/50 text-xs truncate">📱 {student.phone_number}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Edit Student Button - NEW */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedStudent({
                    full_name: student.full_name || "",
                    user_type: student.user_type || "student"
                  });
                  setShowEditStudentDialog(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-yellow-300">{totalParticipations}</p>
                <p className="text-white/60 text-[10px] sm:text-xs">השתתפויות</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white w-8 h-8 sm:w-10 sm:h-10"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 p-4 bg-white/5"
          >
            <div className="space-y-4">
              {lessons.map((lesson) => {
                const participation = getParticipationForLesson(lesson.id);
                
                return (
                  <div key={lesson.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 text-right">
                        <h4 className="font-bold text-white mb-1">{lesson.lesson_name}</h4>
                        {lesson.description && (
                          <p className="text-white/60 text-sm">{lesson.description}</p>
                        )}
                      </div>
                      {!participation && (
                        <Button
                          onClick={() => handleAddParticipation(lesson)}
                          size="sm"
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-200 border border-green-500/30"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          הוסף
                        </Button>
                      )}
                    </div>

                    {/* Participation info */}
                    {participation && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div
                          className={`flex items-center justify-between rounded-lg p-3 border ${
                            participation.attended 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : participation.watched_recording
                                ? 'bg-blue-500/10 border-blue-500/20'
                                : 'bg-orange-500/10 border-orange-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {participation.attended ? (
                              <>
                                <UserCheck className="w-4 h-4 text-green-400" />
                                <Calendar className="w-4 h-4 text-white/60" />
                                <span className="text-white font-medium">
                                  {new Date(participation.lesson_date).toLocaleDateString("he-IL")}
                                </span>
                                <span className="text-green-300 text-sm">
                                  ✓ נוכח
                                </span>
                              </>
                            ) : participation.watched_recording ? (
                              <>
                                <Play className="w-4 h-4 text-blue-400" />
                                <Calendar className="w-4 h-4 text-white/60" />
                                <span className="text-white font-medium">
                                  {new Date(participation.lesson_date).toLocaleDateString("he-IL")}
                                </span>
                                <span className="text-blue-300 text-sm">
                                  📹 צפה במוקלט
                                </span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-4 h-4 text-orange-400" />
                                <Calendar className="w-4 h-4 text-white/60" />
                                <span className="text-white font-medium">
                                  {new Date(participation.lesson_date).toLocaleDateString("he-IL")}
                                </span>
                                <span className="text-orange-300 text-sm">
                                  ✗ לא נוכח
                                </span>
                              </>
                            )}
                            {participation.survey_completed && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full">
                                ⭐ מילא סקר
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditParticipation(lesson, participation)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleRemoveParticipation(lesson, participation.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                            >
                              הסר
                            </Button>
                          </div>
                        </div>

                        {/* Survey Results - Only if completed */}
                        {participation.survey_completed && (
                          <div className="mt-2 bg-white/5 rounded-lg p-3 border border-white/10">
                            <p className="text-xs text-white/70 font-medium mb-2">תוצאות סקר:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {participation.survey_interest && (
                                <div className="flex items-center gap-1">
                                  <span className="text-white/60">🎯 עניין:</span>
                                  <span className="text-yellow-300 font-medium">{participation.survey_interest}/5</span>
                                </div>
                              )}
                              {participation.survey_fun && (
                                <div className="flex items-center gap-1">
                                  <span className="text-white/60">😄 כיף:</span>
                                  <span className="text-yellow-300 font-medium">{participation.survey_fun}/5</span>
                                </div>
                              )}
                              {participation.survey_learned && (
                                <div className="flex items-center gap-1">
                                  <span className="text-white/60">📚 למידה:</span>
                                  <span className="text-yellow-300 font-medium">{participation.survey_learned}/5</span>
                                </div>
                              )}
                              {participation.survey_difficulty && (
                                <div className="flex items-center gap-1">
                                  <span className="text-white/60">💡 קל להבנה:</span>
                                  <span className="text-yellow-300 font-medium">{6 - participation.survey_difficulty}/5</span>
                                </div>
                              )}
                            </div>
                            {participation.survey_comments && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-xs text-white/60 mb-1">💬 הערות:</p>
                                <p className="text-xs text-white/80 italic">"{participation.survey_comments}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Date Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-600">
              הוסף השתתפות בשיעור
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-purple-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-purple-900">
                {selectedLesson?.lesson_name}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {student.full_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-date" className="text-gray-700 font-medium">
                תאריך השיעור
              </Label>
              <Input
                id="lesson-date"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                max={getTodayDate()}
                className="border-2 border-purple-200"
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <Checkbox
                id="attended"
                checked={wasAttended}
                onCheckedChange={setWasAttended}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label
                htmlFor="attended"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                ✓ התלמיד היה נוכח בשיעור
              </Label>
            </div>
            {!wasAttended && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ התלמיד יוכל לצפות בהרצאה המוקלטת
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDateDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={confirmAddParticipation}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={!lessonDate}
              >
                אישור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-blue-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-600">
              ערוך השתתפות בשיעור
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-blue-900">
                {selectedLesson?.lesson_name}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {student.full_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-date" className="text-gray-700 font-medium">
                תאריך השיעור
              </Label>
              <Input
                id="edit-lesson-date"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                max={getTodayDate()}
                className="border-2 border-blue-200"
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <Checkbox
                id="edit-attended"
                checked={wasAttended}
                onCheckedChange={setWasAttended}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label
                htmlFor="edit-attended"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                ✓ התלמיד היה נוכח בשיעור
              </Label>
            </div>
            {!wasAttended && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ התלמיד יוכל לצפות בהרצאה המוקלטת
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowEditDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={confirmEditParticipation}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                disabled={!lessonDate}
              >
                שמור שינויים
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog - NEW */}
      <Dialog open={showEditStudentDialog} onOpenChange={setShowEditStudentDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-600">
              ערוך פרטי תלמיד
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-purple-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-purple-600">
                {student.email}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                שם מלא
              </Label>
              <Input
                value={editedStudent.full_name}
                onChange={(e) => setEditedStudent({...editedStudent, full_name: e.target.value})}
                className="border-2 border-purple-200"
                placeholder="הזן שם מלא"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                סוג משתמש
              </Label>
              <Select 
                value={editedStudent.user_type} 
                onValueChange={(value) => setEditedStudent({...editedStudent, user_type: value})}
              >
                <SelectTrigger className="border-2 border-purple-200">
                  <SelectValue placeholder="בחר סוג משתמש" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">תלמיד</SelectItem>
                  <SelectItem value="parent">הורה</SelectItem>
                  <SelectItem value="demo">דמו</SelectItem>
                  <SelectItem value="teacher">מורה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editedStudent.user_type === "parent" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ הורים יכולים לצפות בתוכן אך לא לבצע פעולות שישפיעו על חווית הלמידה
                </p>
              </div>
            )}

            {editedStudent.user_type === "demo" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ משתמשי דמו יכולים לשחק באופן חופשי אך לא יופיעו בטבלת השיאים
                </p>
              </div>
            )}
            
            {editedStudent.user_type === "teacher" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ מורים יכולים לנהל תלמידים ושיעורים
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setShowEditStudentDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveStudentDetails}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={!editedStudent.full_name.trim()}
              >
                שמור שינויים
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}