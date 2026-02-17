import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, X, Trophy, Coins, Calculator, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";

const MAX_DAILY_EXERCISES = 30;
const MATH_COINS_PER_CORRECT_ANSWER = 5; // Coins per correct answer

// Component to display fractions nicely
const FractionDisplay = ({ text }) => {
  // Split by operators while keeping them - match all math operators
  const parts = text.split(/(\s*[+\-×÷=?]\s*)/);
  
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap" style={{ direction: 'rtl' }}>
      {parts.map((part, index) => {
        const trimmed = part.trim();
        
        // Skip empty parts
        if (!trimmed) return null;
        
        // Check if this part is a fraction (contains / but no spaces and not a question mark)
        if (trimmed.includes('/') && !trimmed.includes(' ')) {
          const [numerator, denominator] = trimmed.split('/');
          return (
            <div key={index} className="inline-flex flex-col items-center mx-1">
              <span className="text-4xl font-black leading-none">{numerator}</span>
              <div className="w-full h-1 bg-white my-1"></div>
              <span className="text-4xl font-black leading-none">{denominator}</span>
            </div>
          );
        }
        
        // Make division symbol very clear
        if (trimmed === '÷') {
          return (
            <span key={index} className="text-7xl font-black mx-3 text-yellow-300" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.1em' }}>
              ÷
            </span>
          );
        }
        
        // Make multiplication symbol clear
        if (trimmed === '×') {
          return <span key={index} className="text-6xl font-black mx-2 text-blue-300">×</span>;
        }
        
        // Return operators or other text as-is with proper spacing
        return <span key={index} className="text-5xl font-black mx-2">{trimmed}</span>;
      })}
    </div>
  );
};

