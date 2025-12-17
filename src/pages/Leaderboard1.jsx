import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, TrendingUp, BookOpen, Star, Crown, Handshake, Check, Heart, Flame, Calculator, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TamagotchiAvatar from "../components/avatar/TamagotchiAvatar";
import { AVATAR_ITEMS } from "../components/avatar/TamagotchiAvatar";
import StudentProfileDialog from "../components/leaderboard/StudentProfileDialog";
import { toast } from "sonner";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    loadData();
    
    // Calculate time until season end (31.03.2026)
    const calculateTimeLeft = () => {
      const seasonEnd = new Date('2026-03-31T23:59:59');
      const now = new Date();
      const difference = seasonEnd - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const calculateTotalValue = (user, investmentsValue) => {
    const purchasedItems = user.purchased_items || [];

    let spentOnItems = 0;
    purchasedItems.forEach(itemId => {
      const item = AVATAR_ITEMS[itemId];
      if (item) {
        spentOnItems += item.price || 0;
      }
    });

    const currentCoins = Math.round(user.coins || 0);
    return Math.round(currentCoins + spentOnItems + investmentsValue);
  };

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Fetch all data in a single batch to prevent rate limiting
      let allEntries = [];
      let allUsers = [];
      let allWordProgress = [];
      let allInvestments = [];

      try {
        allEntries = await base44.entities.LeaderboardEntry.list();
      } catch (e) {
        console.error("Error loading LeaderboardEntry:", e);
      }

      try {
        allUsers = await base44.entities.User.list();
      } catch (e) {
        console.error("Error loading Users:", e);
        // If User.list fails, just use an empty array
        allUsers = [];
      }

      try {
        allWordProgress = await base44.entities.WordProgress.list();
      } catch (e) {
        console.error("Error loading WordProgress:", e);
      }

      try {
        allInvestments = await base44.entities.Investment.list();
      } catch (e) {
        console.error("Error loading Investments:", e);
      }

      console.log("Loaded entries:", allEntries.length, "users:", allUsers.length);

      // If no entries loaded, show error
      if (allEntries.length === 0) {
        console.error("No leaderboard entries found");
        setUsers([]);
        return;
      }

      // Filter: Show ONLY students, exclude admins (unless current user is admin viewing themselves)
      const isCurrentUserAdmin = user?.role === 'admin';
      
      let filteredUsersForLeaderboard = allEntries.filter(u => {
        // Check if this entry belongs to an admin
        const userRecord = allUsers.find(usr => usr.email === u.student_email);
        const isEntryAdmin = userRecord?.role === 'admin';

        // Current user can always see themselves
        if (user && u.student_email === user.email) {
          return true;
        }

        // Regular users cannot see admins AT ALL (even if they are also students)
        if (!isCurrentUserAdmin && isEntryAdmin) {
          return false;
        }

        // For others, only show students
        return u.user_type === 'student';
      });

      // Fetch lesson participations and lessons for accurate counts
      let allLessonParticipations = [];
      let allLessons = [];
      let allMathProgress = [];
      
      try {
        allLessonParticipations = await base44.entities.LessonParticipation.list();
      } catch (e) {
        console.error("Error loading LessonParticipation:", e);
      }
      
      try {
        allLessons = await base44.entities.Lesson.list();
      } catch (e) {
        console.error("Error loading Lessons:", e);
      }
      
      try {
        allMathProgress = await base44.entities.MathProgress.list();
      } catch (e) {
        console.error("Error loading MathProgress:", e);
      }

      const usersWithAllStats = filteredUsersForLeaderboard.map((u) => {
        const masteredWords = allWordProgress.filter(
          w => w.student_email === u.student_email && w.mastered
        ).length;

        // Get actual data from User entity (real source of truth)
        const userRecord = allUsers.find(usr => usr.email === u.student_email);
        const last_login_date = userRecord?.last_login_date;
        const actualTotalLessons = userRecord?.total_lessons || u.total_lessons || 0;
        const actualAiTechLevel = userRecord?.ai_tech_level || u.ai_tech_level || 1;
        const actualPersonalDevLevel = userRecord?.personal_dev_level || u.personal_dev_level || 1;
        const actualSocialSkillsLevel = userRecord?.social_skills_level || u.social_skills_level || 1;
        const actualMoneyBusinessLevel = userRecord?.money_business_level || u.money_business_level || 1;
        
        // Calculate lesson counts by category
        const userParticipations = allLessonParticipations.filter(p => p.student_email === u.student_email && p.attended);
        const lessonMap = {};
        allLessons.forEach(lesson => {
          lessonMap[lesson.id] = lesson;
        });
        
        let aiTechLessons = 0;
        let socialSkillsLessons = 0;
        let moneyBusinessLessons = 0;
        
        userParticipations.forEach(participation => {
          const lesson = lessonMap[participation.lesson_id];
          if (!lesson) return;
          
          if (lesson.category === 'ai_tech') aiTechLessons++;
          if (lesson.category === 'personal_skills' || lesson.category === 'social_skills') socialSkillsLessons++;
          if (lesson.category === 'money_business') moneyBusinessLessons++;
        });
        
        // Count completed math questions (any question with attempts)
        const userMathProgress = allMathProgress.filter(m => m.student_email === u.student_email && (m.total_attempts || 0) > 0);
        const masteredMathQuestions = userMathProgress.length;
        
        // Login streak
        const loginStreak = userRecord?.login_streak || 0;
        
        // Collaboration count
        const collaborationCount = Math.floor((userRecord?.total_collaboration_coins || 0) / 25);

        const averageLevel = Math.round(
          (actualAiTechLevel +
          actualPersonalDevLevel +
          actualSocialSkillsLevel +
          actualMoneyBusinessLevel) / 4
        );

        // Calculate net worth including investments (NO pending taxes!)
        const userInvestments = allInvestments.filter(inv => inv.student_email === u.student_email);
        const investmentsValue = userInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
        
        const totalValue = calculateTotalValue(u, investmentsValue);

        const totalXP =
          ((u.ai_tech_level || 1) - 1) * 100 + (u.ai_tech_xp || 0) +
          ((u.personal_dev_level || 1) - 1) * 100 + (u.personal_dev_xp || 0) +
          ((u.social_skills_level || 1) - 1) * 100 + (u.social_skills_xp || 0) +
          ((u.money_business_level || 1) - 1) * 100 + (u.money_business_xp || 0);

        // Calculate category earnings for crowns
        const userWordProgress = allWordProgress.filter(w => w.student_email === u.student_email);
        const vocabEarnings = userWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
        
        // Debug for alon
        if (u.student_email === 'alon@binder.co.il') {
          console.log('Alon LeaderboardEntry:', u);
          console.log('Alon UserRecord:', userRecord);
        }
        
        const mathEarnings = userRecord?.total_math_earnings || u.total_math_earnings || 0;
        const currentInvestmentValue = investmentsValue; // Already calculated above
        const loginStreakEarnings = userRecord?.total_login_streak_coins || u.total_login_streak_coins || 0;
        const workEarnings = userRecord?.total_work_earnings || u.total_work_earnings || 0;

        return {
          ...u,
          masteredWords,
          averageLevel,
          totalValue,
          totalXP,
          last_login_date,
          total_lessons: actualTotalLessons,
          ai_tech_level: actualAiTechLevel,
          personal_dev_level: actualPersonalDevLevel,
          social_skills_level: actualSocialSkillsLevel,
          money_business_level: actualMoneyBusinessLevel,
          vocabEarnings,
          mathEarnings,
          currentInvestmentValue,
          loginStreakEarnings,
          workEarnings,
          aiTechLessons,
          socialSkillsLessons,
          moneyBusinessLessons,
          masteredMathQuestions,
          loginStreak,
          collaborationCount
        };
      });

      // Sort by totalValue (Networth) instead of totalXP
      usersWithAllStats.sort((a, b) => b.totalValue - a.totalValue);

      // Find kings in each category
      const mathKing = [...usersWithAllStats].sort((a, b) => b.mathEarnings - a.mathEarnings)[0];
      const vocabKing = [...usersWithAllStats].sort((a, b) => b.vocabEarnings - a.vocabEarnings)[0];
      const investmentKing = [...usersWithAllStats].sort((a, b) => b.currentInvestmentValue - a.currentInvestmentValue)[0];
      const loginStreakKing = [...usersWithAllStats].sort((a, b) => b.loginStreakEarnings - a.loginStreakEarnings)[0];
      const workKing = [...usersWithAllStats].sort((a, b) => b.workEarnings - a.workEarnings)[0];

      // Debug: Log kings
      console.log('Math King:', mathKing?.student_email, 'Earnings:', mathKing?.mathEarnings);
      console.log('Vocab King:', vocabKing?.student_email, 'Earnings:', vocabKing?.vocabEarnings);
      console.log('Investment King:', investmentKing?.student_email, 'Value:', investmentKing?.currentInvestmentValue);
      console.log('Login Streak King:', loginStreakKing?.student_email, 'Earnings:', loginStreakKing?.loginStreakEarnings);
      console.log('Work King:', workKing?.student_email, 'Earnings:', workKing?.workEarnings);

      // Add crown flags to users
      usersWithAllStats.forEach(u => {
        u.crowns = [];
        if (mathKing && u.student_email === mathKing.student_email && mathKing.mathEarnings > 0) {
          u.crowns.push({ type: 'math', name: '🔢 מלך החשבון', bonus: '+5 מטבעות לתרגיל' });
        }
        if (vocabKing && u.student_email === vocabKing.student_email && vocabKing.vocabEarnings > 0) {
          u.crowns.push({ type: 'vocab', name: '📚 מלך האנגלית', bonus: '+5 מטבעות למילה' });
        }
        if (investmentKing && u.student_email === investmentKing.student_email && investmentKing.currentInvestmentValue > 0) {
          u.crowns.push({ type: 'investment', name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' });
        }
        if (loginStreakKing && u.student_email === loginStreakKing.student_email && loginStreakKing.loginStreakEarnings > 0) {
          u.crowns.push({ type: 'login', name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' });
        }
        if (workKing && u.student_email === workKing.student_email && workKing.workEarnings > 0) {
          u.crowns.push({ type: 'work', name: '💪 מלך העבודה', bonus: '+5 מטבעות לשעה' });
        }
      });

      setUsers(usersWithAllStats);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      toast.error("שגיאה בטעינת טבלת השיאים. נסה שוב מאוחר יותר.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollaborate = async (targetUser, e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      toast.error("אנא התחבר מחדש");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch fresh user data - use me() for current user to avoid permission issues
      const currentUserFull = await base44.auth.me();
      const allUsers = await base44.entities.User.list();
      const targetUserFull = allUsers.find(u => u.email === targetUser.student_email);
      
      if (!currentUserFull) {
        toast.error("לא מצאתי את המשתמש שלך במערכת");
        return;
      }

      if (!targetUserFull) {
        toast.error("לא מצאתי את המשתמש השני במערכת");
        return;
      }
      
      // Check if already collaborated with THIS SPECIFIC user today
      const dailyCollaborations = currentUserFull.daily_collaborations || [];
      const alreadyCollaboratedToday = dailyCollaborations.some(
        collab => collab && collab.email === targetUser.student_email && collab.date === today
      );
      
      if (alreadyCollaboratedToday) {
        toast.error(`כבר שלחת בקשה ל-${targetUser.full_name} היום! 🤝`);
        return;
      }

      // Check if target user already sent collaboration request to current user
      const targetDailyCollaborations = targetUserFull.daily_collaborations || [];
      const targetAlreadySentRequest = targetDailyCollaborations.some(
        collab => collab && collab.email === currentUser.email && collab.date === today && !collab.completed
      );

      if (targetAlreadySentRequest) {
        // MUTUAL COLLABORATION! Both users get 25 coins!
        const coinsReward = 25;

        // Mark both collaborations as completed
        const updatedCurrentCollaborations = [
          ...(dailyCollaborations.filter(c => c && c.date === today) || []),
          { email: targetUser.student_email, date: today, completed: true }
        ];

        const updatedTargetCollaborations = targetDailyCollaborations.map(c => 
          (c && c.email === currentUser.email && c.date === today) 
            ? { ...c, completed: true } 
            : c
        );

        // Update both users with coins
        await Promise.all([
          base44.auth.updateMe({
            coins: (currentUserFull.coins || 0) + coinsReward,
            daily_collaborations: updatedCurrentCollaborations,
            total_collaboration_coins: (currentUserFull.total_collaboration_coins || 0) + coinsReward
          }),
          base44.entities.User.update(targetUserFull.id, {
            coins: (targetUserFull.coins || 0) + coinsReward,
            daily_collaborations: updatedTargetCollaborations,
            total_collaboration_coins: (targetUserFull.total_collaboration_coins || 0) + coinsReward
          })
        ]);

        // Update leaderboards
        try {
          const [currentUserLeaderboard, targetUserLeaderboard] = await Promise.all([
            base44.entities.LeaderboardEntry.filter({ student_email: currentUser.email }),
            base44.entities.LeaderboardEntry.filter({ student_email: targetUser.student_email })
          ]);

          const leaderboardUpdates = [];
          if (currentUserLeaderboard.length > 0) {
            leaderboardUpdates.push(
              base44.entities.LeaderboardEntry.update(currentUserLeaderboard[0].id, {
                coins: (currentUserFull.coins || 0) + coinsReward
              })
            );
          }
          if (targetUserLeaderboard.length > 0) {
            leaderboardUpdates.push(
              base44.entities.LeaderboardEntry.update(targetUserLeaderboard[0].id, {
                coins: (targetUserFull.coins || 0) + coinsReward
              })
            );
          }
          
          if (leaderboardUpdates.length > 0) {
            await Promise.all(leaderboardUpdates);
          }
        } catch (leaderboardError) {
          console.error("Error updating leaderboard:", leaderboardError);
        }

        toast.success(`🎉 שיתוף פעולה הדדי! ${targetUser.full_name} ואתה קיבלתם ${coinsReward} מטבעות כל אחד! 💰✨`);
      } else {
        // Just send collaboration request (no coins yet)
        const updatedCollaborations = [
          ...(dailyCollaborations.filter(c => c && c.date === today) || []),
          { email: targetUser.student_email, date: today, completed: false }
        ];

        await base44.auth.updateMe({
          daily_collaborations: updatedCollaborations
        });

        toast.info(`📤 שלחת בקשת שיתוף פעולה ל-${targetUser.full_name}! אם גם הם ישלחו לך, תקבלו 25 מטבעות כל אחד! 🤝`);
      }

      loadData();
    } catch (error) {
      console.error("Error collaborating:", error);
      const errorMessage = error?.message || error?.response?.data?.message || "שגיאה לא צפויה";
      toast.error(`שגיאה: ${errorMessage}`);
    }
  };

  const hasCollaboratedToday = (targetEmail) => {
    if (!currentUser) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const dailyCollaborations = currentUser.daily_collaborations || [];
    
    return dailyCollaborations.some(
      collab => collab && collab.email === targetEmail && collab.date === today
    );
  };

  const getCollaborationStatus = (targetEmail) => {
    if (!currentUser) return 'none';
    
    const today = new Date().toISOString().split('T')[0];
    const dailyCollaborations = currentUser.daily_collaborations || [];
    
    const collab = dailyCollaborations.find(
      c => c && c.email === targetEmail && c.date === today
    );
    
    if (!collab) return 'none';
    return collab.completed ? 'completed' : 'pending';
  };

  const getRankColor = (index) => {
    if (index === 0) return "from-yellow-400 to-orange-400";
    if (index === 1) return "from-gray-300 to-gray-400";
    if (index === 2) return "from-amber-600 to-amber-700";
    return "from-purple-400 to-pink-400";
  };

  // Calculate percentage from first place
  const firstPlaceValue = users.length > 0 ? users[0].totalValue : 0;
  const calculatePercentageFromFirst = (value) => {
    if (firstPlaceValue === 0) return 100;
    return Math.round((value / firstPlaceValue) * 100);
  };

  const handleStudentClick = async (student) => {
    try {
      // Fetch full user data as LeaderboardEntry doesn't contain all User fields
      const allUsers = await base44.entities.User.list();
      const fullUserData = allUsers.find(u => u.email === student.student_email);
      
      if (fullUserData) {
        setSelectedStudent(fullUserData);
        setShowProfileDialog(true);
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
      toast.error("שגיאה בטעינת פרטי התלמיד");
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
          🏆
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          🏆 טבלת שיאים 🏆
        </h1>
        <p className="text-white/80 text-lg">
          מי הכי עשיר? 💰
        </p>
      </motion.div>

      {/* Prizes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-md border-2 border-yellow-400/60 shadow-2xl">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-2">
                <Trophy className="w-7 h-7 text-yellow-400" />
                עונה 1 - פרסים!
                <Trophy className="w-7 h-7 text-yellow-400" />
              </h2>
              
              {/* Countdown Timer */}
              <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 rounded-xl p-4 border border-red-500/40 mb-4">
                <p className="text-white/90 text-sm mb-2 font-bold">⏰ העונה מסתיימת ב-31.03.2026</p>
                <div className="flex items-center justify-center gap-1 sm:gap-3 text-white">
                    <div className="bg-white/10 rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2">
                      <div className="text-sm sm:text-2xl font-black">{timeLeft.seconds}</div>
                      <div className="text-[8px] sm:text-xs opacity-80">שניות</div>
                    </div>
                    <div className="text-sm sm:text-2xl font-black">:</div>
                    <div className="bg-white/10 rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2">
                      <div className="text-sm sm:text-2xl font-black">{timeLeft.minutes}</div>
                      <div className="text-[8px] sm:text-xs opacity-80">דקות</div>
                    </div>
                    <div className="text-sm sm:text-2xl font-black">:</div>
                    <div className="bg-white/10 rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2">
                      <div className="text-sm sm:text-2xl font-black">{timeLeft.hours}</div>
                      <div className="text-[8px] sm:text-xs opacity-80">שעות</div>
                    </div>
                    <div className="text-sm sm:text-2xl font-black">:</div>
                    <div className="bg-white/10 rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2">
                      <div className="text-sm sm:text-2xl font-black">{timeLeft.days}</div>
                      <div className="text-[8px] sm:text-xs opacity-80">ימים</div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          {/* 2nd Place - Left */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="bg-gradient-to-br from-gray-600/60 to-gray-800/60 rounded-xl p-4 border-2 border-gray-400/70 shadow-xl order-2 md:order-1"
                          >
                <div className="text-center mb-3">
                  <div className="text-5xl mb-2">🥈</div>
                  <h3 className="text-2xl font-black text-gray-100">מקום 2</h3>
                  <div className="bg-gray-400/30 rounded-full px-3 py-1 mt-2 inline-block">
                    <p className="text-gray-100 font-black text-sm">שווי: ₪500</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-gray-400/30">
                    <p className="text-white font-bold text-base">⌨️ Razer Ornata V3</p>
                    <p className="text-gray-200/80 text-sm">מקלדת גיימינג - מתג היברידי</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-gray-400/30">
                    <p className="text-white font-bold text-base">🖱️ Razer Basilisk V3 X HyperSpeed</p>
                    <p className="text-gray-200/80 text-sm">עכבר גיימינג אלחוטי - שחור</p>
                  </div>
                </div>
              </motion.div>

              {/* 1st Place - Center */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-yellow-500/70 to-orange-600/70 rounded-xl p-4 border-2 border-yellow-400/80 relative overflow-hidden shadow-2xl order-1 md:order-2"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 to-orange-400/30"
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="relative text-center mb-3">
                  <div className="text-5xl mb-2">🥇</div>
                  <h3 className="text-2xl font-black text-yellow-100">מקום 1</h3>
                  <div className="bg-yellow-400/40 rounded-full px-3 py-1 mt-2 inline-block border border-yellow-300/50">
                    <p className="text-yellow-50 font-black text-sm">שווי: ₪1,000</p>
                  </div>
                </div>
                <div className="relative space-y-2">
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-yellow-400/40">
                    <p className="text-white font-bold text-base">🎧 Razer BlackShark V2 HyperSpeed</p>
                    <p className="text-yellow-100/80 text-sm">אוזניות גיימינג אלחוטיות - שחור</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-yellow-400/40">
                    <p className="text-white font-bold text-base">⌨️ Razer Ornata V3</p>
                    <p className="text-yellow-100/80 text-sm">מקלדת גיימינג - מתג היברידי</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-yellow-400/40">
                    <p className="text-white font-bold text-base">🖱️ Razer Basilisk V3 X HyperSpeed</p>
                    <p className="text-yellow-100/80 text-sm">עכבר גיימינג אלחוטי - שחור</p>
                  </div>
                </div>
              </motion.div>

              {/* 3rd Place - Right */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-amber-700/60 to-amber-900/60 rounded-xl p-4 border-2 border-amber-500/70 shadow-xl order-3 md:order-3"
              >
                <div className="text-center mb-3">
                  <div className="text-5xl mb-2">🥉</div>
                  <h3 className="text-2xl font-black text-amber-200">מקום 3</h3>
                  <div className="bg-amber-500/30 rounded-full px-3 py-1 mt-2 inline-block">
                    <p className="text-amber-100 font-black text-sm">שווי: ₪250</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-black/30 rounded-lg p-3 text-center border border-amber-500/30">
                    <p className="text-white font-bold text-base">🖱️ Razer Basilisk V3 X HyperSpeed</p>
                    <p className="text-amber-200/80 text-sm">עכבר גיימינג אלחוטי - שחור</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="text-center mt-4 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-lg p-3 border border-green-500/40">
              <p className="text-white font-bold text-base">
                🏆 המובילים בשלושת המקומות הראשונים יזכו בפרסים! 🏆
              </p>
              <p className="text-white/80 text-sm mt-1">
                המקומות ייקבעו ב-31 במרץ 2026 בסוף העונה
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard */}
      <div className="space-y-4">
        {users.map((player, index) => {
          const isCurrentUser = player.student_email === currentUser?.email;
          const isFirstPlace = index === 0;
          const hasCollaborated = hasCollaboratedToday(player.student_email);
          
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`overflow-hidden ${
                  isCurrentUser
                    ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-yellow-400 shadow-2xl"
                    : isFirstPlace
                    ? "bg-gradient-to-r from-blue-800/40 to-indigo-900/40 border-2 border-yellow-400 shadow-2xl"
                    : "bg-white/10 backdrop-blur-md border-white/20"
                }`}
              >
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-4">
                    {/* Rank Number */}
                    <div className="flex-shrink-0 w-6 sm:w-12 text-center">
                      <div className={`text-base sm:text-2xl font-black ${isFirstPlace ? 'text-yellow-400' : 'text-white'}`}>
                        #{index + 1}
                      </div>
                    </div>

                    {/* Avatar - SMALLER */}
                    <div 
                      className="flex-shrink-0 cursor-pointer hidden sm:block"
                      onClick={() => handleStudentClick(player)}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                        <div className="scale-[0.6]">
                          <TamagotchiAvatar 
                            equippedItems={player.equipped_items || {}} 
                            size="small"
                            showBackground={false}
                            userEmail={player.student_email}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleStudentClick(player)}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 mb-1">
                        <h3 className="text-sm sm:text-lg font-bold text-white truncate max-w-[120px] sm:max-w-none">
                          {player.first_name && player.last_name 
                            ? `${player.first_name} ${player.last_name}`
                            : player.full_name}
                        </h3>
                        {isCurrentUser && (
                          <span className="text-[10px] sm:text-xs bg-yellow-400 text-gray-900 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold whitespace-nowrap">
                            אתה!
                          </span>
                        )}
                      </div>

                      {/* Stats Grid - Visible on desktop */}
                      <TooltipProvider>
                        <div className="hidden sm:flex items-center gap-2 text-xs flex-wrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-white/90">🤖</span>
                                <span className="text-white/60">-</span>
                                <span className="text-white/80">{player.aiTechLessons || 0}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">שיעורי בינה מלאכותית וטכנולוגיה</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-white/90">❤️</span>
                                <span className="text-white/60">-</span>
                                <span className="text-white/80">{player.socialSkillsLessons || 0}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">שיעורי מיומנויות אישיות</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-white/90">💸</span>
                                <span className="text-white/60">-</span>
                                <span className="text-white/80">{player.moneyBusinessLessons || 0}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">שיעורי כסף ועסקים</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-white/90 font-bold">ABC</span>
                                <span className="text-white/60">-</span>
                                <span className="text-white/80">{player.masteredWords || 0}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">מילים באנגלית שלוט</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <span className="text-white/90 font-bold">123</span>
                                <span className="text-white/60">-</span>
                                <span className="text-white/80">{player.masteredMathQuestions || 0}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">שאלות חשבון שלוט</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {(player.loginStreak || 0) > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <span className="text-white/90">🔥</span>
                                  <span className="text-white/60">-</span>
                                  <span className="text-white/80">{player.loginStreak || 0}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">רצף כניסות בימים</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {(player.collaborationCount || 0) > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <span className="text-white/90">🤝</span>
                                  <span className="text-white/60">-</span>
                                  <span className="text-white/80">{player.collaborationCount || 0}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">שיתופי פעולה</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>

                      {/* Last Login - Hidden on mobile */}
                      {player.last_login_date && (
                        <div className="hidden sm:block text-[9px] text-white/50 mt-1">
                          כניסה אחרונה: {new Date(player.last_login_date).toLocaleDateString('he-IL')}
                        </div>
                      )}

                      {/* Crown Badges */}
                      {player.crowns && player.crowns.length > 0 && (
                        <div className="flex gap-1 mb-1 flex-wrap">
                          {player.crowns.map((crown, idx) => (
                            <div 
                              key={idx} 
                              className="text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black shadow-lg border border-yellow-300/50"
                              title={`${crown.name} - ${crown.bonus}`}
                            >
                              {crown.name}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Stats Badges with Tooltips */}
                      <TooltipProvider>
                        <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-2 flex-wrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 cursor-help">
                                🤖{player.aiTechLessons || 0}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">בינה מלאכותית וטכנולוגיה: {player.aiTechLessons || 0} שיעורים</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 cursor-help">
                                ❤️{player.socialSkillsLessons || 0}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">מיומנויות אישיות: {player.socialSkillsLessons || 0} שיעורים</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-200 cursor-help">
                                💸{player.moneyBusinessLessons || 0}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">כסף ועסקים: {player.moneyBusinessLessons || 0} שיעורים</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 cursor-help">
                                ABC{player.masteredWords || 0}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">אנגלית: {player.masteredWords || 0} מילים שלוט</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-green-500/30 text-green-200 cursor-help">
                                123{player.masteredMathQuestions || 0}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">חשבון: {player.masteredMathQuestions || 0} שאלות שלוט</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {(player.loginStreak || 0) > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-200 cursor-help">
                                  🔥{player.loginStreak || 0}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">רצף כניסות: {player.loginStreak || 0} ימים</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {(player.collaborationCount || 0) > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200 cursor-help">
                                  🤝{player.collaborationCount || 0}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">שיתופי פעולה: {player.collaborationCount || 0}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                    </div>

                    {/* Right Side: Networth + Collaborate Button */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 sm:gap-2">
                      {/* Total Networth */}
                      <div className="text-center">
                        <div className={`bg-gradient-to-br ${getRankColor(index)} text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-xl shadow-lg`}>
                          <div className="text-base sm:text-2xl">{player.totalValue}</div>
                          <div className="text-[8px] sm:text-[10px] opacity-80">מטבעות</div>
                        </div>
                        {/* Percentage from first place */}
                        {index > 0 && (
                          <div className="text-[10px] sm:text-xs text-white/70 mt-1">
                            {calculatePercentageFromFirst(player.totalValue)}%
                          </div>
                        )}
                      </div>

                      {/* Collaborate Button - Only for OTHER users */}
                      {!isCurrentUser && (() => {
                        const collabStatus = getCollaborationStatus(player.student_email);
                        return (
                          <Button
                            onClick={(e) => handleCollaborate(player, e)}
                            disabled={collabStatus !== 'none'}
                            size="sm"
                            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 font-bold ${
                              collabStatus === 'completed'
                                ? "bg-green-500/40 text-green-200 cursor-not-allowed border-green-500/30"
                                : collabStatus === 'pending'
                                ? "bg-orange-500/40 text-orange-200 cursor-not-allowed border-orange-500/30"
                                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                            }`}
                          >
                            {collabStatus === 'completed' ? (
                              <>
                                <Check className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">קיבלתם 25🪙</span>
                                <span className="sm:hidden">25🪙</span>
                              </>
                            ) : collabStatus === 'pending' ? (
                              <>
                                <Check className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">שלחת בקשה</span>
                                <span className="sm:hidden">נשלח</span>
                              </>
                            ) : (
                              <>
                                <Handshake className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">שתף פעולה</span>
                                <span className="sm:hidden">שתף</span>
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold text-white mb-2">אין עדיין שחקנים</h3>
          <p className="text-white/70">התחל להשתתף בשיעורים ולהרוויח מטבעות!</p>
        </motion.div>
      )}

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-white mb-2">💡 טיפ</h3>
            <p className="text-white/70 text-sm">
              כדי לעלות בטבלה, צבור יותר מטבעות!<br/>
              השתתף בשיעורים, למד אנגלית, קנה פריטים, ו<span className="text-green-300 font-bold">שתף פעולה</span> עם חברים! 🤝<br/>
              <span className="text-yellow-300 font-bold">שלח בקשת שיתוף פעולה לחבר - אם גם הוא ישלח לך, תקבלו 25 מטבעות כל אחד! 💰</span>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Student Profile Dialog */}
      <StudentProfileDialog
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        student={selectedStudent}
      />
    </div>
  );
}