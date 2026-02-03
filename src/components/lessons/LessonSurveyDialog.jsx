import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function LessonSurveyDialog({ isOpen, onClose, lesson, onSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    interest: 0,
    fun: 0,
    learned: 0,
    difficulty: 0,
    comments: ""
  });

  const questions = [
    { key: "interest", label: "כמה השיעור עניין אותי", icon: "🎯" },
    { key: "fun", label: "כמה היה לי כיף", icon: "😄" },
    { key: "learned", label: "כמה למדתי", icon: "📚" },
    { key: "difficulty", label: "כמה קל היה להבין (1=לא הבנתי, 5=הבנתי הכל)", icon: "💡" }
  ];

  const handleStarClick = (key, value) => {
    setRatings({ ...ratings, [key]: value });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (ratings.interest && ratings.fun && ratings.learned && ratings.difficulty && ratings.comments.trim()) {
      setIsSubmitting(true);
      try {
        await onSubmit(ratings);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isComplete = ratings.interest && ratings.fun && ratings.learned && ratings.difficulty && ratings.comments.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            מה דעתך על השיעור? ⭐
          </DialogTitle>
          <p className="text-sm text-gray-600 text-center mt-2">
            {lesson?.lesson_name}
          </p>
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-3 rounded-lg mt-4">
            <p className="text-center font-bold text-orange-800 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              מלא את הסקר וקבל 70 מטבעות! 🎉
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questions.map((question) => (
            <div key={question.key} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{question.icon}</span>
                <p className="font-medium text-gray-800">{question.label}</p>
              </div>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <motion.button
                    key={value}
                    onClick={() => handleStarClick(question.key, value)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        value <= ratings[question.key]
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <p className="font-medium text-gray-800 flex items-center gap-2">
              <span>💬</span>
              הערות ומשוב (חובה)
            </p>
            <Textarea
              value={ratings.comments}
              onChange={(e) => setRatings({ ...ratings, comments: e.target.value })}
              placeholder="מה אהבת? מה אפשר לשפר?"
              className="border-2 border-purple-200 h-24"
            />
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
              disabled={!isComplete || isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
            >
              {isSubmitting ? "שולח..." : "שלח סקר וקבל 70 מטבעות! ⭐"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}