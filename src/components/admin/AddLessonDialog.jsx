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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { key: "ai_tech", name: "בינה מלאכותית וטכנולוגיה", icon: "🤖" },
  { key: "personal_dev", name: "פיתוח אישי", icon: "🌱" },
  { key: "social_skills", name: "מיומנויות חברתיות", icon: "❤️" },
  { key: "money_business", name: "כסף ועסקים", icon: "💸" }
];

const DAYS_OF_WEEK = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" }
];

export default function AddLessonDialog({ isOpen, onClose, onSubmit }) {
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [lessonData, setLessonData] = useState({
    lesson_name: "",
    description: "",
    thumbnail_url: "",
    recorded_lesson_url: "",
    category: "ai_tech",
    lesson_date: getTodayDate()
  });

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.getDay();
  };

  const selectedDayOfWeek = lessonData.lesson_date ? getDayOfWeek(lessonData.lesson_date) : null;
  const selectedDayLabel = selectedDayOfWeek !== null ? DAYS_OF_WEEK[selectedDayOfWeek]?.label : "";

  const handleSubmit = () => {
    if (lessonData.lesson_name && lessonData.category && lessonData.lesson_date) {
      onSubmit(lessonData);
      setLessonData({
        lesson_name: "",
        description: "",
        thumbnail_url: "",
        recorded_lesson_url: "",
        category: "ai_tech",
        lesson_date: getTodayDate()
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
              תאריך השיעור ⭐
            </Label>
            <Input
              id="lesson-date"
              type="date"
              value={lessonData.lesson_date}
              onChange={(e) => setLessonData({ ...lessonData, lesson_date: e.target.value })}
              className="border-2 border-purple-200"
            />
            {selectedDayLabel && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📅 השיעור ביום <span className="font-bold">{selectedDayLabel}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ✨ התלמידים מהקבוצות שלומדות ביום זה יתווספו אוטומטית!
                </p>
              </div>
            )}
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
            <p className="text-xs text-gray-500">
              תמונה שתוצג בספריית השיעורים
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recorded-url" className="text-gray-700 font-medium">
              לינק לשיעור מוקלט
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

          <Button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg"
            disabled={!lessonData.lesson_name || !lessonData.category || !lessonData.lesson_date}
          >
            צור שיעור חדש ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}