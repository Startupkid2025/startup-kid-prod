import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";
import { base44 } from "@/api/base44Client";
import { AVATAR_ITEMS } from "../avatar/TamagotchiAvatar";

// Calculate level based on PROGRESSIVE lesson requirements
const calculateLevel = (totalLessons) => {
  if (totalLessons < 4) return 1;
  if (totalLessons < 10) return 2;
  if (totalLessons < 18) return 3;
  if (totalLessons < 28) return 4;
  if (totalLessons < 40) return 5;
  return 6;
};

// Calculate lessons needed for next level
const getLessonsForNextLevel = (currentLevel) => {
  const thresholds = [0, 4, 10, 18, 28, 40];
  return thresholds[currentLevel] || 40;
};

// Calculate current level progress
const getCurrentLevelProgress = (totalLessons) => {
  const level = calculateLevel(totalLessons);
  const thresholds = [0, 4, 10, 18, 28, 40];
  
  if (level >= 6) {
    return { current: totalLessons - 40, needed: 0 };
  }
  
  const currentLevelStart = thresholds[level - 1];
  const nextLevelStart = thresholds[level];
  const lessonsInThisLevel = nextLevelStart - currentLevelStart;
  const currentProgress = totalLessons - currentLevelStart;
  
  return { current: currentProgress, needed: lessonsInThisLevel };
};

// Generate smart tips based on user state
const generateSmartTip = async (user, equippedItems) => {
  try {
    // Get additional data
    const [investments, participations, wordProgress, mathProgress, allLeaderboardEntries] = await Promise.all([
      base44.entities.Investment.filter({ student_email: user.email }).catch(() => []),
      base44.entities.LessonParticipation.filter({ student_email: user.email }).catch(() => []),
      base44.entities.WordProgress.filter({ student_email: user.email }).catch(() => []),
      base44.entities.MathProgress.filter({ student_email: user.email }).catch(() => []),
      base44.entities.LeaderboardEntry.list().catch(() => [])
    ]);

    const tips = [];

    // Calculate real networth (coins + items + investments)
    const cashOnHand = user.coins || 0;
    
    const purchasedItems = user.purchased_items || [];
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item && item.price) {
        itemsValue += item.price;
      }
    });

    const investmentsValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
    const myNetWorth = cashOnHand + itemsValue + investmentsValue;

    // 1. LEADERBOARD POSITION - Based on NETWORTH (not coins!)
    if (user.user_type === 'student') {
      const studentEntries = allLeaderboardEntries.filter(e => e.user_type === 'student');
      
      // Calculate networth for each student
      const leaderboardWithNetworth = await Promise.all(
        studentEntries.map(async (entry) => {
          try {
            const studentInvestments = await base44.entities.Investment.filter({ 
              student_email: entry.student_email 
            }).catch(() => []);
            
            const studentCash = entry.coins || 0;
            const studentItems = (entry.purchased_items || []).reduce((sum, itemId) => {
              const item = AVATAR_ITEMS[itemId];
              return sum + (item?.price || 0);
            }, 0);
            const studentInvValue = studentInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
            
            return {
              ...entry,
              networth: studentCash + studentItems + studentInvValue
            };
          } catch (error) {
            console.error(`Error calculating networth for ${entry.student_email}:`, error);
            return {
              ...entry,
              networth: entry.coins || 0
            };
          }
        })
      );
      
      // Sort by networth
      leaderboardWithNetworth.sort((a, b) => b.networth - a.networth);
      const myPosition = leaderboardWithNetworth.findIndex(e => e.student_email === user.email) + 1;
      
      if (myPosition === 1) {
        tips.push(`🥇 אנחנו במקום הראשון! בוא נשמור על התואר! 👑`);
      } else if (myPosition === 2) {
        tips.push(`🥈 אנחנו במקום השני! עוד קצת ונהיה ראשונים! 💪`);
      } else if (myPosition === 3) {
        tips.push(`🥉 אנחנו במקום השלישי! בוא נשמור על הפודיום! 🔥`);
      } else if (myPosition > 3 && myPosition <= 10) {
        tips.push(`🏆 אנחנו במקום #${myPosition}! עוד קצת מאמץ ונגיע לטופ 3 💪`);
      } else if (myPosition > 10) {
        tips.push(`📊 אנחנו במקום #${myPosition} - בוא נשתפר! כל שיעור, תרגיל והשקעה מקדמים אותנו 🚀`);
      }
    }

    // 2. Check for hourly bonus items (work optimization)
    const hasLowHourlyBonus = purchasedItems.length < 3;
    if (hasLowHourlyBonus && cashOnHand >= 400) {
      tips.push("💡 קנה פריטים שמביאים מטבעות לשעה! כל פריט נותן בונוס כשאתה עובד 💰");
    }

    // 3. Investment tip (inflation protection)
    const totalInvested = investments.reduce((sum, inv) => sum + inv.invested_amount, 0);
    if (cashOnHand > 200 && totalInvested === 0) {
      tips.push("🏦 השקע את הכסף בהשקעות! כל יום יש אינפלציה של 1% על העובר ושב - השקעות מגנות מזה ומרוויחות 📈");
    } else if (cashOnHand > 500 && totalInvested < cashOnHand) {
      tips.push("💸 עדיף להשקיע בבורסה מאשר להחזיק מזומן! אינפלציה אוכלת 1% ביום מהכסף שלנו 📉");
    }

    // 4. Work reminder
    if (!user.is_working && cashOnHand < 100) {
      tips.push("⏰ שלח אותי לעבוד! זמן זה כסף - אני יכול להרוויח מטבעות בזמן שאתה עושה דברים אחרים 💼");
    }

    // 5. Surveys tip
    const completedSurveys = participations.filter(p => p.survey_completed).length;
    const attendedLessons = participations.filter(p => p.attended).length;
    if (attendedLessons > completedSurveys && completedSurveys < attendedLessons) {
      tips.push("📝 יש לך סקרים למלא על השיעורים! זה כסף קל - 20 מטבעות לסקר 🎯");
    }

    // 6. Next level progress
    const currentLevel = calculateLevel(user.total_lessons || 0);
    const progress = getCurrentLevelProgress(user.total_lessons || 0);
    if (currentLevel < 6) {
      tips.push(`🌟 אני תכף רמה ${currentLevel + 1}! עוד ${progress.needed - progress.current} שיעורים ונתקדם 🎓`);
    }

    // 7. Math & Vocabulary practice
    const masteredWords = wordProgress.filter(w => w.mastered).length;
    const masteredMath = mathProgress.filter(m => m.mastered).length;
    if (masteredWords < 10) {
      tips.push("📚 תרגול אנגלית זאת דרך מצוינת להרוויח מטבעות! כל מילה ששולט בה = 3-9 מטבעות 🔤");
    }
    if (masteredMath < 10) {
      tips.push("🔢 תרגילים בחשבון זאת דרך מעולה למקסם את השווי שלנו! כל תרגיל נכון מרוויח מטבעות 💯");
    }

    // 8. Low coins warning
    if (cashOnHand < 50 && !user.is_working) {
      tips.push("⚠️ הכסף שלנו נגמר! שלח אותי לעבוד או תפתור כמה תרגילי מתמטיקה 💪");
    }

    // 9. Investment profit tip
    if (investments.length > 0) {
      const totalValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
      const profit = totalValue - totalInvested;
      if (profit > 50) {
        tips.push(`💎 ההשקעות שלנו מרוויחות! יש לנו רווח של ${Math.round(profit)} מטבעות 🎉`);
      } else if (profit < -50) {
        tips.push(`📉 ההשקעות שלנו מפסידות... אולי כדאי למכור ולהשקיע במשהו יותר יציב? 🤔`);
      }
    }

    // Return a random tip if we have any, otherwise return a generic encouraging message
    if (tips.length > 0) {
      return tips[Math.floor(Math.random() * tips.length)];
    }

    // Fallback messages
    const fallbacks = [
      "💪 בוא נמשיך להתקדם! כל שיעור מביא אותנו קדימה",
      "🎯 אני כאן לעזור לך להצליח!",
      "✨ ביחד אנחנו הולכים רחוק!"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];

  } catch (error) {
    console.error("Error generating smart tip:", error);
    return "💡 בוא נמשיך ללמוד ולהשתפר!";
  }
};

