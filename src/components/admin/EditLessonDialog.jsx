import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { key: "ai_tech", name: "בינה מלאכותית וטכנולוגיה", icon: "🤖" },
  { key: "personal_skills", name: "מיומנויות אישיות", icon: "🌱" },
  { key: "money_business", name: "כסף ועסקים", icon: "💸" }
];

export default function EditLessonDialog({ isOpen, onClose, lesson, onSuccess }) {
  const [lessonData, setLessonData] = useState({
    lesson_name: "",
    description: "",
    thumbnail_url: "",
    recorded_lesson_url: "",
    category: "ai_tech"
  });

  useEffect(() => {
    if (lesson) {
      setLessonData({
        lesson_name: lesson.lesson_name || "",
        description: lesson.description || "",
        thumbnail_url: lesson.thumbnail_url || "",
        recorded_lesson_url: lesson.recorded_lesson_url || "",
        category: lesson.category || "ai_tech"
      });
    }
  }, [lesson]);

  const handleSubmit = async () => {
    if (lessonData.lesson_name && lessonData.category && lesson?.id) {
      try {
        const { base44 } = await import("@/api/base44Client");
        const { toast } = await import("sonner");
        
        await base44.entities.Lesson.update(lesson.id, lessonData);
        toast.success("השיעור עודכן בהצלחה! ✨");
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } catch (error) {
        const { toast } = await import("sonner");
        console.error("Error updating lesson:", error);
        toast.error("שגיאה בעדכון השיעור");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            ערוך שיעור ✏️
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
            <Label htmlFor="description" className="text-gray-700 font-medium">
              תיאור השיעור
            </Label>
            <Textarea
              id="description"
              value={lessonData.description}
              onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })}
              placeholder="על מה השיעור?"
              className="border-2 border-purple-200 h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail-url" className="text-gray-700 font-medium">
              לינק לתמונה (Thumbnail)
            </Label>
            <Input
              id="thumbnail-url"
              value={lessonData.thumbnail_url}
              onChange={(e) => setLessonData({ ...lessonData, thumbnail_url: e.target.value })}
              placeholder="https://..."
              className="border-2 border-purple-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recorded-url" className="text-gray-700 font-medium">
              לינק לשיעור מוקלט (אופציונלי)
            </Label>
            <Input
              id="recorded-url"
              value={lessonData.recorded_lesson_url}
              onChange={(e) => setLessonData({ ...lessonData, recorded_lesson_url: e.target.value })}
              placeholder="https://youtube.com/... או לינק אחר"
              className="border-2 border-purple-200"
            />
          </div>

          <div className="border-t-2 border-purple-200 pt-4 space-y-2">
            <Label className="text-gray-700 font-medium">
              קטגוריית השיעור
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              כל שיעור מוסיף נקודה אחת לקטגוריה שנבחרה
            </p>
            
            <Select
              value={lessonData.category}
              onValueChange={(value) => setLessonData({ ...lessonData, category: value })}
            >
              <SelectTrigger className="w-full border-2 border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.key} value={cat.key}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
              disabled={!lessonData.lesson_name || !lessonData.category}
            >
              שמור שינויים ✨
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}