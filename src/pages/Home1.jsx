import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, Shirt, Coins, TrendingUp, Clock, DollarSign, Users, Briefcase, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import TamagotchiAvatar, { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";
import TamagotchiWardrobe from "../components/avatar/TamagotchiWardrobe";
import AvatarShop from "../components/avatar/AvatarShop";
import Avatar from "../components/home/Avatar";
import SkillBar from "../components/home/SkillBar";
import CommunityFeed from "../components/home/CommunityFeed";
import AvatarWork from "../components/home/AvatarWork";
import GroupSelectionDialog from "../components/home/GroupSelectionDialog";
import { toast } from "sonner";

const SKILLS = [
  { key: "ai_tech", name: "בינה מלאכותית וטכנולוגיה", icon: "🤖", color: "from-blue-400 to-cyan-400" },
  { key: "social_skills", name: "מיומנויות אישיות", icon: "❤️", color: "from-pink-400 to-rose-400" },
  { key: "money_business", name: "כסף ועסקים", icon: "💸", color: "from-yellow-400 to-amber-400" }
];

export default function Home() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [showGroupSelection, setShowGroupSelection] = useState(false);
  const [userGroup, setUserGroup] = useState(null);
  const [nextLesson, setNextLesson] = useState(null);
  const [netWorth, setNetWorth] = useState(0);
  const [investmentsValue, setInvestmentsValue] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const initializeIntroLesson = async (userEmail) => {
    try {
      // Check if user already has the intro lesson participation
      const existingParticipations = await base44.entities.LessonParticipation.filter({
        student_email: userEmail,
        lesson_id: '68e4eebd3c0ca8414597076b' // סטארטאפ קיד - היכרות
      });

      if (existingParticipations.length === 0) {
        // Create participation for intro lesson
        await base44.entities.LessonParticipation.create({
          lesson_id: '68e4eebd3c0ca8414597076b',
          student_email: userEmail,
          lesson_date: new Date().toISOString().split('T')[0],
          attended: false
        });
      }
    } catch (error) {
      console.error("Error initializing intro lesson:", error);
    }
  };

  const getTodayKeyJerusalem = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  };

  const applyPassiveIncomeIfNeeded = async (user) => {
    try {
      const todayKey = getTodayKeyJerusalem();
      const lastKey = user.last_passive_income_date || todayKey;
      
      // Calculate days difference
      const lastDate = new Date(lastKey);
      const todayDate = new Date(todayKey);
      const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 0) return; // Same day, no income to add
      
      // Calculate passive income per day from purchased background items
      const purchasedItems = user.purchased_items || [];
      let perDay = 0;
      
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item && item.category === 'background' && item.passiveIncome) {
          perDay += item.passiveIncome;
        }
      });
      
      if (perDay === 0) {
        // No passive income items, just update date
        await base44.auth.updateMe({ last_passive_income_date: todayKey });
        return;
      }
      
      // Calculate total amount
      const amount = perDay * daysDiff;
      
      // Update user
      const newCoins = (user.coins || 0) + amount;
      const newTotalPassiveIncome = (user.total_passive_income || 0) + amount;
      
      await base44.auth.updateMe({
        coins: newCoins,
        total_passive_income: newTotalPassiveIncome,
        last_passive_income_date: todayKey
      });
      
      // Sync to LeaderboardEntry
      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
          student_email: user.email 
        });
        if (leaderboardEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            coins: newCoins,
            total_passive_income: newTotalPassiveIncome
          });
        }
      } catch (error) {
        console.error("Error syncing passive income to leaderboard:", error);
      }
      
      // Show toast notification
      if (amount > 0) {
        toast.success(`🏠 קיבלת ${amount} מטבעות מהכנסה פסיבית! (${daysDiff} ימים × ${perDay} מטבעות)`, {
          duration: 5000
        });
      }
      
      // Update user object for current session
      user.coins = newCoins;
      user.total_passive_income = newTotalPassiveIncome;
      user.last_passive_income_date = todayKey;
    } catch (error) {
      console.error("Error applying passive income:", error);
    }
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      // Apply passive income FIRST (before any other calculations)
      await applyPassiveIncomeIfNeeded(user);
      
      // Initialize intro lesson for new users
      if (!user.tutorial_initialized) {
        await initializeIntroLesson(user.email);
        await base44.auth.updateMe({ tutorial_initialized: true });
      }
      
      // Check if user needs to select group/name - only if they DON'T have these fields
      const needsOnboarding = !user.has_selected_group && (!user.first_name || !user.last_name);
      if (needsOnboarding) {
        setShowGroupSelection(true);
      }
      
      // Calculate lesson counts
      const lessonCounts = await calculateLessonCounts(user);
      
      // Calculate actual current coins based on net worth
      // const recalculatedCoins = await recalculateCoins(user);
      // if (recalculatedCoins !== null && Math.abs(recalculatedCoins - (user.coins || 0)) >= 1) {
      //   await base44.auth.updateMe({ coins: recalculatedCoins });
      //   user.coins = recalculatedCoins;
      // }

      setUserData({ ...user, ...lessonCounts });

      // Use pre-calculated investments_value if available (set by CRON or on trades)
      let invValue = user.investments_value;
      
      // Fallback: fetch if not available
      if (invValue === undefined || invValue === null) {
        invValue = await fetchInvestmentsValue(user.email);
      }

      const purchasedItems = user.purchased_items || [];
      let itemsValue = 0;
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item) itemsValue += item.price || 0;
      });

      setInvestmentsValue(invValue ?? 0);

      const worth = (user.coins || 0) + itemsValue + (invValue ?? 0);
      setNetWorth(worth);

      // Save calculated values if they changed
      const needsUpdate = 
        user.investments_value !== invValue || 
        user.total_networth !== worth;
      
      if (needsUpdate) {
        await base44.auth.updateMe({ 
          investments_value: invValue ?? 0, 
          total_networth: worth 
        });
        user.investments_value = invValue ?? 0;
        user.total_networth = worth;
      }

      // Fetch user group and next lesson
      try {
        const allGroups = await base44.entities.Group.list();
        const myGroup = allGroups.find(g => g.student_emails?.includes(user.email));
        
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

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      if (error.response?.status === 404 || error.response?.status === 401) {
        await base44.auth.redirectToLogin();
      }
      setIsLoading(false);
    }
  };



  const calculateLessonCounts = async (user) => {
    try {
      const allParticipations = await base44.entities.LessonParticipation.filter({ student_email: user.email });
      const allLessons = await base44.entities.Lesson.list();

      const lessonMap = {};
      allLessons.forEach(lesson => {
        lessonMap[lesson.id] = lesson;
      });

      const counts = {
        ai_tech_lessons: 0,
        social_skills_lessons: 0,
        money_business_lessons: 0
      };

      allParticipations.forEach(participation => {
        if (participation.attended) {
          const lesson = lessonMap[participation.lesson_id];
          if (!lesson) return;

          // Count based on lesson category
          if (lesson.category === 'ai_tech') counts.ai_tech_lessons++;
          if (lesson.category === 'personal_skills' || lesson.category === 'social_skills') counts.social_skills_lessons++;
          if (lesson.category === 'money_business') counts.money_business_lessons++;
        }
      });

      // Calculate total_lessons - real count of attended lessons
      const total_lessons = counts.ai_tech_lessons + counts.social_skills_lessons + counts.money_business_lessons;
      
      // Update User entity if there's a mismatch
      if (user.total_lessons !== total_lessons) {
        await base44.auth.updateMe({ total_lessons });
        
        // Sync to LeaderboardEntry
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
            student_email: user.email 
          });
          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
              total_lessons,
              ai_tech_lessons: counts.ai_tech_lessons,
              social_skills_lessons: counts.social_skills_lessons,
              money_business_lessons: counts.money_business_lessons
            });
          }
        } catch (error) {
          console.error("Error syncing to leaderboard:", error);
        }
      }

      return { ...counts, total_lessons };
    } catch (error) {
      console.error("Error calculating lesson counts:", error);
      return {
        ai_tech_lessons: 0,
        social_skills_lessons: 0,
        money_business_lessons: 0,
        total_lessons: 0
      };
    }
  };

  const recalculateCoins = async (user) => {
    try {
      // Total income from all sources
      const baseCoins = 500;
      const lessonsCoins = (user.total_lessons || 0) * 100;
      
      const allWordProgress = await base44.entities.WordProgress.filter({ student_email: user.email });
      const wordCoins = allWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
      
      const allMathProgress = await base44.entities.MathProgress.filter({ student_email: user.email });
      const mathCoins = allMathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
      
      const allParticipations = await base44.entities.LessonParticipation.filter({ student_email: user.email });
      const completedSurveys = allParticipations.filter(p => p.survey_completed === true);
      const surveyCoins = completedSurveys.length * 70;
      
      const allQuizProgress = await base44.entities.QuizProgress.filter({ student_email: user.email });
      const quizCoins = allQuizProgress.reduce((sum, q) => sum + (q.coins_earned || 0), 0);
      
      let profileTasksCoins = 0;
      if (user.completed_instagram_follow) profileTasksCoins += 50;
      if (user.completed_youtube_subscribe) profileTasksCoins += 50;
      if (user.completed_facebook_follow) profileTasksCoins += 50;
      if (user.completed_discord_join) profileTasksCoins += 50;
      if (user.completed_share) profileTasksCoins += 100;
      
      let profileDetailsCoins = 0;
      if (user.age) profileDetailsCoins += 20;
      if (user.bio && user.bio.length > 10) profileDetailsCoins += 30;
      if (user.phone_number) profileDetailsCoins += 20;
      
      const workCoins = user.total_work_earnings || 0;
      const collaborationCoins = user.total_collaboration_coins || 0;
      const loginStreakCoins = user.total_login_streak_coins || 0;
      const passiveIncomeCoins = user.total_passive_income || 0;

      const allInvestments = await base44.entities.Investment.list();
      const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
      const totalInvested = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
      const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      const unrealizedProfit = investmentsValue - totalInvested;
      const realizedProfit = user.total_realized_investment_profit || 0;
      // Only count realized profit as income (unrealized is already in current_value/assets)
      const totalInvestmentProfit = realizedProfit;

      const totalIncome = baseCoins + lessonsCoins + wordCoins + mathCoins + 
                         surveyCoins + quizCoins + profileTasksCoins + 
                         profileDetailsCoins + workCoins + collaborationCoins + 
                         loginStreakCoins + passiveIncomeCoins + totalInvestmentProfit;

      const purchasedItems = user.purchased_items || [];
      let itemsValue = 0;
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item && item.price) {
          itemsValue += item.price;
        }
      });

      const inflationLoss = user.total_inflation_lost || 0;
      const incomeTax = user.total_income_tax || 0;
      const capitalGainsTax = user.total_capital_gains_tax || 0;
      const creditInterest = user.total_credit_interest || 0;
      const itemSaleLosses = user.total_item_sale_losses || 0;
      const investmentFees = user.total_investment_fees || 0;

      const totalLosses = inflationLoss + incomeTax + capitalGainsTax + creditInterest + itemSaleLosses + investmentFees;

      // DON'T subtract investments! They are assets, not expenses
      const correctCoins = Math.round(totalIncome - itemsValue - totalLosses);
      
      console.log(`\n💰 HOME1 - Coin Recalculation for ${user.email}:`);
      console.log(`  📥 INCOME BREAKDOWN:`);
      console.log(`    base: ${baseCoins}`);
      console.log(`    lessons: ${lessonsCoins} (${user.total_lessons || 0} × 100)`);
      console.log(`    vocabulary: ${wordCoins}`);
      console.log(`    math: ${mathCoins}`);
      console.log(`    surveys: ${surveyCoins}`);
      console.log(`    quizzes: ${quizCoins}`);
      console.log(`    profileTasks: ${profileTasksCoins}`);
      console.log(`    profileDetails: ${profileDetailsCoins}`);
      console.log(`    work: ${workCoins}`);
      console.log(`    collaboration: ${collaborationCoins}`);
      console.log(`    loginStreak: ${loginStreakCoins}`);
      console.log(`    passiveIncome: ${passiveIncomeCoins}`);
      console.log(`    investmentProfit (realized): ${totalInvestmentProfit}`);
      console.log(`    ✅ TOTAL INCOME: ${totalIncome}`);
      console.log(`\n  📦 ASSETS:`);
      console.log(`    items: ${itemsValue}`);
      console.log(`    investments: ${investmentsValue} (NOT subtracted from coins!)`);
      console.log(`\n  📉 LOSSES:`);
      console.log(`    inflation: ${inflationLoss}`);
      console.log(`    incomeTax: ${incomeTax}`);
      console.log(`    capitalGainsTax: ${capitalGainsTax}`);
      console.log(`    creditInterest: ${creditInterest}`);
      console.log(`    itemSaleLosses: ${itemSaleLosses}`);
      console.log(`    investmentFees: ${investmentFees}`);
      console.log(`    ✅ TOTAL LOSSES: ${totalLosses}`);
      console.log(`\n  🧮 CALCULATION:`);
      console.log(`    ${totalIncome} - ${itemsValue} - ${totalLosses} = ${correctCoins}`);
      console.log(`    Current user.coins: ${user.coins || 0}`);
      console.log(`    Difference: ${correctCoins - (user.coins || 0)}\n`);

      return correctCoins;
    } catch (error) {
      console.error("Error recalculating coins:", error);
      return null;
    }
  };



  const handleEquipItem = async (newEquipped) => {
    if (!userData) return;
    
    await base44.auth.updateMe({ equipped_items: newEquipped });
    setUserData({ ...userData, equipped_items: newEquipped });

    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          equipped_items: newEquipped
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  };

  const handlePurchaseItem = async (itemId) => {
    if (!userData) return;

    const item = AVATAR_ITEMS[itemId];
    if (!item) return;

    const itemPrice = item.price || 0;
    
    if ((userData.coins || 0) < itemPrice) {
      toast.error(`אין לך מספיק מטבעות! צריך ${itemPrice} מטבעות.`);
      return;
    }

    const purchasedItems = userData.purchased_items || [];
    if (purchasedItems.includes(itemId)) {
      toast.error("כבר קנית את הפריט הזה!");
      return;
    }

    const newPurchasedItems = [...purchasedItems, itemId];
    const newCoins = (userData.coins || 0) - itemPrice;

    await base44.auth.updateMe({
      purchased_items: newPurchasedItems,
      coins: newCoins
    });

    setUserData({
      ...userData,
      purchased_items: newPurchasedItems,
      coins: newCoins
    });

    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          purchased_items: newPurchasedItems,
          coins: newCoins
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    toast.success(`🎉 קנית את ${item.name}!`);
  };

  const handleSellItem = async (itemId) => {
    if (!userData) return;

    const item = AVATAR_ITEMS[itemId];
    if (!item) return;

    const purchasedItems = userData.purchased_items || [];
    if (!purchasedItems.includes(itemId)) {
      toast.error("לא קנית את הפריט הזה!");
      return;
    }

    const salePrice = Math.floor((item.price || 0) * 0.5);
    const lossDueToSale = (item.price || 0) - salePrice;

    const newPurchasedItems = purchasedItems.filter(id => id !== itemId);
    const newCoins = (userData.coins || 0) + salePrice;

    const equippedItems = userData.equipped_items || {};
    let newEquippedItems = { ...equippedItems };
    if (equippedItems[item.category] === itemId) {
      delete newEquippedItems[item.category];
    }

    await base44.auth.updateMe({
      purchased_items: newPurchasedItems,
      coins: newCoins,
      equipped_items: newEquippedItems,
      total_item_sale_losses: (userData.total_item_sale_losses || 0) + lossDueToSale
    });

    setUserData({
      ...userData,
      purchased_items: newPurchasedItems,
      coins: newCoins,
      equipped_items: newEquippedItems,
      total_item_sale_losses: (userData.total_item_sale_losses || 0) + lossDueToSale
    });

    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
      if (leaderboardEntries.length > 0) {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          purchased_items: newPurchasedItems,
          coins: newCoins,
          equipped_items: newEquippedItems,
          total_item_sale_losses: (userData.total_item_sale_losses || 0) + lossDueToSale
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    toast.success(`מכרת את ${item.name} ב-${salePrice} מטבעות (50% מהמחיר המקורי)`);
  };

  const fetchInvestmentsValue = async (userEmail) => {
    try {
      const myInvestments = await safeRequest(
        () => base44.entities.Investment.filter({ student_email: userEmail }),
        { key: `INV:${userEmail}`, ttlMs: 15000, retries: 1 }
      );
      const investmentsValue = myInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      console.log(`✅ Fetched investments value for ${userEmail}: ${investmentsValue}`);
      return investmentsValue;
    } catch (error) {
      console.error("Error fetching investments value:", error);
      // Return null on error to distinguish from 0 investments
      return null;
    }
  };

  const calculateNetWorth = async (user = userData, cachedInvestmentsValue = null) => {
    if (!user) return 0;

    // Try to use pre-calculated total_networth from User entity first
    if (user.total_networth !== undefined && user.total_networth !== null) {
      console.log(`\n💎 HOME1 - Using pre-calculated net worth for ${user.email}: ${user.total_networth}\n`);
      return user.total_networth;
    }

    // Fallback: calculate manually if not available
    const currentCoins = user.coins || 0;
    const purchasedItems = user.purchased_items || [];
    
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) {
        itemsValue += item.price || 0;
      }
    });

    // Use cached investments value if provided, otherwise fetch
    const investmentsValue = cachedInvestmentsValue !== null ? cachedInvestmentsValue : await fetchInvestmentsValue(user.email);
    const netWorth = currentCoins + itemsValue + investmentsValue;
    
    console.log(`\n💎 HOME1 - Net Worth Calculation (fallback) for ${user.email}:`);
    console.log(`  coins: ${currentCoins}`);
    console.log(`  items: ${itemsValue}`);
    console.log(`  investments: ${investmentsValue}`);
    console.log(`  ✅ NET WORTH: ${netWorth}\n`);
    
    return netWorth;
  };

  const calculateExpectedDailyLoss = () => {
    if (!userData) return 0;

    const netWorth = calculateNetWorth();
    const currentCoins = userData.coins || 0;

    let inflationLoss = 0;
    let incomeTax = 0;
    let creditInterest = 0;

    if (currentCoins > 0) {
      inflationLoss = Math.floor(currentCoins * 0.03);
    }

    const purchasedItems = userData.purchased_items || [];
    let incomeTaxRate = 0.015;

    for (const itemId of purchasedItems) {
      const item = AVATAR_ITEMS[itemId];
      if (item && item.category === 'body' && item.taxReduction) {
        incomeTaxRate = Math.max(0, incomeTaxRate - (item.taxReduction / 100));
      }
    }

    incomeTax = Math.floor(netWorth * incomeTaxRate);

    if (currentCoins < 0) {
      creditInterest = Math.floor(Math.abs(currentCoins) * 0.10);
    }

    return inflationLoss + incomeTax + creditInterest;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          🎮
        </motion.div>
      </div>
    );
  }

  const expectedDailyLoss = calculateExpectedDailyLoss();

  return (
    <div className="px-4 py-8 pb-24 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-black text-white">
          שלום {userData?.first_name || userData?.full_name?.split(' ')[0] || 'חבר'}! 👋
        </h1>
      </motion.div>

      {/* First Row - Coins and Net Worth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coins & Equipped Items Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card className="bg-gradient-to-br from-orange-400 via-amber-500 to-orange-500 border-0 shadow-2xl h-full overflow-hidden relative">
                {/* Animated background circles */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <CardContent className="p-6 flex flex-col h-full relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-black text-lg">💰 עובר ושב</h3>
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Coins className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6 text-center"
                  >
                    <p className="text-6xl font-black text-white drop-shadow-lg mb-2">
                      {(userData?.coins || 0).toLocaleString('he-IL')}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                      <span>💰</span>
                      <span className="font-medium">מטבעות זמינים</span>
                    </div>
                  </motion.div>

                <TooltipProvider>
                  <div className="space-y-2 mb-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 backdrop-blur-sm border border-orange-400/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-bold text-sm">💸 הפסדים צפויים</span>
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <HelpCircle className="w-4 h-4 text-white/60" />
                      </motion.div>
                    </div>
                    {(() => {
                      const currentCoins = userData?.coins || 0;
                      const purchasedItems = userData?.purchased_items || [];

                      let inflationLoss = 0;
                      let incomeTax = 0;
                      let creditInterest = 0;

                      if (currentCoins > 0) {
                        inflationLoss = Math.floor(currentCoins * 0.03);
                      }

                      let incomeTaxRate = 0.015;
                      for (const itemId of purchasedItems) {
                        const item = AVATAR_ITEMS[itemId];
                        if (item && item.category === 'body' && item.taxReduction) {
                          incomeTaxRate = Math.max(0, incomeTaxRate - (item.taxReduction / 100));
                        }
                      }
                      incomeTax = Math.floor(netWorth * incomeTaxRate);

                      if (currentCoins < 0) {
                        creditInterest = Math.floor(Math.abs(currentCoins) * 0.10);
                      }
                      
                      console.log(`\n💸 HOME1 - Expected Daily Losses for ${userData?.email}:`);
                      console.log(`  currentCoins: ${currentCoins}`);
                      console.log(`  netWorth: ${netWorth}`);
                      console.log(`  inflationLoss (3% on cash): ${inflationLoss}`);
                      console.log(`  incomeTax (${(incomeTaxRate * 100).toFixed(2)}% on netWorth): ${incomeTax}`);
                      console.log(`  creditInterest (10% on negative): ${creditInterest}`);
                      console.log(`  ✅ TOTAL EXPECTED DAILY LOSS: ${inflationLoss + incomeTax + creditInterest}\n`);

                      return (
                        <>
                          {inflationLoss > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className="flex items-center justify-between bg-white/15 rounded-lg px-3 py-2.5 cursor-help hover:bg-white/25 transition-all border border-white/10"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white/90 text-sm font-medium flex items-center gap-1">
                                    💨 אינפלציה
                                    <span className="text-white/60 text-[10px]">(3%)</span>
                                  </span>
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-white">-{inflationLoss}</span>
                                    <span className="text-xs">🪙</span>
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                                <p className="text-xs">אינפלציה: 3% ביום על יתרת מזומנים חיובית</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {incomeTax > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className="flex items-center justify-between bg-white/15 rounded-lg px-3 py-2.5 cursor-help hover:bg-white/25 transition-all border border-white/10"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white/90 text-sm font-medium flex items-center gap-1">
                                    📊 מס הכנסה
                                    <span className="text-white/60 text-[10px]">({(incomeTaxRate * 100).toFixed(1)}%)</span>
                                  </span>
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-white">-{incomeTax}</span>
                                    <span className="text-xs">🪙</span>
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                                <p className="text-xs">מס הכנסה: {(incomeTaxRate * 100).toFixed(1)}% ביום על שווי כולל</p>
                                <p className="text-xs text-slate-400 mt-1">ניתן להפחית עם צבעי גוף שונים</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {creditInterest > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className="flex items-center justify-between bg-white/15 rounded-lg px-3 py-2.5 cursor-help hover:bg-white/25 transition-all border border-white/10"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white/90 text-sm font-medium flex items-center gap-1">
                                    💳 ריבית אשראי
                                    <span className="text-white/60 text-[10px]">(10%)</span>
                                  </span>
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-white">-{creditInterest}</span>
                                    <span className="text-xs">🪙</span>
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                                <p className="text-xs">ריבית אשראי: 10% ביום על יתרת מינוס</p>
                                <p className="text-xs text-slate-400 mt-1">מופעל רק כשיש חוב</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {inflationLoss === 0 && incomeTax === 0 && creditInterest === 0 && (
                            <div className="text-center py-3 bg-green-500/20 rounded-lg border border-green-400/30">
                              <p className="text-white font-medium text-sm">🎉 אין הפסדים צפויים!</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </TooltipProvider>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setShowShop(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-bold border-2 border-white/40 mt-auto shadow-lg backdrop-blur-sm transition-all"
                  >
                    <ShoppingBag className="w-4 h-4 ml-2" />
                    פתח חנות
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
            </motion.div>

                {/* Net Worth Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Card className="bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 border-0 shadow-2xl h-full overflow-hidden relative">
                    {/* Animated background circles */}
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    <CardContent className="p-6 h-full flex flex-col relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-black text-lg">שווי כולל 💎</h3>
                        <motion.div
                          className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <TrendingUp className="w-6 h-6 text-white" />
                        </motion.div>
                      </div>

                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mb-6 text-center"
                      >
                        <p className="text-6xl font-black text-white drop-shadow-lg mb-2">
                          {netWorth.toLocaleString('he-IL')}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                          <span>💎</span>
                          <span className="font-medium">שווי נכסים כולל</span>
                        </div>
                      </motion.div>

                      <div className="space-y-3 bg-white/10 rounded-xl p-4 backdrop-blur-sm flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-bold text-sm">📊 פירוט נכסים</span>
                        </div>
                        <motion.div 
                          className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2.5 hover:bg-white/20 transition-all"
                          whileHover={{ x: 5 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-400/30 flex items-center justify-center">
                              <Coins className="w-4 h-4 text-orange-200" />
                            </div>
                            <span className="text-white/90 text-sm font-medium">עובר ושב</span>
                          </div>
                          <span className="font-bold text-white">{(userData?.coins || 0).toLocaleString('he-IL')}</span>
                        </motion.div>
                        <motion.div 
                          className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2.5 hover:bg-white/20 transition-all"
                          whileHover={{ x: 5 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-400/30 flex items-center justify-center">
                              <Shirt className="w-4 h-4 text-blue-200" />
                            </div>
                            <span className="text-white/90 text-sm font-medium">פריטים</span>
                          </div>
                          <span className="font-bold text-white">{(() => {
                            const purchasedItems = userData?.purchased_items || [];
                            let itemsValue = 0;
                            purchasedItems.forEach(itemId => {
                              const item = AVATAR_ITEMS[itemId];
                              if (item) itemsValue += item.price || 0;
                            });
                            return itemsValue.toLocaleString('he-IL');
                          })()}</span>
                        </motion.div>
                        <motion.div 
                          className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2.5 hover:bg-white/20 transition-all"
                          whileHover={{ x: 5 }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-400/30 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-green-200" />
                            </div>
                            <span className="text-white/90 text-sm font-medium">השקעות</span>
                          </div>
                          <span className="font-bold text-white">
                            {investmentsValue !== null ? investmentsValue.toLocaleString('he-IL') : '...'}
                          </span>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                </div>

      {/* Second Row - Avatar + Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Avatar */}
        <Avatar 
          stage={1}
          totalLessons={userData?.total_lessons || 0}
          equippedItems={userData?.equipped_items || {}}
        />

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                המיומנויות שלי
              </h2>

              <div className="space-y-4">
                {SKILLS.map((skill, index) => {
                  const level = userData[`${skill.key}_level`] || 1;
                  const xp = userData[`${skill.key}_xp`] || 0;
                  const lessonCount = userData[`${skill.key}_lessons`] || 0;

                  return (
                    <SkillBar
                      key={skill.key}
                      skill={skill}
                      level={level}
                      xp={xp}
                      lessonCount={lessonCount}
                      delay={index * 0.1}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Community Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CommunityFeed userData={userData} onRefresh={loadData} />
      </motion.div>



      <TamagotchiWardrobe
        isOpen={showWardrobe}
        onClose={() => setShowWardrobe(false)}
        equippedItems={userData?.equipped_items || {}}
        totalLessons={userData?.total_lessons || 0}
        onEquipItem={handleEquipItem}
      />

      <AvatarShop
        isOpen={showShop}
        onClose={() => setShowShop(false)}
        equippedItems={userData?.equipped_items || {}}
        userData={userData}
        onPurchase={loadData}
        onEquipItem={handleEquipItem}
      />

      <AvatarWork
        isOpen={showWork}
        onClose={() => {
          setShowWork(false);
          loadData();
        }}
        userData={userData}
      />

      <GroupSelectionDialog
        isOpen={showGroupSelection}
        onComplete={() => {
          setShowGroupSelection(false);
          loadData();
        }}
      />

      {/* How to Earn Money Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 backdrop-blur-md border-2 border-purple-400/50">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              💰 איך להרוויח מטבעות?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📚</span>
                  <span className="text-white font-bold">השתתפות בשיעורים</span>
                </div>
                <p className="text-white/80 text-sm">100 מטבעות לכל שיעור + נסיון</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד שיעורים</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📝</span>
                  <span className="text-white font-bold">מילוי סקרים</span>
                </div>
                <p className="text-white/80 text-sm">50 מטבעות אחרי כל שיעור</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד שיעורים</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎯</span>
                  <span className="text-white font-bold">חידונים</span>
                </div>
                <p className="text-white/80 text-sm">מטבעות לפי הציון שלך</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד שיעורים</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">ABC</span>
                  <span className="text-white font-bold">תרגילי אנגלית</span>
                </div>
                <p className="text-white/80 text-sm">מטבעות + בונוס מפריטי פה</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד אנגלית</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">123</span>
                  <span className="text-white font-bold">תרגילי חשבון</span>
                </div>
                <p className="text-white/80 text-sm">מטבעות + בונוס מנעליים</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד חשבון</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔥</span>
                  <span className="text-white font-bold">רצף כניסות</span>
                </div>
                <p className="text-white/80 text-sm">10-20-30... מטבעות כל יום!</p>
                <p className="text-white/60 text-xs mt-1">📍 אוטומטי בכניסה</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🏠</span>
                  <span className="text-white font-bold">מגורים</span>
                </div>
                <p className="text-white/80 text-sm">הכנסה פסיבית אוטומטית ליום</p>
                <p className="text-white/60 text-xs mt-1">📍 חנות - פריטי מגורים</p>
              </div>

              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📈</span>
                  <span className="text-white font-bold">השקעות</span>
                </div>
                <p className="text-white/80 text-sm">רווחים (או הפסדים) מהשוק</p>
                <p className="text-white/60 text-xs mt-1">📍 עמוד השקעות</p>
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-lg p-4 border-2 border-yellow-400/50">
              <p className="text-white text-center font-bold text-lg">
                💡 טיפ: פריטים מהחנות נותנים בונוסים שיעזרו לך להרוויח יותר!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>
      );
      }