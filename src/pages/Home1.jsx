import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      // Calculate lesson counts
      const lessonCounts = await calculateLessonCounts(user);
      
      // Calculate actual current coins based on net worth
      const recalculatedCoins = await recalculateCoins(user);
      if (recalculatedCoins !== null && Math.abs(recalculatedCoins - (user.coins || 0)) >= 1) {
        await base44.auth.updateMe({ coins: recalculatedCoins });
        user.coins = recalculatedCoins;
      }
      
      // Initialize tutorial lessons only for new demo users
      if (user.user_type === 'demo' && !user.tutorial_initialized) {
        await initializeTutorialLessons(user.email);
        await base44.auth.updateMe({ tutorial_initialized: true });
      }

      setUserData({ ...user, ...lessonCounts });

      // Calculate net worth
      const worth = await calculateNetWorth();
      setNetWorth(worth);

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

  // Update net worth when data changes
  React.useEffect(() => {
    if (userData) {
      calculateNetWorth().then(setNetWorth);
    }
  }, [userData]);

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
        personal_dev_lessons: 0,
        social_skills_lessons: 0,
        money_business_lessons: 0
      };

      allParticipations.forEach(participation => {
        if (participation.attended) {
          const lesson = lessonMap[participation.lesson_id];
          if (!lesson) return;

          if ((lesson.ai_tech_xp || 0) > 0) counts.ai_tech_lessons++;
          if ((lesson.personal_dev_xp || 0) > 0) counts.personal_dev_lessons++;
          if ((lesson.social_skills_xp || 0) > 0) counts.social_skills_lessons++;
          if ((lesson.money_business_xp || 0) > 0) counts.money_business_lessons++;
        }
      });

      return counts;
    } catch (error) {
      console.error("Error calculating lesson counts:", error);
      return {
        ai_tech_lessons: 0,
        personal_dev_lessons: 0,
        social_skills_lessons: 0,
        money_business_lessons: 0
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
      const surveyCoins = completedSurveys.length * 20;
      
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

      const userInvestments = await base44.entities.Investment.filter({ student_email: user.email });
      const totalInvested = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
      const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      const unrealizedProfit = investmentsValue - totalInvested;
      const realizedProfit = user.total_realized_investment_profit || 0;
      const totalInvestmentProfit = unrealizedProfit + realizedProfit;

      const totalIncome = baseCoins + lessonsCoins + wordCoins + mathCoins + 
                         surveyCoins + quizCoins + profileTasksCoins + 
                         profileDetailsCoins + workCoins + collaborationCoins + 
                         loginStreakCoins + totalInvestmentProfit;

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
      const dividendTax = user.total_dividend_tax || 0;

      const totalLosses = inflationLoss + incomeTax + capitalGainsTax + creditInterest + itemSaleLosses + investmentFees + dividendTax;

      const correctCoins = Math.round(totalIncome - itemsValue - investmentsValue - totalLosses);

      return correctCoins;
    } catch (error) {
      console.error("Error recalculating coins:", error);
      return null;
    }
  };

  const initializeTutorialLessons = async (userEmail) => {
    try {
      const tutorialLessons = [
        {
          lesson_name: "שיעור הדגמה - מבוא לבינה מלאכותית",
          lesson_date: new Date().toISOString().split('T')[0],
          description: "למד את היסודות של AI וטכנולוגיה מודרנית",
          ai_tech_xp: 30,
          personal_dev_xp: 0,
          social_skills_xp: 0,
          money_business_xp: 0,
          category: "ai_tech",
          thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
          recorded_lesson_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        {
          lesson_name: "שיעור הדגמה - יזמות וחשיבה עסקית",
          lesson_date: new Date().toISOString().split('T')[0],
          description: "גלה איך לחשוב כמו יזם ולזהות הזדמנויות",
          ai_tech_xp: 0,
          personal_dev_xp: 0,
          social_skills_xp: 0,
          money_business_xp: 30,
          category: "money_business",
          thumbnail_url: "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=400",
          recorded_lesson_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      ];

      for (const lessonData of tutorialLessons) {
        const createdLesson = await base44.entities.Lesson.create(lessonData);
        
        await base44.entities.LessonParticipation.create({
          lesson_id: createdLesson.id,
          student_email: userEmail,
          lesson_date: lessonData.lesson_date,
          attended: false
        });
      }
    } catch (error) {
      console.error("Error initializing tutorial lessons:", error);
    }
  };

  const handleEquipItem = async (itemId) => {
    if (!userData) return;

    const item = AVATAR_ITEMS[itemId];
    if (!item) return;

    const currentEquipped = userData.equipped_items || {};
    
    if (currentEquipped[item.category] === itemId) {
      const newEquipped = { ...currentEquipped };
      delete newEquipped[item.category];
      
      await base44.auth.updateMe({ equipped_items: newEquipped });
      setUserData({ ...userData, equipped_items: newEquipped });
    } else {
      const newEquipped = { ...currentEquipped, [item.category]: itemId };
      
      await base44.auth.updateMe({ equipped_items: newEquipped });
      setUserData({ ...userData, equipped_items: newEquipped });
    }

    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
      if (leaderboardEntries.length > 0) {
        const newEquipped = currentEquipped[item.category] === itemId 
          ? { ...currentEquipped, [item.category]: undefined }
          : { ...currentEquipped, [item.category]: itemId };
        
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
          equipped_items: newEquippedItems
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    toast.success(`מכרת את ${item.name} ב-${salePrice} מטבעות (50% מהמחיר המקורי)`);
  };

  const calculateNetWorth = async () => {
    if (!userData) return 0;

    const currentCoins = userData.coins || 0;
    const purchasedItems = userData.purchased_items || [];
    
    let itemsValue = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) {
        itemsValue += item.price || 0;
      }
    });

    // Get investments value
    try {
      const userInvestments = await base44.entities.Investment.filter({ student_email: userData.email });
      const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      return currentCoins + itemsValue + investmentsValue;
    } catch (error) {
      console.error("Error calculating net worth:", error);
      return currentCoins + itemsValue;
    }
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
    let incomeTaxRate = 0.02;

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
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Coins className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-white font-black text-lg">💰 עובר ושב</h3>
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
                  <div className="space-y-2 mb-6 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
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
                      let dividendTax = 0;

                      if (currentCoins > 0) {
                        inflationLoss = Math.floor(currentCoins * 0.03);
                      }

                      let incomeTaxRate = 0.02;
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

                      dividendTax = userData?.daily_dividend_tax || 0;

                      return (
                        <>
                          {inflationLoss > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 cursor-help hover:bg-white/20 transition-all"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-xs">🪙</span>
                                    <span className="text-red-200">-{inflationLoss}</span>
                                  </span>
                                  <span className="text-white/90 text-xs flex items-center gap-1">
                                    💨 אינפלציה
                                    <span className="text-white/60 text-[10px]">(3%)</span>
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
                                  className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 cursor-help hover:bg-white/20 transition-all"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-xs">🪙</span>
                                    <span className="text-red-200">-{incomeTax}</span>
                                  </span>
                                  <span className="text-white/90 text-xs flex items-center gap-1">
                                    📊 מס הכנסה
                                    <span className="text-white/60 text-[10px]">({(incomeTaxRate * 100).toFixed(1)}%)</span>
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
                                  className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 cursor-help hover:bg-white/20 transition-all"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-xs">🪙</span>
                                    <span className="text-red-200">-{creditInterest}</span>
                                  </span>
                                  <span className="text-white/90 text-xs flex items-center gap-1">
                                    💳 ריבית אשראי
                                    <span className="text-white/60 text-[10px]">(10%)</span>
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                                <p className="text-xs">ריבית אשראי: 10% ביום על יתרת מינוס</p>
                                <p className="text-xs text-slate-400 mt-1">מופעל רק כשיש חוב</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {dividendTax > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div 
                                  className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 cursor-help hover:bg-white/20 transition-all"
                                  whileHover={{ x: 5 }}
                                >
                                  <span className="text-white font-bold flex items-center gap-2">
                                    <span className="text-xs">🪙</span>
                                    <span className="text-red-200">-{dividendTax}</span>
                                  </span>
                                  <span className="text-white/90 text-xs flex items-center gap-1">
                                    📈 מס דיבידנד
                                    <span className="text-white/60 text-[10px]">(25%)</span>
                                  </span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700">
                                <p className="text-xs">מס דיבידנד: 25% על רווחי השקעות יומיים</p>
                                <p className="text-xs text-slate-400 mt-1">ניתן להפחית עם פריטי פה שונים</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {inflationLoss === 0 && incomeTax === 0 && creditInterest === 0 && dividendTax === 0 && (
                            <div className="text-center py-3 bg-green-500/20 rounded-lg">
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
                        <div className="text-white/90 text-xs font-bold mb-3">📊 פירוט נכסים</div>
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
                          <span className="font-bold text-white">{(netWorth - (userData?.coins || 0) - (() => {
                            const purchasedItems = userData?.purchased_items || [];
                            let itemsValue = 0;
                            purchasedItems.forEach(itemId => {
                              const item = AVATAR_ITEMS[itemId];
                              if (item) itemsValue += item.price || 0;
                            });
                            return itemsValue;
                          })()).toLocaleString('he-IL')}</span>
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

      {!userGroup && userData?.user_type === 'student' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/30 to-red-500/30 backdrop-blur-md border-2 border-orange-400/50">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-orange-200 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">
                אתה עדיין לא בקבוצה! 🤔
              </h3>
              <p className="text-white/80 text-sm mb-4">
                הצטרף לקבוצה כדי לקבל גישה לשיעורים!
              </p>
              <Button
                onClick={() => setShowGroupSelection(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold"
              >
                בחר קבוצה 👥
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

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
        onPurchase={handlePurchaseItem}
        onSell={handleSellItem}
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
        onClose={() => setShowGroupSelection(false)}
        userEmail={userData?.email}
        onGroupSelected={() => {
          setShowGroupSelection(false);
          loadData();
        }}
      />
    </div>
  );
}