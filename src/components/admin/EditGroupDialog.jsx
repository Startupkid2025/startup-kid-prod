import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export default function EditGroupDialog({ isOpen, onClose, group, lessons, onSubmit }) {
  const [groupData, setGroupData] = useState({
    group_name: "",
    day_of_week: 0,
    hour: "17:00",
    next_lesson_id: "",
    teacher_id: ""
  });
  const [teachers, setTeachers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [conflictWarning, setConflictWarning] = useState(null);

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  useEffect(() => {
    if (group) {
      setGroupData({
        group_name: group.group_name || "",
        day_of_week: group.day_of_week || 0,
        hour: group.hour || "17:00",
        next_lesson_id: group.next_lesson_id || "",
        teacher_id: group.teacher_id || ""
      });
    }
  }, [group]);

  useEffect(() => {
    if (isOpen) {
      base44.entities.Teacher.list().then(t => setTeachers(t.filter(x => x.status === "active")));
      base44.entities.Group.list().then(setAllGroups);
    }
  }, [isOpen]);

  useEffect(() => {
    checkConflict();
  }, [groupData.teacher_id, groupData.day_of_week, groupData.hour, allGroups]);

  const checkConflict = () => {
    if (!groupData.teacher_id || !group) { setConflictWarning(null); return; }
    const conflicts = allGroups.filter(g =>
      g.teacher_id === groupData.teacher_id &&
      g.day_of_week === groupData.day_of_week &&
      g.id !== group.id
    );
    if (conflicts.length > 0) {
      const c = conflicts[0];
      setConflictWarning(`שימו לב: למורה כבר יש קבוצה "${c.group_name}" ביום ${dayNames[c.day_of_week]} בשעה ${c.hour}`);
    } else {
      setConflictWarning(null);
    }
  };

  const handleSubmit = () => {
    if (groupData.group_name && groupData.hour) {
      onSubmit(groupData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            ערוך קבוצה ✏️
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-gray-700 font-medium">שם הקבוצה</Label>
            <Input id="group-name" value={groupData.group_name} onChange={(e) => setGroupData({ ...groupData, group_name: e.target.value })} placeholder="לדוגמה: קבוצת א׳" className="border-2 border-purple-200" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">יום בשבוע</Label>
            <Select value={groupData.day_of_week.toString()} onValueChange={(value) => setGroupData({ ...groupData, day_of_week: Number(value) })}>
              <SelectTrigger className="border-2 border-purple-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {dayNames.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hour" className="text-gray-700 font-medium">שעת השיעור</Label>
            <Input id="hour" type="time" value={groupData.hour} onChange={(e) => setGroupData({ ...groupData, hour: e.target.value })} className="border-2 border-purple-200" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">מורה (אופציונלי)</Label>
            <Select value={groupData.teacher_id || "none"} onValueChange={(value) => setGroupData({ ...groupData, teacher_id: value === "none" ? "" : value })}>
              <SelectTrigger className="border-2 border-purple-200"><SelectValue placeholder="בחר מורה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא מורה</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conflictWarning && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-700 text-sm">{conflictWarning}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">שיעור הבא</Label>
            <Select value={groupData.next_lesson_id} onValueChange={(value) => setGroupData({ ...groupData, next_lesson_id: value })}>
              <SelectTrigger className="border-2 border-purple-200"><SelectValue placeholder="בחר שיעור" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא שיעור</SelectItem>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>{lesson.lesson_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">ביטול</Button>
            <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold" disabled={!groupData.group_name || !groupData.hour}>
              שמור שינויים ✨
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}