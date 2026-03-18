import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, Coins, Rocket, Lightbulb, TrendingUp, Building, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "../avatar/TamagotchiAvatar";
import { updateNetWorth } from "../utils/networthCalculator";
import { syncLeaderboardEntry } from "../utils/leaderboardSync";

const JOBS = [
  {
    id: "lemonade",
    name: "דוכן לימונדה",
    icon: "🍋",
    minStage: 0,
    coinsPerHour: 10,
    color: "from-yellow-400 to-amber-400",
    description: "עסק קטן ומתוק!"
  },
  {
    id: "newspaper",
    name: "משלוח עיתונים",
    icon: "📰",
    minStage: 2,
    coinsPerHour: 20,
    color: "from-blue-400 to-cyan-400",
    description: "מחלק חדשות בשכונה"
  },
  {
    id: "tutor",
    name: "מורה פרטי",
    icon: "📚",
    minStage: 3,
    coinsPerHour: 35,
    color: "from-green-400 to-emerald-400",
    description: "עוזר לילדים ללמוד"
  },
  {
    id: "digital_freelancer",
    name: "פרילנסר דיגיטלי",
    icon: "💼",
    minStage: 4,
    coinsPerHour: 45,
    color: "from-cyan-400 to-blue-400",
    description: "עובד עצמאי בתחום הדיגיטל"
  },
  {
    id: "app_developer",
    name: "מפתח אפליקציות",
    icon: "💻",
    minStage: 5,
    coinsPerHour: 60,
    color: "from-purple-400 to-pink-400",
    description: "בונה אפליקציות מגניבות"
  },
  {
    id: "startup_founder",
    name: "מייסד סטארטאפ",
    icon: "🚀",
    minStage: 6,
    coinsPerHour: 100,
    color: "from-orange-400 to-red-400",
    description: "מנהל חברה משלך!"
  },
  {
    id: "ceo",
    name: "מנכ\"ל חברה",
    icon: "👔",
    minStage: 7,
    coinsPerHour: 150,
    color: "from-yellow-500 to-orange-500",
    description: "ראש חברה גדולה!"
  }
];

