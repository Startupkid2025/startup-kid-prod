import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, X, Trophy, Coins, BookOpen, Star, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";

// קבועים
const DAILY_WORDS_COUNT = 75;
const RESET_HOUR = 0;
const VOCAB_SCHEME_VERSION = 4;

// פונקציות עזר לתאריך לוקאלי
const pad2 = (n) => String(n).padStart(2, '0');

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

// מחזיר את מפתח היום לפי שעה 08:00
const getVocabDayKey = (now) => {
  const hours = now.getHours();
  if (hours < RESET_HOUR) {
    // לפני 08:00 - זה עדיין "אתמול"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatLocalDate(yesterday);
  }
  return formatLocalDate(now);
};

// מחזיר את הזמן הבא של 08:00
const getNextResetAt = (now) => {
  const next = new Date(now);
  next.setHours(RESET_HOUR, 0, 0, 0);
  
  if (now >= next) {
    // אם כבר עברנו את 08:00 היום, הבא הוא מחר
    next.setDate(next.getDate() + 1);
  }
  
  return next;
};

// ערבוב מערך
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// בחירה רנדומלית ייחודית
const pickRandomUnique = (arr, count) => {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(count, arr.length));
};

// נורמליזציה של מילה באנגלית
const normalizeEnglish = (s) => (s || '').trim().toLowerCase();

// מחזיר רשימת מילים ייחודיות לפי word_english (ללא כפילויות)
const uniqueVocabByEnglish = (allVocabWords) => {
  const map = new Map();
  allVocabWords.forEach(word => {
    const key = normalizeEnglish(word.word_english);
    if (key && !map.has(key)) {
      map.set(key, word);
    }
  });
  return Array.from(map.values());
};

