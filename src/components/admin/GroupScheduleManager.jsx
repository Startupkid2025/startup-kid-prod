import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea import
import { ChevronLeft, ChevronRight, Plus, X, Edit2, Calendar as CalendarIcon, Loader2, Trash2, Ban, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, // Retained Select for other potential uses if any, though replaced in dialog
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function GroupScheduleManager({ group }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledLessons, setScheduledLessons] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoClassDialog, setShowNoClassDialog] = useState(false);
  const [noClassTarget, setNoClassTarget] = useState(null); // { scheduledLesson } or { date }
  const [noClassReason, setNoClassReason] = useState("");

  const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  useEffect(() => {
    loadData();
  }, [group, currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allScheduled = await base44.entities.ScheduledLesson.list();
      const scheduled = allScheduled.filter(sl => sl.group_id === group.id);
      console.log("Loaded scheduled lessons for group:", group.id, scheduled);
      setScheduledLessons(scheduled);

      const lessons = await base44.entities.Lesson.list();
      setAllLessons(lessons);

      const allUsers = await base44.entities.User.list();
      const teachers = allUsers.filter(u => u.user_type === "teacher" && u.teacher_status === "approved");
      setAllTeachers(teachers);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getLessonForDate = (date) => {
    if (!date) return null;
    
    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const found = scheduledLessons.find(sl => {
      // Handle both formats: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS...
      const slDate = sl.scheduled_date.includes('T') 
        ? sl.scheduled_date.split('T')[0] 
        : sl.scheduled_date;
      return slDate === dateStr;
    });
    
    console.log(`Looking for lesson on ${dateStr}:`, found);
    return found;
  };

  const isGroupDay = (date) => {
    if (!date) return false;
    // Assuming group.day_of_week is 0 for Sunday, 1 for Monday, etc.
    // JavaScript's getDay() also returns 0 for Sunday, 1 for Monday.
    return date.getDay() === group.day_of_week;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleAddLesson = (date) => {
    setSelectedDate(date);
    
    // Format date correctly as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    console.log("Creating new lesson for date:", formattedDate);
    
    setEditingLesson({
      group_id: group.id,
      scheduled_date: formattedDate,
      start_time: group.hour,
      lesson_id: "",
      teacher_email: "",
      notes: ""
    });
    setShowAddDialog(true);
  };

  const handleEditLesson = (scheduledLesson) => {
    setEditingLesson(scheduledLesson);
    setShowAddDialog(true);
  };

  const handleSaveLesson = async () => {
    try {
      console.log("Saving lesson:", editingLesson);
      
      if (editingLesson.id) {
        await base44.entities.ScheduledLesson.update(editingLesson.id, editingLesson);
        toast.success("השיעור עודכן!");
      } else {
        const created = await base44.entities.ScheduledLesson.create(editingLesson);
        console.log("Lesson created:", created);
        toast.success("השיעור נוסף ליומן!");
      }
      
      setShowAddDialog(false);
      setEditingLesson(null);
      
      // Force reload
      await loadData();
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast.error("שגיאה בשמירת השיעור: " + (error.message || ""));
    }
  };

  const handleCancelLesson = async (scheduledLesson) => {
    if (!confirm("האם אתה בטוח שברצונך לבטל שיעור זה?")) return;
    
    try {
      await base44.entities.ScheduledLesson.update(scheduledLesson.id, {
        is_cancelled: true,
        cancellation_reason: "בוטל על ידי המנהל"
      });
      toast.success("השיעור בוטל");
      loadData();
    } catch (error) {
      console.error("Error cancelling lesson:", error);
      toast.error("שגיאה בביטול השיעור");
    }
  };

  const handleMarkNoClass = (scheduledLesson, date) => {
    setNoClassTarget({ scheduledLesson, date });
    setNoClassReason(scheduledLesson?.no_class_reason || "");
    setShowNoClassDialog(true);
  };

  const handleSaveNoClass = async () => {
    try {
      const user = await base44.auth.me();
      const now = new Date().toISOString();

      if (noClassTarget.scheduledLesson) {
        // Update existing record
        await base44.entities.ScheduledLesson.update(noClassTarget.scheduledLesson.id, {
          no_class: true,
          no_class_reason: noClassReason,
          no_class_marked_by: user.email,
          no_class_marked_at: now
        });
      } else {
        // Create a new record just to mark no-class on this date
        const year = noClassTarget.date.getFullYear();
        const month = String(noClassTarget.date.getMonth() + 1).padStart(2, '0');
        const day = String(noClassTarget.date.getDate()).padStart(2, '0');
        await base44.entities.ScheduledLesson.create({
          group_id: group.id,
          scheduled_date: `${year}-${month}-${day}`,
          start_time: group.hour || "",
          no_class: true,
          no_class_reason: noClassReason,
          no_class_marked_by: user.email,
          no_class_marked_at: now
        });
      }

      toast.success("התאריך סומן כ'לא התקיים שיעור'");
      setShowNoClassDialog(false);
      setNoClassTarget(null);
      setNoClassReason("");
      await loadData();
    } catch (error) {
      console.error("Error marking no class:", error);
      toast.error("שגיאה בסימון");
    }
  };

  const handleUnmarkNoClass = async (scheduledLesson) => {
    try {
      if (scheduledLesson.lesson_id || scheduledLesson.notes || scheduledLesson.start_time) {
        // Has other data — just clear the no_class fields
        await base44.entities.ScheduledLesson.update(scheduledLesson.id, {
          no_class: false,
          no_class_reason: "",
          no_class_marked_by: "",
          no_class_marked_at: null
        });
      } else {
        // Was created only for no_class — delete it
        await base44.entities.ScheduledLesson.delete(scheduledLesson.id);
      }
      toast.success("הסימון בוטל, היום חזר למצב רגיל");
      await loadData();
    } catch (error) {
      console.error("Error unmarking no class:", error);
      toast.error("שגיאה בביטול הסימון");
    }
  };

  const handleDeleteLesson = async (scheduledLesson) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק שיעור זה מהיומן?")) return;
    
    try {
      console.log("Deleting lesson:", scheduledLesson.id);
      await base44.entities.ScheduledLesson.delete(scheduledLesson.id);
      toast.success("השיעור נמחק מהיומן");
      
      // Force reload to update everything
      await loadData();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("שגיאה במחיקת השיעור: " + (error.message || ""));
    }
  };

  const days = getDaysInMonth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6" />
              <span>יומן שיעורים - {group.group_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handlePrevMonth}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>קודם</span>
              </Button>
              <span className="text-lg font-bold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button
                onClick={handleNextMonth}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-1"
              >
                <span>הבא</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {dayNames.map((day) => (
              <div key={day} className="text-center text-white/70 font-bold py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const scheduledLesson = getLessonForDate(date);
              const lesson = scheduledLesson && allLessons.find(l => l.id === scheduledLesson.lesson_id);
              const isToday = date.toDateString() === new Date().toDateString();
              const isCorrectDay = isGroupDay(date);
              const isNoClass = scheduledLesson?.no_class;
              const canAddLesson = !scheduledLesson;

              return (
                <motion.div
                  key={date.toISOString()}
                  whileHover={canAddLesson ? { scale: 1.05 } : {}}
                  className={`aspect-square p-2 rounded-lg border-2 transition-all relative ${
                    isNoClass
                      ? 'bg-gray-500/20 border-gray-400/50'
                      : isToday
                      ? 'bg-yellow-500/30 border-yellow-400'
                      : scheduledLesson
                      ? scheduledLesson.is_cancelled
                        ? 'bg-red-500/20 border-red-400/50'
                        : 'bg-green-500/30 border-green-400'
                      : canAddLesson && isCorrectDay
                      ? 'bg-green-500/10 border-green-400/30 hover:bg-green-500/20 cursor-pointer'
                      : canAddLesson
                      ? 'bg-blue-500/5 border-blue-400/20 hover:bg-blue-500/15 cursor-pointer'
                      : 'bg-white/5 border-white/10'
                  }`}
                  onClick={() => canAddLesson && handleAddLesson(date)}
                >
                  <div className="text-white font-bold text-sm">
                    {date.getDate()}
                  </div>
                  
                  {scheduledLesson && (
                    <div className="mt-1">
                      {isNoClass ? (
                        <div className="bg-gray-500/40 rounded px-1 py-0.5 text-[10px] text-gray-200 font-bold">
                          ❌ לא התקיים
                        </div>
                      ) : scheduledLesson.is_cancelled ? (
                        <div className="bg-red-500/30 rounded px-1 py-0.5 text-[10px] text-red-200">
                          בוטל
                        </div>
                      ) : lesson ? (
                        <div className="bg-green-500/30 rounded px-1 py-0.5 text-[10px] text-green-200 line-clamp-2">
                          {lesson.lesson_name}
                        </div>
                      ) : (
                        <div className="bg-blue-500/30 rounded px-1 py-0.5 text-[10px] text-blue-200">
                          שיעור
                        </div>
                      )}
                      
                      <div className="absolute top-1 left-1 flex gap-1 flex-wrap">
                        {!isNoClass && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditLesson(scheduledLesson); }}
                            className="w-5 h-5 rounded bg-blue-500/50 hover:bg-blue-500 flex items-center justify-center"
                            title="ערוך"
                          >
                            <Edit2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                        {!isNoClass && !scheduledLesson.is_cancelled && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelLesson(scheduledLesson); }}
                            className="w-5 h-5 rounded bg-orange-500/50 hover:bg-orange-500 flex items-center justify-center"
                            title="בטל שיעור"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}
                        {!isNoClass && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLesson(scheduledLesson); }}
                            className="w-5 h-5 rounded bg-red-500/50 hover:bg-red-500 flex items-center justify-center"
                            title="מחק"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                        {/* No-class toggle button */}
                        {isNoClass ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnmarkNoClass(scheduledLesson); }}
                            className="w-5 h-5 rounded bg-green-600/70 hover:bg-green-600 flex items-center justify-center"
                            title="בטל סימון 'לא התקיים'"
                          >
                            <RotateCcw className="w-3 h-3 text-white" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkNoClass(scheduledLesson, date); }}
                            className="w-5 h-5 rounded bg-gray-500/60 hover:bg-gray-500 flex items-center justify-center"
                            title="סמן כ'לא התקיים שיעור'"
                          >
                            <Ban className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allow marking no-class even on days without a scheduled lesson (group day) */}
                  {canAddLesson && isCorrectDay && (
                    <div className="absolute bottom-1 left-1 flex gap-1">
                      <Plus className="w-4 h-4 text-green-400" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkNoClass(null, date); }}
                        className="w-4 h-4 rounded bg-gray-500/50 hover:bg-gray-500 flex items-center justify-center"
                        title="סמן כ'לא התקיים שיעור'"
                      >
                        <Ban className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  )}
                  {canAddLesson && !isCorrectDay && (
                    <div className="absolute bottom-1 left-1">
                      <Plus className="w-4 h-4 text-blue-400 opacity-70" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* No-Class Dialog */}
      <Dialog open={showNoClassDialog} onOpenChange={setShowNoClassDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-gray-400 max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <Ban className="w-5 h-5 text-gray-500" />
              סימון "לא התקיים שיעור"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-bold mb-1">
                {noClassTarget?.scheduledLesson
                  ? `תאריך: ${noClassTarget.scheduledLesson.scheduled_date}`
                  : noClassTarget?.date
                  ? `תאריך: ${noClassTarget.date.toLocaleDateString('he-IL')}`
                  : ""}
              </p>
              <p>סימון זה יציין שהשיעור לא התקיים ביום זה. ניתן לבטל בכל עת.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">סיבה (אופציונלי)</Label>
              <Input
                value={noClassReason}
                onChange={(e) => setNoClassReason(e.target.value)}
                placeholder="למשל: חג, מחלה, מזג אוויר..."
                className="border-2 border-gray-300"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => { setShowNoClassDialog(false); setNoClassTarget(null); setNoClassReason(""); }}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveNoClass}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              >
                <Ban className="w-4 h-4 ml-2" />
                סמן כ"לא התקיים"
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-600">
              {editingLesson?.id ? "ערוך שיעור" : "הוסף שיעור ליומן"}
            </DialogTitle>
          </DialogHeader>
          {editingLesson?.no_class && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2">
              <Ban className="w-4 h-4 text-gray-500 shrink-0" />
              <span>יום זה מסומן כ"לא התקיים שיעור"{editingLesson.no_class_reason ? ` — ${editingLesson.no_class_reason}` : ""}. עריכה חסומה.</span>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">תאריך</Label>
              <Input
                type="date"
                value={editingLesson?.scheduled_date || ""}
                onChange={(e) => setEditingLesson({...editingLesson, scheduled_date: e.target.value})}
                className="border-2 border-purple-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">שעת התחלה</Label>
              <Input
                type="time"
                value={editingLesson?.start_time || ""}
                onChange={(e) => setEditingLesson({...editingLesson, start_time: e.target.value})}
                className="border-2 border-purple-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">שיעור</Label>
              <select
                value={editingLesson?.lesson_id || ""}
                onChange={(e) => setEditingLesson({...editingLesson, lesson_id: e.target.value})}
                className="w-full border-2 border-purple-200 rounded-md p-2"
              >
                <option value="">בחר שיעור (אופציונלי)</option>
                {allLessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>{lesson.lesson_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">מורה</Label>
              <select
                value={editingLesson?.teacher_email || ""}
                onChange={(e) => setEditingLesson({...editingLesson, teacher_email: e.target.value})}
                className="w-full border-2 border-purple-200 rounded-md p-2"
              >
                <option value="">בחר מורה (אופציונלי)</option>
                {allTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.email}>{teacher.full_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">הערות</Label>
              <Textarea
                value={editingLesson?.notes || ""}
                onChange={(e) => setEditingLesson({...editingLesson, notes: e.target.value})}
                className="border-2 border-purple-200"
                placeholder="הערות..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddDialog(false)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveLesson}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                שמור
              </Button>
            </div>
            {/* The delete button in the dialog was removed as per the outline.
                Deletion is now primarily handled via the trash icon on the calendar day itself. */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}