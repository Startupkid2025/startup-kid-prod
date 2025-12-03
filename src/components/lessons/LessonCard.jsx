import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function LessonCard({ lesson, onClick }) {
  const totalXP = 
    (lesson.ai_tech_xp || 0) + 
    (lesson.personal_dev_xp || 0) + 
    (lesson.social_skills_xp || 0) + 
    (lesson.money_business_xp || 0);

  // Format date safely
  const formattedDate = lesson.lesson_date 
    ? format(new Date(lesson.lesson_date), "d MMMM yyyy", { locale: he })
    : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card 
        className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-yellow-300" />
                <h3 className="text-lg font-bold text-white">{lesson.lesson_name}</h3>
              </div>
              
              {formattedDate && (
                <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
              )}

              {lesson.description && (
                <p className="text-white/60 text-sm mt-2">{lesson.description}</p>
              )}

              {lesson.notes && (
                <p className="text-white/60 text-sm mt-2">{lesson.notes}</p>
              )}

              {totalXP > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {lesson.ai_tech_xp > 0 && (
                    <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full">
                      🤖 +{lesson.ai_tech_xp}
                    </span>
                  )}
                  {lesson.personal_dev_xp > 0 && (
                    <span className="text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded-full">
                      🌱 +{lesson.personal_dev_xp}
                    </span>
                  )}
                  {lesson.social_skills_xp > 0 && (
                    <span className="text-xs bg-pink-500/30 text-pink-200 px-2 py-1 rounded-full">
                      ❤️ +{lesson.social_skills_xp}
                    </span>
                  )}
                  {lesson.money_business_xp > 0 && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded-full">
                      💸 +{lesson.money_business_xp}
                    </span>
                  )}
                </div>
              )}
            </div>

            {totalXP > 0 && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 text-white font-bold px-3 py-2 rounded-full text-sm">
                +{totalXP} XP
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}