// בונה רשימת המילים של היום מתוך dailyWords (עד 150), תוך שימוש ב-Map למניעת כפילויות
const buildTodaysVocabWords = (allVocabWords, dailyWords) => {
  // בנה Map: normalized_english -> VocabularyWordRow
  const vocabMap = new Map();
  allVocabWords.forEach(word => {
    const key = normalizeEnglish(word.word_english);
    if (key && !vocabMap.has(key)) {
      vocabMap.set(key, word);
    }
  });
  
  // הרכב רשימה לפי dailyWords (עד 150)
  const result = [];
  const limit = Math.min(dailyWords.length, DAILY_WORDS_COUNT);
  
  for (let i = 0; i < limit; i++) {
    const key = normalizeEnglish(dailyWords[i]);
    const word = vocabMap.get(key);
    if (word) {
      result.push(word);
    }
  }
  
  return result;
};

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
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [masteredPage, setMasteredPage] = useState(1);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [multiChoiceOptions, setMultiChoiceOptions] = useState(null);
  
  const resetInProgressRef = useRef(false);
  const lastResetAttemptRef = useRef(0);

  const MASTERED_PER_PAGE = 9;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextReset = getNextResetAt(now);
      
      const diff = nextReset - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilReset(`${hours}:${pad2(minutes)}:${pad2(seconds)}`);
      
      // בדוק אם צריך רענון אוטומטי
      if (userData) {
        const expectedDayKey = getVocabDayKey(now);
        if (userData.daily_vocabulary_date !== expectedDayKey) {
          // הגיע זמן רענון!
          const timeSinceLastAttempt = Date.now() - lastResetAttemptRef.current;
          if (!resetInProgressRef.current && timeSinceLastAttempt > 30000) {
            lastResetAttemptRef.current = Date.now();
            resetInProgressRef.current = true;
            loadData({ silent: true }).finally(() => {
              resetInProgressRef.current = false;
            });
          }
        }
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [userData]);

  const loadData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const user = await base44.auth.me();
      const [progress, allVocabWords] = await Promise.all([
        base44.entities.WordProgress.filter({ student_email: user.email }),
        base44.entities.VocabularyWord.list(),
      ]);

      const now = new Date();
      const expectedDayKey = getVocabDayKey(now);

      // בדוק אם זו מיגרציה (משתמש ישן על מנגנון חצות)
      const currentVersion = user.daily_vocabulary_scheme_version || 1;
      let forceResetToday = false;

      if (currentVersion < VOCAB_SCHEME_VERSION) {
        // משתמש על מנגנון ישן
        const currentHour = now.getHours();

        if (currentHour >= RESET_HOUR) {
          // אחרי 08:00 - כפה רענון כדי לעבור למנגנון חדש
          forceResetToday = true;
        } else {
          // לפני 08:00 - תקן את התאריך בלי לשנות רשימה (כדי שלא יישבר הלילה)
          if (user.daily_vocabulary_date && user.daily_vocabulary_words?.length > 0) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = formatLocalDate(yesterday);

            await base44.auth.updateMe({
              daily_vocabulary_date: yesterdayKey,
              daily_vocabulary_scheme_version: VOCAB_SCHEME_VERSION
            });
          } else {
            forceResetToday = true;
          }
        }
      }

      // בדוק אם צריך סט חדש
      const needsNewSet = 
        forceResetToday ||
        user.daily_vocabulary_date !== expectedDayKey ||
        !user.daily_vocabulary_words ||
        user.daily_vocabulary_words.length === 0;

      let dailyWords = [];
      let updatedUser = user;

      if (needsNewSet) {
        // סנן מילים תקינות באנגלית בלבד + הסר כפילויות
        const validWords = allVocabWords.filter(w => {
          const word = w.word_english || '';
          return /^[a-zA-Z\s-]+$/.test(word);
        });

        const uniqueWords = uniqueVocabByEnglish(validWords);

        // העדף מילים שעדיין לא mastered
        const masteredWords = progress.filter(w => w.mastered).map(w => normalizeEnglish(w.word_english));
        const unmasteredWords = uniqueWords.filter(w => !masteredWords.includes(normalizeEnglish(w.word_english)));

        // בחר 150 מילים ייחודיות
        let candidates = unmasteredWords.length >= DAILY_WORDS_COUNT 
          ? unmasteredWords 
          : uniqueWords; // אם אין מספיק לא-mastered, קח הכל

        const selected = pickRandomUnique(candidates, DAILY_WORDS_COUNT);
        dailyWords = selected.map(w => w.word_english);

        // שמור למשתמש
        await base44.auth.updateMe({
          daily_vocabulary_date: expectedDayKey,
          daily_vocabulary_words: dailyWords,
          daily_vocabulary_scheme_version: VOCAB_SCHEME_VERSION
        });

        updatedUser = await base44.auth.me();
        setUserData(updatedUser);

        if (silent) {
          toast.success("🎉 המילים התחדשו! מילים חדשות זמינות ללמידה");
        }
      } else {
        dailyWords = user.daily_vocabulary_words || [];
        setUserData(user);
      }

      // טען את המילים של היום (ללא כפילויות) - 75 מילים קבועות ליום
      const todaysVocabWords = buildTodaysVocabWords(allVocabWords, dailyWords);
      setAvailableVocabWords(todaysVocabWords);
      setWordProgress(progress);

      // Generate first word
      const firstWord = generateNextWord(progress, todaysVocabWords);
      setCurrentWord(firstWord);
      // אם זו מילה ראשונה - הכן multi-choice
      if (firstWord?.isFirstTime) {
        setMultiChoiceOptions(generateMultiChoiceOptions(firstWord, todaysVocabWords));
      } else {
        setMultiChoiceOptions(null);
      }

      // Preload next word
      const nextWordPreload = generateNextWord(progress, todaysVocabWords, firstWord);
      setNextWord(nextWordPreload);
      // אין צורך לאפס multiChoiceOptions כאן - כבר טופל למעלה

      if (!silent) {
        setIsLoading(false);
      }
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
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const generateNextWord = (currentProgress, vocabWords, excludeWord = null) => {
    // מילים ששלטתי בהן - mastered או correct_streak >= 2
    const completedWords = currentProgress
      .filter(w => w.mastered || w.correct_streak >= 2)
      .map(w => w.word_english.toLowerCase());

    // בנה Set של המילים המותרות (75 המילים של היום) לאימות מהיר
    const allowedWords = new Set(vocabWords.map(w => (w.word_english || '').toLowerCase()));

    // סנן רק מילים תקינות באנגלית (רק תווי a-z, מקף, רווח) שנמצאות ב-75 של היום
    const validWords = vocabWords.filter(w => {
      const word = w.word_english || '';
      return /^[a-zA-Z\s-]+$/.test(word) && !completedWords.includes(word.toLowerCase());
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
    // isFirstTime = מילה שלא נכונה עדיין אפילו פעם אחת (correct_streak === 0 ולא היה ניסיון נכון)
    // מילה שנכשלה (total_attempts > 0, correct_streak === 0) → עדיין multi-choice
    // מילה שנכונה פעם אחת (correct_streak === 1) → text input
    const isFirstTime = !existingProgress || existingProgress.correct_streak === 0;

    return {
      english: randomWord.word_english,
      hebrew: randomWord.word_hebrew,
      difficulty: randomWord.difficulty_level || 1,
      isReview: !!existingProgress,
      correctStreak: existingProgress?.correct_streak || 0,
      isFirstTime
    };
  };

  // מייצר 4 אפשרויות בחירה (multiple choice) מתוך רשימת המילים הזמינות
  const generateMultiChoiceOptions = (correctWord, vocabWords) => {
    const correct = correctWord.hebrew.split(/[,،;\/]/)[0].trim(); // ניקח רק פירוש ראשון
    // אסוף מילים שונות לאפשרויות
    const others = vocabWords.filter(w =>
      w.word_english.toLowerCase() !== correctWord.english.toLowerCase() &&
      w.word_hebrew && w.word_hebrew.trim().length > 0
    );
    const shuffledOthers = shuffle(others).slice(0, 3);
    const wrongOptions = shuffledOthers.map(w => w.word_hebrew.split(/[,،;\/]/)[0].trim());
    const options = shuffle([correct, ...wrongOptions]);
    return { options, correct };
  };

  const getCoinsForDifficulty = (difficulty) => {
    const coins = { 1: 6, 2: 9, 3: 12 };
    return coins[difficulty] || 6;
  };

  const calculateTotalCoinsForWord = (difficulty) => {
    const baseCoins = getCoinsForDifficulty(difficulty);
    const equippedMouth = userData?.equipped_items?.mouth;
    const mouthItem = equippedMouth ? AVATAR_ITEMS[equippedMouth] : null;
    const vocabBonus = mouthItem?.vocabBonus || 0;
    return baseCoins + vocabBonus;
  };

  const wordsOneCorrectToday = wordProgress.filter(w => 
    w.correct_streak === 1 && 
    availableVocabWords.some(v => v.word_english.toLowerCase() === w.word_english.toLowerCase())
  ).length;
  const completedTodayCount = wordProgress.filter(w => 
    (w.mastered || w.correct_streak >= 2) && 
    availableVocabWords.some(v => v.word_english.toLowerCase() === w.word_english.toLowerCase())
  ).length;
  const maxWords = availableVocabWords.length;
  const masteredWords = wordProgress.filter(w => w.mastered).length;
  const wordsInProgress = wordProgress.filter(w => !w.mastered && w.correct_streak === 0 && w.total_attempts > 0).length;
  const wordsWithOneCorrect = wordProgress.filter(w => !w.mastered && w.correct_streak === 1).length;
  const totalCoinsEarned = wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);

  const handleContinue = async (freshProgress = null) => {
    setUserAnswer("");
    setFeedback(null);
    
    const progressToUse = Array.isArray(freshProgress) ? freshProgress : wordProgress;
    
    let next;
    // ודא שה-nextWord אכן שייך לרשימת 75 המילים של היום
    const nextWordIsValid = nextWord && availableVocabWords.some(
      w => w.word_english.toLowerCase() === nextWord.english?.toLowerCase()
    );

    if (nextWordIsValid) {
      // Recalculate isFirstTime using fresh progress (nextWord may have stale isFirstTime)
      const existingProg = progressToUse.find(w => w.word_english.toLowerCase() === nextWord.english?.toLowerCase());
      const freshIsFirstTime = !existingProg || existingProg.correct_streak === 0;
      next = { ...nextWord, isFirstTime: freshIsFirstTime };
      setCurrentWord(next);
      const newNext = generateNextWord(progressToUse, availableVocabWords, nextWord);
      setNextWord(newNext);
    } else {
      next = generateNextWord(progressToUse, availableVocabWords);
      setCurrentWord(next);
      const newNext = generateNextWord(progressToUse, availableVocabWords, next);
      setNextWord(newNext);
    }
    
    if (next?.isFirstTime) {
      setMultiChoiceOptions(generateMultiChoiceOptions(next, availableVocabWords));
    } else {
      setMultiChoiceOptions(null);
    }
  };

  const resetMultiChoice = () => setMultiChoiceOptions(null);

  useEffect(() => {
    if (currentWord && !feedback) {
      const utterance = new SpeechSynthesisUtterance(currentWord.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentWord]);

  // Play cheerful sound effect when correct answer
  useEffect(() => {
    if (feedback?.isCorrect) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Cheerful ascending notes (C5 -> E5 -> G5)
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
        
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        console.log('Audio not supported');
      }
    }
  }, [feedback]);

  const handleSubmitWithAnswer = async (answer) => {
    setUserAnswer(answer);
    await handleSubmitCore(answer);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || isChecking) return;
    await handleSubmitCore(userAnswer);
  };

  const handleSubmitCore = async (answerToCheck) => {
    if (!answerToCheck?.trim() || isChecking) return;
    if (!currentWord) {
      toast.error("אין מילה ללמוד כרגע.");
      return;
    }

    setIsChecking(true);

    try {
      const normalizeText = (text) => text.trim().toLowerCase().replace(/[\s-]/g, '');
      
      const normalizedAnswer = normalizeText(answerToCheck);
      // Split by comma, semicolon, or slash to get all possible translations
      const correctAnswers = currentWord.hebrew
        .split(/[,،;\/]/)
        .map(a => normalizeText(a))
        .filter(a => a.length > 0);
      
      const isCorrect = correctAnswers.some(correctAnswer =>
        normalizedAnswer === correctAnswer
      );

      const now = new Date().toISOString();
      const freshProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });

      const existingWordProg = freshProgress.find(w =>
        w.word_english.toLowerCase() === currentWord.english.toLowerCase()
      );

      if (existingWordProg) {
        const newStreak = isCorrect ? (existingWordProg.correct_streak + 1) : 0;
        const isMastered = newStreak >= 2;
        const isFirstCorrect = newStreak === 1 && existingWordProg.correct_streak === 0;

        let coinsEarned = 0;
        let bonusBreakdown = [];
        
        // Award 2 coins for first correct answer
        if (isFirstCorrect && isCorrect) {
          coinsEarned = 2;
          bonusBreakdown.push({ type: 'first', amount: 2, label: 'תשובה נכונה ראשונה' });
        }
        
        // Award full coins for mastering
        if (isMastered && !existingWordProg.mastered) {
          const baseCoins = getCoinsForDifficulty(currentWord.difficulty);
          coinsEarned = baseCoins;
          bonusBreakdown = [{ type: 'base', amount: baseCoins, label: 'בסיס' }];
          
          // Check for eyes and mouth bonus
          const equippedItems = userData.equipped_items || {};
          const equippedEyes = equippedItems.eyes;
          const equippedMouth = equippedItems.mouth;
          
          if (equippedEyes) {
            const eyesItem = AVATAR_ITEMS[equippedEyes];
            if (eyesItem && eyesItem.wordBonus) {
              coinsEarned += eyesItem.wordBonus;
              bonusBreakdown.push({ type: 'eyes', amount: eyesItem.wordBonus, label: 'בונוס עיניים' });
            }
          }
          
          if (equippedMouth) {
            const mouthItem = AVATAR_ITEMS[equippedMouth];
            if (mouthItem && mouthItem.wordBonus) {
              coinsEarned += mouthItem.wordBonus;
              bonusBreakdown.push({ type: 'mouth', amount: mouthItem.wordBonus, label: 'בונוס פה' });
            }
          }
          
          // Check if user is vocab king using LeaderboardEntry (public access)
          const [allLeaderboardEntries, allWordProgress] = await Promise.all([
            base44.entities.LeaderboardEntry.list(),
            base44.entities.WordProgress.list()
          ]);
          
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
        }

        // Show feedback immediately with calculated coins
        setFeedback({
          isCorrect,
          correctAnswer: currentWord.hebrew,
          coinsEarned: coinsEarned,
          bonusBreakdown: bonusBreakdown,
          mastered: isMastered,
          isDontKnow: false
        });

        // Update data in background (don't wait)
        if (coinsEarned > 0 && ((isMastered && !existingWordProg.mastered) || isFirstCorrect)) {
          // אין הסרת מילים מהרשימה - אותן 75 מילים חוזרות כל היום

          // Calculate new mastered_words count
          const currentMasteredCount = wordProgress.filter(w => w.mastered).length;
          const newMasteredCount = isMastered && !existingWordProg.mastered ? currentMasteredCount + 1 : currentMasteredCount;
          const oldCoins = userData.coins || 0;
          const newCoinsTotal = oldCoins + coinsEarned;

          // Calculate net worth
          const userInvestments = await base44.entities.Investment.filter({ student_email: userData.email });
          const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
          
          const purchasedItems = userData.purchased_items || [];
          let itemsValue = 0;
          purchasedItems.forEach(itemId => {
            const item = AVATAR_ITEMS[itemId];
            if (item) itemsValue += item.price || 0;
          });
          
          const totalNetworth = newCoinsTotal + itemsValue + investmentsValue;

          // Update in background
          Promise.all([
            base44.auth.updateMe({
              coins: newCoinsTotal,
              total_networth: totalNetworth,
              mastered_words: newMasteredCount
            }),
            base44.entities.WordProgress.update(existingWordProg.id, {
              correct_streak: newStreak,
              total_attempts: existingWordProg.total_attempts + 1,
              mastered: isMastered,
              last_seen: now,
              difficulty_level: currentWord.difficulty,
              coins_earned: (existingWordProg.coins_earned || 0) + coinsEarned
            })
          ]).then(async () => {
            setUserData(prev => ({ 
              ...prev, 
              coins: newCoinsTotal,
              total_networth: totalNetworth,
              mastered_words: newMasteredCount
            }));
            
            // Update leaderboard and get actual value
            let actualLeaderboardNetworth = null;
            try {
              const { syncLeaderboardEntry } = await import("../components/utils/leaderboardSync");
              const freshUser = await base44.auth.me();
              actualLeaderboardNetworth = await syncLeaderboardEntry(freshUser, {
                coins: newCoinsTotal,
                total_networth: totalNetworth,
                investments_value: investmentsValue,
                items_value: itemsValue,
                mastered_words: newMasteredCount
              });
            } catch (err) {
              console.error("Error updating leaderboard:", err);
            }
            
            // Log coin change with actual leaderboard value
            try {
              const { logCoinChange } = await import("../components/utils/coinLogger");
              await logCoinChange(userData.email, oldCoins, newCoinsTotal, "שליטה במילה באנגלית", {
                source: 'Vocabulary',
                word: currentWord.english,
                coinsEarned: coinsEarned,
                mastered: isMastered,
                investments_value: investmentsValue,
                user_networth: totalNetworth,
                actualLeaderboardNetworth: actualLeaderboardNetworth
              });
            } catch (err) {
              console.error("Error logging vocab coins:", err);
            }
          });


        } else {
          await base44.entities.WordProgress.update(existingWordProg.id, {
            correct_streak: newStreak,
            total_attempts: existingWordProg.total_attempts + 1,
            mastered: isMastered,
            last_seen: now,
            difficulty_level: currentWord.difficulty,
            coins_earned: (existingWordProg.coins_earned || 0) + coinsEarned
          });
        }
      } else {
        // New word - award 2 coins if first answer is correct
        let coinsEarned = 0;
        let bonusBreakdown = [];
        
        if (isCorrect) {
          coinsEarned = 2;
          bonusBreakdown.push({ type: 'first', amount: 2, label: 'תשובה נכונה ראשונה' });
        }

        await base44.entities.WordProgress.create({
          student_email: userData.email,
          word_english: currentWord.english,
          word_hebrew: currentWord.hebrew,
          difficulty_level: currentWord.difficulty,
          correct_streak: isCorrect ? 1 : 0,
          total_attempts: 1,
          last_seen: now,
          mastered: false,
          coins_earned: coinsEarned
        });

        // Update user coins if earned coins
        if (coinsEarned > 0) {
          const oldCoins = userData.coins || 0;
          const newCoinsTotal = oldCoins + coinsEarned;

          // Calculate net worth
          const userInvestments = await base44.entities.Investment.filter({ student_email: userData.email });
          const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
          
          const purchasedItems = userData.purchased_items || [];
          let itemsValue = 0;
          purchasedItems.forEach(itemId => {
            const item = AVATAR_ITEMS[itemId];
            if (item) itemsValue += item.price || 0;
          });
          
          const totalNetworth = newCoinsTotal + itemsValue + investmentsValue;

          // Update in background
          Promise.all([
            base44.auth.updateMe({
              coins: newCoinsTotal,
              total_networth: totalNetworth
            })
          ]).then(async () => {
            setUserData(prev => ({ 
              ...prev, 
              coins: newCoinsTotal,
              total_networth: totalNetworth
            }));
            
            // Update leaderboard and get actual value
            let actualLeaderboardNetworth = null;
            try {
              const { syncLeaderboardEntry } = await import("../components/utils/leaderboardSync");
              const freshUser = await base44.auth.me();
              actualLeaderboardNetworth = await syncLeaderboardEntry(freshUser, {
                coins: newCoinsTotal,
                total_networth: totalNetworth,
                investments_value: investmentsValue,
                items_value: itemsValue
              });
            } catch (err) {
              console.error("Error updating leaderboard:", err);
            }
            
            // Log coin change with actual leaderboard value
            try {
              const { logCoinChange } = await import("../components/utils/coinLogger");
              await logCoinChange(userData.email, oldCoins, newCoinsTotal, "תשובה נכונה באנגלית", {
                source: 'Vocabulary - First Correct',
                word: currentWord.english,
                coinsEarned: coinsEarned,
                investments_value: investmentsValue,
                user_networth: totalNetworth,
                actualLeaderboardNetworth: actualLeaderboardNetworth
              });
            } catch (err) {
              console.error("Error logging vocab coins:", err);
            }
          });


        }

        setFeedback({
          isCorrect,
          correctAnswer: currentWord.hebrew,
          coinsEarned: coinsEarned,
          bonusBreakdown: bonusBreakdown,
          mastered: false,
          isDontKnow: false
        });
      }

      // Update local state
      const latestProgress = await base44.entities.WordProgress.filter({ student_email: userData.email });
      setWordProgress(latestProgress);

      // אפס multi-choice אחרי תשובה
      setMultiChoiceOptions(null);

      // Auto-continue only if correct - pass fresh progress to avoid stale closure
      if (isCorrect) {
        setTimeout(() => {
          handleContinue(latestProgress);
        }, 1500);
      }

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
          correct_streak: 0,
          total_attempts: existingWordProg.total_attempts + 1,
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
          למד מילים חדשות והרווח סטארטקוין!
        </p>
      </motion.div>

      {/* Daily Progress + Stats unified card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <CardContent className="p-5">
            {/* Progress section */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/70 text-sm font-semibold">מילים היום</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-xl">{completedTodayCount}</span>
                <span className="text-white/40 font-bold">/</span>
                <span className="text-white/60 font-bold">{maxWords}</span>
              </div>
            </div>
            <div className="h-4 bg-black/20 rounded-full overflow-hidden relative mb-2">
              <motion.div
                className="absolute top-0 right-0 h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${maxWords > 0 ? ((completedTodayCount + wordsOneCorrectToday) / maxWords) * 100 : 0}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <motion.div
                className="absolute top-0 right-0 h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${maxWords > 0 ? (completedTodayCount / maxWords) * 100 : 0}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-end gap-4 mb-5 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>נכון פעם אחת: <span className="text-white/80 font-bold">{wordsOneCorrectToday}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>שלטת: <span className="text-white/80 font-bold">{completedTodayCount}</span></span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <Trophy className="w-6 h-6 text-yellow-300 mx-auto mb-1.5" />
                <p className="text-2xl font-black text-white leading-none mb-1">{masteredWords}</p>
                <p className="text-white/50 text-xs">שלטת בהן</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <div className="text-green-300 text-xl font-black mb-1.5">✓</div>
                <p className="text-2xl font-black text-white leading-none mb-1">{wordsWithOneCorrect}</p>
                <p className="text-white/50 text-xs">נכון פעם אחת</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <Coins className="w-6 h-6 text-amber-300 mx-auto mb-1.5" />
                <p className="text-2xl font-black text-white leading-none mb-1">{totalCoinsEarned}</p>
                <p className="text-white/50 text-xs">סטארטקוין</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                  {!feedback && currentWord.isReview && currentWord.correctStreak > 0 && (
                    <span className="bg-green-500/20 text-green-200 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-1">
                      <span className="font-bold">✓</span>
                      <span className="mr-1">עניתי נכון</span>
                    </span>
                  )}
                  <span className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 font-bold ${
                    currentWord.difficulty === 1 ? 'bg-green-500/20 text-green-200 border-2 border-green-500/40' :
                    currentWord.difficulty === 2 ? 'bg-orange-500/20 text-orange-200 border-2 border-orange-500/40' :
                    'bg-red-500/20 text-red-200 border-2 border-red-500/40'
                  }`}>
                    {currentWord.difficulty === 1 ? '😊 קל' : currentWord.difficulty === 2 ? '💪 בינוני' : '🔥 קשה'}
                  </span>
                  <span className="bg-amber-500/20 text-amber-200 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    {getCoinsForDifficulty(currentWord.difficulty)} סטארטקוין
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4 mb-4 sm:mb-5">
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
                  multiChoiceOptions ? (
                    // שאלה אמריקאית - 4 אפשרויות בחירה
                    <div className="max-w-md mx-auto">
                      <p className="text-white/70 text-sm mb-4">מה הפירוש בעברית?</p>
                      <div className="grid grid-cols-2 gap-3">
                        {multiChoiceOptions.options.map((option, idx) => (
                          <Button
                            key={idx}
                            onClick={async () => {
                              if (isChecking) return;
                              setUserAnswer(option);
                              // הגש עם התשובה הנבחרת
                              await handleSubmitWithAnswer(option);
                            }}
                            disabled={isChecking}
                            className="bg-white/15 hover:bg-white/30 text-white border-2 border-white/20 hover:border-white/40 font-bold py-6 text-base transition-all"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="py-4">
                    {feedback.isCorrect ? (
                      <div>
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-1">
                          <Check className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-300 mb-1">
                          נכון! 🎉
                        </h3>
                        <p className="text-white/70 mb-2 text-base">
                          {currentWord.english} = {feedback.correctAnswer}
                        </p>
                        {feedback.mastered && feedback.coinsEarned > 0 && (
                          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white py-3 px-6 rounded-xl inline-block">
                            <div className="font-black text-xl mb-2">
                              🎊 שלטת במילה! 🎊
                            </div>
                            {feedback.bonusBreakdown && feedback.bonusBreakdown.length > 0 && (
                              <div className="bg-white/20 rounded-lg p-2 text-sm space-y-1">
                                {feedback.bonusBreakdown.map((bonus, idx) => (
                                  <div key={idx} className="flex justify-between items-center">
                                    <span className="text-white/90">{bonus.label}:</span>
                                    <span className="font-bold">+{bonus.amount}</span>
                                  </div>
                                ))}
                                <div className="border-t border-white/30 pt-1 mt-1 flex justify-between items-center font-black text-base">
                                  <span>סה"כ:</span>
                                  <span>+{feedback.coinsEarned} 🪙</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      {feedback.coinsEarned > 0 && !feedback.mastered && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", duration: 0.8, bounce: 0.5 }}
                          className="mt-2"
                        >
                          <motion.div
                            animate={{ 
                              y: [0, -5, 0],
                              boxShadow: [
                                '0 0 20px rgba(59, 130, 246, 0.5)',
                                '0 0 40px rgba(59, 130, 246, 0.8)',
                                '0 0 20px rgba(59, 130, 246, 0.5)'
                              ]
                            }}
                            transition={{ 
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white py-3 px-6 rounded-xl inline-block border-2 border-blue-300"
                          >
                            <div className="font-black text-lg flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                🪙
                              </motion.div>
                              קיבלת +{feedback.coinsEarned} סטארטקוין!
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                      </div>
                      ) : (
                      <div>
                      <div className={`w-16 h-16 ${feedback.isDontKnow ? 'bg-orange-500' : 'bg-red-500'} rounded-full flex items-center justify-center mx-auto mb-1`}>
                      {feedback.isDontKnow ? (
                        <span className="text-4xl">💭</span>
                      ) : (
                        <X className="w-10 h-10 text-white" />
                      )}
                      </div>
                      <h3 className={`text-2xl font-bold ${feedback.isDontKnow ? 'text-orange-300' : 'text-red-300'} mb-1`}>
                      {feedback.isDontKnow ? "התשובה הנכונה:" : "לא נכון 😅"}
                      </h3>
                      <p className="text-white text-lg mb-2 font-bold">
                      {feedback.correctAnswer.split(',').slice(0, 2).join(', ')}
                      </p>
                      <div className="mt-3 space-y-2">
                        <Button
                          onClick={() => setShowSuggestionDialog(true)}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 text-sm"
                        >
                          💡 יש לי פירוש נוסף
                        </Button>
                        <div>
                          <Button
                            onClick={handleContinue}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 text-base"
                          >
                            המשך למילה הבאה →
                          </Button>
                        </div>
                      </div>
                      </div>
                      )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Mastered Words List */}
      {masteredWords > 0 && (() => {
        const masteredWordsList = wordProgress.filter(w => w.mastered);
        const totalPages = Math.ceil(masteredWordsList.length / MASTERED_PER_PAGE);
        const startIdx = (masteredPage - 1) * MASTERED_PER_PAGE;
        const paginatedWords = masteredWordsList.slice(startIdx, startIdx + MASTERED_PER_PAGE);

        return (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-300" />
                מילים ששלטת בהן ({masteredWords})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {paginatedWords.map((word) => {
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
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    onClick={() => setMasteredPage(prev => Math.max(1, prev - 1))}
                    disabled={masteredPage === 1}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                  >
                    ← הקודם
                  </Button>
                  <span className="text-white/70 text-sm">
                    עמוד {masteredPage} מתוך {totalPages}
                  </span>
                  <Button
                    onClick={() => setMasteredPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={masteredPage === totalPages}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                  >
                    הבא →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Suggestion Dialog */}
      <Dialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog}>
        <DialogContent className="bg-gradient-to-br from-purple-900 to-blue-900 border-2 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">
              💡 הצע פירוש נוסף
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-white/80 mb-2">
                המילה: <span className="font-bold text-white" dir="ltr" translate="no" lang="en">{currentWord?.english}</span>
              </p>
              <p className="text-white/80 mb-4">
                הפירוש הנוכחי: <span className="font-bold text-white">{currentWord?.hebrew}</span>
              </p>
            </div>
            <div>
              <label className="text-white font-bold mb-2 block">הפירוש המוצע שלך:</label>
              <Input
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder="הכנס פירוש נוסף בעברית..."
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                autoFocus
              />
            </div>
            <Button
              onClick={async () => {
                if (!suggestionText.trim()) {
                  toast.error("נא להזין פירוש");
                  return;
                }
                
                try {
                  await base44.entities.VocabularyWordSuggestion.create({
                    word_english: currentWord.english,
                    current_hebrew: currentWord.hebrew,
                    suggested_hebrew: suggestionText.trim(),
                    suggested_by_email: userData.email,
                    suggested_by_name: userData.full_name || userData.first_name || userData.email,
                    status: "pending"
                  });
                  
                  toast.success("תודה על ההמלצה! 🙏");
                  setSuggestionText("");
                  setShowSuggestionDialog(false);
                  setTimeout(() => {
                    handleContinue();
                  }, 800);
                } catch (error) {
                  console.error("Error submitting suggestion:", error);
                  toast.error("שגיאה בשליחת ההמלצה");
                }
              }}
              disabled={!suggestionText.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3"
            >
              <Send className="w-4 h-4 ml-2" />
              שלח המלצה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}