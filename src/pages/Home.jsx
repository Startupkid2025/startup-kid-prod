import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import Avatar from "../components/home/Avatar";
import SkillBar from "../components/home/SkillBar";
import LevelUpModal from "../components/home/LevelUpModal";
import AvatarChat from "../components/home/AvatarChat";
import NextLessonTimer from "../components/home/NextLessonTimer";
import GroupSelectionDialog from "../components/home/GroupSelectionDialog";
import AvatarWork from "../components/home/AvatarWork";
import AvatarShop from "../components/avatar/AvatarShop";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";
import { TrendingDown, Coins, TrendingUp, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const skills = [
  {
    key: "ai_tech",
    name: "בינה מלאכותית וטכנולוגיה",
    icon: "🤖",
    color: "from-blue-400 to-cyan-400"
  },
  {
    key: "personal_skills",
    name: "מיומנויות אישיות",
    icon: "🌱",
    color: "from-green-400 to-emerald-400"
  },
  {
    key: "money_business",
    name: "כסף ועסקים",
    icon: "💸",
    color: "from-yellow-400 to-amber-400"
  }
];

export default function Home() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [levelUpModal, setLevelUpModal] = useState({ isOpen: false, skillName: "", newLevel: 0 });
  const [userGroup, setUserGroup] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const [netWorth, setNetWorth] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [itemsValue, setItemsValue] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [lessonCounts, setLessonCounts] = useState({
    ai_tech: 0,
    personal_skills: 0,
    money_business: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const generateAvatarName = () => {
    const names = [
      "באזי", "ספארקי", "נובה", "לונה", "קוסמו", "זיפי", "פיקסל",
      "נינג'ה", "בליץ", "אקו", "מקס", "ריו", "קיווי", "זן",
      "מיסטי", "צ'יפ", "בולט", "סטאר", "פלאש", "ג'מפר"
    ];
    return names[Math.floor(Math.random() * names.length)];
  };

  const calculateLessonCounts = async (userEmail) => {
    try {
      const participations = await base44.entities.LessonParticipation.filter({
        student_email: userEmail,
        attended: true
      });

      const allLessons = await base44.entities.Lesson.list();

      const counts = {
        ai_tech: 0,
        personal_skills: 0,
        money_business: 0
      };

      participations.forEach(participation => {
        const lesson = allLessons.find(l => l.id === participation.lesson_id);
        if (lesson && lesson.category) {
          // Map old categories to new ones
          if (lesson.category === 'personal_dev' || lesson.category === 'social_skills') {
            counts.personal_skills++;
          } else if (counts.hasOwnProperty(lesson.category)) {
            counts[lesson.category]++;
          }
        }
      });

      setLessonCounts(counts);
      return participations.length; // Return total attended lessons
    } catch (error) {
      console.error("Error calculating lesson counts:", error);
      setLessonCounts({
        ai_tech: 0,
        personal_skills: 0,
        money_business: 0
      });
      return 0;
    }
  };

  const recalculateCoins = async (userEmail) => {
    try {
      // Get all attended lessons
      const participations = await base44.entities.LessonParticipation.filter({
        student_email: userEmail,
        attended: true
      });

      // Calculate coins: 500 base + 100 per lesson
      const totalAttendedLessons = participations.length;
      const correctCoins = 500 + (totalAttendedLessons * 100);

      return correctCoins;
    } catch (error) {
      console.error("Error recalculating coins:", error);
      return 500; // Return base amount on error
    }
  };

  const initializeTutorialLessons = async (user) => {
    try {
      if (user.user_type !== 'student') return;
      
      const allLessons = await base44.entities.Lesson.list();
      const tutorialLesson1 = allLessons.find(l => l.lesson_name === "סטארטאפ קיד - היכרות");
      const tutorialLesson2 = allLessons.find(l => l.lesson_name === "הסבר על האפליקציה");

      if (!tutorialLesson1 || !tutorialLesson2) {
        return;
      }

      const existingParticipations = await base44.entities.LessonParticipation.filter({
        student_email: user.email
      });

      const hasLesson1 = existingParticipations.some(p => p.lesson_id === tutorialLesson1.id);
      const hasLesson2 = existingParticipations.some(p => p.lesson_id === tutorialLesson2.id);

      if (!hasLesson1 || !hasLesson2) {
        const joinDate = user.created_date && !isNaN(new Date(user.created_date))
                         ? new Date(user.created_date).toISOString().split('T')[0]
                         : new Date().toISOString().split('T')[0];

        const toCreate = [];
        if (!hasLesson1) {
          toCreate.push({
            lesson_id: tutorialLesson1.id,
            student_email: user.email,
            lesson_date: joinDate,
            attended: false
          });
        }
        if (!hasLesson2) {
          toCreate.push({
            lesson_id: tutorialLesson2.id,
            student_email: user.email,
            lesson_date: joinDate,
            attended: false
          });
        }

        if (toCreate.length > 0) {
          await Promise.all(toCreate.map(data => base44.entities.LessonParticipation.create(data)));
        }
      }
    } catch (error) {
      console.error("Error initializing tutorial lessons:", error);
    }
  };

  const updateLeaderboardEntry = async (userData) => {
    try {
      if (userData.user_type !== 'student') {
        return;
      }

      const leaderboardData = {
        student_email: userData.email,
        full_name: userData.full_name,
        ai_tech_level: userData.ai_tech_level || 1,
        ai_tech_xp: userData.ai_tech_xp || 0,
        personal_dev_level: userData.personal_dev_level || 1,
        personal_dev_xp: userData.personal_dev_xp || 0,
        social_skills_level: userData.social_skills_level || 1,
        social_skills_xp: userData.social_skills_xp || 0,
        money_business_level: userData.money_business_level || 1,
        money_business_xp: userData.money_business_xp || 0,
        total_lessons: userData.total_lessons || 0,
        coins: userData.coins || 0,
        equipped_items: userData.equipped_items || {},
        purchased_items: userData.purchased_items || [],
        user_type: userData.user_type || "student"
      };

      const existingEntries = await base44.entities.LeaderboardEntry.filter({
        student_email: userData.email
      });

      if (existingEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(existingEntries[0].id, leaderboardData);
      } else {
        await base44.entities.LeaderboardEntry.create(leaderboardData);
      }
    } catch (error) {
      console.error("Error updating leaderboard entry:", error);
    }
  };

  const calculateNetWorth = async (user) => {
    try {
      const currentCoins = user.coins || 0;

      const purchasedItems = user.purchased_items || [];
      let calculatedItemsValue = 0;
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item) {
          calculatedItemsValue += item.price || 0;
        }
      });
      setItemsValue(calculatedItemsValue);

      const userInvestments = await base44.entities.Investment.filter({
        student_email: user.email
      });
      setInvestments(userInvestments);

      const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      const netWorth = currentCoins + calculatedItemsValue + investmentsValue;

      return Math.max(0, Math.round(netWorth));
    } catch (error) {
      console.error("Error calculating net worth:", error);
      return 0;
    }
  };

  const applyDailyTaxes = async (user) => {
    try {
      // Only apply taxes to students
      if (user.user_type !== 'student') {
        return user;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastTaxDate = user.last_tax_date;

      if (!lastTaxDate || lastTaxDate < today) {
        // Calculate days passed since last tax
        let daysPassed = 1;
        if (lastTaxDate) {
          const lastDate = new Date(lastTaxDate);
          const todayDate = new Date(today);
          daysPassed = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
          // Cap at maximum 30 days to prevent huge losses
          daysPassed = Math.min(daysPassed, 30);
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
        const userInvestments = await base44.entities.Investment.filter({
          student_email: user.email
        });
        const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);

        // Apply taxes for all days missed
        let newCoins = currentCoins;
        let totalInflationLoss = 0;
        let totalIncomeTax = 0;
        let totalCreditInterest = 0;
        
        // Track last day separately for display
        let lastDayInflation = 0;
        let lastDayIncomeTax = 0;
        let lastDayCreditInterest = 0;

        for (let i = 0; i < daysPassed; i++) {
          const isLastDay = (i === daysPassed - 1);
          
          // Inflation: 1% on cash only (only if positive)
          if (newCoins > 0) {
            const inflationLoss = Math.floor(newCoins * 0.01);
            if (inflationLoss > 0) {
              totalInflationLoss += inflationLoss;
              newCoins -= inflationLoss;
              if (isLastDay) lastDayInflation = inflationLoss;
            }
          }

          // Income tax: 0.5% on current day's total net worth
          // But can be reduced by owning body colors! Each color has different reduction
          let incomeTaxRate = 0.005; // Base rate: 0.5%
          
          // Calculate tax reduction based on owned body colors
          for (const itemId of purchasedItems) {
            const item = AVATAR_ITEMS[itemId];
            if (item && item.category === 'body' && item.taxReduction) {
              incomeTaxRate = Math.max(0, incomeTaxRate - (item.taxReduction / 100));
            }
          }
          
          // Calculate net worth with current coins (after inflation)
          const currentDayNetWorth = newCoins + itemsValue + investmentsValue;
          const incomeTax = Math.floor(currentDayNetWorth * incomeTaxRate);
          if (incomeTax > 0) {
            totalIncomeTax += incomeTax;
            newCoins -= incomeTax;
            if (isLastDay) lastDayIncomeTax = incomeTax;
          }

          // Credit interest: 3% per day on negative balance only
          if (newCoins < 0) {
            const creditInterest = Math.floor(Math.abs(newCoins) * 0.03);
            if (creditInterest > 0) {
              totalCreditInterest += creditInterest;
              newCoins -= creditInterest;
              if (isLastDay) lastDayCreditInterest = creditInterest;
            }
          }
        }

        await base44.auth.updateMe({
          coins: newCoins,
          last_tax_date: today,
          total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
          total_income_tax: (user.total_income_tax || 0) + totalIncomeTax,
          total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
          daily_inflation_lost: lastDayInflation,
          daily_income_tax: lastDayIncomeTax,
          daily_credit_interest: lastDayCreditInterest
        });

        return {
          ...user,
          coins: newCoins,
          last_tax_date: today,
          total_inflation_lost: (user.total_inflation_lost || 0) + totalInflationLoss,
          total_income_tax: (user.total_income_tax || 0) + totalIncomeTax,
          total_credit_interest: (user.total_credit_interest || 0) + totalCreditInterest,
          daily_inflation_lost: lastDayInflation,
          daily_income_tax: lastDayIncomeTax,
          daily_credit_interest: lastDayCreditInterest
        };
      }
      return user;
    } catch (error) {
      console.error("Error applying daily taxes:", error);
      return user;
    }
  };

  const loadUserData = async () => {
    try {
      let user = await base44.auth.me();
      let currentUser = user;

      let needsUpdate = false;
      const updates = {};

      if (!user.ai_tech_xp && user.ai_tech_xp !== 0) {
        const avatarName = generateAvatarName();
        updates.ai_tech_xp = 0;
        updates.ai_tech_level = 1;
        updates.personal_dev_xp = 0;
        updates.personal_dev_level = 1;
        updates.social_skills_xp = 0;
        updates.social_skills_level = 1;
        updates.money_business_xp = 0;
        updates.money_business_level = 1;
        updates.total_lessons = 0;
        updates.avatar_stage = 1;
        updates.avatar_name = avatarName;
        updates.equipped_items = {
            body: "body_blue",
            eyes: "eyes_happy",
            mouth: "mouth_smile"
        };
        updates.purchased_items = [];
        updates.coins = 500; // Start with 500 base coins
        updates.user_type = "student";
        updates.has_selected_group = false;
        updates.last_tax_date = null;
        updates.total_inflation_lost = 0;
        updates.total_income_tax = 0;
        updates.daily_inflation_lost = 0;
        updates.daily_income_tax = 0;
        updates.inflation_reset_v2 = true;
        updates.coins_recalculated_v1 = true; // Mark as having correct coin calculation
        needsUpdate = true;
      } else {
        if (!user.avatar_name) {
          updates.avatar_name = generateAvatarName();
          needsUpdate = true;
        }
        if (!user.user_type) {
          updates.user_type = "student";
          needsUpdate = true;
        }
        if (user.has_selected_group === undefined || user.has_selected_group === null) {
          updates.has_selected_group = false;
          needsUpdate = true;
        }
        if (!user.last_tax_date) {
          updates.last_tax_date = null;
          needsUpdate = true;
        }
        if (user.total_inflation_lost === undefined || user.total_inflation_lost === null) {
          updates.total_inflation_lost = 0;
          needsUpdate = true;
        }
        if (user.total_income_tax === undefined || user.total_income_tax === null) {
          updates.total_income_tax = 0;
          needsUpdate = true;
        }
        if (user.daily_inflation_lost === undefined || user.daily_inflation_lost === null) {
          updates.daily_inflation_lost = 0;
          needsUpdate = true;
        }
        if (user.daily_income_tax === undefined || user.daily_income_tax === null) {
          updates.daily_income_tax = 0;
          needsUpdate = true;
        }
        if (user.total_credit_interest === undefined || user.total_credit_interest === null) {
          updates.total_credit_interest = 0;
          needsUpdate = true;
        }
        if (user.daily_credit_interest === undefined || user.daily_credit_interest === null) {
          updates.daily_credit_interest = 0;
          needsUpdate = true;
        }
        if (user.total_dividend_tax === undefined || user.total_dividend_tax === null) {
          updates.total_dividend_tax = 0;
          needsUpdate = true;
        }
        if (user.daily_dividend_tax === undefined || user.daily_dividend_tax === null) {
          updates.daily_dividend_tax = 0;
          needsUpdate = true;
        }

        if (user.total_inflation_lost > 0 && !user.inflation_reset_v2) {
          updates.total_inflation_lost = 0;
          updates.total_income_tax = 0;
          updates.daily_inflation_lost = 0;
          updates.daily_income_tax = 0;
          updates.total_credit_interest = 0;
          updates.daily_credit_interest = 0;
          updates.total_dividend_tax = 0;
          updates.daily_dividend_tax = 0;
          updates.last_tax_date = null;
          updates.inflation_reset_v2 = true;
          needsUpdate = true;
        }

        // Recalculate coins if not done yet (for existing users)
        if (!user.coins_recalculated_v1 && user.user_type === 'student') {
          const correctCoins = await recalculateCoins(user.email);
          updates.coins = correctCoins;
          updates.coins_recalculated_v1 = true;
          needsUpdate = true;
          console.log(`Recalculated coins for ${user.email}: ${correctCoins}`);
        }
      }

      if (needsUpdate) {
        await base44.auth.updateMe(updates);
        currentUser = await base44.auth.me();
      }

      currentUser = await applyDailyTaxes(currentUser);

      await Promise.allSettled([
        initializeTutorialLessons(currentUser),
        updateLeaderboardEntry(currentUser),
        calculateLessonCounts(currentUser.email)
      ]);

      setUserData(currentUser);

      const worth = await calculateNetWorth(currentUser);
      setNetWorth(worth);

      if (!currentUser.has_selected_group && currentUser.user_type !== "admin") {
        setShowGroupSelection(true);
      } else {
        setShowGroupSelection(false);
      }

      try {
        const allGroups = await base44.entities.Group.list();
        const myGroup = allGroups.find(g => g.student_emails?.includes(currentUser.email));

        if (myGroup) {
          setUserGroup(myGroup);

          if (myGroup.next_lesson_id) {
            try {
              const lesson = await base44.entities.Lesson.get(myGroup.next_lesson_id);
              setNextLesson(lesson);
            } catch (lessonError) {
              console.log("Next lesson not found or deleted");
              setNextLesson(null);
            }
          } else {
            setNextLesson(null);
          }
        } else {
          setUserGroup(null);
          setNextLesson(null);
        }
      } catch (groupError) {
        console.error("Error loading group info:", groupError);
        setUserGroup(null);
        setNextLesson(null);
      }

    } catch (error) {
      console.error("Error loading user:", error);
      if (error.response?.status === 404 || error.response?.status === 401) {
        await base44.auth.redirectToLogin();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipItem = async (newEquippedItems) => {
    try {
      await base44.auth.updateMe({
        equipped_items: newEquippedItems
      });
      await loadUserData();
    } catch (error) {
      console.error("Error equipping item:", error);
    }
  };

  const handlePurchaseItem = async () => {
    try {
      await loadUserData();
    } catch (error) {
      console.error("Error after purchase:", error);
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
          ⭐
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-6 sm:py-8 max-w-2xl mx-auto">
      <GroupSelectionDialog
        isOpen={showGroupSelection}
        onComplete={() => {
          setShowGroupSelection(false);
          loadUserData();
        }}
        studentEmail={userData?.email}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8"
      >
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          שלום, {userData?.full_name?.split(' ')[0] || 'גיבור'} 👋
        </h1>
      </motion.div>

      {userData?.user_type === "demo" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-blue-500/20 backdrop-blur-md rounded-2xl p-4 border border-blue-300/30 text-center"
        >
          <p className="text-white font-medium">
            🎮 אתה במצב דמו - תוכל לשחק באופן חופשי!
          </p>
          <p className="text-white/70 text-sm mt-1">
            כדי להצטרף באופן מלא לקורס, צור קשר עם המורה
          </p>
        </motion.div>
      )}

      {userGroup && (
        <NextLessonTimer group={userGroup} lesson={nextLesson} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Coins Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl blur-xl"></div>
            <Card className="relative bg-gradient-to-br from-yellow-500/90 to-orange-500/90 backdrop-blur-md border-2 border-yellow-300/50 shadow-2xl">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex-1 text-right">
                    <p className="text-white/90 text-[10px] sm:text-sm font-bold">💰 עובר ושב</p>
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-8 h-8 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30"
                  >
                    <Coins className="w-4 h-4 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                  </motion.div>
                </div>

                <div className="text-center mb-2 sm:mb-3">
                  <p className="text-2xl sm:text-5xl font-black text-white drop-shadow-lg">
                    {userData?.coins || 0}
                  </p>
                </div>

                {/* Daily Taxes Display */}
                {(userData?.daily_inflation_lost > 0 || userData?.daily_income_tax > 0 || userData?.daily_credit_interest > 0) && (
                  <div className="bg-red-500/20 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-red-400/30 mb-2 sm:mb-3 space-y-0.5 sm:space-y-1">
                    <p className="text-white/90 text-[9px] sm:text-xs font-bold text-center mb-1">💸 הפסדים היום</p>
                    {userData?.daily_inflation_lost > 0 && (
                      <p className="text-red-100 text-[8px] sm:text-xs font-bold flex items-center justify-between px-1">
                        <span className="flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                          אינפלציה:
                        </span>
                        <span>-{userData.daily_inflation_lost}</span>
                      </p>
                    )}
                    {userData?.daily_income_tax > 0 && (
                      <p className="text-red-100 text-[8px] sm:text-xs font-bold flex items-center justify-between px-1">
                        <span className="flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                          מס הכנסה:
                        </span>
                        <span>-{userData.daily_income_tax}</span>
                      </p>
                    )}
                    {userData?.daily_credit_interest > 0 && (
                      <p className="text-red-100 text-[8px] sm:text-xs font-bold flex items-center justify-between px-1">
                        <span className="flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                          ריבית אשראי:
                        </span>
                        <span>-{userData.daily_credit_interest}</span>
                      </p>
                    )}
                  </div>
                )}
                
                {/* Total Losses Summary */}
                {(userData?.total_inflation_lost > 0 || userData?.total_income_tax > 0 || (userData?.total_credit_interest || 0) > 0) && (
                  <div className="bg-white/10 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-white/20 mb-2 sm:mb-3 space-y-0.5 sm:space-y-1">
                    <p className="text-white/90 text-[9px] sm:text-xs font-bold text-center mb-1">📊 סה״כ הפסדים</p>
                    {userData?.total_inflation_lost > 0 && (
                      <p className="text-white/70 text-[8px] sm:text-xs flex items-center justify-between px-1">
                        <span>📉 אינפלציה:</span>
                        <span className="font-bold text-red-300">-{userData.total_inflation_lost}</span>
                      </p>
                    )}
                    {userData?.total_income_tax > 0 && (
                      <p className="text-white/70 text-[8px] sm:text-xs flex items-center justify-between px-1">
                        <span>🏛️ מס הכנסה:</span>
                        <span className="font-bold text-red-300">-{userData.total_income_tax}</span>
                      </p>
                    )}
                    {(userData?.total_credit_interest || 0) > 0 && (
                      <p className="text-white/70 text-[8px] sm:text-xs flex items-center justify-between px-1">
                        <span>💳 ריבית אשראי:</span>
                        <span className="font-bold text-red-300">-{userData.total_credit_interest}</span>
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => setShowShop(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold border-2 border-white/40 shadow-lg text-[10px] sm:text-base py-1.5 sm:py-2"
                >
                  <ShoppingBag className="w-3 h-3 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                  חנות
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Net Worth Card */}
          <Link to={createPageUrl("Leaderboard")}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-2xl blur-xl"></div>
              <Card className="relative bg-gradient-to-br from-purple-600/90 to-pink-600/90 backdrop-blur-md border-2 border-purple-300/50 shadow-2xl">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex-1 text-right">
                      <p className="text-white/90 text-[10px] sm:text-sm font-bold">💎 שווי כולל</p>
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-8 h-8 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-white/30"
                    >
                      <TrendingUp className="w-4 h-4 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                    </motion.div>
                  </div>

                  <div className="text-center mb-2 sm:mb-3">
                    <p className="text-2xl sm:text-5xl font-black text-white drop-shadow-lg">
                      {netWorth}
                    </p>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-white/20">
                      <span className="text-white/80 text-[8px] sm:text-xs font-medium">💰 עובר ושב</span>
                      <span className="text-white font-bold text-[10px] sm:text-sm">{userData?.coins || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-white/20">
                      <span className="text-white/80 text-[8px] sm:text-xs font-medium">🛍️ פריטים</span>
                      <span className="text-white font-bold text-[10px] sm:text-sm">{itemsValue}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-white/20">
                      <span className="text-white/80 text-[8px] sm:text-xs font-medium">📈 השקעות</span>
                      <span className="text-white font-bold text-[10px] sm:text-sm">
                        {investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Avatar */}
      <div className="mb-6 sm:mb-8">
        <Avatar
          stage={userData?.avatar_stage || 1}
          totalLessons={userData?.total_lessons || 0}
          equippedItems={userData?.equipped_items || {}}
          purchasedItems={userData?.purchased_items || []}
          onEquipItem={handleEquipItem}
        />
      </div>

      {/* Skill Bars */}
      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        {skills.map((skill) => (
          <SkillBar
            key={skill.key}
            icon={skill.icon}
            name={skill.name}
            lessonsCount={lessonCounts[skill.key]}
            color={skill.color}
          />
        ))}
      </div>

      {/* Avatar Work */}
      <AvatarWork
        userData={userData}
        onWorkComplete={loadUserData}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 sm:mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20 text-center"
      >
        <div className="text-4xl mb-3">💡</div>
        <p className="text-white/90 font-medium mb-2">
          איך לקבל מטבעות?
        </p>
        <p className="text-white/70 text-sm leading-relaxed">
          💰 <strong>דרכים לקבל מטבעות:</strong><br />
          🎯 התחלה = 500 מטבעות<br />
          🎓 השתתפות בשיעור = 100 מטבעות<br />
          🔢 תרגיל נכון בחשבון = 5 מטבעות<br />
          📚 מילה שלמדת באנגלית = 5-15 מטבעות<br />
          📝 מילוי סקר = 20 מטבעות<br />
          ❓ חידון = עד 60 מטבעות<br />
          💼 עבודה (לשעה) = מטבעות לפי פריטים<br />
          🤝 שיתוף פעולה עם חבר = 2 מטבעות<br />
          🔥 רצף כניסות יומי = 1-30 מטבעות<br />
          📈 רווחי השקעות<br />
          ✅ משימות בפרופיל = עד 300 מטבעות<br />
          👤 השלמת פרטי פרופיל = 70 מטבעות<br />
          <span className="text-red-300 font-bold mt-2 block">⚠️ שים לב: כל יום יש אינפלציה (1%) על העובר ושב ומס הכנסה (0.5%) על כל השווי!</span>
        </p>
      </motion.div>

      <AvatarChat
        userData={userData}
        equippedItems={userData?.equipped_items || {}}
      />

      <AvatarShop
        isOpen={showShop}
        onClose={() => setShowShop(false)}
        equippedItems={userData?.equipped_items || {}}
        userData={userData}
        onPurchase={handlePurchaseItem}
        onEquipItem={handleEquipItem}
      />

      <LevelUpModal
        isOpen={levelUpModal.isOpen}
        onClose={() => setLevelUpModal({ ...levelUpModal, isOpen: false })}
        skillName={levelUpModal.skillName}
        newLevel={levelUpModal.newLevel}
      />
    </div>
  );
}