export default function Avatar({ stage, totalLessons, equippedItems }) {
  const [currentMessage, setCurrentMessage] = React.useState("טוען...");
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Generate smart tip
      const tip = await generateSmartTip(userData, equippedItems);
      setCurrentMessage(tip);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const currentLevel = calculateLevel(totalLessons);
  const progress = getCurrentLevelProgress(totalLessons);
  const isMaxLevel = currentLevel >= 6;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6 sm:mb-8"
    >
      <Card className="bg-white/10 backdrop-blur-md border-white/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div>

        <div className="relative p-4 sm:p-6">
          {/* Avatar Name & Level */}
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
              {user?.avatar_name || "טוען..."}
            </h2>
            {isMaxLevel ? (
              <>
                <p className="text-yellow-300 font-bold text-lg">
                  ⭐ רמה מקסימלית! ⭐
                </p>
                <p className="text-white/70 text-sm mt-1">
                  {totalLessons} שיעורים בסך הכל
                </p>
              </>
            ) : (
              <>
                <p className="text-white/80 text-sm">
                  רמה {currentLevel} • {progress.current}/{progress.needed} שיעורים
                </p>
                <p className="text-white/60 text-xs mt-1">
                  סה״כ {totalLessons} שיעורים
                </p>
              </>
            )}
          </div>

          {/* Progress Bar - Discrete segments */}
          {!isMaxLevel && (
            <div className="mb-4 sm:mb-6">
              <div className="flex gap-0.5 sm:gap-1">
                {Array.from({ length: progress.needed }).map((_, index) => (
                  <motion.div
                    key={index}
                    className="flex-1 h-2 sm:h-3 rounded-full overflow-hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div
                      className={`h-full ${
                        index < progress.current
                          ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                          : "bg-white/20"
                      } transition-all duration-300`}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Avatar Display */}
          <div className="flex justify-center mb-4 sm:mb-6 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-2xl animate-pulse"></div>
            <div className="scale-90 sm:scale-100">
              <TamagotchiAvatar
                equippedItems={equippedItems}
                size="large"
                showBackground={true}
                avatarStage={currentLevel}
                userEmail={user?.email}
              />
            </div>
          </div>

          {/* Speech Bubble with Smart Tips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-xl">
              <p className="text-gray-800 font-medium text-center text-sm sm:text-base">{currentMessage}</p>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"></div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}