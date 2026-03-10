import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ExternalLink, AlertCircle, Star, Play, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { safeRequest } from "../components/utils/base44SafeRequest";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";

import LessonSurveyDialog from "../components/lessons/LessonSurveyDialog";
import LessonQuizDialog from "../components/lessons/LessonQuizDialog";
import VideoPlayerDialog from "../components/lessons/VideoPlayerDialog";
import NextLessonTimer from "../components/home/NextLessonTimer";

export default function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [quizProgress, setQuizProgress] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyLesson, setSurveyLesson] = useState(null);
  const [surveyParticipation, setSurveyParticipation] = useState(null);
  const [quizLesson, setQuizLesson] = useState(null);
  const [videoLesson, setVideoLesson] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);

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
    
    let fileId = null;
    
    // Try to extract FILE_ID from various Google Drive URL formats
    
    // Format: /file/d/FILE_ID/view or /file/d/FILE_ID/sharing or /file/d/FILE_ID/preview
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    
    // Format: /open?id=FILE_ID or ?id=FILE_ID
    if (!fileId) {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        fileId = idMatch[1];
      }
    }
    
    // Format: /thumbnail?id=FILE_ID
    if (!fileId) {
      const thumbMatch = url.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
      if (thumbMatch) {
        fileId = thumbMatch[1];
      }
    }
    
    // Format: /uc?id=FILE_ID
    if (!fileId) {
      const ucMatch = url.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
      if (ucMatch) {
        fileId = ucMatch[1];
      }
    }
    
    // If we found a file ID, use thumbnail format with size parameter
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
    
    // If not a Google Drive link or couldn't extract ID, return original URL
    return url;
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Use cache for all API calls to reduce rate limit hits
      const [myParticipations, myQuizProgress, allGroups] = await Promise.all([
        safeRequest(
          () => base44.entities.LessonParticipation.filter({ student_email: user.email }, "-lesson_date"),
          { key: `LP:${user.email}`, ttlMs: 30000, retries: 1 }
        ).catch(() => []),
        
        safeRequest(
          () => base44.entities.QuizProgress.filter({ student_email: user.email }),
          { key: `QP:${user.email}`, ttlMs: 30000, retries: 1 }
        ).catch(() => []),
        
        safeRequest(
          () => base44.entities.Group.list(),
          { key: 'Groups:all', ttlMs: 60000, retries: 1 }
        ).catch(() => [])
      ]);

      let myLessons = [];
      
      // Only load lessons if user has participations
      if (myParticipations.length > 0) {
        const participatedLessonIds = myParticipations.map(p => p.lesson_id);
        
        // Load only the specific lessons this user participated in
        const lessonPromises = participatedLessonIds.map(lessonId =>
          safeRequest(
            () => base44.entities.Lesson.get(lessonId),
            { key: `Lesson:${lessonId}`, ttlMs: 120000, retries: 1 }
          ).catch(() => null)
        );
        
        const loadedLessons = await Promise.all(lessonPromises);
        myLessons = loadedLessons.filter(l => l !== null);

        // Sort by participation date
        myLessons.sort((a, b) => {
          const participationA = myParticipations.find(p => p.lesson_id === a.id);
          const participationB = myParticipations.find(p => p.lesson_id === b.id);
          
          if (!participationA || !participationB) return 0;
          
          return new Date(participationB.lesson_date) - new Date(participationA.lesson_date);
        });
      }

      setLessons(myLessons);
      setParticipations(myParticipations);
      setQuizProgress(myQuizProgress);

      // Load group and next lesson
      const myGroup = allGroups.find(g => g.student_emails?.includes(user.email));
      setUserGroup(myGroup || null);

      if (myGroup?.next_lesson_id) {
        const nextLessonData = await safeRequest(
          () => base44.entities.Lesson.get(myGroup.next_lesson_id),
          { key: `Lesson:${myGroup.next_lesson_id}`, ttlMs: 120000, retries: 1 }
        ).catch(() => null);
        setNextLesson(nextLessonData);
      } else {
        setNextLesson(null);
      }
    } catch (error) {
      console.error("Error in loadData:", error);
      toast.error("שגיאה בטעינת הנתונים");
    }
    
    setIsLoading(false);
  };

  const participationMap = useMemo(() => {
    const m = new Map();
    participations.forEach(p => m.set(p.lesson_id, p));
    return m;
  }, [participations]);

  const quizProgressMap = useMemo(() => {
    const m = new Map();
    quizProgress.forEach(q => m.set(q.lesson_id, q));
    return m;
  }, [quizProgress]);

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

      // Give 70 coins for completing survey
      const currentCoins = currentUser.coins || 0;
      const surveyReward = 70;
      const newCoins = currentCoins + surveyReward;
      
      // Calculate net worth using pre-calculated investments_value
      const investmentsValue = currentUser.investments_value || 0;
      
      const { AVATAR_ITEMS } = await import("../components/avatar/TamagotchiAvatar");
      const purchasedItems = currentUser.purchased_items || [];
      let itemsValue = 0;
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item) itemsValue += item.price || 0;
      });
      
      const totalNetworth = newCoins + itemsValue + investmentsValue;
      
      // Log coin change
      try {
        const { logCoinChange } = await import("../components/utils/coinLogger");
        await logCoinChange(currentUser.email, currentCoins, newCoins, "מילוי סקר שיעור", {
          source: 'Lessons',
          lesson_id: surveyLesson.id,
          lesson_name: surveyLesson.lesson_name
        });
      } catch (logError) {
        console.error("Error logging survey coins:", logError);
      }
      
      await base44.auth.updateMe({
        coins: newCoins,
        total_networth: totalNetworth
      });

      // Sync to leaderboard
      try {
        await syncLeaderboardEntry({...currentUser, coins: newCoins, total_networth: totalNetworth}, {
          investments_value: investmentsValue,
          items_value: itemsValue
        });
      } catch (error) {
        console.error("Error syncing leaderboard:", error);
      }

      // Update current user state
      setCurrentUser({...currentUser, coins: newCoins, total_networth: totalNetworth});

      setSurveyLesson(null);
      setSurveyParticipation(null);
      toast.success("תודה על המשוב! קיבלת 70 סטארטקוין! 🎉");
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
      {/* Next Lesson Timer */}
      {userGroup && (
        <NextLessonTimer group={userGroup} lesson={nextLesson} />
      )}

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
            const participation = participationMap.get(lesson.id);
            const quizProg = quizProgressMap.get(lesson.id);
            const wasAttended = participation?.attended !== false;
            const hasSurvey = participation?.survey_completed;
            const hasQuiz = quizProg?.completed;
            const watchedRecording = participation?.watched_recording || false;
            
            const isDemoWithoutParticipation = currentUser?.user_type === "demo" && !participation;
            
            // Can earn XP from watching if they missed the lesson and haven't watched it yet
            const canEarnXPFromWatching = participation && !wasAttended && !watchedRecording;
            
            const thumbnailUrl = getGoogleDriveThumbnail(lesson.thumbnail_url);
            
            return (
              <div
                key={lesson.id}
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
                        loading="lazy"
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

                      {/* Quiz Button */}
                      <Button
                        onClick={() => setQuizLesson(lesson)}
                        className={`w-full font-bold flex items-center justify-center ${
                          hasQuiz 
                            ? "bg-green-500/20 border-2 border-green-500 text-green-200 hover:bg-green-500/30"
                            : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          {hasQuiz ? `חידות על השיעור (${quizProg.score}/${quizProg.total_questions} ✓)` : "חידות על השיעור 🪙"}
                        </span>
                      </Button>

                      {/* Survey Button - always available if has participation */}
                      {participation && !hasSurvey && (
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
              </div>
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