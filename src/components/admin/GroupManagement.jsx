import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Users, Calendar, Clock, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

import AddGroupDialog from "./AddGroupDialog.jsx";
import EditGroupDialog from "./EditGroupDialog.jsx";
import ManageGroupStudentsDialog from "./ManageGroupStudentsDialog";
import GroupScheduleManager from "./GroupScheduleManager";
import GroupLessonStatus from "./GroupLessonStatus";

export default function GroupManagement() {
  const [groups, setGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [scheduledLessons, setScheduledLessons] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [managingGroup, setManagingGroup] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [viewingLessonStatus, setViewingLessonStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allGroups, allLessons, allUsers, allScheduledLessons, allTeachers] = await Promise.all([
        base44.entities.Group.list(),
        base44.entities.Lesson.list(),
        base44.entities.User.list(),
        base44.entities.ScheduledLesson.list(),
        base44.entities.Teacher.list()
      ]);

      const sortedGroups = allGroups.sort((a, b) => {
        return a.group_name.localeCompare(b.group_name, 'he');
      });

      setGroups(sortedGroups);
      setLessons(allLessons);
      setStudents(allUsers);
      setScheduledLessons(allScheduledLessons);
      setTeachers(allTeachers);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    }
    setIsLoading(false);
  };

  const handleAddGroup = async (groupData) => {
    await base44.entities.Group.create(groupData);
    setShowAddDialog(false);
    toast.success("הקבוצה נוספה בהצלחה! 🎉");
    loadData();
  };

  const handleEditGroup = async (groupData) => {
    if (!editingGroup) return;
    await base44.entities.Group.update(editingGroup.id, groupData);
    setEditingGroup(null);
    toast.success("הקבוצה עודכנה בהצלחה! ✨");
    loadData();
  };

  const handleDeleteGroup = async (groupId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את הקבוצה?")) {
      await base44.entities.Group.delete(groupId);
      toast.success("הקבוצה נמחקה בהצלחה");
      loadData();
    }
  };

  const handleUpdateStudents = async (groupId, newStudentEmails) => {
    await base44.entities.Group.update(groupId, { student_emails: newStudentEmails });
    setManagingGroup(null);
    toast.success("רשימת התלמידים עודכנה! ✨");
    loadData();
  };

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  if (viewingSchedule) {
    return (
      <div>
        <Button
          onClick={() => setViewingSchedule(null)}
          variant="outline"
          className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
        >
          ← חזור לקבוצות
        </Button>
        <GroupScheduleManager 
          group={viewingSchedule} 
          allGroups={groups}
          onGroupChange={(groupId) => {
            const newGroup = groups.find(g => g.id === groupId);
            if (newGroup) setViewingSchedule(newGroup);
          }}
        />
      </div>
    );
  }

  if (viewingLessonStatus) {
    return (
      <div>
        <Button
          onClick={() => setViewingLessonStatus(null)}
          variant="outline"
          className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20"
        >
          ← חזור לקבוצות
        </Button>
        <GroupLessonStatus 
          group={viewingLessonStatus} 
          students={students}
          allGroups={groups}
          onGroupChange={(groupId) => {
            const newGroup = groups.find(g => g.id === groupId);
            if (newGroup) setViewingLessonStatus(newGroup);
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">ניהול קבוצות</h2>
        </div>
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-white" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">ניהול קבוצות</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          קבוצה חדשה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const nextLesson = lessons.find(l => l.id === group.next_lesson_id);
          const groupTeacher = teachers.find(t => t.id === group.teacher_id);
          
          // Count only actual students (not teachers/admins/parents)
          const actualStudents = (group.student_emails || []).filter(email => {
            const user = students.find(s => s.email === email);
            // Don't count admins (even if user_type is student) and don't count teachers/parents
            return user && user.user_type === 'student' && user.role !== 'admin';
          });
          const studentCount = actualStudents.length;

          // Check if group has at least 2 future scheduled lessons
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time for date-only comparison
          
          const futureScheduledLessons = scheduledLessons.filter(sl => {
            if (sl.group_id !== group.id || !sl.lesson_id || sl.is_cancelled) {
              return false;
            }
            const lessonDate = new Date(sl.scheduled_date);
            lessonDate.setHours(0, 0, 0, 0);
            return lessonDate >= today;
          });
          const hasTwoLessonsAhead = futureScheduledLessons.length >= 2;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{group.group_name}</span>
                      {hasTwoLessonsAhead && (
                        <span className="text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded-full border border-green-400/50 font-bold">
                          ✓ 2+ שיעורים
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setViewingLessonStatus(group)}
                        size="sm"
                        variant="outline"
                        className="bg-green-500/20 border-green-500/30 hover:bg-green-500/30 text-green-200"
                        title="סטטוס שיעורים"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setViewingSchedule(group)}
                        size="sm"
                        variant="outline"
                        className="bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30 text-purple-200"
                        title="יומן שיעורים"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setManagingGroup(group)}
                        size="sm"
                        variant="outline"
                        className="bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-200"
                        title="תלמידים בקבוצה"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingGroup(group)}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                        title="עריכת קבוצה"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteGroup(group.id)}
                        size="sm"
                        variant="outline"
                        className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-200"
                        title="מחיקת קבוצה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span>יום {dayNames[group.day_of_week]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Clock className="w-4 h-4" />
                    <span>שעה {group.hour}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Users className="w-4 h-4" />
                    <span>{studentCount} תלמידים</span>
                  </div>
                  {groupTeacher && (
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="text-base">👩‍🏫</span>
                      <span>{groupTeacher.full_name}</span>
                    </div>
                  )}
                  {nextLesson && (
                    <div className="bg-purple-500/20 rounded-lg p-3 mt-3 border border-purple-500/30">
                      <p className="text-xs text-purple-200 mb-1">שיעור הבא:</p>
                      <p className="text-sm font-bold text-white">{nextLesson.lesson_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">אין עדיין קבוצות במערכת</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              צור קבוצה ראשונה
            </Button>
          </CardContent>
        </Card>
      )}

      <AddGroupDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        lessons={lessons}
        onSubmit={handleAddGroup}
      />

      {editingGroup && (
        <EditGroupDialog
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          group={editingGroup}
          lessons={lessons}
          onSubmit={handleEditGroup}
        />
      )}

      {managingGroup && (
        <ManageGroupStudentsDialog
          isOpen={!!managingGroup}
          onClose={() => setManagingGroup(null)}
          group={managingGroup}
          allStudents={students}
          onSubmit={(newEmails) => handleUpdateStudents(managingGroup.id, newEmails)}
          allGroups={groups}
          onGroupChange={(groupId) => {
            const newGroup = groups.find(g => g.id === groupId);
            if (newGroup) setManagingGroup(newGroup);
          }}
        />
      )}
    </div>
  );
}