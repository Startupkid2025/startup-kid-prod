import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, TrendingUp, User, Shield, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "./components/avatar/TamagotchiAvatar";
import { syncLeaderboardEntry } from "./components/utils/leaderboardSync";
import MaintenancePage from "./components/MaintenancePage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [maintenanceMode, setMaintenanceMode] = React.useState(null);
  const [isLoadingMaintenance, setIsLoadingMaintenance] = React.useState(true);
  const [showLoginReward, setShowLoginReward] = React.useState(false);
  const [loginRewardData, setLoginRewardData] = React.useState(null);

  React.useEffect(() => {
    checkMaintenanceMode();
    loadUser();
    updateLoginStreak();
  }, []); // Only run once on mount

  const checkMaintenanceMode = async () => {
    try {
      const modes = await base44.entities.MaintenanceMode.list();
      if (modes.length > 0) {
        setMaintenanceMode(modes[0]);
      } else {
        // Create default entry
        const newMode = await base44.entities.MaintenanceMode.create({
          is_active: false,
          message: "האפליקציה במצב תחזוקה. נחזור בקרוב!"
        });
        setMaintenanceMode(newMode);
      }
    } catch (error) {
      console.error("Error loading maintenance mode:", error);
    } finally {
      setIsLoadingMaintenance(false);
    }
  };

  const updateLoginStreak = async () => {
    try {
      let user = await base44.auth.me();
      if (!user) return;

      // Initialize new user with starting coins FIRST
      if (user.coins === undefined || user.coins === null) {
        await base44.auth.updateMe({
          coins: 500
        });
        user = await base44.auth.me();
      }

      // Use Jerusalem timezone for date calculations
      const DATE_TZ = "Asia/Jerusalem";
      const fmtIL = new Intl.DateTimeFormat("en-CA", {
        timeZone: DATE_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const today = fmtIL.format(new Date());
      const lastLogin = user.last_login_date;

      if (lastLogin === today) {
        // Already logged in today
        return;
      }
      
      // First time login - initialize without showing dialog
      if (!lastLogin) {
        await base44.auth.updateMe({
          login_streak: 1,
          last_login_date: today,
          total_login_streak_coins: 10
        });
        
        // Sync to LeaderboardEntry
        try {
          const { syncLeaderboardEntry } = await import("./components/utils/leaderboardSync");
          await syncLeaderboardEntry(user.email, {
            login_streak: 1,
            last_login_date: today,
            total_login_streak_coins: 10
          });
        } catch (syncError) {
          console.error("Error syncing first login:", syncError);
        }
        return;
      }

      // Calculate yesterday in Jerusalem timezone
      const todayParts = today.split("-").map(Number);
      const yesterdayDate = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2] - 1));
      const yesterdayStr = fmtIL.format(yesterdayDate);

      let newStreak = 1;
      let isNewStreak = true;

      if (lastLogin === yesterdayStr) {
        // Continuing streak
        newStreak = (user.login_streak || 0) + 1;
        isNewStreak = false;
      }

      // Calculate reward (capped at 10 days)
      const rewardStreak = Math.min(newStreak, 10);
      const reward = rewardStreak * 10;

      // Update user
      const oldCoins = user.coins || 0;
      const newCoins = oldCoins + reward;

      // Log the coin change
      try {
        const { logCoinChange } = await import("./components/utils/coinLogger");
        
        // Get investments_value and networth
        const investmentsValue = user.investments_value || 0;
        const userNetworth = user.total_networth || 0;
        
        // Get leaderboard networth
        let leaderboardNetworth = 0;
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
          if (leaderboardEntries.length > 0) {
            leaderboardNetworth = leaderboardEntries[0].total_networth || 0;
          }
        } catch (err) {
          console.error("Error fetching leaderboard:", err);
        }
        
        await logCoinChange(user.email, oldCoins, newCoins, "בונוס כניסה יומית", {
          source: 'Layout - Login Streak',
          streak: newStreak,
          reward: reward,
          investments_value: investmentsValue,
          user_networth: userNetworth,
          leaderboard_networth: leaderboardNetworth
        });
      } catch (logError) {
        console.error("Error logging login streak coins:", logError);
      }

      await base44.auth.updateMe({
        login_streak: newStreak,
        last_login_date: today,
        coins: newCoins,
        total_login_streak_coins: (user.total_login_streak_coins || 0) + reward
      });

      // Sync to LeaderboardEntry
      try {
        const { syncLeaderboardEntry } = await import("./components/utils/leaderboardSync");
        await syncLeaderboardEntry(user.email, {
          login_streak: newStreak,
          last_login_date: today,
          coins: newCoins,
          total_login_streak_coins: (user.total_login_streak_coins || 0) + reward
        });
      } catch (syncError) {
        console.error("Error syncing login streak:", syncError);
      }

      // Show welcome dialog
      if (reward > 0) {
        setLoginRewardData({
          streak: newStreak,
          reward: reward,
          isNewStreak: isNewStreak
        });
        setShowLoginReward(true);
      }
    } catch (error) {
      console.error("Error updating login streak:", error);
    }
  };



  const loadUser = async () => {
    try {
      let user = await base44.auth.me();
      
      // Initialize new user with starting coins BEFORE any other operations
      if (user.coins === undefined || user.coins === null) {
        await base44.auth.updateMe({
          coins: 500
        });
        
        // Reload user data with updated coins
        user = await base44.auth.me();
      }
      
      setCurrentUser(user);
      
      // Ensure LeaderboardEntry exists for this user
      try {
        await syncLeaderboardEntry(user.email, {
          coins: user.coins || 0,
          investments_value: user.investments_value || 0,
          items_value: user.items_value || 0,
          login_streak: user.login_streak || 0,
          last_login_date: user.last_login_date || null
        });
      } catch (syncError) {
        console.error("Error syncing leaderboard on load:", syncError);
      }
      
      // Apply daily economy updates for current user only (inflation + credit interest)
      applyDailyEconomyForCurrentUser(user).catch(error => {
        console.error("Error applying daily economy:", error);
      });
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const applyDailyEconomyForCurrentUser = async (user) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastTaxDate = user.last_tax_date;
      
      // First time - initialize without applying economy
      if (!lastTaxDate) {
        await base44.auth.updateMe({
          last_tax_date: today
        });
        return;
      }

      // If already processed today, skip
      if (lastTaxDate === today) {
        return;
      }

      // Calculate days passed
      let daysPassed = 1;
      if (lastTaxDate) {
        const lastDate = new Date(lastTaxDate);
        const todayDate = new Date(today);
        daysPassed = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        daysPassed = Math.min(daysPassed, 30); // Cap at 30 days
      }

      const oldCoins = user.coins || 0;
      let newCoins = oldCoins;
      let totalInflationLoss = 0;
      let totalCreditInterest = 0;
      let totalPassiveIncome = 0;

      // Apply for all missed days
      for (let i = 0; i < daysPassed; i++) {
        // Passive income from backgrounds
        const equippedBackground = user.equipped_items?.background;
        if (equippedBackground) {
          const bgItem = AVATAR_ITEMS[equippedBackground];
          if (bgItem && bgItem.passiveIncome > 0) {
            totalPassiveIncome += bgItem.passiveIncome;
            newCoins += bgItem.passiveIncome;
          }
        }

        // Inflation: 3% on cash only (only if positive)
        if (newCoins > 0) {
          const inflationLoss = Math.floor(newCoins * 0.03);
          if (inflationLoss > 0) {
            totalInflationLoss += inflationLoss;
            newCoins -= inflationLoss;
          }
        }

        // Credit interest: 10% per day on negative balance only
        if (newCoins < 0) {
          const creditInterest = Math.floor(Math.abs(newCoins) * 0.10);
          if (creditInterest > 0) {
            totalCreditInterest += creditInterest;
            newCoins -= creditInterest;
          }
        }
      }
      
      // Log all daily economy changes
      try {
        const { logCoinChange } = await import("./components/utils/coinLogger");
        
        // Get common values for all logs
        const investmentsValue = user.investments_value || 0;
        const userNetworth = user.total_networth || 0;
        
        // Get leaderboard networth
        let leaderboardNetworth = 0;
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
          if (leaderboardEntries.length > 0) {
            leaderboardNetworth = leaderboardEntries[0].total_networth || 0;
          }
        } catch (err) {
          console.error("Error fetching leaderboard:", err);
        }
        
        if (totalPassiveIncome > 0) {
          await logCoinChange(user.email, oldCoins, oldCoins + totalPassiveIncome, "הכנסה פסיבית", {
            source: 'Layout - Daily Economy',
            days: daysPassed,
            amount: totalPassiveIncome,
            investments_value: investmentsValue,
            user_networth: userNetworth,
            leaderboard_networth: leaderboardNetworth
          });
        }
        
        if (totalInflationLoss > 0) {
          await logCoinChange(user.email, oldCoins + totalPassiveIncome, oldCoins + totalPassiveIncome - totalInflationLoss, "אינפלציה", {
            source: 'Layout - Daily Economy',
            days: daysPassed,
            amount: -totalInflationLoss,
            investments_value: investmentsValue,
            user_networth: userNetworth,
            leaderboard_networth: leaderboardNetworth
          });
        }
        
        if (totalCreditInterest > 0) {
          await logCoinChange(user.email, newCoins + totalCreditInterest, newCoins, "ריבית אשראי", {
            source: 'Layout - Daily Economy',
            days: daysPassed,
            amount: -totalCreditInterest,
            investments_value: investmentsValue,
            user_networth: userNetworth,
            leaderboard_networth: leaderboardNetworth
          });
        }
      } catch (logError) {
        console.error("Error logging daily economy:", logError);
      }

      // Calculate new net worth
      const { updateNetWorth } = await import("./components/utils/networthCalculator");

      // Update user
      await base44.auth.updateMe({
        coins: newCoins,
        last_tax_date: today,
        total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
        total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
        total_passive_income: (user.total_passive_income || 0) + totalPassiveIncome
      });

      // Update net worth
      const newNetWorth = await updateNetWorth(user.email);

      // Sync to LeaderboardEntry
      await syncLeaderboardEntry(user.email, {
        coins: newCoins,
        total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
        total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
        total_passive_income: (user.total_passive_income || 0) + totalPassiveIncome,
        total_networth: newNetWorth
      });
    } catch (error) {
      console.error("Error applying daily economy:", error);
    }
  };





  const navItems = [
    { name: "בית", path: createPageUrl("Home1"), icon: Home, roles: ["user", "admin"] },
    { name: "שיעורים", path: createPageUrl("Lessons1"), icon: BookOpen, roles: ["user", "admin"] },
    { name: "אנגלית", path: createPageUrl("Vocabulary1"), icon: () => (
      <div className="font-bold text-base">ABC</div>
    ), roles: ["user", "admin"] },
    { name: "חשבון", path: createPageUrl("MathGames1"), icon: () => (
      <div className="font-bold text-base">123</div>
    ), roles: ["user", "admin"] },
    { name: "השקעות", path: createPageUrl("Investments1"), icon: TrendingUp, roles: ["user", "admin"] },
    { name: "שיאים", path: createPageUrl("Leaderboard1"), icon: Trophy, roles: ["user", "admin", "parent"] },
    { name: "פרופיל", path: createPageUrl("Profile1"), icon: User, roles: ["user", "admin", "parent"] },
    { name: "ניהול", path: createPageUrl("Admin1"), icon: Shield, roles: ["admin"] }
  ];

  const visibleNavItems = navItems.filter(item => {
    if (currentUser?.role === "admin") return item.roles.includes("admin") || item.roles.includes("user");
    if (currentUser?.user_type === "parent") return item.roles.includes("parent");
    return item.roles.includes("user");
  });

  const isActive = (path) => location.pathname === path;

  // Show maintenance page if active and user is not admin
  if (isLoadingMaintenance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4C6EF5] via-[#7B5EF5] to-[#9B6EF5] flex items-center justify-center">
        <div className="text-white text-2xl">טוען...</div>
      </div>
    );
  }

  if (maintenanceMode?.is_active && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4C6EF5] via-[#7B5EF5] to-[#9B6EF5] text-white" dir="rtl">
        <MaintenancePage message={maintenanceMode.message} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4C6EF5] via-[#7B5EF5] to-[#9B6EF5] text-white" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 800;
        }
        
        :root {
          --primary: #4C6EF5;
          --secondary: #9B6EF5;
          --accent: #FFD700;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes levelUp {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .sparkle {
          animation: sparkle 1s ease-in-out infinite;
        }
        
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>

      {/* Main Content Area */}
      <main className="pb-24 sm:pb-20 min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl border-t border-white/20 z-50 safe-area-pb">
        <div className="flex items-center justify-center px-2 py-2">
          <div className="flex items-center justify-center gap-1">
            {visibleNavItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 px-2 py-1.5 rounded-lg ${
                    active
                      ? "text-[#FFD700] bg-white/15 shadow-lg"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {typeof IconComponent === 'function' && (item.name === "אנגלית" || item.name === "חשבון") ? (
                      <div className="font-bold text-xs">
                        <IconComponent />
                      </div>
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold whitespace-nowrap ${active ? 'text-[#FFD700]' : 'text-white/70'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Login Reward Dialog */}
      <Dialog open={showLoginReward} onOpenChange={setShowLoginReward}>
        <DialogContent className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 border-4 border-white shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-white text-center mb-2">
              {loginRewardData?.isNewStreak ? "⚠️ רצף חדש!" : "🔥 כל הכבוד!"}
            </DialogTitle>
          </DialogHeader>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="text-center py-6"
          >
            {loginRewardData?.isNewStreak ? (
              <>
                <div className="text-7xl mb-4">😅</div>
                <p className="text-white text-xl font-bold mb-4">
                  הרצף נשבר! אבל זה בסדר...
                </p>
                <p className="text-white/90 text-lg mb-6">
                  התחלת רצף חדש - יום 1!
                </p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4">🔥</div>
                <p className="text-white text-2xl font-black mb-2">
                  רצף של {loginRewardData?.streak} ימים!
                </p>
                <p className="text-white/90 text-lg mb-6">
                  המשך ככה! 💪
                </p>
              </>
            )}
            
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", duration: 0.8 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/50"
            >
              <p className="text-white/90 text-sm mb-2">קיבלת בונוס:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-black text-white">
                  {loginRewardData?.reward}
                </span>
                <span className="text-3xl">🪙</span>
              </div>
              <p className="text-white/80 text-xs mt-2">סטארטקוין</p>
            </motion.div>

            <Button
              onClick={() => setShowLoginReward(false)}
              className="mt-6 w-full bg-white text-orange-600 hover:bg-white/90 font-black text-lg py-6"
            >
              יאללה בוא נתחיל! 🚀
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}