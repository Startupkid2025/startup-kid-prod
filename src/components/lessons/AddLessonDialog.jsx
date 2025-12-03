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
import { Textarea } from "@/components/ui/textarea";

const skills = [
  { key: "ai_tech_xp", name: "בינה מלאכותית וטכנולוגיה", icon: "🤖" },
  { key: "personal_dev_xp", name: "פיתוח אישי", icon: "🌱" },
  { key: "social_skills_xp", name: "מיומנויות חברתיות", icon: "❤️" },
  { key: "money_business_xp", name: "כסף ועסקים", icon: "💸" }
];

export default function AddLessonDialog({ isOpen, onClose, onSubmit }) {
  const [lessonData, setLessonData] = useState({
    lesson_name: "",
    lesson_date: new Date().toISOString().split('T')[0],
    notes: "",
    ai_tech_xp: 0,
    personal_dev_xp: 0,
    social_skills_xp: 0,
    money_business_xp: 0
  });

  const handleSubmit = () => {
    if (lessonData.lesson_name && lessonData.lesson_date) {
      onSubmit(lessonData);
      setLessonData({
        lesson_name: "",
        lesson_date: new Date().toISOString().split('T')[0],
        notes: "",
        ai_tech_xp: 0,
        personal_dev_xp: 0,
        social_skills_xp: 0,
        money_business_xp: 0
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            הוסף שיעור חדש 📚
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-name" className="text-gray-700 font-medium">
              שם השיעור
            </Label>
            <Input
              id="lesson-name"
              value={lessonData.lesson_name}
              onChange={(e) => setLessonData({ ...lessonData, lesson_name: e.target.value })}
              placeholder="לדוגמה: יצירת אתר ראשון"
              className="border-2 border-purple-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-date" className="text-gray-700 font-medium">
              תאריך השיעור
            </Label>
            <Input
              id="lesson-date"
              type="date"
              value={lessonData.lesson_date}
              onChange={(e) => setLessonData({ ...lessonData, lesson_date: e.target.value })}
              className="border-2 border-purple-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700 font-medium">
              הערות (אופציונלי)
            </Label>
            <Textarea
              id="notes"
              value={lessonData.notes}
              onChange={(e) => setLessonData({ ...lessonData, notes: e.target.value })}
              placeholder="מה למדת בשיעור?"
              className="border-2 border-purple-200 h-20"
            />
          </div>

          <div className="border-t-2 border-purple-200 pt-4">
            <Label className="text-gray-700 font-medium mb-3 block">
              הוסף נקודות (אופציונלי)
            </Label>
            
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.key} className="flex items-center gap-3">
                  <span className="text-2xl">{skill.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{skill.name}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={lessonData[skill.key]}
                    onChange={(e) => setLessonData({ 
                      ...lessonData, 
                      [skill.key]: Number(e.target.value) 
                    })}
                    className="w-20 text-center border-2 border-purple-200"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg"
            disabled={!lessonData.lesson_name || !lessonData.lesson_date}
          >
            שמור שיעור ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}