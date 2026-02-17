import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X, Briefcase, Clock, Coins, Moon, UtensilsCrossed, Zap, Heart } from "lucide-react";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [sleepStatus, setSleepStatus] = React.useState(null);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [energy, setEnergy] = React.useState(100);
  const [hunger, setHunger] = React.useState(0);

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
    
    if (sleepStatus && sleepStatus.isSleeping) {
      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, sleepStatus.returnTime - now);
        setTimeLeft(remaining);

        if (remaining === 0) {
          wakeUp();
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [workStatus, sleepStatus]);

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

      // Check sleep status
      const sleepStat = userData.sleep_status || null;
      if (sleepStat && sleepStat.isSleeping) {
        setSleepStatus(sleepStat);
        const now = Date.now();
        setTimeLeft(Math.max(0, sleepStat.returnTime - now));
      } else {
        setSleepStatus(null);
      }

      // Update hunger based on time passed
      await updateHungerBasedOnTime(userData);

      // Load energy and hunger after potential update
      const updatedUser = await base44.auth.me();
      setEnergy(updatedUser.energy ?? 100);
      setHunger(updatedUser.hunger ?? 0);

      // Generate smart tip
      const tip = await generateSmartTip(updatedUser, equippedItems);
      setCurrentMessage(tip);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const updateHungerBasedOnTime = async (userData) => {
    try {
      const now = Date.now();
      const lastHungerUpdate = userData.last_hunger_update || now;
      const hoursPassed = Math.floor((now - lastHungerUpdate) / (60 * 60 * 1000));

      if (hoursPassed >= 1) {
        const hungerIncrease = hoursPassed * 10;
        const newHunger = Math.min(100, (userData.hunger || 0) + hungerIncrease);

        await base44.auth.updateMe({
          hunger: newHunger,
          last_hunger_update: now
        });
      }
    } catch (error) {
      console.error("Error updating hunger:", error);
    }
  };

  const getCurrentStage = () => {
    return calculateLevel(user?.total_lessons || 0);
  };

  const sendToWork = async () => {
    // Check if tired
    if (energy < 30) {
      toast.error(`${user.avatar_name} עייף מדי! שלח אותו לישון קודם 😴`);
      return;
    }
    
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

    const baseCoins = currentJob.coinsPerHour + hourlyBonus;

    // Apply hunger penalty to work efficiency
    let workEfficiency = 1.0;
    if (hunger >= 80) {
      workEfficiency = 0.25; // 25% efficiency when very hungry
    } else if (hunger >= 60) {
      workEfficiency = 0.5; // 50% efficiency when hungry
    } else if (hunger >= 30) {
      workEfficiency = 0.75; // 75% efficiency when somewhat hungry
    }
    // else 100% efficiency when well-fed (hunger < 30)

    const totalCoinsToEarn = Math.round(baseCoins * workEfficiency);
    const currentWorkHours = user.total_work_hours || 0;

    // Reduce energy when going to work
    const newEnergy = Math.max(0, energy - 20);

    await base44.auth.updateMe({
      work_status: {
        isWorking: true,
        jobId: currentJob.id,
        jobName: currentJob.name,
        coinsToEarn: totalCoinsToEarn,
        baseCoins: baseCoins,
        workEfficiency: workEfficiency,
        returnTime: returnTime
      },
      total_work_hours: currentWorkHours + 1,
      energy: newEnergy,
      hunger: Math.min(100, hunger + 15)
    });

    setEnergy(newEnergy);
    setHunger(Math.min(100, hunger + 15));
    setTimeLeft(60 * 60 * 1000); // Set initial time left

    setWorkStatus({
      isWorking: true,
      jobId: currentJob.id,
      jobName: currentJob.name,
      coinsToEarn: totalCoinsToEarn,
      baseCoins: baseCoins,
      workEfficiency: workEfficiency,
      returnTime: returnTime
    });

    const bonusText = hourlyBonus > 0 ? ` (+${hourlyBonus} בונוס פריטים)` : '';
    const efficiencyText = workEfficiency < 1 ? ` ⚠️ יעילות ${Math.round(workEfficiency * 100)}% בגלל רעב!` : '';
    toast.success(`${user.avatar_name} יצא לעבוד כ${currentJob.name}! 💼${bonusText}${efficiencyText}`);
  };

  const completeWork = async () => {
    if (!workStatus) return;

    let coinsToAdd = workStatus.coinsToEarn;
    
    const totalWorkEarnings = (user.total_work_earnings || 0) + coinsToAdd;
    const newCoins = (user.coins || 0) + coinsToAdd;
    const finalCoins = Math.max(newCoins, -300);

    // Calculate net worth
    const userInvestments = await base44.entities.Investment.filter({ student_email: user.email });
    const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
    
    const purchasedItems = user.purchased_items || [];
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) itemsValue += item.price || 0;
    });
    
    const totalNetworth = finalCoins + itemsValue + investmentsValue;

    await base44.auth.updateMe({
      coins: finalCoins,
      total_networth: totalNetworth,
      total_work_earnings: totalWorkEarnings,
      work_status: null
    });

    // Update leaderboard directly
    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          coins: finalCoins,
          total_networth: totalNetworth,
          investments_value: investmentsValue,
          items_value: itemsValue,
          total_work_earnings: totalWorkEarnings,
          total_work_hours: user.total_work_hours || 0
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    toast.success(`${user.avatar_name} חזר מהעבודה! קיבלת ${coinsToAdd} סטארטקוין! 🎉`);
    setWorkStatus(null);
    loadUser();
  };
  
  const sendToSleep = async () => {
    const returnTime = Date.now() + (8 * 60 * 60 * 1000); // 8 hours

    await base44.auth.updateMe({
      sleep_status: {
        isSleeping: true,
        returnTime: returnTime
      }
    });

    setSleepStatus({
      isSleeping: true,
      returnTime: returnTime
    });

    toast.success(`${user.avatar_name} הלך לישון! לילה טוב 🌙`);
  };
  
  const wakeUp = async () => {
    if (!sleepStatus) return;

    await base44.auth.updateMe({
      energy: 100,
      sleep_status: null
    });

    setEnergy(100);
    setSleepStatus(null);
    toast.success(`${user.avatar_name} התעורר רענן ומלא אנרגיה! 🌅`);
    loadUser();
  };
  
  const feedAvatar = async () => {
    if (hunger < 30) {
      toast.error("הוא לא רעב עכשיו!");
      return;
    }
    
    const foodCost = 10;
    if ((user.coins || 0) < foodCost) {
      toast.error("אין מספיק מטבעות לקנות אוכל!");
      return;
    }

    const newCoins = (user.coins || 0) - foodCost;
    const newHunger = Math.max(0, hunger - 10);
    const totalFoodExpense = (user.total_food_expense || 0) + foodCost;

    // Calculate net worth
    const userInvestments = await base44.entities.Investment.filter({ student_email: user.email });
    const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
    
    const purchasedItems = user.purchased_items || [];
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) itemsValue += item.price || 0;
    });
    
    const totalNetworth = newCoins + itemsValue + investmentsValue;

    await base44.auth.updateMe({
      coins: newCoins,
      total_networth: totalNetworth,
      hunger: newHunger,
      total_food_expense: totalFoodExpense
    });

    // Update leaderboard directly
    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          coins: newCoins,
          total_networth: totalNetworth,
          investments_value: investmentsValue,
          items_value: itemsValue,
          total_food_expense: totalFoodExpense
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    setHunger(newHunger);
    toast.success(`${user.avatar_name} אכל והרעב ירד! 🍎 (-10 מטבעות)`);
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
  
  // Force re-render when totalLessons changes
  React.useEffect(() => {
    if (user) {
      loadUser();
    }
  }, [totalLessons]);

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
                  סטארטאמון: {user?.avatar_name || "טוען..."}
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
                  רמה {currentLevel}{workStatus?.isWorking && ` • ${workStatus.jobName}`} • {progress.current}/{progress.needed} שיעורים
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
                isWorking={workStatus?.isWorking || sleepStatus?.isSleeping || false}
              />
            </div>
          </div>
          
          {/* Energy and Hunger Bars */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <motion.div 
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${
                  energy > 60 ? 'bg-emerald-500/30' :
                  energy > 30 ? 'bg-yellow-500/30' :
                  'bg-red-500/30'
                }`}>
                  <Zap className={`w-4 h-4 ${
                    energy > 60 ? 'text-emerald-300' :
                    energy > 30 ? 'text-yellow-300' :
                    'text-red-300'
                  }`} />
                </div>
                <span className="text-white/90 text-xs font-bold flex-1">אנרגיה</span>
                <span className="text-white font-black text-sm">{energy}%</span>
              </div>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full ${
                    energy > 60 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                    energy > 30 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${energy}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${
                  hunger < 30 ? 'bg-emerald-500/30' :
                  hunger < 70 ? 'bg-orange-500/30' :
                  'bg-red-500/30'
                }`}>
                  <Heart className={`w-4 h-4 ${
                    hunger < 30 ? 'text-emerald-300' :
                    hunger < 70 ? 'text-orange-300' :
                    'text-red-300'
                  }`} />
                </div>
                <span className="text-white/90 text-xs font-bold flex-1">שובע</span>
                <span className="text-white font-black text-sm">{100 - hunger}%</span>
              </div>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full ${
                    hunger < 30 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                    hunger < 70 ? 'bg-gradient-to-r from-orange-400 to-yellow-400' :
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - hunger}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={sendToSleep}
                disabled={sleepStatus?.isSleeping || workStatus?.isWorking || energy > 80}
                className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-1">
                  <Moon className="w-5 h-5" />
                  <span className="text-xs">לך לישון (8 שעות)</span>
                </div>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={feedAvatar}
                disabled={sleepStatus?.isSleeping || workStatus?.isWorking || hunger < 30}
                className="w-full bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-1">
                  <UtensilsCrossed className="w-5 h-5" />
                  <span className="text-xs">אוכל (10 🪙)</span>
                </div>
              </Button>
            </motion.div>
          </div>

          {/* Speech Bubble with Work Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            {sleepStatus && sleepStatus.isSleeping ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-indigo-500/90 to-purple-500/90 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-white/30 shadow-lg">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Moon className="w-5 h-5 text-white" />
                      <span className="text-2xl font-black text-white">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    <div className="w-0.5 h-8 bg-white/40 rounded-full"></div>
                    <span className="text-xl font-black text-white">😴 ישן</span>
                  </div>
                </div>

                {timeLeft === 0 && (
                  <Button
                    onClick={wakeUp}
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-black text-base py-6 shadow-xl"
                  >
                    ☀️ העיר אותו!
                  </Button>
                )}
              </div>
            ) : workStatus && workStatus.isWorking ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-white/30 shadow-lg">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-white" />
                      <span className="text-2xl font-black text-white">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    <div className="w-0.5 h-8 bg-white/40 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-yellow-200">{workStatus.coinsToEarn}</span>
                      <Coins className="w-5 h-5 text-yellow-200" />
                    </div>
                  </div>
                </div>

                {timeLeft === 0 && (
                  <Button
                    onClick={completeWork}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white font-black text-base py-6 shadow-xl"
                  >
                    🎉 אסוף סטארטקוין!
                  </Button>
                )}
              </div>
            ) : (() => {
              const currentStage = getCurrentStage();
              const availableJobs = JOBS.filter(job => job.minStage <= currentStage);
              const currentJob = [...availableJobs].reverse()[0];
              
              if (!currentJob) return (
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-2xl border-2 border-white/30">
                  <p className="text-white font-medium text-center text-sm sm:text-base drop-shadow-lg">{currentMessage}</p>
                </div>
              );

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
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-2xl border-2 border-white/30">
                <div className="space-y-3">
                  <div className="flex flex-col items-center mb-2">
                    <div className="text-4xl drop-shadow-lg mb-2">
                      {currentJob.icon}
                    </div>
                    <h3 className="text-base font-black text-white drop-shadow-lg text-center">
                      {currentJob.name}
                    </h3>
                  </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 0 20px rgba(168, 85, 247, 0.4)",
                          "0 0 40px rgba(236, 72, 153, 0.6)",
                          "0 0 20px rgba(168, 85, 247, 0.4)"
                        ]
                      }}
                      transition={{
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="relative rounded-lg overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse opacity-75"></div>
                      <Button
                        onClick={sendToWork}
                        className="w-full relative bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black py-6 text-lg shadow-2xl border-2 border-white/50"
                      >
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                        >
                          <Briefcase className="w-6 h-6 ml-2" />
                        </motion.div>
                        שלח לעבודה! 💼
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mr-auto bg-gradient-to-br from-yellow-300 to-orange-400 rounded-lg px-3 py-1 flex items-center gap-1 shadow-lg border border-yellow-200 cursor-help">
                                <span className="font-black text-white drop-shadow-lg">{currentJob.coinsPerHour}</span>
                                {hourlyBonus > 0 && (
                                  <span className="text-white font-black drop-shadow-lg text-sm">
                                    (+{hourlyBonus} בונוס)
                                  </span>
                                )}
                                <Coins className="w-5 h-5 text-white" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-purple-900 border-purple-700">
                              <div className="text-white">
                                <p className="font-bold mb-1">💰 הרווחים שלך לשעה:</p>
                                <p className="text-sm">• {currentJob.coinsPerHour} מהעבודה</p>
                                {hourlyBonus > 0 && (
                                  <p className="text-sm text-yellow-300">• +{hourlyBonus} מפריטים שקנית! 🎁</p>
                                )}
                                <p className="text-xs text-white/70 mt-2">💡 קנה פריטים בחנות כדי להגדיל את ההרווחים!</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Button>
                    </motion.div>

                    {totalWorkEarnings > 0 && (
                      <div className="bg-gradient-to-r from-emerald-400/30 to-green-400/30 backdrop-blur-md rounded-lg px-3 py-2 border border-white/30">
                        <p className="text-center text-sm">
                          <span className="text-white/90 font-medium">בסה״כ הרווחתי מעבודה:</span>
                          <span className="text-white font-black text-lg mr-2 drop-shadow-lg">{totalWorkEarnings} 🪙</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}