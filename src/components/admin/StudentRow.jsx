import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, UserCheck, Calendar, Plus, UserX, Edit2, Users, Play, Trash2, Coins, FolderEdit } from "lucide-react";
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
import { syncLeaderboardEntry } from "../utils/leaderboardSync";
import { logCoinChange } from "../utils/coinLogger";

export default function StudentRow({ 
  student, 
  lessons, 
  participations,
  groups = [],
  scheduledLessons = [],
  wordProgress = [],
  mathProgress = [],
  quizProgress = [],
  investments = [],
  onToggleParticipation,
  onUpdateParticipation,
  onRefresh
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditStudentDialog, setShowEditStudentDialog] = useState(false);
  const [showAddCoinsDialog, setShowAddCoinsDialog] = useState(false);
  const [showEditStreakDialog, setShowEditStreakDialog] = useState(false);
  const [editedStreak, setEditedStreak] = useState(student.login_streak || 0);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingParticipation, setEditingParticipation] = useState(null);
  const [coinsToAdd, setCoinsToAdd] = useState("");
  const [coinsReason, setCoinsReason] = useState("");
  const [deletingParticipations, setDeletingParticipations] = useState(new Set());
  
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
    first_name: student.first_name || "",
    last_name: student.last_name || "",
    full_name: student.full_name || "",
    user_type: student.user_type || "student",
    total_work_hours: student.total_work_hours || 0
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");

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
      // בדוק אם יש כבר השתתפות לאותו שיעור
      const existingParticipation = participations.find(
        p => p.lesson_id === selectedLesson.id && p.student_email === student.email
      );
      
      if (existingParticipation) {
        toast.error("התלמיד כבר רשום לשיעור זה");
        setShowDateDialog(false);
        setSelectedLesson(null);
        return;
      }
      
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
    // מנע מחיקה כפולה
    if (deletingParticipations.has(participationId)) {
      return;
    }
    
    try {
      // בדוק אם ההשתתפות עדיין קיימת
      const stillExists = participations.find(p => p.id === participationId);
      if (!stillExists) {
        if (onRefresh) await onRefresh();
        return;
      }
      
      // סמן כממחיק
      setDeletingParticipations(prev => new Set([...prev, participationId]));
      
      await onToggleParticipation(student, lesson, null, participationId, false);
      
      // הסר מרשימת הממחיקים
      setDeletingParticipations(prev => {
        const next = new Set(prev);
        next.delete(participationId);
        return next;
      });
    } catch (error) {
      // הסר מרשימת הממחיקים גם במקרה של שגיאה
      setDeletingParticipations(prev => {
        const next = new Set(prev);
        next.delete(participationId);
        return next;
      });
      
      if (error.response?.status === 404 || error.message?.includes('not found') || error.message?.includes('404')) {
        if (onRefresh) await onRefresh();
      } else {
        console.error("Error removing participation:", error);
        toast.error("שגיאה בהסרת ההשתתפות");
      }
    }
  };

  // Handle adding coins
  const handleAddCoins = async () => {
    if (!coinsToAdd || isNaN(coinsToAdd) || Number(coinsToAdd) === 0) {
      toast.error("הזן מספר סטארטקוין תקין");
      return;
    }
    
    const amount = Number(coinsToAdd);
    const oldCoins = student.coins || 0;
    const newCoins = oldCoins + amount;
    
    try {
      // Log the coin change
      try {
        await logCoinChange(student.email, oldCoins, newCoins, coinsReason || "עדכון ידני", {
          source: 'Admin - Manual Adjustment',
          admin_reason: coinsReason
        });
      } catch (logError) {
        console.error("Error logging admin coin change:", logError);
      }

      // Update User entity
      await base44.entities.User.update(student.id, {
        coins: newCoins,
        total_admin_coins: (student.total_admin_coins || 0) + amount
      });
      
      // Sync to LeaderboardEntry
      await syncLeaderboardEntry(student.email, {
        coins: newCoins,
        total_admin_coins: (student.total_admin_coins || 0) + amount
      });
      
      const action = amount > 0 ? "נוספו" : "הופחתו";
      const absAmount = Math.abs(amount);
      toast.success(`${action} ${absAmount} סטארטקוין ל-${student.full_name} ${coinsReason ? `(${coinsReason})` : ""} ✨`);
      
      setShowAddCoinsDialog(false);
      setCoinsToAdd("");
      setCoinsReason("");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error adding coins:", error);
      toast.error("שגיאה בהוספת סטארטקוין");
    }
  };

  // Handle editing login streak
  const handleSaveStreak = async () => {
    const newStreak = Number(editedStreak);
    if (isNaN(newStreak) || newStreak < 0) {
      toast.error("הזן מספר תקין");
      return;
    }
    
    try {
      // Use Jerusalem timezone for today's date
      const DATE_TZ = "Asia/Jerusalem";
      const fmtIL = new Intl.DateTimeFormat("en-CA", {
        timeZone: DATE_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const today = fmtIL.format(new Date());
      
      await base44.entities.User.update(student.id, {
        login_streak: newStreak,
        last_login_date: today
      });
      
      await syncLeaderboardEntry(student.email, {
        login_streak: newStreak,
        last_login_date: today
      });
      
      toast.success(`רצף הכניסות של ${student.full_name} עודכן ל-${newStreak} ימים! 🔥`);
      setShowEditStreakDialog(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating streak:", error);
      toast.error("שגיאה בעדכון רצף");
    }
  };

  // Handle deleting user
  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      // Delete all user's participations
      const userParticipations = participations.filter(p => p.student_email === student.email);
      for (const participation of userParticipations) {
        try {
          await base44.entities.LessonParticipation.delete(participation.id);
        } catch (error) {
          console.error("Error deleting participation:", error);
        }
      }

      // Delete user's word progress
      try {
        const studentWordProgress = wordProgress.filter(w => w.student_email === student.email);
        for (const progress of studentWordProgress) {
          await base44.entities.WordProgress.delete(progress.id);
        }
      } catch (error) {
        console.error("Error deleting word progress:", error);
      }

      // Delete user's math progress
      try {
        const studentMathProgress = mathProgress.filter(m => m.student_email === student.email);
        for (const progress of studentMathProgress) {
          await base44.entities.MathProgress.delete(progress.id);
        }
      } catch (error) {
        console.error("Error deleting math progress:", error);
      }

      // Delete user's quiz progress
      try {
        const studentQuizProgress = quizProgress.filter(q => q.student_email === student.email);
        for (const progress of studentQuizProgress) {
          await base44.entities.QuizProgress.delete(progress.id);
        }
      } catch (error) {
        console.error("Error deleting quiz progress:", error);
      }

      // Delete user's investments
      try {
        const studentInvestments = await base44.entities.Investment.filter({ student_email: student.email });
        for (const investment of studentInvestments) {
          await base44.entities.Investment.delete(investment.id);
        }
      } catch (error) {
        console.error("Error deleting investments:", error);
      }

      // Delete leaderboard entry
      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: student.email });
        for (const entry of leaderboardEntries) {
          await base44.entities.LeaderboardEntry.delete(entry.id);
        }
      } catch (error) {
        console.error("Error deleting leaderboard entry:", error);
      }

      // Remove from groups
      try {
        const allGroups = await base44.entities.Group.list();
        for (const group of allGroups) {
          if (group.student_emails && group.student_emails.includes(student.email)) {
            const updatedEmails = group.student_emails.filter(email => email !== student.email);
            await base44.entities.Group.update(group.id, { student_emails: updatedEmails });
          }
        }
      } catch (error) {
        console.error("Error removing from groups:", error);
      }

      // Finally, delete the user
      try {
        await base44.entities.User.delete(student.id);
      } catch (deleteErr) {
        // Ignore 404 - user already deleted
        if (deleteErr.message && !deleteErr.message.includes('not found') && !deleteErr.message.includes('404')) {
          throw deleteErr;
        }
      }

      toast.success(`${student.full_name} נמחק בהצלחה`);
      setShowDeleteDialog(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("שגיאה במחיקת המשתמש");
    } finally {
      setIsDeleting(false);
    }
  };

  // NEW: Handle saving student details (combines old name and user type change logic)
  const handleSaveStudentDetails = async () => {
    try {
      if (!editedStudent.first_name.trim() || !editedStudent.last_name.trim()) {
        toast.error("יש להזין שם פרטי ושם משפחה");
        return;
      }

      const fullName = `${editedStudent.first_name.trim()} ${editedStudent.last_name.trim()}`;
      console.log("Updating student:", student.id, "with data:", editedStudent);

      // Update User entity - fetch fresh user data first
      const allUsers = await base44.entities.User.list();
      const freshUserData = allUsers.find(u => u.id === student.id);
      
      await base44.entities.User.update(student.id, {
        first_name: editedStudent.first_name.trim(),
        last_name: editedStudent.last_name.trim(),
        full_name: fullName,
        user_type: editedStudent.user_type,
        total_work_hours: Number(editedStudent.total_work_hours) || 0
      });
      
      console.log("Updated user name to:", fullName);
      
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
            full_name: fullName,
            first_name: editedStudent.first_name.trim(),
            last_name: editedStudent.last_name.trim(),
            ai_tech_level: freshUserData?.ai_tech_level || student.ai_tech_level || 1,
            ai_tech_xp: freshUserData?.ai_tech_xp || student.ai_tech_xp || 0,
            personal_dev_level: freshUserData?.personal_dev_level || student.personal_dev_level || 1,
            personal_dev_xp: freshUserData?.personal_dev_xp || student.personal_dev_xp || 0,
            social_skills_level: freshUserData?.social_skills_level || student.social_skills_level || 1,
            social_skills_xp: freshUserData?.social_skills_xp || student.social_skills_xp || 0,
            money_business_level: freshUserData?.money_business_level || student.money_business_level || 1,
            money_business_xp: freshUserData?.money_business_xp || student.money_business_xp || 0,
            total_lessons: freshUserData?.total_lessons || student.total_lessons || 0,
            coins: freshUserData?.coins || student.coins || 0,
            equipped_items: freshUserData?.equipped_items || student.equipped_items || {},
            purchased_items: freshUserData?.purchased_items || student.purchased_items || [],
            user_type: editedStudent.user_type
          };

          // Always sync (create or update) via syncLeaderboardEntry
          await syncLeaderboardEntry(student.email, leaderboardData);
          console.log("Synced leaderboard entry with new name:", fullName);
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


  // Handle changing student group
  const handleSaveGroup = async () => {
    try {
      // Remove from all groups first
      for (const group of groups) {
        if (group.student_emails?.includes(student.email)) {
          await base44.entities.Group.update(group.id, {
            student_emails: group.student_emails.filter(e => e !== student.email)
          });
        }
      }

      // Add to new group if selected
      if (selectedGroupId && selectedGroupId !== "none") {
        const newGroup = groups.find(g => g.id === selectedGroupId);
        if (newGroup) {
          await base44.entities.Group.update(newGroup.id, {
            student_emails: [...(newGroup.student_emails || []), student.email]
          });
        }
      }

      // Update LeaderboardEntry group_name
      const newGroupName = selectedGroupId && selectedGroupId !== "none"
        ? groups.find(g => g.id === selectedGroupId)?.group_name || ""
        : "";
      try {
        const lbEntries = await base44.entities.LeaderboardEntry.filter({ student_email: student.email });
        if (lbEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(lbEntries[0].id, { group_name: newGroupName });
        }
      } catch (e) {
        console.error("Error updating leaderboard group:", e);
      }

      toast.success("הקבוצה עודכנה בהצלחה! ✨");
      setShowGroupDialog(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("שגיאה בעדכון הקבוצה");
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

  // Find the group the student belongs to
  const studentGroup = groups.find(g => g.student_emails?.includes(student.email));

  // Find the last scheduled lesson for the student's group
  const getRecommendedLesson = () => {
    if (!studentGroup) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // התחלת היום
    
    // Get all scheduled lessons for this group that have passed or are today
    const groupScheduledLessons = scheduledLessons.filter(sl => {
      if (sl.group_id !== studentGroup.id || !sl.lesson_id || sl.is_cancelled) {
        return false;
      }
      
      const lessonDate = new Date(sl.scheduled_date);
      lessonDate.setHours(0, 0, 0, 0);
      
      // רק שיעורים שהתאריך שלהם היום או בעבר
      return lessonDate <= today;
    });
    
    if (groupScheduledLessons.length === 0) return null;
    
    // Sort by date (most recent first)
    const sortedLessons = groupScheduledLessons.sort((a, b) => {
      const dateA = new Date(a.scheduled_date);
      const dateB = new Date(b.scheduled_date);
      return dateB - dateA;
    });
    
    // Return the most recent lesson that already happened (or is today)
    return sortedLessons[0];
  };
  
  const recommendedScheduledLesson = getRecommendedLesson();

  return (
    <>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
        {/* Student Header */}
        <div 
          className="p-3 sm:p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white w-8 h-8 sm:w-10 sm:h-10 hover:bg-white/10 transition-all"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
              <div className="text-center bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl px-3 py-2 border border-yellow-500/30 shadow-lg backdrop-blur-sm">
                <p className="text-xl sm:text-2xl font-black text-yellow-300">{totalParticipations}</p>
                <p className="text-white/60 text-[10px] sm:text-xs whitespace-nowrap">השתתפויות</p>
              </div>
              
              {/* Edit Streak Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-orange-300 hover:text-orange-200 w-9 h-9 hover:bg-gradient-to-br hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-orange-400/50 rounded-xl"
                title={`רצף כניסות: ${student.login_streak || 0} ימים`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedStreak(student.login_streak || 0);
                  setShowEditStreakDialog(true);
                }}
              >
                🔥
              </Button>

              {/* Add Coins Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-yellow-300 hover:text-yellow-200 w-9 h-9 hover:bg-gradient-to-br hover:from-yellow-500/30 hover:to-amber-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-yellow-400/50 rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setCoinsToAdd("");
                  setCoinsReason("");
                  setShowAddCoinsDialog(true);
                }}
              >
                <Coins className="w-4 h-4" />
              </Button>

              {/* Edit Group Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-green-300 hover:text-green-200 w-9 h-9 hover:bg-gradient-to-br hover:from-green-500/30 hover:to-teal-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-green-400/50 rounded-xl"
                title="שנה קבוצה"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGroupId(studentGroup?.id || "none");
                  setShowGroupDialog(true);
                }}
              >
                <FolderEdit className="w-4 h-4" />
              </Button>

              {/* Edit Student Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-300 hover:text-blue-200 w-9 h-9 hover:bg-gradient-to-br hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-blue-400/50 rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedStudent({
                    first_name: student.first_name || "",
                    last_name: student.last_name || "",
                    full_name: student.full_name || "",
                    user_type: student.user_type || "student",
                    total_work_hours: student.total_work_hours || 0
                  });
                  setShowEditStudentDialog(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>

              {/* Delete User Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-red-300 hover:text-red-200 w-9 h-9 hover:bg-gradient-to-br hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-red-400/50 rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="text-right min-w-0 flex-1">
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${userTypeColors[student.user_type || "student"]}`}>
                    {userTypeLabels[student.user_type || "student"]}
                  </span>
                  {studentGroup && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      📚 {studentGroup.group_name}
                    </span>
                  )}
                  <p className="font-bold text-white text-base sm:text-lg truncate">
                    {student.first_name && student.last_name 
                      ? `${student.first_name} ${student.last_name}`
                      : (student.full_name || student.email)}
                  </p>
                </div>
                <p className="text-white/60 text-xs sm:text-sm truncate">{student.email}</p>
                {student.phone_number && (
                  <p className="text-white/50 text-xs truncate">📱 {student.phone_number}</p>
                )}
                <p className="text-white/50 text-xs truncate">
                  📅 הצטרף: {new Date(student.created_date).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                {student.full_name?.[0] || "?"}
              </div>
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
                const studentParticipations = participations.filter(
                  p => p.lesson_id === lesson.id && p.student_email === student.email
                );
                const hasDuplicates = studentParticipations.length > 1;
                const participation = studentParticipations[0];
                const isRecommended = recommendedScheduledLesson?.lesson_id === lesson.id;
                
                return (
                  <div key={lesson.id} className={`bg-white/5 rounded-xl p-4 border ${
                    hasDuplicates
                      ? 'border-red-400 bg-red-500/10 shadow-lg shadow-red-500/20'
                      : isRecommended && !participation 
                      ? 'border-yellow-400 bg-yellow-500/10 shadow-lg shadow-yellow-500/20' 
                      : 'border-white/10'
                  }`}>
                    {hasDuplicates && (
                      <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-2 mb-3 flex items-center justify-between">
                        <span className="text-red-200 text-sm font-bold">
                          ⚠️ כפל שיעורים! יש {studentParticipations.length} רשומות
                        </span>
                        <Button
                          onClick={async () => {
                            if (!confirm(`למחוק את כל ${studentParticipations.length} ההשתתפויות?`)) return;
                            try {
                              for (const p of studentParticipations) {
                                await base44.entities.LessonParticipation.delete(p.id);
                              }
                              toast.success("כל הכפילויות נמחקו");
                              if (onRefresh) await onRefresh();
                            } catch (error) {
                              console.error("Error deleting duplicates:", error);
                              toast.error("שגיאה במחיקה");
                            }
                          }}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-3 h-3 ml-1" />
                          מחק הכל
                        </Button>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      {!participation && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleAddParticipation(lesson)}
                            size="sm"
                            className={`${
                              isRecommended
                                ? 'bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-200 border border-yellow-400/50 shadow-md'
                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-200 border border-green-500/30'
                            }`}
                          >
                            <Plus className="w-4 h-4 ml-1" />
                            {isRecommended ? '⭐ הוסף (מומלץ)' : 'הוסף'}
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isRecommended && !participation && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full border border-yellow-400/30 font-bold">
                              ⭐ שיעור אחרון של הקבוצה
                            </span>
                          )}
                          <h4 className="font-bold text-white mb-1">{lesson.lesson_name}</h4>
                        </div>
                        {lesson.description && (
                          <p className="text-white/60 text-sm">{lesson.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Participation info */}
                    {participation && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        {studentParticipations.map((p, idx) => (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between rounded-lg p-3 border ${
                              p.attended 
                                ? 'bg-green-500/10 border-green-500/20' 
                                : p.watched_recording
                                  ? 'bg-blue-500/10 border-blue-500/20'
                                  : 'bg-orange-500/10 border-orange-500/20'
                            }`}
                          >
                            <div className="flex gap-2">
                              {hasDuplicates && (
                                <span className="text-white/60 text-xs font-bold px-2 py-1 bg-white/10 rounded">
                                  #{idx + 1}
                                </span>
                              )}
                              <Button
                                onClick={() => handleEditParticipation(lesson, p)}
                                size="sm"
                                variant="ghost"
                                className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                              >
                                ערוך
                              </Button>
                              <Button
                                onClick={() => handleRemoveParticipation(lesson, p.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                                disabled={deletingParticipations.has(p.id)}
                              >
                                {deletingParticipations.has(p.id) ? "מוחק..." : "הסר"}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              {p.survey_completed && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded-full">
                                  ⭐ מילא סקר
                                </span>
                              )}
                              {p.attended ? (
                                <>
                                  <span className="text-green-300 text-sm">
                                    ✓ נוכח
                                  </span>
                                  <span className="text-white font-medium">
                                    {new Date(p.lesson_date).toLocaleDateString("he-IL")}
                                  </span>
                                  <Calendar className="w-4 h-4 text-white/60" />
                                  <UserCheck className="w-4 h-4 text-green-400" />
                                </>
                              ) : p.watched_recording ? (
                                <>
                                  <span className="text-blue-300 text-sm">
                                    📹 צפה במוקלט
                                  </span>
                                  <span className="text-white font-medium">
                                    {new Date(p.lesson_date).toLocaleDateString("he-IL")}
                                  </span>
                                  <Calendar className="w-4 h-4 text-white/60" />
                                  <Play className="w-4 h-4 text-blue-400" />
                                </>
                              ) : (
                                <>
                                  <span className="text-orange-300 text-sm">
                                    ✗ לא נוכח
                                  </span>
                                  <span className="text-white font-medium">
                                    {new Date(p.lesson_date).toLocaleDateString("he-IL")}
                                  </span>
                                  <Calendar className="w-4 h-4 text-white/60" />
                                  <UserX className="w-4 h-4 text-orange-400" />
                                </>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Survey Results - Only if completed */}
                        {participation && participation.survey_completed && (
                          <div className="mt-2 bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm text-white font-bold">
                                💬 ממוצע סקרים (מ-{participations.filter(p => p.student_email === student.email && p.survey_completed).length} משובים)
                              </p>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mb-3">
                              {participation.survey_interest && (
                                <div className="text-center bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                                  <p className="text-2xl font-black text-yellow-300">{participation.survey_interest}</p>
                                  <p className="text-[10px] text-white/70 mt-1">🎯 קל להבנה</p>
                                </div>
                              )}
                              {participation.survey_fun && (
                                <div className="text-center bg-orange-500/10 rounded-lg p-2 border border-orange-500/20">
                                  <p className="text-2xl font-black text-orange-300">{participation.survey_fun}</p>
                                  <p className="text-[10px] text-white/70 mt-1">😄 כיף</p>
                                </div>
                              )}
                              {participation.survey_learned && (
                                <div className="text-center bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                                  <p className="text-2xl font-black text-purple-300">{participation.survey_learned}</p>
                                  <p className="text-[10px] text-white/70 mt-1">📚 למידה</p>
                                </div>
                              )}
                              {participation.survey_difficulty && (
                                <div className="text-center bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                                  <p className="text-2xl font-black text-red-300">{participation.survey_difficulty}</p>
                                  <p className="text-[10px] text-white/70 mt-1">💪 עניין</p>
                                </div>
                              )}
                            </div>
                            {participation.survey_comments && (
                              <div className="bg-white/5 rounded-lg p-2 text-right">
                                <p className="text-xs text-white/60 mb-1">💬 נעים לשמוע</p>
                                <p className="text-xs text-white/90">"{participation.survey_comments}"</p>
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
                שם פרטי
              </Label>
              <Input
                value={editedStudent.first_name}
                onChange={(e) => setEditedStudent({...editedStudent, first_name: e.target.value})}
                className="border-2 border-purple-200"
                placeholder="הזן שם פרטי"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                שם משפחה
              </Label>
              <Input
                value={editedStudent.last_name}
                onChange={(e) => setEditedStudent({...editedStudent, last_name: e.target.value})}
                className="border-2 border-purple-200"
                placeholder="הזן שם משפחה"
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

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                שעות עבודה 💼
              </Label>
              <Input
                type="number"
                value={editedStudent.total_work_hours}
                onChange={(e) => setEditedStudent({...editedStudent, total_work_hours: e.target.value})}
                className="border-2 border-purple-200"
                placeholder="0"
                min="0"
              />
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
                disabled={!editedStudent.first_name.trim() || !editedStudent.last_name.trim()}
              >
                שמור שינויים
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Coins Dialog */}
      <Dialog open={showAddCoinsDialog} onOpenChange={setShowAddCoinsDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-yellow-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-yellow-600">
              הוסף/הפחת סטארטקוין
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-yellow-900">
                {student.full_name}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                יתרה נוכחית: {student.coins || 0} סטארטקוין
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                כמות סטארטקוין (חיובי להוסיף, שלילי להפחית)
              </Label>
              <Input
                type="number"
                value={coinsToAdd}
                onChange={(e) => setCoinsToAdd(e.target.value)}
                className="border-2 border-yellow-200"
                placeholder="לדוגמה: 100 או -50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                סיבה (אופציונלי)
              </Label>
              <Input
                value={coinsReason}
                onChange={(e) => setCoinsReason(e.target.value)}
                className="border-2 border-yellow-200"
                placeholder="לדוגמה: עדכון מיוחד"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 זה ישפיע על היתרה ועל מיקום בטבלת השיאים
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddCoinsDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleAddCoins}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                disabled={!coinsToAdd || isNaN(coinsToAdd) || Number(coinsToAdd) === 0}
              >
                אישור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Streak Dialog */}
      <Dialog open={showEditStreakDialog} onOpenChange={setShowEditStreakDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-orange-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              ערוך רצף כניסות 🔥
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-orange-900">
                {student.full_name}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                רצף נוכחי: {student.login_streak || 0} ימים
              </p>
              <p className="text-xs text-orange-600 mt-1">
                כניסה אחרונה: {student.last_login_date || "לא ידוע"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                רצף חדש (ימים)
              </Label>
              <Input
                type="number"
                min="0"
                value={editedStreak}
                onChange={(e) => setEditedStreak(e.target.value)}
                className="border-2 border-orange-200"
                placeholder="הזן מספר ימים"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 זה יעדכן את הרצף ואת תאריך הכניסה האחרונה להיום
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowEditStreakDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveStreak}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                disabled={isNaN(editedStreak) || Number(editedStreak) < 0}
              >
                שמור רצף
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gradient-to-br from-red-900/95 to-red-800/95 backdrop-blur-xl border-2 border-red-500/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white text-center">
              ⚠️ אזהרה - מחיקת משתמש
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-white text-lg mb-4">
              האם אתה בטוח שברצונך למחוק את <strong>{student.full_name}</strong>?
            </p>
            <p className="text-red-200 text-sm mb-2">
              פעולה זו תמחק גם:
            </p>
            <ul className="text-red-200 text-sm text-right list-disc list-inside space-y-1 mb-6">
              <li>כל ההשתתפויות בשיעורים</li>
              <li>כל ההתקדמות במילים והמתמטיקה</li>
              <li>כל החידונים</li>
              <li>כל ההשקעות</li>
              <li>הרשומה בטבלת השיאים</li>
              <li>השיוך לקבוצות</li>
            </ul>
            <p className="text-red-300 font-bold text-base">
              ⚠️ פעולה זו בלתי הפיכה! ⚠️
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
              className="bg-white/20 border-white/30 hover:bg-white/30 text-white"
              disabled={isDeleting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "מוחק..." : "מחק לצמיתות"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}