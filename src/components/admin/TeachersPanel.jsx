import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Users, Phone, Mail, Search, AlertTriangle, GraduationCap, Loader2 } from "lucide-react";

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function TeachersPanel() {
  const [teachers, setTeachers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "", email: "", status: "active", notes: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allTeachers, allGroups] = await Promise.all([
        base44.entities.Teacher.list(),
        base44.entities.Group.list()
      ]);
      setTeachers(allTeachers);
      setGroups(allGroups);
    } catch (e) {
      toast.error("שגיאה בטעינת נתונים");
    }
    setIsLoading(false);
  };

  const getTeacherGroups = (teacherId) => groups.filter(g => g.teacher_id === teacherId);

  const hoursOverlap = (hourA, hourB) => {
    if (!hourA || !hourB) return false;
    // Parse HH:MM and assume 1-hour duration per class
    const toMinutes = (h) => {
      const [hh, mm] = h.split(":").map(Number);
      return hh * 60 + (mm || 0);
    };
    const startA = toMinutes(hourA);
    const startB = toMinutes(hourB);
    const endA = startA + 60;
    const endB = startB + 60;
    return startA < endB && startB < endA;
  };

  const getConflicts = (teacherId) => {
    const tGroups = getTeacherGroups(teacherId);
    const conflicts = [];
    for (let i = 0; i < tGroups.length; i++) {
      for (let j = i + 1; j < tGroups.length; j++) {
        if (tGroups[i].day_of_week === tGroups[j].day_of_week && hoursOverlap(tGroups[i].hour, tGroups[j].hour)) {
          conflicts.push({ a: tGroups[i], b: tGroups[j] });
        }
      }
    }
    return conflicts;
  };

  const totalConflicts = teachers.reduce((sum, t) => sum + getConflicts(t.id).length, 0);

  const handleSave = async () => {
    if (!formData.full_name.trim()) { toast.error("שם מלא הוא שדה חובה"); return; }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error("פורמט אימייל לא תקין"); return; }
    try {
      if (editingTeacher) {
        await base44.entities.Teacher.update(editingTeacher.id, formData);
        toast.success("המורה עודכן בהצלחה!");
      } else {
        await base44.entities.Teacher.create(formData);
        toast.success("המורה נוסף בהצלחה!");
      }
      setShowDialog(false);
      setEditingTeacher(null);
      setFormData({ full_name: "", phone: "", email: "", status: "active", notes: "" });
      loadData();
    } catch { toast.error("שגיאה בשמירה"); }
  };

  const handleToggleStatus = async (teacher) => {
    const newStatus = teacher.status === "active" ? "inactive" : "active";
    await base44.entities.Teacher.update(teacher.id, { status: newStatus });
    toast.success(newStatus === "active" ? "המורה הופעל" : "המורה הושבת");
    if (viewingTeacher?.id === teacher.id) setViewingTeacher({ ...teacher, status: newStatus });
    loadData();
  };

  const handleDelete = async (teacher) => {
    if (!confirm(`האם למחוק את ${teacher.full_name}?`)) return;
    await base44.entities.Teacher.delete(teacher.id);
    toast.success("המורה נמחק");
    if (viewingTeacher?.id === teacher.id) setViewingTeacher(null);
    loadData();
  };

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({ full_name: teacher.full_name || "", phone: teacher.phone || "", email: teacher.email || "", status: teacher.status || "active", notes: teacher.notes || "" });
    setShowDialog(true);
  };

  const openAdd = () => {
    setEditingTeacher(null);
    setFormData({ full_name: "", phone: "", email: "", status: "active", notes: "" });
    setShowDialog(true);
  };

  const filteredTeachers = teachers.filter(t => {
    const sm = !searchTerm || t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.phone?.includes(searchTerm) || t.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const stm = filterStatus === "all" || t.status === filterStatus;
    return sm && stm;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
        <Loader2 className="w-12 h-12 text-white" />
      </motion.div>
    </div>
  );

  // Profile view
  if (viewingTeacher) {
    const teacher = teachers.find(t => t.id === viewingTeacher.id) || viewingTeacher;
    const teacherGroups = getTeacherGroups(teacher.id);
    const conflicts = getConflicts(teacher.id);
    const schedule = {};
    teacherGroups.forEach(g => {
      if (!schedule[g.day_of_week]) schedule[g.day_of_week] = [];
      schedule[g.day_of_week].push(g);
    });

    return (
      <div className="space-y-6">
        <Button onClick={() => setViewingTeacher(null)} variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
          ← חזור למורים
        </Button>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
                  {teacher.full_name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{teacher.full_name}</h2>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${teacher.status === "active" ? "bg-green-500/30 text-green-200" : "bg-red-500/30 text-red-200"}`}>
                    {teacher.status === "active" ? "פעיל" : "לא פעיל"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {teacher.phone && (
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(teacher.phone); toast.success("טלפון הועתק"); }} className="bg-blue-500/20 border-blue-500/30 text-blue-200 hover:bg-blue-500/30">
                    <Phone className="w-3.5 h-3.5 ml-1" />{teacher.phone}
                  </Button>
                )}
                {teacher.email && (
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(teacher.email); toast.success("אימייל הועתק"); }} className="bg-green-500/20 border-green-500/30 text-green-200 hover:bg-green-500/30">
                    <Mail className="w-3.5 h-3.5 ml-1" />{teacher.email}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(teacher)} className="bg-yellow-500/20 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleStatus(teacher)} className={teacher.status === "active" ? "bg-orange-500/20 border-orange-500/30 text-orange-200 hover:bg-orange-500/30" : "bg-green-500/20 border-green-500/30 text-green-200 hover:bg-green-500/30"}>
                  {teacher.status === "active" ? "השבת" : "הפעל"}
                </Button>
              </div>
            </div>
            {teacher.notes && (
              <div className="mt-4 bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs mb-1">הערות:</p>
                <p className="text-white/90 text-sm">{teacher.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {conflicts.length > 0 && (
          <Card className="bg-red-500/20 border-red-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-300" />
                <p className="text-red-200 font-bold">⚠️ חפיפות בלו"ז ({conflicts.length})</p>
              </div>
              {conflicts.map((c, i) => (
                <div key={i} className="bg-red-500/10 rounded-lg p-3 mb-2 text-sm text-red-200">
                  קבוצה "{c.a.group_name}" וקבוצה "{c.b.group_name}" — שתיהן ביום {DAY_NAMES[c.a.day_of_week]}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5" />קבוצות ({teacherGroups.length})</CardTitle></CardHeader>
          <CardContent>
            {teacherGroups.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">אין קבוצות משויכות</p>
            ) : (
              <div className="space-y-3">
                {teacherGroups.map(g => (
                  <div key={g.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-bold">{g.group_name}</p>
                    <p className="text-white/60 text-xs">יום {DAY_NAMES[g.day_of_week]} • שעה {g.hour} • {(g.student_emails || []).length} תלמידים</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader><CardTitle className="text-white">לו"ז שבועי</CardTitle></CardHeader>
          <CardContent>
            {teacherGroups.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">אין שיעורים מתוכננים</p>
            ) : (
              <div className="space-y-2">
                {[0,1,2,3,4,5,6].map(day => {
                  const dg = schedule[day] || [];
                  if (!dg.length) return null;
                  return (
                    <div key={day} className="flex items-start gap-3">
                      <span className="text-white/60 text-sm w-16 flex-shrink-0">יום {DAY_NAMES[day]}</span>
                      <div className="flex flex-wrap gap-2">
                        {dg.map(g => (
                          <span key={g.id} className="bg-purple-500/30 text-purple-200 text-xs px-2 py-1 rounded-full">{g.group_name} | {g.hour}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingTeacher(null); } }}>
          <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md">
            <DialogHeader><DialogTitle className="text-2xl font-bold text-purple-600 text-center">ערוך מורה ✏️</DialogTitle></DialogHeader>
            <TeacherForm formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={() => { setShowDialog(false); setEditingTeacher(null); }} isEdit={true} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">ניהול מורים</h2>
        <Button onClick={openAdd} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Plus className="w-5 h-5 ml-2" />מורה חדש
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ מורים', value: teachers.length, color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30", icon: "👩‍🏫" },
          { label: "מורים פעילים", value: teachers.filter(t => t.status === "active").length, color: "from-green-500/20 to-emerald-500/20 border-green-500/30", icon: "✅" },
          { label: "קבוצות משויכות", value: groups.filter(g => g.teacher_id).length, color: "from-purple-500/20 to-pink-500/20 border-purple-500/30", icon: "🏫" },
          { label: 'חפיפות בלו"ז', value: totalConflicts, color: totalConflicts > 0 ? "from-red-500/20 to-orange-500/20 border-red-500/30" : "from-gray-500/20 to-gray-500/20 border-gray-500/30", icon: totalConflicts > 0 ? "⚠️" : "✓" }
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`bg-gradient-to-br ${s.color}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-white/70 text-xs mb-1">{s.label}</p><p className="text-3xl font-black text-white">{s.value}</p></div>
                  <span className="text-3xl">{s.icon}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input placeholder="חפש לפי שם, טלפון, אימייל..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teachers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeachers.map(teacher => {
          const tGroups = getTeacherGroups(teacher.id);
          const conflicts = getConflicts(teacher.id);
          return (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-black text-white flex-shrink-0">
                      {teacher.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-white font-bold">{teacher.full_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${teacher.status === "active" ? "bg-green-500/30 text-green-200" : "bg-gray-500/30 text-gray-300"}`}>
                          {teacher.status === "active" ? "פעיל" : "לא פעיל"}
                        </span>
                        {conflicts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 font-bold">⚠️ {conflicts.length} חפיפות</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-white/60 text-xs mb-1">
                        {teacher.phone && <span><Phone className="w-3 h-3 inline ml-1" />{teacher.phone}</span>}
                        {teacher.email && <span><Mail className="w-3 h-3 inline ml-1" />{teacher.email}</span>}
                      </div>
                      <p className="text-white/70 text-xs">{tGroups.length} קבוצות{tGroups.length > 0 ? ` • ${tGroups.map(g => g.group_name).join(", ")}` : ""}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => setViewingTeacher(teacher)} className="bg-blue-500/20 border-blue-500/30 text-blue-200 hover:bg-blue-500/30 h-8 w-8 p-0" title="פרופיל">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(teacher)} className="bg-yellow-500/20 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30 h-8 w-8 p-0" title="עריכה">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(teacher)} className={`h-8 w-8 p-0 text-xs ${teacher.status === "active" ? "bg-orange-500/20 border-orange-500/30 text-orange-200 hover:bg-orange-500/30" : "bg-green-500/20 border-green-500/30 text-green-200 hover:bg-green-500/30"}`} title={teacher.status === "active" ? "השבת" : "הפעל"}>
                        {teacher.status === "active" ? "⏸" : "▶"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(teacher)} className="bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30 h-8 w-8 p-0" title="מחיקה">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredTeachers.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">{searchTerm || filterStatus !== "all" ? "אין מורים המתאימים לחיפוש" : "אין מורים במערכת"}</p>
            {!searchTerm && filterStatus === "all" && (
              <Button onClick={openAdd} className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500">הוסף מורה ראשון</Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingTeacher(null); } }}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
              {editingTeacher ? "ערוך מורה ✏️" : "הוסף מורה חדש 👩‍🏫"}
            </DialogTitle>
          </DialogHeader>
          <TeacherForm formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={() => { setShowDialog(false); setEditingTeacher(null); }} isEdit={!!editingTeacher} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeacherForm({ formData, setFormData, onSave, onCancel, isEdit }) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">שם מלא *</Label>
        <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="שם המורה" className="border-2 border-purple-200" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">סטטוס</Label>
        <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
          <SelectTrigger className="border-2 border-purple-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">טלפון</Label>
        <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="050-1234567" className="border-2 border-purple-200" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">אימייל</Label>
        <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="teacher@example.com" className="border-2 border-purple-200" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">הערות</Label>
        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="הערות..." className="w-full border-2 border-purple-200 rounded-md p-2 text-sm min-h-16 resize-none" />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">ביטול</Button>
        <Button onClick={onSave} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" disabled={!formData.full_name.trim()}>
          {isEdit ? "שמור שינויים ✨" : "הוסף מורה ✨"}
        </Button>
      </div>
    </div>
  );
}