export default function AvatarWork({ userData, onWorkComplete }) {
  const [workStatus, setWorkStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadWorkStatus();
  }, [userData]);

  useEffect(() => {
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

  const loadWorkStatus = () => {
    if (!userData) return;

    const status = userData.work_status || null;
    if (status && status.isWorking) {
      setWorkStatus(status);
      const now = Date.now();
      setTimeLeft(Math.max(0, status.returnTime - now));
    } else {
      setWorkStatus(null);
    }
  };

  const getCurrentStage = () => {
    const lessons = userData?.total_lessons || 0;
    if (lessons < 4) return 1;
    if (lessons < 10) return 2;
    if (lessons < 18) return 3;
    if (lessons < 28) return 4;
    if (lessons < 40) return 5;
    return 6;
  };

  const availableJobs = JOBS.filter(job => job.minStage <= getCurrentStage());

  const sendToWork = async (job) => {
    if (isSending || !userData) return;
    setIsSending(true);
    try {
    const returnTime = Date.now() + (60 * 60 * 1000); // 1 hour

    // Calculate total earnings including hourly bonuses from items
    const purchasedItems = userData.purchased_items || [];
    let hourlyBonus = 0;
    
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item && item.hourlyBonus) {
        hourlyBonus += item.hourlyBonus;
      }
    });

    const totalCoinsToEarn = job.coinsPerHour + hourlyBonus;
    
    // Increment work hours counter (number of times sent to work)
    const currentWorkHours = userData.total_work_hours || 0;

    await base44.auth.updateMe({
      work_status: {
        isWorking: true,
        jobId: job.id,
        jobName: job.name,
        coinsToEarn: totalCoinsToEarn,
        returnTime: returnTime
      },
      total_work_hours: currentWorkHours + 1
    });

    // Update leaderboard with work hours
    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData?.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          total_work_hours: currentWorkHours + 1
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    setWorkStatus({
      isWorking: true,
      jobId: job.id,
      jobName: job.name,
      coinsToEarn: totalCoinsToEarn,
      returnTime: returnTime
    });

    const bonusText = hourlyBonus > 0 ? ` (כולל +${hourlyBonus} מפריטים!)` : '';
    toast.success(`${userData.avatar_name} יצא לעבוד כ${job.name}! 💼${bonusText}`);
    } finally {
      setIsSending(false);
    }
  };

  const completeWork = async () => {
    if (!workStatus) return;

    let coinsToAdd = workStatus.coinsToEarn;
    
    // Check if user is work king and add bonus - use LeaderboardEntry instead of User
    try {
      const allLeaderboardEntries = await base44.entities.LeaderboardEntry.list();
      let maxWorkEarnings = 0;
      let workKingEmail = null;
      
      allLeaderboardEntries.forEach(entry => {
        const earnings = entry.total_work_earnings || 0;
        if (earnings > maxWorkEarnings) {
          maxWorkEarnings = earnings;
          workKingEmail = entry.student_email;
        }
      });
      
      if (workKingEmail === userData?.email && maxWorkEarnings > 0) {
        coinsToAdd += 5; // Work king bonus!
      }
    } catch (error) {
      console.error("Error checking work king:", error);
    }
    
    // Apply income tax (10% on work earnings)
    const incomeTax = Math.floor(coinsToAdd * 0.10);
    const coinsAfterTax = coinsToAdd - incomeTax;
    
    const totalWorkEarnings = (userData.total_work_earnings || 0) + coinsToAdd;
    const oldCoins = userData.coins || 0;
    let currentCoins = oldCoins;
    
    // Get common values for all logs
    const investmentsValue = userData.investments_value || 0;
    const userNetworth = userData.total_networth || 0;
    
    // Get leaderboard networth
    let leaderboardNetworth = 0;
    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData?.email });
      if (leaderboardEntries.length > 0) {
        leaderboardNetworth = leaderboardEntries[0].total_networth || 0;
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
    
    // Log work earnings
    try {
      const { logCoinChange } = await import("../utils/coinLogger");
      await logCoinChange(userData?.email, oldCoins, oldCoins + coinsToAdd, "השלמת עבודה", {
        source: 'AvatarWork',
        job: workStatus.jobName,
        coinsEarned: coinsToAdd,
        investments_value: investmentsValue,
        user_networth: userNetworth,
        leaderboard_networth: leaderboardNetworth
      });
    } catch (logError) {
      console.error("Error logging work coins:", logError);
    }
    
    currentCoins = oldCoins + coinsToAdd;
    
    // Log income tax
    if (incomeTax > 0) {
      try {
        const { logCoinChange } = await import("../utils/coinLogger");
        await logCoinChange(userData?.email, currentCoins, currentCoins - incomeTax, "מס הכנסה", {
          source: 'AvatarWork',
          job: workStatus.jobName,
          taxRate: "10%",
          taxAmount: incomeTax,
          investments_value: investmentsValue,
          user_networth: userNetworth,
          leaderboard_networth: leaderboardNetworth
        });
      } catch (logError) {
        console.error("Error logging income tax:", logError);
      }
    }
    
    const newCoins = currentCoins - incomeTax;
    
    // Limit debt to -300
    const finalCoins = Math.max(newCoins, -300);

    await base44.auth.updateMe({
      coins: finalCoins,
      total_work_earnings: totalWorkEarnings,
      total_income_tax: (userData.total_income_tax || 0) + incomeTax,
      work_status: null
    });

    // Update net worth
    const newNetWorth = await updateNetWorth(userData?.email);

    // Sync to LeaderboardEntry (including total_work_hours)
    await syncLeaderboardEntry(userData?.email, {
      coins: finalCoins,
      total_work_earnings: totalWorkEarnings,
      total_income_tax: (userData.total_income_tax || 0) + incomeTax,
      total_networth: newNetWorth,
      total_work_hours: userData.total_work_hours || 0
    });

    toast.success(`${userData.avatar_name} חזר מהעבודה! קיבלת ${coinsAfterTax} סטארטקוין (לאחר מס הכנסה 10%) 🎉`);
    setWorkStatus(null);
    if (onWorkComplete) onWorkComplete();
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalWorkEarnings = userData?.total_work_earnings || 0;

  if (workStatus && workStatus.isWorking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 backdrop-blur-md border-2 border-indigo-400/60 shadow-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar Icon */}
              <div className="flex-shrink-0 text-5xl">
                {JOBS.find(j => j.id === workStatus.jobId)?.icon || "💼"}
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-white font-black text-lg mb-1">
                  {userData?.avatar_name} עובד 💼
                </p>
                <p className="text-indigo-200 font-bold text-base mb-3">
                  {workStatus.jobName}
                </p>
                
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 inline-flex">
                  <Clock className="w-5 h-5 text-yellow-300" />
                  <p className="text-white font-black text-xl">
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>

              {/* Coins */}
              <div className="flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl px-3 py-2 border-2 border-yellow-300/50 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-black text-lg whitespace-nowrap">
                    {workStatus.coinsToEarn}+
                  </p>
                  <Coins className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {timeLeft === 0 && (
              <Button
                onClick={completeWork}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black text-lg py-4 shadow-lg"
              >
                אסוף סטארטקוין! 💰
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Get current job based on stage
  const currentStage = getCurrentStage();
  const currentJob = [...availableJobs].reverse()[0]; // Get the highest available job
  
  if (!currentJob) return null;

  // Calculate total earnings with bonuses
  const purchasedItems = userData?.purchased_items || [];
  let hourlyBonus = 0;
  
  purchasedItems.forEach(itemId => {
    const item = AVATAR_ITEMS[itemId];
    if (item && item.hourlyBonus) {
      hourlyBonus += item.hourlyBonus;
    }
  });

  const totalEarnings = currentJob.coinsPerHour + hourlyBonus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className={`bg-gradient-to-br ${currentJob.color} backdrop-blur-md border-2 border-white/30 shadow-2xl`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">
              {currentJob.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black text-2xl mb-1">
                {currentJob.name}
              </h3>
              <p className="text-white/90 text-sm">
                {currentJob.description}
              </p>
            </div>
          </div>

          <Button
            onClick={() => sendToWork(currentJob)}
            disabled={isSending}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-xl py-6 shadow-lg backdrop-blur-sm border-2 border-white/40"
          >
            <Briefcase className="w-6 h-6 ml-2" />
            שלח את {userData?.avatar_name} לעבוד
            <div className="mr-auto flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
              <Coins className="w-5 h-5" />
              <span className="font-black text-lg">{totalEarnings}/שעה</span>
              {hourlyBonus > 0 && (
                <span className="text-xs bg-green-500/50 px-2 py-0.5 rounded-full">
                  +{hourlyBonus}
                </span>
              )}
            </div>
          </Button>

          {totalWorkEarnings > 0 && (
            <div className="mt-3 bg-white/10 rounded-lg px-4 py-2 flex items-center justify-center gap-2">
              <span className="text-white/80 text-sm">
                סה״כ הרווחתי מעבודה:
              </span>
              <span className="text-white font-black text-lg">
                {totalWorkEarnings} 🪙
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}