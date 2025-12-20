import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, X, Trophy, Coins, BookOpen, Star } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";

export default function Vocabulary() {
  const [userData, setUserData] = useState(null);
  const [wordProgress, setWordProgress] = useState([]);
  const [availableVocabWords, setAvailableVocabWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [nextWord, setNextWord] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setUserData(user);

      const progress = await base44.entities.WordProgress.filter({ student_email: user.email });
      setWordProgress(progress);

      // Load all vocabulary words from database
      const allVocabWords = await base44.entities.VocabularyWord.list();
      
      // בדוק אם צריך לבחור מילים חדשות להיום
      const today = new Date().toISOString().split('T')[0];
      let dailyWords = [];
      
      if (user.daily_vocabulary_date !== today || !user.daily_vocabulary_words || user.daily_vocabulary_words.length === 0) {
        // בחר 200 מילים רנדומליות להיום
        const shuffled = [...allVocabWords].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 200);
        dailyWords = selected.map(w => w.word_english);
        
        // שמור על המשתמש
        await base44.auth.updateMe({
          daily_vocabulary_date: today,
          daily_vocabulary_words: dailyWords
        });
      } else {
        dailyWords = user.daily_vocabulary_words;
      }
      
      // סנן רק למילים של היום
      const todaysVocabWords = allVocabWords.filter(w => dailyWords.includes(w.word_english));
      setAvailableVocabWords(todaysVocabWords);

      // Generate first word
      const firstWord = await generateNextWord(progress, todaysVocabWords);
      setCurrentWord(firstWord);
      
      // Preload next word
      const nextWordPreload = await generateNextWord(progress, todaysVocabWords, firstWord);
      setNextWord(nextWordPreload);

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error.response?.status === 404 || error.response?.status === 401) {
        await base44.auth.redirectToLogin();
      } else if (error.message === 'Network Error') {
        toast.error("בעיית תקשורת עם השרת. בודק חיבור לאינטרנט...");
        setTimeout(() => loadData(), 3000);
      } else {
        toast.error("שגיאה בטעינת הנתונים");
      }
      setIsLoading(false);
    }
  };

  const generateNextWord = async (currentProgress, vocabWords, excludeWord = null) => {
    // מילים שעדיין לא שלטתי בהן
    const masteredWords = currentProgress.filter(w => w.mastered).map(w => w.word_english.toLowerCase());

    // סנן רק מילים תקינות באנגלית (רק תווי a-z, מקף, רווח)
    const validWords = vocabWords.filter(w => {
      const word = w.word_english || '';
      return /^[a-zA-Z\s-]+$/.test(word) && !masteredWords.includes(word.toLowerCase());
    });

    if (validWords.length === 0) {
      return null; // סיימתי את כל המילים
    }

    // בחר מילה רנדומלית
    let randomWord = validWords[Math.floor(Math.random() * validWords.length)];

    // נסה לא להראות את אותה מילה פעמיים ברצף
    if (excludeWord && randomWord.word_english.toLowerCase() === excludeWord.english?.toLowerCase() && validWords.length > 1) {
      randomWord = validWords[Math.floor(Math.random() * validWords.length)];
    }

    const existingProgress = currentProgress.find(w => w.word_english.toLowerCase() === randomWord.word_english.toLowerCase());

    return {
      english: randomWord.word_english,
      hebrew: randomWord.word_hebrew,
      difficulty: randomWord.difficulty_level || 1,
      isReview: !!existingProgress,
      correctStreak: existingProgress?.correct_streak || 0
    };
  };

  const getCoinsForDifficulty = (difficulty) => {
    return difficulty * 3;
  };

  const calculateTotalCoinsForWord = (difficulty) => {
    const baseCoins = getCoinsForDifficulty(difficulty);
    const equippedMouth = userData?.equipped_items?.mouth;
    const mouthItem = equippedMouth ? AVATAR_ITEMS[equippedMouth] : null;
    const vocabBonus = mouthItem?.vocabBonus || 0;
    return baseCoins + vocabBonus;
  };

  const maxWords = availableVocabWords.length;
  const masteredWords = wordProgress.filter(w => w.mastered).length;
  const wordsInProgress = wordProgress.filter(w => !w.mastered && w.correct_streak === 0 && w.total_attempts > 0).length;
  const wordsWithOneCorrect = wordProgress.filter(w => !w.mastered && w.correct_streak === 1).length;
  const totalCoinsEarned = wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);

  const handleContinue = async () => {
    setUserAnswer("");
    setFeedback(null);
    
    if (nextWord) {
      setCurrentWord(nextWord);
      // Preload new next word
      const newNext = await generateNextWord(wordProgress, availableVocabWords, nextWord);
      setNextWord(newNext);
    } else {
      const next = await generateNextWord(wordProgress, availableVocabWords);
      setCurrentWord(next);
      const newNext = await generateNextWord(wordProgress, availableVocabWords, next);
      setNextWord(newNext);
    }
  };

  useEffect(() => {
    if (currentWord && !feedback) {
      const utterance = new SpeechSynthesisUtterance(currentWord.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentWord]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || isChecking) return;
    if (!currentWord) {
      toast.error("אין מילה ללמוד כרגע.");
      return;
    }

    setIsChecking(true);

    try {
      const normalizeText = (text) => text.trim().toLowerCase().replace(/[\s-]/g, '');
      
      const normalizedAnswer = normalizeText(userAnswer);
      // Split by comma, semicolon, or slash to get all possible translations
      const correctAnswers = currentWord.hebrew
        .split(/[,،;\/]/)
        .map(a => normalizeText(a))
        .filter(a => a.length > 0);
      
      const isCorrect = correctAnswers.some(correctAnswer =>
        normalizedAnswer === correctAnswer ||
        correctAnswer.includes(normalizedAnswer) ||
        normalizedAnswer.includes(correctAnswer)
      );

      const now = new Date().toISOString();
      const freshProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });

      const existingWordProg = freshProgress.find(w =>
        w.word_english.toLowerCase() === currentWord.english.toLowerCase()
      );

      if (existingWordProg) {
        const newStreak = isCorrect ? (existingWordProg.correct_streak + 1) : 0;
        const isMastered = newStreak >= 2;

        let coinsEarned = 0;
        let bonusBreakdown = [];
        if (isMastered && !existingWordProg.mastered) {
          const baseCoins = getCoinsForDifficulty(currentWord.difficulty);
          coinsEarned = baseCoins;
          bonusBreakdown.push({ type: 'base', amount: baseCoins, label: 'בסיס' });
          
          // Check for eyes and mouth bonus
          const purchasedItems = userData.purchased_items || [];
          const equippedItems = userData.equipped_items || {};
          const equippedEyes = equippedItems.eyes;
          const equippedMouth = equippedItems.mouth;
          
          if (equippedEyes && purchasedItems.includes(equippedEyes)) {
            const eyesItem = AVATAR_ITEMS[equippedEyes];
            if (eyesItem && eyesItem.wordBonus) {
              coinsEarned += eyesItem.wordBonus;
              bonusBreakdown.push({ type: 'eyes', amount: eyesItem.wordBonus, label: 'בונוס עיניים' });
            }
          }
          
          if (equippedMouth && purchasedItems.includes(equippedMouth)) {
            const mouthItem = AVATAR_ITEMS[equippedMouth];
            if (mouthItem && mouthItem.wordBonus) {
              coinsEarned += mouthItem.wordBonus;
              bonusBreakdown.push({ type: 'mouth', amount: mouthItem.wordBonus, label: 'בונוס פה' });
            }
          }
          
          // Check if user is vocab king using LeaderboardEntry (public access)
          const allLeaderboardEntries = await base44.entities.LeaderboardEntry.list();
          const allWordProgress = await base44.entities.WordProgress.list();
          
          let maxVocabEarnings = 0;
          let vocabKingEmail = null;
          
          allLeaderboardEntries.forEach(entry => {
            const userWords = allWordProgress.filter(w => w.student_email === entry.student_email);
            const earnings = userWords.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
            if (earnings > maxVocabEarnings) {
              maxVocabEarnings = earnings;
              vocabKingEmail = entry.student_email;
            }
          });
          
          if (vocabKingEmail === userData.email && maxVocabEarnings > 0) {
            coinsEarned += 5;
            bonusBreakdown.push({ type: 'king', amount: 5, label: 'בונוס מלך אנגלית' });
          }

          // הסר את המילה מהרשימה היומית
          const updatedDailyWords = (userData.daily_vocabulary_words || []).filter(
            w => w.toLowerCase() !== currentWord.english.toLowerCase()
          );

          // עדכן גם את המילים הזמינות
          const updatedAvailableWords = availableVocabWords.filter(
            w => w.word_english.toLowerCase() !== currentWord.english.toLowerCase()
          );
          setAvailableVocabWords(updatedAvailableWords);

          await base44.auth.updateMe({
            coins: (userData.coins || 0) + coinsEarned,
            daily_vocabulary_words: updatedDailyWords
          });
          setUserData(prev => ({ 
            ...prev, 
            coins: (prev.coins || 0) + coinsEarned,
            daily_vocabulary_words: updatedDailyWords
          }));

          // Update leaderboard
          try {
            const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
            if (leaderboardEntries.length > 0) {
              await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
                coins: (userData.coins || 0) + coinsEarned
              });
            }
          } catch (error) {
            console.error("Error updating leaderboard:", error);
          }
        }

        await base44.entities.WordProgress.update(existingWordProg.id, {
          correct_streak: newStreak,
          total_attempts: existingWordProg.total_attempts + 1,
          mastered: isMastered,
          last_seen: now,
          difficulty_level: currentWord.difficulty,
          coins_earned: (existingWordProg.coins_earned || 0) + coinsEarned
        });

        setFeedback({
          isCorrect,
          correctAnswer: currentWord.hebrew,
          coinsEarned: coinsEarned,
          bonusBreakdown: bonusBreakdown,
          mastered: isMastered,
          isDontKnow: false
        });
      } else {
        await base44.entities.WordProgress.create({
          student_email: userData.email,
          word_english: currentWord.english,
          word_hebrew: currentWord.hebrew,
          difficulty_level: currentWord.difficulty,
          correct_streak: isCorrect ? 1 : 0,
          total_attempts: 1,
          last_seen: now,
          mastered: false,
          coins_earned: 0
        });

        setFeedback({
          isCorrect,
          correctAnswer: currentWord.hebrew,
          coinsEarned: 0,
          mastered: false,
          isDontKnow: false
        });
      }

      const latestUserData = await base44.auth.me();
      setUserData(latestUserData);
      const latestProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });
      setWordProgress(latestProgress);

      // Auto-continue after delay
      setTimeout(() => {
        handleContinue();
      }, 500);

    } catch (error) {
      console.error("Error checking answer:", error);
      if (error.message === 'Network Error') {
        toast.error("בעיית תקשורת. נסה שוב בעוד רגע...");
      } else {
        toast.error("שגיאה בבדיקת התשובה");
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleDontKnow = async () => {
    if (!currentWord || isChecking) return;
    
    setIsChecking(true);

    try {
      const now = new Date().toISOString();
      const freshProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });
      const existingWordProg = freshProgress.find(w =>
        w.word_english.toLowerCase() === currentWord.english.toLowerCase()
      );

      if (existingWordProg) {
        await base44.entities.WordProgress.update(existingWordProg.id, {
          last_seen: now,
          difficulty_level: currentWord.difficulty
        });
      } else {
        await base44.entities.WordProgress.create({
          student_email: userData.email,
          word_english: currentWord.english,
          word_hebrew: currentWord.hebrew,
          difficulty_level: currentWord.difficulty,
          correct_streak: 0,
          total_attempts: 0,
          last_seen: now,
          mastered: false,
          coins_earned: 0
        });
      }

      setFeedback({
        isCorrect: false,
        correctAnswer: currentWord.hebrew,
        coinsEarned: 0,
        mastered: false,
        isDontKnow: true
      });

      const latestProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });
      setWordProgress(latestProgress);

    } catch (error) {
      console.error("Error handling don't know:", error);
      toast.error("שגיאה");
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading || !userData) {
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
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          אוצר מילים באנגלית 📚
        </h1>
        <p className="text-white/80 text-lg">
          למד מילים חדשות והרווח מטבעות!
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-8 h-8 text-blue-300 mx-auto mb-2" />
            <p className="text-2xl font-black text-white">{maxWords}</p>
            <p className="text-white/70 text-sm">מילים זמינות</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
            <p className="text-2xl font-black text-white">{masteredWords}</p>
            <p className="text-white/70 text-sm">שלטת בהן</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-black text-green-300 mb-2">✓</div>
            <p className="text-2xl font-black text-white">{wordsWithOneCorrect}</p>
            <p className="text-white/70 text-sm">נכון פעם אחת</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <Coins className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="text-2xl font-black text-white">{totalCoinsEarned}</p>
            <p className="text-white/70 text-sm">מטבעות צברת</p>
          </CardContent>
        </Card>
      </div>

      {/* Game Area */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
        <CardContent className="p-4 sm:p-8">
          {!currentWord ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-white text-xl font-bold mb-2">
                סיימת את כל המילים הזמינות!
              </p>
              <p className="text-white/70 text-base">
                כל המילים במאגר נלמדו! 📚
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWord.english}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="flex justify-center gap-2 sm:gap-3 mb-4 flex-wrap">
                  {currentWord.isReview && currentWord.correctStreak > 0 && (
                    <span className="bg-green-500/20 text-green-200 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-1">
                      <span className="font-bold">✓</span>
                      <span className="mr-1">עניתי נכון</span>
                    </span>
                  )}
                  <span className="bg-amber-500/20 text-amber-200 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    {getCoinsForDifficulty(currentWord.difficulty)} {currentWord.difficulty === 1 ? "מטבע" : "מטבעות"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6 sm:mb-8">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white break-words px-2" dir="ltr" translate="no" lang="en">
                    {currentWord.english}
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      const utterance = new SpeechSynthesisUtterance(currentWord.english);
                      utterance.lang = 'en-US';
                      utterance.rate = 0.8;
                      window.speechSynthesis.speak(utterance);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full"
                  >
                    🔊
                  </Button>
                </div>

                {!feedback ? (
                  <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                    <Input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="מה המילה בעברית?"
                      className="text-center text-xl py-6 bg-white border-2 border-purple-200 focus:border-purple-400 text-gray-900 placeholder:text-gray-400 mb-4"
                      disabled={isChecking}
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={handleDontKnow}
                        disabled={isChecking}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-6 text-lg flex-1"
                      >
                        🤷 לא יודע
                      </Button>
                      <Button
                        type="submit"
                        disabled={!userAnswer.trim() || isChecking}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg flex-1"
                      >
                        בדוק תשובה ✓
                      </Button>
                    </div>
                  </form>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="py-8"
                  >
                    {feedback.isCorrect ? (
                      <div>
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-16 h-16 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-green-300 mb-2">
                          נכון! 🎉
                        </h3>
                        <p className="text-white/70 mb-4">
                          {currentWord.english} = {feedback.correctAnswer}
                        </p>
                        {feedback.mastered && feedback.coinsEarned > 0 && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", duration: 0.6 }}
                            className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-4 px-8 rounded-2xl inline-block"
                          >
                            <div className="font-black text-2xl mb-2">
                              🎊 שלטת במילה! 🎊
                            </div>
                            {feedback.bonusBreakdown && feedback.bonusBreakdown.length > 0 && (
                              <div className="bg-white/20 rounded-lg p-3 text-sm space-y-1">
                                {feedback.bonusBreakdown.map((bonus, idx) => (
                                  <div key={idx} className="flex justify-between items-center">
                                    <span className="text-white/90">{bonus.label}:</span>
                                    <span className="font-bold">+{bonus.amount}</span>
                                  </div>
                                ))}
                                <div className="border-t border-white/30 pt-1 mt-2 flex justify-between items-center font-black text-lg">
                                  <span>סה"כ:</span>
                                  <span>+{feedback.coinsEarned} 🪙</span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className={`w-24 h-24 ${feedback.isDontKnow ? 'bg-orange-500' : 'bg-red-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                          {feedback.isDontKnow ? (
                            <span className="text-5xl">💭</span>
                          ) : (
                            <X className="w-16 h-16 text-white" />
                          )}
                        </div>
                        <h3 className={`text-3xl font-bold ${feedback.isDontKnow ? 'text-orange-300' : 'text-red-300'} mb-2`}>
                          {feedback.isDontKnow ? "התשובה הנכונה:" : "לא נכון 😅"}
                        </h3>
                        <p className="text-white text-xl mb-2 font-bold">
                          {feedback.correctAnswer.split(',').slice(0, 2).join(', ')}
                        </p>
                        {feedback.isDontKnow && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-6"
                          >
                            <Button
                              onClick={handleContinue}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 px-8 text-lg"
                            >
                              המשך למילה הבאה →
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Mastered Words List */}
      {masteredWords > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-300" />
              מילים ששלטת בהן ({masteredWords})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {wordProgress
                .filter(w => w.mastered)
                .map((word) => {
                  const vocabWord = availableVocabWords.find(v => v.word_english.toLowerCase() === word.word_english.toLowerCase());
                  const displayHebrew = vocabWord ? vocabWord.word_hebrew : (word.word_hebrew || word.word_english);
                  
                  return (
                    <div
                      key={word.id}
                      className="bg-white/5 rounded-lg p-3 border border-white/10 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 mb-2 text-green-300 text-xs">
                        <span className="font-bold">✓✓</span>
                      </div>
                      <p className="font-bold text-white" dir="ltr" translate="no" lang="en">{word.word_english}</p>
                      <p className="text-white/60 text-sm">{displayHebrew}</p>
                      <div className="flex items-center justify-center gap-1 mt-2 text-amber-300 text-xs">
                        <Coins className="w-3 h-3" />
                        <span>{word.coins_earned}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* One Correct Words List */}
      {wordsWithOneCorrect > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="text-2xl">✓</div>
              מילים שעניתי נכון פעם אחת ({wordsWithOneCorrect})
            </h3>
            <p className="text-white/70 text-sm mb-4">עוד תשובה נכונה אחת ותקבל מטבעות! 🎯</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {wordProgress
                .filter(w => !w.mastered && w.correct_streak === 1)
                .map((word) => {
                  const vocabWord = availableVocabWords.find(v => v.word_english.toLowerCase() === word.word_english.toLowerCase());
                  const displayHebrew = vocabWord ? vocabWord.word_hebrew : (word.word_hebrew || word.word_english);
                  
                  return (
                    <div
                      key={word.id}
                      className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 mb-2 text-blue-300 text-xs">
                        <span className="font-bold">✓</span>
                      </div>
                      <p className="font-bold text-white" dir="ltr" translate="no" lang="en">{word.word_english}</p>
                      <p className="text-white/60 text-sm">{displayHebrew}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress Words List */}
      {wordsInProgress > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="text-2xl">📝</div>
              מילים בתהליך ({wordsInProgress})
            </h3>
            <p className="text-white/70 text-sm mb-4">מילים שנסיתי אבל עדיין לא עניתי נכון</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {wordProgress
                .filter(w => !w.mastered && w.correct_streak === 0 && w.total_attempts > 0)
                .map((word) => {
                  const vocabWord = availableVocabWords.find(v => v.word_english.toLowerCase() === word.word_english.toLowerCase());
                  const displayHebrew = vocabWord ? vocabWord.word_hebrew : (word.word_hebrew || word.word_english);
                  
                  return (
                    <div
                      key={word.id}
                      className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30 text-center"
                    >
                      <div className="text-orange-300 text-xs mb-2">
                        {word.total_attempts} ניסיונות
                      </div>
                      <p className="font-bold text-white" dir="ltr" translate="no" lang="en">{word.word_english}</p>
                      <p className="text-white/60 text-sm">{displayHebrew}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}