export default function MathGames() {
  const [userData, setUserData] = useState(null);
  const [mathProgress, setMathProgress] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (userData && !isLoading && !currentQuestion && !isGenerating && dailyCount < MAX_DAILY_EXERCISES) {
      generateQuestion();
    }
  }, [userData, isLoading, currentQuestion, isGenerating, dailyCount]);

  // Timer countdown
  useEffect(() => {
    if (dailyCount >= MAX_DAILY_EXERCISES && userData?.last_math_reset) {
      const interval = setInterval(() => {
        updateTimeUntilReset();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [dailyCount, userData?.last_math_reset]);

  const updateTimeUntilReset = () => {
    if (!userData?.last_math_reset) return;
    
    const lastReset = new Date(userData.last_math_reset);
    const nextReset = new Date(lastReset);
    nextReset.setHours(nextReset.getHours() + 24);
    
    const now = new Date();
    const diff = nextReset - now;
    
    if (diff <= 0) {
      setTimeUntilReset("מוכן לאיפוס!");
      loadData(); // Reload to reset
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeUntilReset(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const checkAndResetDaily = async (user) => {
    const now = new Date();
    const lastReset = user.last_math_reset ? new Date(user.last_math_reset) : null;
    
    // Check if 24 hours have passed
    if (!lastReset || (now - lastReset) >= 24 * 60 * 60 * 1000) {
      await base44.auth.updateMe({
        daily_math_count: 0,
        last_math_reset: now.toISOString()
      });
      return 0;
    }
    
    return user.daily_math_count || 0;
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const resetCount = await checkAndResetDaily(user);
      const updatedUser = await base44.auth.me();
      
      setUserData(updatedUser);
      setDailyCount(resetCount);

      const progress = await base44.entities.MathProgress.filter({ student_email: updatedUser.email });
      setMathProgress(progress);

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error.response?.status === 404 || error.response?.status === 401) {
        await base44.auth.redirectToLogin();
      }
      setIsLoading(false);
    }
  };

  const generateMultiplicationQuestion = (level) => {
    let num1, num2;
    if (level === 1) {
      // Easy: 2-12 × 2-12 (no 1s!)
      num1 = Math.floor(Math.random() * 11) + 2; // 2-12
      num2 = Math.floor(Math.random() * 11) + 2; // 2-12
    } else if (level === 2) {
      // Medium: teens and twenties, avoid multiplying by single digits below 5
      num1 = Math.floor(Math.random() * 20) + 10; // 10-29
      num2 = Math.floor(Math.random() * 8) + 5; // 5-12
    } else {
      // Hard: two-digit multiplication
      num1 = Math.floor(Math.random() * 30) + 10; // 10-39
      num2 = Math.floor(Math.random() * 20) + 5; // 5-24
    }
    
    return {
      question: `${num1} × ${num2}`,
      answer: (num1 * num2).toString(),
      display: `כמה זה ${num1} כפול ${num2}?`,
      category: "multiplication"
    };
  };

  const generateDivisionQuestion = (level) => {
    let num1, num2;
    if (level === 1) {
      // Easy: division but not too simple (avoid dividing by 1 or dividing equal numbers)
      num2 = Math.floor(Math.random() * 9) + 3; // 3-11
      const quotient = Math.floor(Math.random() * 8) + 3; // 3-10
      num1 = num2 * quotient;
    } else if (level === 2) {
      // Medium: larger numbers
      num2 = Math.floor(Math.random() * 10) + 6; // 6-15
      const quotient = Math.floor(Math.random() * 13) + 8; // 8-20
      num1 = num2 * quotient;
    } else {
      // Hard: challenging division
      num2 = Math.floor(Math.random() * 15) + 12; // 12-26
      const quotient = Math.floor(Math.random() * 18) + 12; // 12-29
      num1 = num2 * quotient;
    }
    
    return {
      question: `${num1} ÷ ${num2}`,
      answer: (num1 / num2).toString(),
      display: `כמה זה ${num1} חלקי ${num2}?`,
      category: "multiplication" // For now, division is grouped under multiplication category
    };
  };

  const generateFractionsQuestion = (level) => {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    
    if (level === 1) {
      // Simple addition with same denominator - but avoid identical numerator and denominator
      const denominator = [3, 4, 5, 6, 7, 8][Math.floor(Math.random() * 6)];
      let num1 = Math.floor(Math.random() * (denominator - 1)) + 1;
      let num2 = Math.floor(Math.random() * (denominator - num1)) + 1;
      
      // Make sure we don't get num1 + num2 = denominator (which equals 1)
      // And make sure neither fraction is the whole (e.g., 5/5)
      // If num1 is too large, adjust num2, and ensure both are positive.
      if (num1 + num2 >= denominator || num1 === denominator || num2 === denominator) {
        num1 = Math.floor(Math.random() * (denominator - 2)) + 1; // max den-2, min 1
        num2 = Math.floor(Math.random() * (denominator - num1 - 1)) + 1; // max den-num1-1, min 1
        if (num2 <= 0) num2 = 1; // ensure num2 is at least 1
      }
      
      const answer = num1 + num2;
      const divisor = gcd(answer, denominator); // Simplify the answer fraction
      
      return {
        question: `${num1}/${denominator} + ${num2}/${denominator}`,
        answer: `${answer / divisor}/${denominator / divisor}`,
        display: `? = ${num2}/${denominator} + ${num1}/${denominator}`,
        category: "fractions"
      };
    } else if (level === 2) {
      // Multiplication or addition with different denominators
      const choice = Math.random() < 0.5;
      
      if (choice) {
        // Multiplication - avoid multiplying by 1
        let num1 = Math.floor(Math.random() * 4) + 2; // 2-5
        let den1 = Math.floor(Math.random() * 5) + 3; // 3-7
        let num2 = Math.floor(Math.random() * 4) + 2; // 2-5
        let den2 = Math.floor(Math.random() * 5) + 3; // 3-7
        
        // Make sure we're not multiplying fractions that equal 1 or are trivial
        if (num1 >= den1) num1 = Math.floor(den1 * 0.6); // Adjust to be less than den1
        if (num2 >= den2) num2 = Math.floor(den2 * 0.6); // Adjust to be less than den2
        if (num1 === 0) num1 = 1;
        if (num2 === 0) num2 = 1;
        
        const answerNum = num1 * num2;
        const answerDen = den1 * den2;
        const divisor = gcd(answerNum, answerDen);
        
        return {
          question: `${num1}/${den1} × ${num2}/${den2}`,
          answer: `${answerNum / divisor}/${answerDen / divisor}`,
          display: `? = ${num2}/${den2} × ${num1}/${den1}`,
          category: "fractions"
        };
      } else {
        // Addition with different denominators
        const num1 = Math.floor(Math.random() * 3) + 2; // 2-4
        const den1 = [3, 4, 5, 6][Math.floor(Math.random() * 4)];
        const num2 = Math.floor(Math.random() * 3) + 2; // 2-4
        const den2 = [3, 4, 5, 6].filter(d => d !== den1)[Math.floor(Math.random() * 3)];
        
        const commonDen = den1 * den2;
        const answerNum = (num1 * den2) + (num2 * den1);
        const divisor = gcd(answerNum, commonDen);
        
        return {
          question: `${num1}/${den1} + ${num2}/${den2}`,
          answer: `${answerNum / divisor}/${commonDen / divisor}`,
          display: `? = ${num2}/${den2} + ${num1}/${den1}`,
          category: "fractions"
        };
      }
    } else {
      // Hard: Division of fractions - avoid simple cases
      let num1 = Math.floor(Math.random() * 5) + 3; // 3-7
      let den1 = Math.floor(Math.random() * 6) + 4; // 4-9
      let num2 = Math.floor(Math.random() * 5) + 3; // 3-7
      let den2 = Math.floor(Math.random() * 6) + 4; // 4-9
      
      // Make sure neither fraction equals 1 or are trivial
      if (num1 >= den1) num1 = Math.floor(den1 * 0.7);
      if (num2 >= den2) num2 = Math.floor(den2 * 0.7);
      if (num1 === 0) num1 = 1;
      if (num2 === 0) num2 = 1;

      const answerNum = num1 * den2;
      const answerDen = den1 * num2;
      const divisor = gcd(answerNum, answerDen);
      
      return {
        question: `${num1}/${den1} ÷ ${num2}/${den2}`,
        answer: `${answerNum / divisor}/${answerDen / divisor}`,
        display: `? = ${num2}/${den2} ÷ ${num1}/${den1}`,
        category: "fractions"
      };
    }
  };

  const generatePercentagesQuestion = (level) => {
    if (level === 1) {
      // Easy: common percentages but not too trivial (avoid 100%, 50% of round numbers)
      const percent = [15, 20, 25, 30, 40, 60, 75, 80][Math.floor(Math.random() * 8)];
      const number = [120, 150, 180, 200, 240, 300, 350, 400][Math.floor(Math.random() * 8)];
      const answer = (number * percent) / 100;

      return {
        question: `${percent}% מ-${number}`,
        answer: answer.toString(),
        display: `כמה זה ${percent}% מ-${number}?`,
        category: "percentages"
      };
    } else if (level === 2) {
      // Medium: more varied percentages and numbers
      const percent = [12, 18, 22, 28, 35, 42, 55, 65, 72, 85][Math.floor(Math.random() * 10)];
      const number = Math.floor(Math.random() * 20 + 8) * 50; // 400-1350, multiples of 50
      const answer = (number * percent) / 100;

      return {
        question: `${percent}% מ-${number}`,
        answer: answer.toString(),
        display: `כמה זה ${percent}% מ-${number}?`,
        category: "percentages"
      };
    } else {
      // Hard: complex percentages or reverse questions
      const choice = Math.random() < 0.7;

      if (choice) {
        // Forward: unusual percentages
        const percent = Math.floor(Math.random() * 88) + 7; // 7-94
        const number = Math.floor(Math.random() * 30 + 10) * 20; // 200-780, multiples of 20
        const answer = (number * percent) / 100;

        return {
          question: `${percent}% מ-${number}`,
          answer: answer.toString(),
          display: `כמה זה ${percent}% מ-${number}?`,
          category: "percentages"
        };
      } else {
        // Reverse: what percent is X of Y?
        const base = Math.floor(Math.random() * 20 + 10) * 10; // 100-290, multiples of 10
        const percent = [20, 25, 30, 40, 50, 60, 75, 80][Math.floor(Math.random() * 8)];
        const part = (base * percent) / 100;

        return {
          question: `${part} זה כמה אחוז מ-${base}?`,
          answer: `${percent}%`,
          display: `${part} זה כמה אחוז מ-${base}?`,
          category: "percentages"
        };
      }
    }
  };

  const categoryInfo = {
    multiplication: { name: "כפל/חילוק", icon: "✖️", color: "from-blue-400 to-cyan-400" },
    fractions: { name: "שברים", icon: "➗", color: "from-green-400 to-emerald-400" },
    percentages: { name: "אחוזים", icon: "💯", color: "from-purple-400 to-pink-400" }
  };

  const generateQuestion = async () => {
    if (isGenerating || dailyCount >= MAX_DAILY_EXERCISES) return;
    
    setIsGenerating(true);
    setFeedback(null);
    setCurrentQuestion(null);
    
    try {
      // No need to reload progress here - we already have it in state
      const level = Math.floor(Math.random() * 3) + 1;
      
      // Random category - all mixed together
      const questionTypes = ['mult', 'div', 'fractions', 'percentages'];
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      let questionData;
      
      if (randomType === 'mult') {
        questionData = generateMultiplicationQuestion(level);
      } else if (randomType === 'div') {
        questionData = generateDivisionQuestion(level);
      } else if (randomType === 'fractions') {
        questionData = generateFractionsQuestion(level);
      } else {
        questionData = generatePercentagesQuestion(level);
      }

      setCurrentQuestion({
        category: questionData.category,
        question: questionData.question,
        answer: questionData.answer,
        display: questionData.display,
        difficulty: level
      });
    } catch (error) {
      console.error("Error generating question:", error);
      toast.error("שגיאה ביצירת שאלה");
    }
    
    setIsGenerating(false);
  };

  const getExplanation = async (question, correctAnswer) => {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `הסבר בעברית פשוטה וברורה איך לפתור את התרגיל הבא:
${question} = ${correctAnswer}

חשוב מאוד:
- הסבר קצר ופשוט (2-3 משפטים)
- השתמש רק במילים בעברית פשוטה, ללא מושגים באנגלית
- מתאים לילדים בגילאי 10-16
- השתמש באימוג'ים רלוונטיים (🔢 ➗ ✖️ ➕)
- אל תכתוב את השאלה שוב, רק את ההסבר
- הסבר את השלבים בצורה הכי פשוטה`,
        response_json_schema: {
          type: "object",
          properties: {
            explanation: { type: "string" }
          }
        }
      });

      return response.explanation;
    } catch (error) {
      console.error("Error getting explanation:", error);
      return null;
    }
  };

  // Helper function to compare fractions
  const compareFractions = (answer1, answer2) => {
    // Trim inputs
    answer1 = answer1.trim();
    answer2 = answer2.trim();

    // If both are simple numbers, compare them directly
    if (!answer1.includes('/') && !answer2.includes('/')) {
      // Check for floating point comparison issues (e.g. 0.333 vs 1/3)
      if (parseFloat(answer1).toFixed(5) === parseFloat(answer2).toFixed(5)) {
        return true;
      }
      return answer1 === answer2;
    }

    // GCD function (copied for self-containment)
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

    // Parse a string into a fraction object { numerator, denominator }
    const parseFraction = (str) => {
      if (!str.includes('/')) {
        const num = parseFloat(str);
        if (isNaN(num)) throw new Error("Invalid number input");
        return { numerator: num, denominator: 1 };
      }
      const parts = str.split('/');
      if (parts.length !== 2) throw new Error("Invalid fraction format");
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) throw new Error("Invalid fraction values");
      return { numerator: num, denominator: den };
    };

    try {
      const frac1 = parseFraction(answer1);
      const frac2 = parseFraction(answer2);

      // Handle potential negative numbers in numerator or denominator
      let n1 = frac1.numerator;
      let d1 = frac1.denominator;
      let n2 = frac2.numerator;
      let d2 = frac2.denominator;

      // Ensure denominator is positive for consistent comparison
      if (d1 < 0) { n1 = -n1; d1 = -d1; }
      if (d2 < 0) { n2 = -n2; d2 = -d2; }

      // Simplify both fractions
      const commonDivisor1 = gcd(Math.abs(n1), Math.abs(d1));
      const simplified1 = {
        numerator: n1 / commonDivisor1,
        denominator: d1 / commonDivisor1
      };

      const commonDivisor2 = gcd(Math.abs(n2), Math.abs(d2));
      const simplified2 = {
        numerator: n2 / commonDivisor2,
        denominator: d2 / commonDivisor2
      };
      
      // Compare simplified fractions
      return simplified1.numerator === simplified2.numerator && 
             simplified1.denominator === simplified2.denominator;
    } catch (e) {
      console.error("Error comparing fractions:", e);
      // If parsing fails or an invalid fraction is encountered, treat as incorrect
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim() || isChecking) return;
    if (!currentQuestion) {
      toast.error("אין שאלה לענות עליה כרגע.");
      return;
    }

    setIsChecking(true);

    try {
      const answer = userAnswer.trim();
      const correctAnswer = currentQuestion.answer.trim();
      
      // Use fraction comparison for better accuracy, even for non-fraction answers
      // It handles integers correctly because parseFraction converts them to X/1
      const isCorrect = compareFractions(answer, correctAnswer);

      const now = new Date().toISOString();

      // Use existing mathProgress from state instead of fetching again
      const existingProgress = mathProgress.find(p =>
        p.question === currentQuestion.question &&
        p.category === currentQuestion.category
      );

      // Get explanation for wrong answers
      let explanation = null;
      if (!isCorrect) {
        explanation = await getExplanation(currentQuestion.question, correctAnswer);
      }

      // Award coins for correct answer
      let coinsEarned = 0;
      if (isCorrect) {
        coinsEarned = MATH_COINS_PER_CORRECT_ANSWER;
        
        // Import AVATAR_ITEMS
        const { AVATAR_ITEMS } = await import('../components/avatar/TamagotchiAvatar');
        
        // Check for shoes bonus (mathBonus)
        const equippedItems = userData.equipped_items || {};
        const equippedShoes = equippedItems.shoes;
        
        if (equippedShoes) {
          const shoesItem = AVATAR_ITEMS[equippedShoes];
          if (shoesItem && shoesItem.mathBonus) {
            coinsEarned += shoesItem.mathBonus;
          }
        }
        
        // Math king bonus is already included in the daily calculation in Layout
        // No need to add it again here
        
        const oldCoins = userData.coins || 0;
        const newCoins = oldCoins + coinsEarned;
        
        // Calculate net worth
        const userInvestments = await base44.entities.Investment.filter({ student_email: userData.email });
        const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
        
        const purchasedItems = userData.purchased_items || [];
        let itemsValue = 0;
        purchasedItems.forEach(itemId => {
          const item = AVATAR_ITEMS[itemId];
          if (item) itemsValue += item.price || 0;
        });
        
        const totalNetworth = newCoins + itemsValue + investmentsValue;
        
        // Log the coin change
        try {
          const { logCoinChange } = await import('../components/utils/coinLogger');
          
          let leaderboardNetworth = 0;
          try {
            const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
            if (leaderboardEntries.length > 0) {
              leaderboardNetworth = leaderboardEntries[0].total_networth || 0;
            }
          } catch (err) {
            console.error("Error fetching leaderboard:", err);
          }
          
          await logCoinChange(userData.email, oldCoins, newCoins, "תרגיל חשבון נכון", {
            source: 'MathGames',
            question: currentQuestion.question,
            coinsEarned: coinsEarned,
            investments_value: investmentsValue,
            user_networth: totalNetworth,
            leaderboard_networth: leaderboardNetworth
          });
        } catch (logError) {
          console.error("Error logging math coins:", logError);
        }
        
        // Update User with coins and networth
        await base44.auth.updateMe({
          coins: newCoins,
          total_networth: totalNetworth,
          daily_math_count: (userData.daily_math_count || 0) + 1,
          total_math_earnings: (userData.total_math_earnings || 0) + coinsEarned,
          total_correct_math_answers: (userData.total_correct_math_answers || 0) + 1
        });
        setDailyCount(prev => prev + 1);
        
        // Update LeaderboardEntry directly
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
          
          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
              coins: newCoins,
              total_networth: totalNetworth,
              investments_value: investmentsValue,
              items_value: itemsValue,
              total_correct_math_answers: (userData.total_correct_math_answers || 0) + 1
            });
            console.log("✅ LeaderboardEntry updated");
          }
        } catch (leaderboardError) {
          console.error("❌ Error updating leaderboard:", leaderboardError);
        }
      }

      if (existingProgress) {
        const newStreak = isCorrect ? (existingProgress.correct_streak + 1) : 0;
        const isMastered = newStreak >= 3;

        await base44.entities.MathProgress.update(existingProgress.id, {
          correct_streak: newStreak,
          total_attempts: existingProgress.total_attempts + 1,
          mastered: isMastered,
          last_seen: now,
          coins_earned: (existingProgress.coins_earned || 0) + coinsEarned
        });

        setFeedback({
          isCorrect,
          correctAnswer: currentQuestion.answer,
          coinsEarned,
          mastered: isMastered,
          explanation
        });
      } else {
        await base44.entities.MathProgress.create({
          student_email: userData.email,
          category: currentQuestion.category,
          question: currentQuestion.question,
          correct_answer: currentQuestion.answer,
          difficulty_level: currentQuestion.difficulty,
          correct_streak: isCorrect ? 1 : 0,
          total_attempts: 1,
          last_seen: now,
          mastered: false,
          coins_earned: coinsEarned
        });

        setFeedback({
          isCorrect,
          correctAnswer: currentQuestion.answer,
          coinsEarned,
          mastered: false,
          explanation
        });
      }

      // Reload user data and progress after update
      const latestUserData = await base44.auth.me();
      setUserData(latestUserData);
      
      // Only reload progress if we created/updated it
      if (existingProgress) {
        // Update the existing progress in state
        setMathProgress(prev => prev.map(p => 
          p.id === existingProgress.id 
            ? { ...p, correct_streak: isCorrect ? p.correct_streak + 1 : 0, total_attempts: p.total_attempts + 1, coins_earned: (p.coins_earned || 0) + coinsEarned }
            : p
        ));
      } else {
        // Add the new progress to state
        const latestProgress = await base44.entities.MathProgress.filter({ student_email: userData.email });
        setMathProgress(latestProgress);
      }

      // Auto-continue only for correct answers
      if (isCorrect) {
        setTimeout(() => {
          setUserAnswer("");
          setFeedback(null);
          if (dailyCount < MAX_DAILY_EXERCISES) {
            generateQuestion();
          } else {
            setCurrentQuestion(null);
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("שגיאה בבדיקת התשובה");
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = () => {
    setUserAnswer("");
    setFeedback(null);
    
    if (dailyCount < MAX_DAILY_EXERCISES) {
      generateQuestion();
    } else {
      setCurrentQuestion(null);
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
          🔢
        </motion.div>
      </div>
    );
  }

  const totalCorrectExercises = mathProgress.filter(p => p.correct_streak > 0 || p.mastered).length;
  const totalCoinsEarned = mathProgress.reduce((sum, p) => sum + (p.coins_earned || 0), 0);

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          משחקי מתמטיקה 🔢
        </h1>
        <p className="text-white/80 text-lg">
          תרגלו וצברו סטארטקוין! (כל תרגיל נכון = {MATH_COINS_PER_CORRECT_ANSWER} סטארטקוין)
        </p>
      </motion.div>

      {/* Daily Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">תרגילים היום:</span>
              <span className="text-2xl font-black text-white">
                {dailyCount} / {MAX_DAILY_EXERCISES}
              </span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${(dailyCount / MAX_DAILY_EXERCISES) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {dailyCount >= MAX_DAILY_EXERCISES && (
              <div className="mt-4 text-center">
                <p className="text-white font-bold mb-2">
                  🎉 סיימת את כל התרגילים להיום!
                </p>
                <div className="flex items-center justify-center gap-2 text-white/70">
                  <Clock className="w-4 h-4" />
                  <span>תרגילים חדשים בעוד: {timeUntilReset}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
            <p className="text-2xl font-black text-white">{totalCorrectExercises}</p>
            <p className="text-white/70 text-sm">תרגילים שהצלחת</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <Coins className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="text-2xl font-black text-white">{totalCoinsEarned}</p>
            <p className="text-white/70 text-sm">סטארטקוין צברת</p>
          </CardContent>
        </Card>
      </div>

      {/* Game Area */}
      {dailyCount < MAX_DAILY_EXERCISES ? (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
          <CardContent className="p-8">
            {!currentQuestion ? (
              <div className="text-center py-12">
                {isGenerating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <Calculator className="w-16 h-16 text-purple-400" />
                    </motion.div>
                    <p className="text-white text-lg font-medium mt-4">
                      מכין שאלה חדשה...
                    </p>
                  </>
                ) : (
                  <p className="text-white text-lg">אין שאלות זמינות</p>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.question}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center"
                >
                  <div className="flex justify-center gap-3 mb-6">
                    <span className={`bg-gradient-to-r ${categoryInfo[currentQuestion.category].color} text-white px-4 py-2 rounded-full text-sm flex items-center gap-2`}>
                      {categoryInfo[currentQuestion.category].icon}
                      {categoryInfo[currentQuestion.category].name}
                    </span>
                    <span className="bg-amber-500/20 text-amber-200 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      {MATH_COINS_PER_CORRECT_ANSWER} סטארטקוין
                    </span>
                  </div>

                  <div className="text-white mb-8">
                    <FractionDisplay text={currentQuestion.display} />
                  </div>

                  {!feedback ? (
                    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                      <Input
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="כתוב את התשובה"
                        className="text-center text-xl py-6 bg-white border-2 border-purple-200 focus:border-purple-400 text-gray-900 placeholder:text-gray-400 mb-4"
                        disabled={isChecking}
                        autoFocus
                      />
                      <Button
                        type="submit"
                        disabled={!userAnswer.trim() || isChecking}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 text-lg"
                      >
                        {isChecking ? (
                          <>
                            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                            בודק...
                          </>
                        ) : (
                          "בדוק תשובה ✓"
                        )}
                      </Button>
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
                            התשובה היא {feedback.correctAnswer}
                          </p>
                          {feedback.coinsEarned > 0 && (
                            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-xl py-3 px-6 rounded-2xl inline-block mb-4">
                              +{feedback.coinsEarned} סטארטקוין! 🪙
                            </div>
                          )}
                          {feedback.mastered && (
                            <p className="text-green-300 mt-2 text-sm">
                              ⭐ שלטת בתרגיל הזה!
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-16 h-16 text-white" />
                          </div>
                          <h3 className="text-3xl font-bold text-red-300 mb-2">
                            לא נכון 😅
                          </h3>
                          <div className="text-white/70 text-base mb-4">
                            <p className="mb-2">התשובה הנכונה:</p>
                            {feedback.correctAnswer.includes('/') ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="text-3xl font-black text-white">{feedback.correctAnswer.split('/')[0]}</span>
                                <div className="w-full h-1 bg-white my-1"></div>
                                <span className="text-3xl font-black text-white">{feedback.correctAnswer.split('/')[1]}</span>
                              </div>
                            ) : (
                              <span className="font-bold text-white text-3xl">{feedback.correctAnswer}</span>
                            )}
                          </div>
                          {feedback.explanation && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-4 bg-blue-500/20 rounded-xl p-4 border border-blue-500/30 max-w-lg mx-auto mb-6"
                            >
                              <p className="text-blue-200 text-sm mb-2 font-bold">💡 איך פותרים:</p>
                              <p className="text-white text-base leading-relaxed">
                                {feedback.explanation}
                              </p>
                            </motion.div>
                          )}
                          <Button
                            onClick={handleContinue}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 text-lg"
                          >
                            המשך לשאלה הבאה →
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              סיימת את כל התרגילים להיום!
            </h3>
            <p className="text-white/70 mb-4">
              עבודה מצוינת! חזור מחר לעוד 30 תרגילים
            </p>
            <div className="bg-white/10 rounded-xl p-4 inline-block">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span className="font-bold">תרגילים חדשים בעוד:</span>
                <span className="text-2xl font-black text-yellow-300">{timeUntilReset}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* New Explanation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center"
      >
        <div className="text-4xl mb-3">💡</div>
        <p className="text-white/90 font-medium mb-2">
          איך לקבל סטארטקוין?
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          💰 <strong>דרכים לקבל סטארטקוין:</strong><br />
          🎓 השתתפות בשיעור = 100 סטארטקוין<br />
          🔢 תרגיל נכון בחשבון = 5 סטארטקוין<br />
          📚 מילה שלמדת באנגלית = 5-15 סטארטקוין<br />
          📝 מילוי סקר = 20 סטארטקוין<br />
          ❓ חידון = עד 10 סטארטקוין<br />
          💼 עבודה (לשעה) = סטארטקוין לפי פריטים<br />
          🤝 שיתוף פעולה עם חבר = 2 סטארטקוין<br />
          🔥 רצף כניסות יומי = 1-30 סטארטקוין<br />
          📈 רווחי השקעות<br />
          ✅ משימות בפרופיל = עד 300 סטארטקוין<br />
          👤 השלמת פרטי פרופיל = 70 סטארטקוין
        </p>
      </motion.div>
    </div>
  );
}