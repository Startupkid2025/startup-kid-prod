import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Users, Calendar, Clock, Loader2, BookOpen, Search, X } from "lucide-react";
import { toast } from "sonner";

import AddGroupDialog from "./AddGroupDialog.jsx";
import EditGroupDialog from "./EditGroupDialog.jsx";
import ManageGroupStudentsDialog from "./ManageGroupStudentsDialog";
import GroupScheduleManager from "./GroupScheduleManager";
import GroupLessonStatus from "./GroupLessonStatus";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function extractGroupNumber(name) {
  if (!name) return Infinity;
  const match = name.match(/#?(\d+)/);
  return match ? parseInt(match[1]) : Infinity;
}

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

  // Filter/Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("number_asc");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterDays, setFilterDays] = useState([]);

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
      setGroups(allGroups);
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

  // Pre-compute student counts for all groups at once (no N calls)
  const studentCountMap = useMemo(() => {
    const map = {};
    groups.forEach(group => {
      const count = (group.student_emails || []).filter(email => {
        const user = students.find(s => s.email === email);
        return user && user.user_type === 'student' && user.role !== 'admin';
      }).length;
      map[group.id] = count;
    });
    return map;
  }, [groups, students]);

  // Pre-compute future lesson counts
  const futureLessonsMap = useMemo(() => {
    const map = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    groups.forEach(group => {
      const count = scheduledLessons.filter(sl => {
        if (sl.group_id !== group.id || !sl.lesson_id || sl.is_cancelled) return false;
        const d = new Date(sl.scheduled_date);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      }).length;
      map[group.id] = count;
    });
    return map;
  }, [groups, scheduledLessons]);

  // Filtered + sorted groups
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => g.group_name?.toLowerCase().includes(q));
    }

    if (filterTeacher) {
      result = result.filter(g => g.teacher_id === filterTeacher);
    }

    if (filterDays.length > 0) {
      result = result.filter(g => filterDays.includes(g.day_of_week));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "number_asc":
          return extractGroupNumber(a.group_name) - extractGroupNumber(b.group_name);
        case "number_desc":
          return extractGroupNumber(b.group_name) - extractGroupNumber(a.group_name);
        case "teacher": {
          const ta = teachers.find(t => t.id === a.teacher_id)?.full_name || "";
          const tb = teachers.find(t => t.id === b.teacher_id)?.full_name || "";
          return ta.localeCompare(tb, 'he') || extractGroupNumber(a.group_name) - extractGroupNumber(b.group_name);
        }
        case "day_asc":
          return (a.day_of_week ?? 7) - (b.day_of_week ?? 7)
            || (a.hour || "").localeCompare(b.hour || "")
            || extractGroupNumber(a.group_name) - extractGroupNumber(b.group_name);
        case "students_desc":
          return (studentCountMap[b.id] || 0) - (studentCountMap[a.id] || 0);
        case "students_asc":
          return (studentCountMap[a.id] || 0) - (studentCountMap[b.id] || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [groups, searchQuery, filterTeacher, filterDays, sortBy, studentCountMap, teachers]);

  const toggleDay = (day) => {
    setFilterDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterTeacher("");
    setFilterDays([]);
    setSortBy("number_asc");
  };

  const hasActiveFilters = searchQuery || filterTeacher || filterDays.length > 0 || sortBy !== "number_asc";

  if (viewingSchedule) {
    return (
      <div>
        <Button onClick={() => setViewingSchedule(null)} variant="outline" className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
          ← חזור לקבוצות
        </Button>
        <GroupScheduleManager
          group={viewingSchedule}
          allGroups={groups}
          onGroupChange={(groupId) => {
            const g = groups.find(g => g.id === groupId);
            if (g) setViewingSchedule(g);
          }}
        />
      </div>
    );
  }

  if (viewingLessonStatus) {
    return (
      <div>
        <Button onClick={() => setViewingLessonStatus(null)} variant="outline" className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
          ← חזור לקבוצות
        </Button>
        <GroupLessonStatus
          group={viewingLessonStatus}
          students={students}
          allGroups={groups}
          onGroupChange={(groupId) => {
            const g = groups.find(g => g.id === groupId);
            if (g) setViewingLessonStatus(g);
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
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
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

      {/* Controls Bar */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש שם קבוצה..."
              className="pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm focus:outline-none"
          >
            <option value="number_asc" className="bg-purple-900">מספר קבוצה: 1 → גדול</option>
            <option value="number_desc" className="bg-purple-900">מספר קבוצה: גדול → 1</option>
            <option value="teacher" className="bg-purple-900">לפי מורה</option>
            <option value="day_asc" className="bg-purple-900">לפי יום בשבוע</option>
            <option value="students_desc" className="bg-purple-900">תלמידים: הרבה → מעט</option>
            <option value="students_asc" className="bg-purple-900">תלמידים: מעט → הרבה</option>
          </select>

          {/* Teacher Filter */}
          <select
            value={filterTeacher}
            onChange={e => setFilterTeacher(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm focus:outline-none"
          >
            <option value="" className="bg-purple-900">כל המורים</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id} className="bg-purple-900">{t.full_name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="ghost" size="sm" className="text-white/70 hover:text-white gap-1">
              <X className="w-4 h-4" /> נקה פילטרים
            </Button>
          )}
        </div>

        {/* Day Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-white/60 text-sm">סינון לפי יום:</span>
          {DAY_NAMES.map((name, idx) => (
            <button
              key={idx}
              onClick={() => toggleDay(idx)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                filterDays.includes(idx)
                  ? 'bg-purple-500 border-purple-400 text-white'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="text-white/50 text-xs">
          מציג {filteredGroups.length} מתוך {groups.length} קבוצות
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGroups.map((group) => {
          const nextLesson = lessons.find(l => l.id === group.next_lesson_id);
          const groupTeacher = teachers.find(t => t.id === group.teacher_id);
          const studentCount = studentCountMap[group.id] || 0;
          const hasTwoLessonsAhead = (futureLessonsMap[group.id] || 0) >= 2;

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{group.group_name}</span>
                      {/* Day+Hour badge */}
                      {group.day_of_week !== undefined && (
                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/40 font-bold">
                          {DAY_NAMES[group.day_of_week]} {group.hour}
                        </span>
                      )}
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
                    <span>יום {DAY_NAMES[group.day_of_week]}</span>
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

      {filteredGroups.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">
              {groups.length === 0 ? "אין עדיין קבוצות במערכת" : "לא נמצאו קבוצות התואמות לסינון"}
            </p>
            {groups.length === 0 && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                צור קבוצה ראשונה
              </Button>
            )}
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
            const g = groups.find(g => g.id === groupId);
            if (g) setManagingGroup(g);
          }}
        />
      )}
    </div>
  );
}