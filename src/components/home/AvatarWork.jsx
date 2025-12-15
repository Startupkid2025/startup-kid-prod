import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, Coins, Rocket, Lightbulb, TrendingUp, Building, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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
    const returnTime = Date.now() + (60 * 60 * 1000); // 1 hour

    // Calculate total earnings including hourly bonuses from items
    const purchasedItems = userData.purchased_items || [];
    let hourlyBonus = 0;
    
    purchasedItems.forEach(itemId => {
      const item = require('../avatar/TamagotchiAvatar').AVATAR_ITEMS[itemId];
      if (item && item.hourlyBonus) {
        hourlyBonus += item.hourlyBonus;
      }
    });

    const totalCoinsToEarn = job.coinsPerHour + hourlyBonus;

    await base44.auth.updateMe({
      work_status: {
        isWorking: true,
        jobId: job.id,
        jobName: job.name,
        coinsToEarn: totalCoinsToEarn,
        returnTime: returnTime
      }
    });

    setWorkStatus({
      isWorking: true,
      jobId: job.id,
      jobName: job.name,
      coinsToEarn: totalCoinsToEarn,
      returnTime: returnTime
    });

    const bonusText = hourlyBonus > 0 ? ` (כולל +${hourlyBonus} מפריטים!)` : '';
    toast.success(`${userData.avatar_name} יצא לעבוד כ${job.name}! 💼${bonusText}`);
  };

  const completeWork = async () => {
    if (!workStatus) return;

    const coinsToAdd = workStatus.coinsToEarn;
    const totalWorkEarnings = (userData.total_work_earnings || 0) + coinsToAdd;

    await base44.auth.updateMe({
      coins: (userData.coins || 0) + coinsToAdd,
      total_work_earnings: totalWorkEarnings,
      work_status: null
    });

    toast.success(`${userData.avatar_name} חזר מהעבודה! קיבלת ${coinsToAdd} מטבעות! 🎉`);
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
              <div className="flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl px-4 py-3 border-2 border-yellow-300/50 shadow-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-white" />
                  <p className="text-white font-black text-xl">
                    +{workStatus.coinsToEarn}
                  </p>
                </div>
              </div>
            </div>

            {timeLeft === 0 && (
              <Button
                onClick={completeWork}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black text-lg py-4 shadow-lg"
              >
                אסוף מטבעות! 💰
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            שלח את {userData?.avatar_name} לעבוד
          </CardTitle>
          <p className="text-white/70 text-sm mt-2">
            בחר עבודה ותרוויח מטבעות! 💼
          </p>
          {totalWorkEarnings > 0 && (
            <div className="mt-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl px-4 py-2 border-2 border-green-300/50 shadow-lg inline-flex items-center gap-2">
              <Coins className="w-4 h-4 text-white" />
              <span className="text-white font-black text-base">
                סה״כ הרווחתי מעבודה: {totalWorkEarnings}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableJobs.map((job) => {
              // Calculate total earnings with bonuses
              const purchasedItems = userData?.purchased_items || [];
              let hourlyBonus = 0;
              
              purchasedItems.forEach(itemId => {
                const item = require('../avatar/TamagotchiAvatar').AVATAR_ITEMS[itemId];
                if (item && item.hourlyBonus) {
                  hourlyBonus += item.hourlyBonus;
                }
              });

              const totalEarnings = job.coinsPerHour + hourlyBonus;

              return (
                <motion.button
                  key={job.id}
                  onClick={() => sendToWork(job)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-gradient-to-br ${job.color} p-4 rounded-xl shadow-lg text-white text-right relative overflow-hidden`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl">{job.icon}</span>
                      <div>
                        <p className="font-bold text-lg">{job.name}</p>
                        <p className="text-xs opacity-90">{job.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 bg-white/20 rounded-lg px-3 py-1 inline-flex">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">{totalEarnings}</span>
                      <span className="text-sm">/ שעה</span>
                      {hourlyBonus > 0 && (
                        <span className="text-xs bg-green-500/50 px-2 py-0.5 rounded-full mr-1">
                          +{hourlyBonus} מפריטים
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Locked Jobs Preview */}
          {JOBS.filter(job => job.minStage > getCurrentStage()).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/70 text-sm mb-3">🔒 עבודות נעולות:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {JOBS.filter(job => job.minStage > getCurrentStage()).map((job) => (
                  <div
                    key={job.id}
                    className="bg-white/5 p-4 rounded-xl border-2 border-white/10 opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{job.icon}</span>
                      <div>
                        <p className="font-bold text-white">{job.name}</p>
                        <p className="text-xs text-white/70">
                          נדרש רמה {job.minStage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-300 text-sm">
                      <Coins className="w-4 h-4" />
                      <span className="font-bold">{job.coinsPerHour}/שעה</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}