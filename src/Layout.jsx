import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BookOpen, TrendingUp, User, Shield, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AVATAR_ITEMS } from "./components/avatar/TamagotchiAvatar";

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      
      // Check and update login streak
      await checkAndUpdateLoginStreak(user);

      // Apply daily taxes and dividend tax to all users (runs automatically in background)
      applyDailyTaxesToAllUsers().catch(error => {
        console.error("Error applying taxes to all users:", error);
      });

      // Apply daily dividend tax from investment profits
      applyDailyDividendTax(user).catch(error => {
        console.error("Error applying dividend tax:", error);
      });
      
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const applyDailyDividendTax = async (user) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastDividendDate = user.last_dividend_date;

      // If already applied dividend tax today, do nothing
      if (lastDividendDate === today) {
        return;
      }

      // Get all investments for this user
      const allInvestments = await base44.entities.Investment.list();
      const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);

      if (userInvestments.length === 0) {
        return;
      }

      // Get today's market data
      const todayMarketData = await base44.entities.DailyMarketPerformance.filter({ date: today });
      if (todayMarketData.length === 0) {
        return;
      }

      const todayMarket = todayMarketData[0];
      const marketChanges = {
        government_bonds: todayMarket.government_bonds_change || 0,
        real_estate: todayMarket.real_estate_change || 0,
        gold: todayMarket.gold_change || 0,
        stock_market: todayMarket.stock_market_change || 0,
        tech_startup: todayMarket.tech_startup_change || 0,
        crypto: todayMarket.crypto_change || 0
      };

      // Dividend tax removed - no longer applied
      // Mark as processed for today
      await base44.auth.updateMe({
        last_dividend_date: today
      });
    } catch (error) {
      console.error("Error applying dividend tax:", error);
    }
  };

  const checkAndUpdateLoginStreak = async (user) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = user.last_login_date;
      
      // If already logged in today, do nothing
      if (lastLogin === today) {
        return;
      }

      // Calculate days since last login
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let newStreak = 1;
      let streakBonus = 5; // Base bonus: 5 coins
      
      if (lastLogin === yesterdayStr) {
        // Continued streak!
        newStreak = (user.login_streak || 0) + 1;
        streakBonus = Math.min(newStreak * 5, 50); // 5 coins per day, max 50 coins (day 10+)
        
        toast.success(`🔥 רצף כניסות: ${newStreak} ימים! קיבלת ${streakBonus} מטבעות! 🎉`, {
          duration: 5000
        });
      } else if (lastLogin && lastLogin !== yesterdayStr) {
        // Streak broken
        toast.info(`התחלת רצף כניסות חדש! קיבלת ${streakBonus} מטבע 🌟`);
      } else {
        // First login
        toast.success(`🎉 ברוך הבא! קיבלת ${streakBonus} מטבע על הכניסה הראשונה!`);
      }
      
      // Check if user is login streak king and add bonus
      const allUsers = await base44.entities.User.list();
      let maxStreakEarnings = 0;
      let streakKingEmail = null;

      allUsers.forEach(u => {
        const earnings = u.total_login_streak_coins || 0;
        if (earnings > maxStreakEarnings) {
          maxStreakEarnings = earnings;
          streakKingEmail = u.email;
        }
      });

      let finalBonus = streakBonus;
      if (streakKingEmail === user.email && maxStreakEarnings > 0) {
        finalBonus += 10; // Login streak king bonus!
      }

      // Update user with new streak and bonus
      await base44.auth.updateMe({
        last_login_date: today,
        login_streak: newStreak,
        coins: (user.coins || 0) + finalBonus,
        total_login_streak_coins: (user.total_login_streak_coins || 0) + finalBonus
      });

      // Update leaderboard entry if exists
      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
        if (leaderboardEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            coins: (user.coins || 0) + streakBonus
          });
        }
      } catch (error) {
        console.error("Error updating leaderboard:", error);
      }
    } catch (error) {
      console.error("Error checking login streak:", error);
    }
  };

  const applyDailyTaxesToAllUsers = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allUsers = await base44.entities.User.list();
      const allInvestments = await base44.entities.Investment.list();

      // Filter only students
      const students = allUsers.filter(u => u.user_type === 'student');

      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        const lastTaxDate = user.last_tax_date;

        if (!lastTaxDate || lastTaxDate < today) {
          try {
            // Calculate days passed
            let daysPassed = 1;
            if (lastTaxDate) {
              const lastDate = new Date(lastTaxDate);
              const todayDate = new Date(today);
              daysPassed = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
              daysPassed = Math.min(daysPassed, 30); // Cap at 30 days
            }

            const currentCoins = user.coins || 0;

            // Calculate current net worth
            const purchasedItems = user.purchased_items || [];
            let itemsValue = 0;
            purchasedItems.forEach(itemId => {
              const item = AVATAR_ITEMS[itemId];
              if (item) {
                itemsValue += item.price || 0;
              }
            });

            // Get investments value
            const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
            const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
            const currentNetWorth = currentCoins + itemsValue + investmentsValue;

            // Apply taxes for all days missed
            let newCoins = currentCoins;
            let totalInflationLoss = 0;
            let totalIncomeTax = 0;
            let totalCreditInterest = 0;

            for (let i = 0; i < daysPassed; i++) {
              // Inflation: 1% on cash only (only if positive)
              if (newCoins > 0) {
                const inflationLoss = Math.floor(newCoins * 0.01);
                if (inflationLoss > 0) {
                  totalInflationLoss += inflationLoss;
                  newCoins -= inflationLoss;
                }
              }

              // Income tax: 0.5% on total net worth (taken from cash)
              // But can be reduced by owning body colors! Each color has different reduction
              let incomeTaxRate = 0.005; // Base rate: 0.5%
              
              // Calculate tax reduction based on owned body colors
              for (const itemId of purchasedItems) {
                const item = AVATAR_ITEMS[itemId];
                if (item && item.category === 'body' && item.taxReduction) {
                  incomeTaxRate = Math.max(0, incomeTaxRate - (item.taxReduction / 100));
                }
              }
              
              // Recalculate net worth with current coins
              const currentDayNetWorth = newCoins + itemsValue + investmentsValue;
              const incomeTax = Math.floor(currentDayNetWorth * incomeTaxRate);
              if (incomeTax > 0) {
                totalIncomeTax += incomeTax;
                newCoins -= incomeTax;
              }

              // Credit interest: 3% per day on negative balance only
              if (newCoins < 0) {
                const creditInterest = Math.floor(Math.abs(newCoins) * 0.03);
                if (creditInterest > 0) {
                  totalCreditInterest += creditInterest;
                  newCoins -= creditInterest;
                }
              }
            }

            await base44.entities.User.update(user.id, {
              coins: newCoins,
              last_tax_date: today,
              total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
              total_income_tax: (user.total_income_tax || 0) + totalIncomeTax,
              total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
              daily_inflation_lost: lastDayInflation,
              daily_income_tax: lastDayIncomeTax,
              daily_credit_interest: lastDayCreditInterest
            });

            // Update leaderboard
            try {
              const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
              if (leaderboardEntries.length > 0) {
                await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
                  coins: newCoins
                });
              }
            } catch (error) {
              console.error("Error updating leaderboard for user:", user.email, error);
            }

            // Add delay between user updates to avoid rate limiting
            if (i < students.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error("Error applying taxes to user:", user.email, error);
            // Continue with next user even if one fails
          }
        }
      }
    } catch (error) {
      console.error("Error applying taxes to all users:", error);
    }
  };

  const navItems = [
    { name: "בית", path: createPageUrl("Home"), icon: Home, roles: ["user", "admin"] },
    { name: "שיעורים", path: createPageUrl("Lessons"), icon: BookOpen, roles: ["user", "admin"] },
    { name: "אנגלית", path: createPageUrl("Vocabulary"), icon: () => (
      <div className="font-bold text-base">ABC</div>
    ), roles: ["user", "admin"] },
    { name: "חשבון", path: createPageUrl("MathGames"), icon: () => (
      <div className="font-bold text-base">123</div>
    ), roles: ["user", "admin"] },
    { name: "השקעות", path: createPageUrl("Investments"), icon: TrendingUp, roles: ["user", "admin"] },
    { name: "שיאים", path: createPageUrl("Leaderboard"), icon: Trophy, roles: ["user", "admin", "parent"] },
    { name: "פרופיל", path: createPageUrl("Profile"), icon: User, roles: ["user", "admin", "parent"] },
    { name: "ניהול", path: createPageUrl("Admin"), icon: Shield, roles: ["admin"] }
  ];

  const visibleNavItems = navItems.filter(item => {
    if (currentUser?.role === "admin") return item.roles.includes("admin");
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