import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, TrendingUp, User, Shield, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "./components/avatar/TamagotchiAvatar";
import { syncLeaderboardEntry } from "./components/utils/leaderboardSync";

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
    updateLoginStreak();
  }, []);

  const updateLoginStreak = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      // Client-side login streak update
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = user.last_login_date;

      if (lastLogin === today) {
        // Already logged in today
        return;
      }

      // Check if yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

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
      const newCoins = (user.coins || 0) + reward;
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

      // Show toast
      if (reward > 0) {
        if (isNewStreak) {
          toast.warning(`⚠️ הרצף נשבר! התחלת רצף חדש\n💰 הרווחת ${reward} מטבעות (יום 1)`, {
            duration: 5000,
            style: { fontSize: '16px' }
          });
        } else {
          toast.success(`🔥 רצף כניסות: ${newStreak} ימים ברצף!\n💰 הרווחת ${reward} מטבעות!`, {
            duration: 6000,
            style: { fontSize: '16px', fontWeight: 'bold' }
          });
        }
      }
    } catch (error) {
      console.error("Error updating login streak:", error);
    }
  };



  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      
      // Apply daily economy updates for current user only (inflation + credit interest)
      applyDailyEconomyForCurrentUser(user).catch(error => {
        console.error("Error applying daily economy:", error);
      });
      
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const applyDailyEconomyForCurrentUser = async (user) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastTaxDate = user.last_tax_date;

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

      let newCoins = user.coins || 0;
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

      // Update user
      await base44.auth.updateMe({
        coins: newCoins,
        last_tax_date: today,
        total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
        total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
        total_passive_income: (user.total_passive_income || 0) + totalPassiveIncome
      });

      // Sync to LeaderboardEntry
      await syncLeaderboardEntry(user.email, {
        coins: newCoins,
        total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
        total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
        total_passive_income: (user.total_passive_income || 0) + totalPassiveIncome
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
    </div>
  );
}