import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Users, Mail, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function TeachersAdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, allGroups] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Group.list()
      ]);
      setTeachers(allUsers.filter(u => u.user_type === "teacher"));
      setGroups(allGroups);
    } catch (error) {
      toast.error("שגיאה בטעינת נתונים");
    }
    setIsLoading(false);
  };

  const handleAddTeacher = async () => {
    if (!newTeacherEmail) return;
    try {
      const allUsers = await base44.entities.User.list();
      const existingUser = allUsers.find(u => u.email === newTeacherEmail);

      if (existingUser) {
        const updateData = { user_type: "teacher" };
        if (newTeacherName) updateData.full_name = newTeacherName;
        await base44.entities.User.update(existingUser.id, updateData);
        toast.success("המשתמש סומן כמורה!");
      } else {
        await base44.users.inviteUser(newTeacherEmail, "user");
        toast.success("הזמנה נשלחה! לאחר הצטרפות, סמן את המשתמש כמורה.");
      }

      setShowAddDialog(false);
      setNewTeacherEmail("");
      setNewTeacherName("");
      await loadData();
    } catch (error) {
      toast.error("שגיאה: " + (error.message || ""));
    }
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    try {
      await base44.entities.User.update(editingTeacher.id, { full_name: editingTeacher.full_name });
      toast.success("המורה עודכן בהצלחה!");
      setEditingTeacher(null);
      await loadData();
    } catch (error) {
      toast.error("שגיאה בעדכון: " + (error.message || ""));
    }
  };

  const getTeacherGroups = (teacherEmail) => {
    return groups.filter(g => g.teacher_email === teacherEmail);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-12 h-12 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">ניהול מורים</h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף מורה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teachers.map(teacher => {
          const teacherGroups = getTeacherGroups(teacher.email);
          return (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-lg">
                      {teacher.full_name?.[0] || "?"}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg">{teacher.full_name}</h4>
                      <p className="text-xs text-white/60 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {teacher.email}
                      </p>
                    </div>
                    <Button
                      onClick={() => setEditingTeacher({ ...teacher })}
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-white/60 mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      קבוצות ({teacherGroups.length}):
                    </p>
                    {teacherGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacherGroups.map(g => (
                          <span key={g.id} className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full border border-blue-400/30">
                            {g.group_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/40 text-xs">אין קבוצות מוקצות</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {teachers.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70 mb-4">אין עדיין מורים במערכת</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              הוסף מורה ראשון
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Teacher Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-blue-300 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-600 text-center">הוסף מורה חדש 👨‍🏫</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">אימייל המורה</Label>
              <Input
                type="email"
                value={newTeacherEmail}
                onChange={(e) => setNewTeacherEmail(e.target.value)}
                placeholder="teacher@example.com"
                className="border-2 border-blue-200"
              />
              <p className="text-xs text-gray-500">אם המשתמש קיים במערכת - יסומן כמורה. אחרת תישלח הזמנה.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">שם מלא (אופציונלי)</Label>
              <Input
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="שם פרטי ושם משפחה"
                className="border-2 border-blue-200"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowAddDialog(false)} variant="outline" className="flex-1">ביטול</Button>
              <Button
                onClick={handleAddTeacher}
                disabled={!newTeacherEmail}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                הוסף
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={() => setEditingTeacher(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-blue-300 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-600">עריכת מורה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">שם מלא</Label>
              <Input
                value={editingTeacher?.full_name || ""}
                onChange={(e) => setEditingTeacher({ ...editingTeacher, full_name: e.target.value })}
                className="border-2 border-blue-200"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setEditingTeacher(null)} variant="outline" className="flex-1">ביטול</Button>
              <Button onClick={handleUpdateTeacher} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500">שמור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}