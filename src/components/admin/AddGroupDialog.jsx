import React, { useState } from "react";
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

export default function AddGroupDialog({ isOpen, onClose, lessons, teachers = [], onSubmit }) {
  const [groupData, setGroupData] = useState({
    group_name: "",
    day_of_week: 0,
    hour: "17:00",
    student_emails: [],
    next_lesson_id: "",
    teacher_email: ""
  });

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  const handleSubmit = () => {
    if (groupData.group_name && groupData.hour) {
      onSubmit(groupData);
      setGroupData({
        group_name: "",
        day_of_week: 0,
        hour: "17:00",
        student_emails: [],
        next_lesson_id: ""
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            צור קבוצה חדשה 👥
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-gray-700 font-medium">
              שם הקבוצה
            </Label>
            <Input
              id="group-name"
              value={groupData.group_name}
              onChange={(e) => setGroupData({ ...groupData, group_name: e.target.value })}
              placeholder="לדוגמה: קבוצת א׳"
              className="border-2 border-purple-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              יום בשבוע
            </Label>
            <Select
              value={groupData.day_of_week.toString()}
              onValueChange={(value) => setGroupData({ ...groupData, day_of_week: Number(value) })}
            >
              <SelectTrigger className="border-2 border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hour" className="text-gray-700 font-medium">
              שעת השיעור
            </Label>
            <Input
              id="hour"
              type="time"
              value={groupData.hour}
              onChange={(e) => setGroupData({ ...groupData, hour: e.target.value })}
              className="border-2 border-purple-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              שיעור הבא (אופציונלי)
            </Label>
            <Select
              value={groupData.next_lesson_id}
              onValueChange={(value) => setGroupData({ ...groupData, next_lesson_id: value })}
            >
              <SelectTrigger className="border-2 border-purple-200">
                <SelectValue placeholder="בחר שיעור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא שיעור</SelectItem>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.lesson_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg"
            disabled={!groupData.group_name || !groupData.hour}
          >
            צור קבוצה ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}