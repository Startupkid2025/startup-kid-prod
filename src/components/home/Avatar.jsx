import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X, Briefcase, Clock, Coins } from "lucide-react";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";
import { base44 } from "@/api/base44Client";
import { AVATAR_ITEMS } from "../avatar/TamagotchiAvatar";
import { toast } from "sonner";
import { updateNetWorth } from "../utils/networthCalculator";
import { syncLeaderboardEntry } from "../utils/leaderboardSync";

const JOBS = [
  { id: "lemonade", name: "דוכן לימונדה", icon: "🍋", minStage: 0, coinsPerHour: 10 },
  { id: "newspaper", name: "משלוח עיתונים", icon: "📰", minStage: 2, coinsPerHour: 20 },
  { id: "tutor", name: "מורה פרטי", icon: "📚", minStage: 3, coinsPerHour: 35 },
  { id: "digital_freelancer", name: "פרילנסר דיגיטלי", icon: "💼", minStage: 4, coinsPerHour: 45 },
  { id: "app_developer", name: "מפתח אפליקציות", icon: "💻", minStage: 5, coinsPerHour: 60 },
  { id: "startup_founder", name: "מייסד סטארטאפ", icon: "🚀", minStage: 6, coinsPerHour: 100 }
];

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
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newAvatarName, setNewAvatarName] = React.useState("");
  const [workStatus, setWorkStatus] = React.useState(null);
  const [timeLeft, setTimeLeft] = React.useState(0);

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    if (workStatus && workStatus.isWorking) {
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, workStatus.returnTime - now);
        setTimeLeft(remaining);

        if (remaining === 0) {
          completeWork();
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [workStatus]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setNewAvatarName(userData.avatar_name || "");
      
      // Check work status
      const status = userData.work_status || null;
      if (status && status.isWorking) {
        setWorkStatus(status);
        const now = Date.now();
        setTimeLeft(Math.max(0, status.returnTime - now));
      } else {
        setWorkStatus(null);
      }
      
      // Generate smart tip
      const tip = await generateSmartTip(userData, equippedItems);
      setCurrentMessage(tip);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const getCurrentStage = () => {
    return calculateLevel(user?.total_lessons || 0);
  };

  const sendToWork = async () => {
    const currentStage = getCurrentStage();
    const availableJobs = JOBS.filter(job => job.minStage <= currentStage);
    const currentJob = [...availableJobs].reverse()[0];
    
    if (!currentJob) return;

    const returnTime = Date.now() + (60 * 60 * 1000); // 1 hour

    const purchasedItems = user.purchased_items || [];
    let hourlyBonus = 0;
    
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item && item.hourlyBonus) {
        hourlyBonus += item.hourlyBonus;
      }
    });

    const totalCoinsToEarn = currentJob.coinsPerHour + hourlyBonus;
    const currentWorkHours = user.total_work_hours || 0;

    await base44.auth.updateMe({
      work_status: {
        isWorking: true,
        jobId: currentJob.id,
        jobName: currentJob.name,
        coinsToEarn: totalCoinsToEarn,
        returnTime: returnTime
      },
      total_work_hours: currentWorkHours + 1
    });

    setWorkStatus({
      isWorking: true,
      jobId: currentJob.id,
      jobName: currentJob.name,
      coinsToEarn: totalCoinsToEarn,
      returnTime: returnTime
    });

    const bonusText = hourlyBonus > 0 ? ` (כולל +${hourlyBonus} מפריטים!)` : '';
    toast.success(`${user.avatar_name} יצא לעבוד כ${currentJob.name}! 💼${bonusText}`);
  };

  const completeWork = async () => {
    if (!workStatus) return;

    let coinsToAdd = workStatus.coinsToEarn;
    
    const totalWorkEarnings = (user.total_work_earnings || 0) + coinsToAdd;
    const newCoins = (user.coins || 0) + coinsToAdd;
    const finalCoins = Math.max(newCoins, -300);

    await base44.auth.updateMe({
      coins: finalCoins,
      total_work_earnings: totalWorkEarnings,
      work_status: null
    });

    const newNetWorth = await updateNetWorth(user.email);

    await syncLeaderboardEntry(user.email, {
      coins: finalCoins,
      total_work_earnings: totalWorkEarnings,
      total_networth: newNetWorth,
      total_work_hours: user.total_work_hours || 0
    });

    toast.success(`${user.avatar_name} חזר מהעבודה! קיבלת ${coinsToAdd} סטארטקוין! 🎉`);
    setWorkStatus(null);
    loadUser();
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSaveAvatarName = async () => {
    if (!newAvatarName.trim()) {
      toast.error("השם לא יכול להיות ריק");
      return;
    }

    try {
      await base44.auth.updateMe({
        avatar_name: newAvatarName.trim()
      });

      toast.success(`השם השתנה ל-${newAvatarName.trim()}! 🎉`);
      setIsEditingName(false);
      loadUser();
    } catch (error) {
      console.error("Error updating avatar name:", error);
      toast.error("שגיאה בשינוי השם");
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
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Input
                  value={newAvatarName}
                  onChange={(e) => setNewAvatarName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-9 text-center font-bold max-w-[200px]"
                  placeholder="שם הסטארטאמון"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveAvatarName();
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setNewAvatarName(user?.avatar_name || "");
                    }
                  }}
                />
                <Button
                  onClick={handleSaveAvatarName}
                  size="sm"
                  className="bg-green-500/30 hover:bg-green-500/50 h-9 w-9 p-0"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setIsEditingName(false);
                    setNewAvatarName(user?.avatar_name || "");
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-white/70 hover:text-white h-9 w-9 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {user?.avatar_name || "טוען..."}
                </h2>
                <Button
                  onClick={() => setIsEditingName(true)}
                  size="sm"
                  variant="ghost"
                  className="text-white/50 hover:text-white/80 h-7 w-7 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            )}
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
                equippedItems={equippedItems || {}}
                size="large"
                showBackground={true}
                avatarStage={currentLevel}
                userEmail={user?.email}
              />
            </div>
          </div>

          {/* Speech Bubble with Work Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-xl border-2 border-purple-200">
              {workStatus && workStatus.isWorking ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-4xl">
                        {JOBS.find(j => j.id === workStatus.jobId)?.icon || "💼"}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-purple-900">
                          {workStatus.jobName}
                        </h3>
                        <p className="text-xs text-purple-600">בעבודה כרגע...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-200">
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-black text-purple-900">
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-purple-200"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-yellow-600">{workStatus.coinsToEarn}</span>
                        <Coins className="w-5 h-5 text-yellow-500" />
                      </div>
                    </div>
                  </div>

                  {timeLeft === 0 && (
                    <Button
                      onClick={completeWork}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black text-base py-6"
                    >
                      🎉 אסוף סטארטקוין!
                    </Button>
                  )}
                </div>
              ) : (() => {
                const currentStage = getCurrentStage();
                const availableJobs = JOBS.filter(job => job.minStage <= currentStage);
                const currentJob = [...availableJobs].reverse()[0];
                
                if (!currentJob) return <p className="text-gray-800 font-medium text-center text-sm sm:text-base">{currentMessage}</p>;

                const purchasedItems = user?.purchased_items || [];
                let hourlyBonus = 0;
                
                purchasedItems.forEach(itemId => {
                  const item = AVATAR_ITEMS[itemId];
                  if (item && item.hourlyBonus) {
                    hourlyBonus += item.hourlyBonus;
                  }
                });

                const totalEarnings = currentJob.coinsPerHour + hourlyBonus;
                const totalWorkEarnings = user?.total_work_earnings || 0;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-4xl">
                          {currentJob.icon}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-purple-900">
                            {currentJob.name}
                          </h3>
                          <p className="text-xs text-purple-600">עבודה זמינה</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={sendToWork}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-5 text-base"
                    >
                      <Briefcase className="w-5 h-5 ml-2" />
                      שלח לעבודה
                      <div className="mr-auto bg-white/20 rounded-lg px-3 py-1 flex items-center gap-1">
                        <span className="font-black">{totalEarnings}</span>
                        <Coins className="w-4 h-4" />
                        <span className="text-sm">/שעה</span>
                      </div>
                    </Button>

                    {totalWorkEarnings > 0 && (
                      <div className="bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-lg px-3 py-2 border border-green-300/50">
                        <p className="text-center text-sm">
                          <span className="text-green-700 font-medium">סה״כ הרווחתי מעבודה:</span>
                          <span className="text-green-900 font-black text-lg mr-2">{totalWorkEarnings} 🪙</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-purple-100"></div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}