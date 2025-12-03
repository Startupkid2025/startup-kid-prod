import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Lesson } from "@/entities/Lesson";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Mail, Phone, Award, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allUsers = await User.list();
    const teacherUsers = allUsers.filter(u => u.user_type === "teacher");
    setTeachers(teacherUsers);
    
    const lessons = await Lesson.list();
    setAllLessons(lessons);
  };

  const handleApprove = async (teacher) => {
    await User.update(teacher.id, { teacher_status: "approved" });
    toast.success(`${teacher.full_name} אושר כמורה!`);
    loadData();
  };

  const handleReject = async (teacher) => {
    if (confirm(`האם אתה בטוח שברצונך לדחות את ${teacher.full_name}?`)) {
      await User.update(teacher.id, { teacher_status: "rejected" });
      toast.success("המורה נדחה");
      loadData();
    }
  };

  const handleEditLessons = (teacher) => {
    setEditingTeacher(teacher);
    setSelectedLessonIds(teacher.teacher_lesson_ids || []);
  };

  const handleToggleLesson = (lessonId) => {
    setSelectedLessonIds(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleSaveLessons = async () => {
    if (!editingTeacher) return;
    
    await User.update(editingTeacher.id, { teacher_lesson_ids: selectedLessonIds });
    toast.success("השיעורים עודכנו בהצלחה!");
    setEditingTeacher(null);
    loadData();
  };

  const pendingTeachers = teachers.filter(t => t.teacher_status === "pending");
  const approvedTeachers = teachers.filter(t => t.teacher_status === "approved");

  return (
    <div className="space-y-6">
      {/* Pending Teachers */}
      {pendingTeachers.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">ממתינים לאישור ({pendingTeachers.length})</h3>
          <div className="space-y-4">
            {pendingTeachers.map(teacher => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-white/10 backdrop-blur-md border-yellow-400/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-2">{teacher.full_name}</h4>
                        <div className="space-y-1 text-sm text-white/70">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {teacher.email}
                          </div>
                          {teacher.phone_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {teacher.phone_number}
                            </div>
                          )}
                        </div>
                        {teacher.teacher_bio && (
                          <p className="text-white/80 text-sm mt-2">{teacher.teacher_bio}</p>
                        )}
                        {teacher.teacher_specializations && teacher.teacher_specializations.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {teacher.teacher_specializations.map((spec, idx) => (
                              <Badge key={idx} className="bg-blue-500/30 text-blue-200">
                                <Award className="w-3 h-3 mr-1" />
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(teacher)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          אשר
                        </Button>
                        <Button
                          onClick={() => handleReject(teacher)}
                          size="sm"
                          variant="destructive"
                        >
                          <X className="w-4 h-4 mr-1" />
                          דחה
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Teachers */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">מורים מאושרים ({approvedTeachers.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvedTeachers.map(teacher => {
            const teacherLessonNames = allLessons
              .filter(l => teacher.teacher_lesson_ids && teacher.teacher_lesson_ids.includes(l.id))
              .map(l => l.lesson_name);
            
            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-white/10 backdrop-blur-md border-green-400/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white font-bold text-lg">
                        {teacher.full_name?.[0] || "?"}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{teacher.full_name}</h4>
                        <p className="text-xs text-white/60">{teacher.email}</p>
                      </div>
                      <Button
                        onClick={() => handleEditLessons(teacher)}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        שיעורים
                      </Button>
                    </div>
                    {teacher.teacher_bio && (
                      <p className="text-white/70 text-sm mt-2">{teacher.teacher_bio}</p>
                    )}
                    
                    {teacherLessonNames.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-white/60 mb-1">שיעורים שיכול ללמד:</p>
                        <div className="flex gap-1 flex-wrap">
                          {teacherLessonNames.map((name, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {approvedTeachers.length === 0 && pendingTeachers.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <p className="text-white/70">אין עדיין מורים במערכת</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Lessons Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={() => setEditingTeacher(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-600">
              שיעורים עבור {editingTeacher?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">בחר את השיעורים שהמורה יכול ללמד:</p>
            
            {allLessons.map(lesson => (
              <div key={lesson.id} className="flex items-start gap-3 p-3 rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors">
                <Checkbox
                  id={lesson.id}
                  checked={selectedLessonIds.includes(lesson.id)}
                  onCheckedChange={() => handleToggleLesson(lesson.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={lesson.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {lesson.lesson_name}
                  </Label>
                  {lesson.description && (
                    <p className="text-xs text-gray-500 mt-1">{lesson.description}</p>
                  )}
                </div>
              </div>
            ))}

            {allLessons.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                אין עדיין שיעורים במערכת
              </p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setEditingTeacher(null)}
                variant="outline"
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveLessons}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}