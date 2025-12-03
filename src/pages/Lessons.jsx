
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ExternalLink, AlertCircle, Star, Play, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import LessonSurveyDialog from "../components/lessons/LessonSurveyDialog";
import LessonQuizDialog from "../components/lessons/LessonQuizDialog";
import VideoPlayerDialog from "../components/lessons/VideoPlayerDialog";

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [quizProgress, setQuizProgress] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]); // New state for quiz questions
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyLesson, setSurveyLesson] = useState(null);
  const [surveyParticipation, setSurveyParticipation] = useState(null);
  const [quizLesson, setQuizLesson] = useState(null);
  const [videoLesson, setVideoLesson] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Category icon mapping
  const getCategoryIcon = (category) => {
    const icons = {
      ai_tech: "🤖",
      personal_dev: "🌱",
      social_skills: "❤️",
      money_business: "💸"
    };
    return icons[category] || "📚";
  };

  const getGoogleDriveThumbnail = (url) => {
    if (!url) return null;
    
    console.log("Processing thumbnail URL:", url);
    
    // If it's already a thumbnail or direct link, return it
    if (url.includes('/thumbnail') || url.includes('/uc?')) {
      return url;
    }
    
    let fileId = null;
    
    // Try to extract FILE_ID from various Google Drive URL formats
    
    // Format: /file/d/FILE_ID/view or /file/d/FILE_ID/sharing or /file/d/FILE_ID/preview
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
      console.log("Extracted FILE_ID from /file/d/ format:", fileId);
    }
    
    // Format: /open?id=FILE_ID or ?id=FILE_ID
    if (!fileId) {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        fileId = idMatch[1];
        console.log("Extracted FILE_ID from ?id= format:", fileId);
      }
    }
    
    // If we found a file ID, convert to thumbnail URL
    if (fileId) {
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
      console.log("Generated thumbnail URL:", thumbnailUrl);
      return thumbnailUrl;
    }
    
    console.log("Could not extract FILE_ID, returning original URL");
    // If not a Google Drive link or couldn't extract ID, return original URL
    return url;
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const allLessons = await base44.entities.Lesson.list("-created_date");
      
      // Try to get participations
      let myParticipations = [];
      try {
        myParticipations = await base44.entities.LessonParticipation.filter(
          { student_email: user.email },
          "-lesson_date"
        );
        console.log("Loaded participations:", myParticipations);
      } catch (error) {
        console.error("Error loading participations:", error);
        // If there's an error, continue with empty participations
      }

      // Try to get quiz progress
      let myQuizProgress = [];
      try {
        myQuizProgress = await base44.entities.QuizProgress.filter(
          { student_email: user.email }
        );
        console.log("Loaded quiz progress:", myQuizProgress);
      } catch (error) {
        console.error("Error loading quiz progress:", error);
        // If there's an error, continue with empty quiz progress
      }

      // Load all quiz questions to check which lessons have quizzes
      let allQuizQuestions = [];
      try {
        allQuizQuestions = await base44.entities.QuizQuestion.list();
      } catch (error) {
        console.error("Error loading quiz questions:", error);
      }

      let myLessons;
      
      // Demo users see all lessons, regular students see only their assigned lessons
      if (user.user_type === "demo") {
        myLessons = allLessons;
        console.log("Demo user - showing all lessons:", allLessons.length);
      } else {
        // For regular students, show only lessons they're assigned to
        if (myParticipations.length === 0) {
          console.log("No participations found for user:", user.email);
          myLessons = [];
        } else {
          const participatedLessonIds = myParticipations.map(p => p.lesson_id);
          console.log("Participated lesson IDs:", participatedLessonIds);
          
          myLessons = allLessons.filter(lesson => 
            participatedLessonIds.includes(lesson.id)
          );
          console.log("Filtered lessons:", myLessons.length);

          // Sort by participation date for regular students
          myLessons.sort((a, b) => {
            const participationA = myParticipations.find(p => p.lesson_id === a.id);
            const participationB = myParticipations.find(p => p.lesson_id === b.id);
            
            if (!participationA || !participationB) return 0;
            
            return new Date(participationB.lesson_date) - new Date(participationA.lesson_date);
          });
        }
      }

      console.log("Final lessons to display:", myLessons.length);
      setLessons(myLessons);
      setParticipations(myParticipations);
      setQuizProgress(myQuizProgress);
      setQuizQuestions(allQuizQuestions);
    } catch (error) {
      console.error("Error in loadData:", error);
      toast.error("שגיאה בטעינת הנתונים");
    }
    
    setIsLoading(false);
  };

  const getParticipationForLesson = (lessonId) => {
    return participations.find(p => p.lesson_id === lessonId);
  };

  const getQuizProgressForLesson = (lessonId) => {
    return quizProgress.find(q => q.lesson_id === lessonId);
  };

  const hasQuizQuestions = (lessonId) => {
    return quizQuestions.some(q => q.lesson_id === lessonId);
  };

  const handleOpenSurvey = (lesson, participation) => {
    setSurveyLesson(lesson);
    setSurveyParticipation(participation);
  };

  const handleSubmitSurvey = async (ratings) => {
    if (!surveyParticipation || !surveyLesson || !currentUser) {
      toast.error("שגיאה במילוי הסקר. נסה שוב מאוחר יותר.");
      return;
    }

    try {
      await base44.entities.LessonParticipation.update(surveyParticipation.id, {
        survey_completed: true,
        survey_interest: ratings.interest,
        survey_fun: ratings.fun,
        survey_learned: ratings.learned,
        survey_difficulty: ratings.difficulty,
        survey_comments: ratings.comments || ""
      });

      // Give 20 XP bonus
      const userLevels = [
        { key: "ai_tech", level: currentUser.ai_tech_level || 1 },
        { key: "personal_dev", level: currentUser.personal_dev_level || 1 },
        { key: "social_skills", level: currentUser.social_skills_level || 1 },
        { key: "money_business", level: currentUser.money_business_level || 1 }
      ];
      
      const highestSkill = userLevels.reduce((max, skill) => 
        skill.level > max.level ? skill : max
      );

      const xpKey = `${highestSkill.key}_xp`;
      const levelKey = `${highestSkill.key}_level`;
      
      const currentXP = currentUser[xpKey] || 0;
      const currentLevel = currentUser[levelKey] || 1;
      
      const totalXP = (currentLevel - 1) * 100 + currentXP + 20;
      const newLevel = Math.floor(totalXP / 100) + 1;
      const newXP = totalXP % 100;
      
      await base44.auth.updateMe({
        [xpKey]: newXP,
        [levelKey]: newLevel
      });

      setSurveyLesson(null);
      setSurveyParticipation(null);
      toast.success("תודה על המשוב! קיבלת 20 נקודות! 🎉");
      loadData();
    } catch (error) {
      console.error("Failed to submit survey:", error);
      toast.error("שגיאה בעת שמירת הסקר. נסה שוב.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          📚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">ספריית השיעורים שלי 📚</h1>
        <p className="text-white/80 text-lg">
          סה"כ {lessons.length} שיעורים
        </p>
        {currentUser?.user_type === "demo" && (
          <p className="text-yellow-300 text-sm mt-2">
            🎮 משתמש דמו - כל השיעורים זמינים לצפייה
          </p>
        )}
      </motion.div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-bold text-white mb-2">טרם הועלה שיעור</h3>
          <p className="text-white/70 mb-6">המורה שלך יוסיף אותך לשיעורים בקרוב!</p>
          {currentUser?.email && (
            <p className="text-white/50 text-sm">
              המשתמש שלך: {currentUser.email}
            </p>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const participation = getParticipationForLesson(lesson.id);
            const quizProg = getQuizProgressForLesson(lesson.id);
            const wasAttended = participation?.attended !== false;
            const hasSurvey = participation?.survey_completed;
            const hasQuiz = quizProg?.completed;
            const watchedRecording = participation?.watched_recording || false;
            const hasQuestions = hasQuizQuestions(lesson.id); // Check if quiz questions exist for this lesson
            
            const isDemoWithoutParticipation = currentUser?.user_type === "demo" && !participation;
            
            // Can earn XP from watching if they missed the lesson and haven't watched it yet
            const canEarnXPFromWatching = participation && !wasAttended && !watchedRecording;
            
            const thumbnailUrl = getGoogleDriveThumbnail(lesson.thumbnail_url);
            
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <div className={`bg-white/10 backdrop-blur-md rounded-2xl border overflow-hidden hover:scale-[1.02] transition-all ${
                  isDemoWithoutParticipation 
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : wasAttended 
                      ? 'border-white/20 hover:bg-white/15' 
                      : 'border-orange-500/30 bg-orange-500/10'
                }`}>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
                    {thumbnailUrl && lesson.thumbnail_url ? (
                      <img 
                        src={thumbnailUrl} 
                        alt={lesson.lesson_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Failed to load image:", thumbnailUrl, "Original:", lesson.thumbnail_url);
                          e.target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log("Successfully loaded image:", thumbnailUrl);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-16 h-16 text-white/50" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {isDemoWithoutParticipation && (
                      <div className="absolute top-3 right-3 bg-yellow-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 font-bold">
                        🎮 דמו
                      </div>
                    )}
                    
                    {!isDemoWithoutParticipation && !wasAttended && (
                      <div className="absolute top-3 right-3 bg-orange-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        {watchedRecording ? "צפה במוקלט" : "לא נוכחת"}
                      </div>
                    )}

                    {/* XP Total Badge - Yellow only if can earn XP */}
                    {(() => {
                      const totalXP = 
                        (lesson.ai_tech_xp || 0) + 
                        (lesson.personal_dev_xp || 0) + 
                        (lesson.social_skills_xp || 0) + 
                        (lesson.money_business_xp || 0);
                      return totalXP > 0 && (
                        <div className={`absolute top-3 left-3 font-bold px-3 py-1 rounded-full text-sm shadow-lg ${
                          canEarnXPFromWatching 
                            ? "bg-gradient-to-br from-yellow-400 to-orange-400 text-white"
                            : "bg-white/20 text-white/90"
                        }`}>
                          +{totalXP} XP
                        </div>
                      );
                    })()}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 flex items-center gap-2">
                      <span className="text-2xl">{getCategoryIcon(lesson.category)}</span>
                      {lesson.lesson_name}
                    </h3>

                    {participation?.lesson_date && (
                      <p className="text-white/50 text-sm mb-3">
                        📅 {new Date(participation.lesson_date).toLocaleDateString("he-IL")}
                      </p>
                    )}

                    {/* XP Badges */}
                    <div className="flex gap-2 flex-wrap mb-4">
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

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Watch Button */}
                      {lesson.recorded_lesson_url && (
                        <Button
                          onClick={() => setVideoLesson(lesson)}
                          className={`w-full font-bold ${
                            canEarnXPFromWatching
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          }`}
                        >
                          <Play className="w-4 h-4 ml-2" />
                          {wasAttended && !isDemoWithoutParticipation ? "צפה בשיעור" : "צפה בהקלטה"}
                        </Button>
                      )}

                      {/* Quiz Button - only for attended lessons and only if there are questions */}
                      {(wasAttended || isDemoWithoutParticipation) && hasQuestions && (
                        <Button
                          onClick={() => setQuizLesson(lesson)}
                          className={`w-full font-bold flex items-center justify-between ${
                            hasQuiz 
                              ? "bg-green-500/20 border-2 border-green-500 text-green-200 hover:bg-green-500/30"
                              : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            {hasQuiz ? "חידות על השיעור" : "חידות על השיעור 🪙"}
                          </span>
                          {hasQuiz && (
                            <span className="flex items-center gap-1" dir="ltr">
                              {quizProg.score}/{quizProg.total_questions} תשובות נכונות ✓
                            </span>
                          )}
                        </Button>
                      )}

                      {/* Survey Button - only for attended lessons with participation */}
                      {wasAttended && participation && !hasSurvey && (
                        <Button
                          onClick={() => handleOpenSurvey(lesson, participation)}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold flex items-center justify-center"
                        >
                          <span className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            מלא סקר 🪙
                          </span>
                        </Button>
                      )}

                      {/* Survey Completed */}
                      {hasSurvey && (
                        <div className="bg-green-500/20 rounded-xl p-3 border-2 border-green-500 text-center">
                          <p className="text-green-200 text-sm font-medium flex items-center justify-center gap-2">
                            <span>✓</span>
                            <span>מילאת את הסקר - תודה!</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Video Player Dialog */}
      {videoLesson && (
        <VideoPlayerDialog
          isOpen={!!videoLesson}
          onClose={() => {
            setVideoLesson(null);
            loadData(); // Reload data to update watched_recording status
          }}
          lesson={videoLesson}
        />
      )}

      {/* Survey Dialog */}
      {surveyLesson && (
        <LessonSurveyDialog
          isOpen={!!surveyLesson}
          onClose={() => {
            setSurveyLesson(null);
            setSurveyParticipation(null);
          }}
          lesson={surveyLesson}
          onSubmit={handleSubmitSurvey}
        />
      )}

      {/* Quiz Dialog */}
      {quizLesson && (
        <LessonQuizDialog
          isOpen={!!quizLesson}
          onClose={() => setQuizLesson(null)}
          lesson={quizLesson}
          onComplete={loadData}
        />
      )}
    </div>
  );
}
