import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Check, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LessonQuizDialog({ isOpen, onClose, lesson, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [existingProgress, setExistingProgress] = useState(null);

  useEffect(() => {
    if (isOpen && lesson) {
      loadQuestions();
    }
  }, [isOpen, lesson]);

  const loadQuestions = async () => {
    try {
      const user = await base44.auth.me();
      
      // Check if user attended this lesson (unless they're a demo user)
      if (user.user_type !== "demo") {
        const participationList = await base44.entities.LessonParticipation.filter({
          lesson_id: lesson.id,
          student_email: user.email
        });

        if (participationList.length === 0 || participationList[0].attended === false) {
          toast.error("רק תלמידים שנכחו בשיעור יכולים לענות על החידון");
          onClose();
          return;
        }
      }
      
      // Check if user already completed this quiz
      const progressList = await base44.entities.QuizProgress.filter({
        lesson_id: lesson.id,
        student_email: user.email
      });

      if (progressList.length > 0) {
        setExistingProgress(progressList[0]);
      }

      const quizQuestions = await base44.entities.QuizQuestion.filter(
        { lesson_id: lesson.id },
        "order"
      );
      
      if (quizQuestions.length === 0) {
        toast.error("אין שאלות לחידון זה עדיין");
        onClose();
        return;
      }

      setQuestions(quizQuestions);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading quiz questions:", error);
      toast.error("שגיאה בטעינת שאלות החידון");
      onClose();
    }
  };

  const handleAnswerClick = (answer) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    if (answer === currentQuestion.correct_answer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    try {
      const user = await base44.auth.me();
      
      const finalScore = score;
      const coinsEarned = finalScore * 10; // Coins *potentially* earned for this attempt
      
      // Calculate coins to add: only add if improved or first time
      const coinsToAdd = existingProgress 
        ? Math.max(0, coinsEarned - (existingProgress.coins_earned || 0))
        : coinsEarned;

      // Update or create quiz progress
      if (existingProgress) {
        // If current score is better or equal, update. Otherwise, only update if it's the current session's final score for a previous best.
        // The logic for existingProgress ensures we only save the best score if it's higher.
        // However, here we want to update the latest attempt's score.
        // For coins, we only grant new coins for improvement.
        await base44.entities.QuizProgress.update(existingProgress.id, {
          score: finalScore,
          total_questions: questions.length,
          completed: true,
          // Only update coins_earned if current attempt's coins are higher
          coins_earned: Math.max(existingProgress.coins_earned || 0, coinsEarned)
        });
      } else {
        await base44.entities.QuizProgress.create({
          lesson_id: lesson.id,
          student_email: user.email,
          score: finalScore,
          total_questions: questions.length,
          completed: true,
          coins_earned: coinsEarned
        });
      }

      // Give coins to user only if there are new coins to add
      if (coinsToAdd > 0) {
        await base44.auth.updateMe({
          coins: (user.coins || 0) + coinsToAdd
        });
      }

      setQuizCompleted(true);
      
      if (coinsToAdd > 0) {
        toast.success(`קיבלת ${coinsToAdd} מטבעות! 🎉`);
      } else {
        toast.success(`סיימת את החידון! ציון: ${finalScore}/${questions.length}`);
      }
      
      onComplete(); // Notify parent component that quiz is completed
    } catch (error) {
      console.error("Error saving quiz progress:", error);
      toast.error("שגיאה בשמירת תוצאות החידון");
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    // Optionally re-fetch questions if they could change, but for now assuming static.
    // Also, existingProgress state is kept so previous score can still be shown.
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-4xl">⏳</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    const prevBestScore = existingProgress ? existingProgress.score : 0;
    const isImprovement = existingProgress && score > prevBestScore;
    const coinsEarnedThisAttempt = score * 10;
    const previousMaxCoins = existingProgress ? (existingProgress.coins_earned || 0) : 0;
    const newCoinsAwarded = Math.max(0, coinsEarnedThisAttempt - previousMaxCoins);
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
              סיימת את החידון! 🎉
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-20 h-20 text-white" />
              </div>
            </motion.div>

            <h3 className="text-3xl font-black text-gray-800 mb-2" dir="ltr">
              {score}/{questions.length}
            </h3>
            <p className="text-xl text-gray-600 mb-6">
              {percentage}% נכון!
            </p>

            {existingProgress && (
              <p className="text-lg text-gray-700 mb-4" dir="ltr">
                ציון קודם: {prevBestScore}/{questions.length}
              </p>
            )}

            {isImprovement && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 mb-4">
                <p className="text-lg font-bold text-green-800">
                  🎊 שיפרת את הציון! (+{score - prevBestScore})
                </p>
              </div>
            )}

            {newCoinsAwarded > 0 && (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 mb-6">
                <p className="text-lg font-bold text-orange-800">
                  🪙 קיבלת {newCoinsAwarded} מטבעות!
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <Button
                onClick={handleRestart}
                variant="outline"
                className="flex-1 border-2 border-purple-400 text-purple-600 hover:bg-purple-50"
              >
                נסה שוב 🔄
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-8"
              >
                סגור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const options = [
    { letter: 'A', text: currentQuestion.option_a },
    { letter: 'B', text: currentQuestion.option_b },
    { letter: 'C', text: currentQuestion.option_c },
    { letter: 'D', text: currentQuestion.option_d }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center">
            חידון: {lesson.lesson_name}
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            שאלה {currentQuestionIndex + 1} מתוך {questions.length}
          </p>
          {existingProgress && (
            <p className="text-center text-sm text-blue-600 mt-1">
              ניסיון קודם: {existingProgress.score}/{existingProgress.total_questions}
            </p>
          )}
        </DialogHeader>

        <div className="py-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
            <p className="text-xl font-bold text-gray-800 leading-relaxed text-right">
              {currentQuestion.question}
            </p>
          </div>

          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.letter;
              const isCorrect = option.letter === currentQuestion.correct_answer;
              const showResult = isAnswered;

              let buttonClass = "w-full p-4 text-right border-2 rounded-xl font-medium transition-all ";
              
              if (!showResult) {
                buttonClass += "border-gray-300 hover:border-purple-400 hover:bg-purple-50 bg-white";
              } else if (isCorrect) {
                buttonClass += "border-green-500 bg-green-100 text-green-800";
              } else if (isSelected && !isCorrect) {
                buttonClass += "border-red-500 bg-red-100 text-red-800";
              } else {
                buttonClass += "border-gray-300 bg-gray-50 text-gray-600";
              }

              return (
                <motion.button
                  key={option.letter}
                  onClick={() => handleAnswerClick(option.letter)}
                  disabled={isAnswered}
                  className={buttonClass}
                  whileHover={!isAnswered ? { scale: 1.02 } : {}}
                  whileTap={!isAnswered ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg text-right flex-1">{option.text}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {showResult && isCorrect && (
                        <Check className="w-6 h-6 text-green-600" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <X className="w-6 h-6 text-red-600" />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        showResult && isCorrect
                          ? "bg-green-500 text-white"
                          : showResult && isSelected && !isCorrect
                          ? "bg-red-500 text-white"
                          : "bg-purple-200 text-purple-700"
                      }`}>
                        {option.letter}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg"
              >
                {currentQuestionIndex < questions.length - 1 ? "שאלה הבאה ←" : "סיים חידון 🎉"}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}