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
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";

// 3️⃣ Memoized LeaderboardRow to prevent unnecessary re-renders
const LeaderboardRow = React.memo(({ 
  player, 
  index, 
  actualIndex, 
  currentUserEmail, 
  onStudentClick, 
  onCollaborate, 
  getCollaborationStatus, 
  hasPendingRequestFromUser,
  getRankColor,
  formatLastLoginDM
}) => {
  const isCurrentUser = player.student_email === currentUserEmail;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`overflow-hidden ${
          isCurrentUser
            ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-yellow-400 shadow-2xl"
            : actualIndex === 0
            ? "bg-gradient-to-r from-blue-800/40 to-indigo-900/40 border-2 border-yellow-400 shadow-2xl"
            : "bg-white/10 backdrop-blur-md border-white/20"
        }`}
      >
        <CardContent className="p-2 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-4">
            {/* Rank Number */}
            <div className="flex-shrink-0 w-6 sm:w-12 text-center">
              <div className={`text-base sm:text-2xl font-black ${actualIndex === 0 ? 'text-yellow-400' : 'text-white'}`}>
                #{actualIndex + 1}
              </div>
            </div>

            {/* Avatar - SMALLER */}
            <div 
              className="flex-shrink-0 cursor-pointer hidden sm:block"
              onClick={() => onStudentClick(player)}
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
              onClick={() => onStudentClick(player)}
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

              {/* Crown Badges */}
              {player.crowns && player.crowns.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
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

              {/* Stats Display */}
              <TooltipProvider>
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Total Lessons */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">📚</span>
                        <span className="text-[10px] sm:text-xs font-bold text-blue-200">{player.total_lessons || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">סה"כ שיעורים: {player.total_lessons || 0}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* English Words */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">🔤</span>
                        <span className="text-[10px] sm:text-xs font-bold text-purple-200">{player.masteredWords || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">אנגלית: {player.masteredWords || 0} מילים</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Math Questions */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-green-500/20 border border-green-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">🔢</span>
                        <span className="text-[10px] sm:text-xs font-bold text-green-200">{player.masteredMathQuestions || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">חשבון: {player.masteredMathQuestions || 0} תרגילים</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Login Streak */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">🔥</span>
                        <span className="text-[10px] sm:text-xs font-bold text-orange-200">{player.loginStreak || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">רצף כניסות: {player.loginStreak || 0} ימים</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Collaborations */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">🤝</span>
                        <span className="text-[10px] sm:text-xs font-bold text-pink-200">{player.collaborationCount || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">שיתופי פעולה: {player.collaborationCount || 0}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Work Hours */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/30 cursor-help">
                        <span className="text-[10px] sm:text-xs">💼</span>
                        <span className="text-[10px] sm:text-xs font-bold text-yellow-200">{player.workHours || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">שעות עבודה: {player.workHours || 0}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Last Login */}
                  {player.last_login_date && formatLastLoginDM(player.last_login_date) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 cursor-help">
                          <span className="text-[10px] sm:text-xs">📅</span>
                          <span className="text-[10px] sm:text-xs font-bold text-cyan-200">
                            {formatLastLoginDM(player.last_login_date)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">כניסה אחרונה: {formatLastLoginDM(player.last_login_date)}</p>
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
                <div className={`bg-gradient-to-br ${getRankColor(actualIndex)} text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-xl shadow-lg`}>
                  <div className="text-base sm:text-2xl">{player.totalValue}</div>
                  <div className="text-[8px] sm:text-[10px] opacity-80">מטבעות</div>
                </div>
              </div>

              {/* Collaborate Button - Only for OTHER users */}
              {!isCurrentUser && (() => {
                const collabStatus = getCollaborationStatus(player.student_email);
                const hasPendingRequest = hasPendingRequestFromUser(player);

                return (
                  <div className="relative">
                    {hasPendingRequest && collabStatus === 'none' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10 border border-white"></div>
                    )}
                    <Button
                      onClick={(e) => onCollaborate(player, e)}
                      disabled={collabStatus !== 'none'}
                      size="sm"
                      className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 font-bold relative ${
                        collabStatus === 'completed'
                          ? "bg-green-500/40 text-green-200 cursor-not-allowed border-green-500/30"
                          : collabStatus === 'pending'
                          ? "bg-orange-500/40 text-orange-200 cursor-not-allowed border-orange-500/30"
                          : hasPendingRequest
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white animate-pulse"
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
                      ) : hasPendingRequest ? (
                        <>
                          <Heart className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">שלח לי! קבל 25🪙</span>
                          <span className="sm:hidden">25🪙!</span>
                        </>
                      ) : (
                        <>
                          <Handshake className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">שתף פעולה</span>
                          <span className="sm:hidden">שתף</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// Helper function to fetch all records with pagination (with rate limit handling)
async function listAll(entityHandler, sort = "-created_date", pageSize = 200) {
  let all = [];
  let skip = 0;
  let retries = 0;
  const maxRetries = 3;
  
  while (true) {
    try {
      const page = await entityHandler.list(sort, pageSize, skip);
      all = all.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
      retries = 0; // Reset retries on success
      
      // Add small delay between pages to avoid rate limits
      if (skip > 0) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      // Handle rate limit errors with exponential backoff
      if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        if (retries >= maxRetries) {
          throw error;
        }
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 8000);
        console.log(`Rate limit hit, waiting ${delay}ms before retry ${retries}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return all;
}

// Helper to format last login date safely
const formatLastLoginDM = (value) => {
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  }

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
};

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 20;

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

  // Check for pending collaboration requests
  useEffect(() => {
    if (!currentUser || !users.length) return;
    
    const today = new Date().toISOString().split('T')[0];
    let pendingCount = 0;
    
    users.forEach(user => {
      if (user.student_email === currentUser.email) return;
      
      const userCollaborations = user.daily_collaborations || [];
      const hasPendingRequest = userCollaborations.some(
        c => c && c.email === currentUser.email && c.date === today && !c.completed
      );
      
      if (hasPendingRequest) {
        pendingCount++;
      }
    });
    
    if (pendingCount > 0) {
      toast.info(`🤝 יש לך ${pendingCount} בקשות שיתוף פעולה! לחץ על "שתף פעולה" כדי לקבל 25 מטבעות! 💰`, {
        duration: 8000
      });
    }
  }, [currentUser, users]);

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

      // 1️⃣ Fetch all data - load critical data first, then rest in smaller batches
      const allEntries = await listAll(base44.entities.LeaderboardEntry);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Load rest in 2 parallel batches
      const [allWordProgress, allInvestments, allLessonParticipations] = await Promise.allSettled([
        listAll(base44.entities.WordProgress),
        listAll(base44.entities.Investment),
        listAll(base44.entities.LessonParticipation)
      ]).then(results => results.map((result, idx) => {
        if (result.status === 'fulfilled') return result.value;
        const names = ['WordProgress', 'Investments', 'LessonParticipation'];
        console.error(`Error loading ${names[idx]}:`, result.reason);
        return [];
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const [allLessons, allMathProgress] = await Promise.allSettled([
        listAll(base44.entities.Lesson),
        listAll(base44.entities.MathProgress)
      ]).then(results => results.map((result, idx) => {
        if (result.status === 'fulfilled') return result.value;
        const names = ['Lessons', 'MathProgress'];
        console.error(`Error loading ${names[idx]}:`, result.reason);
        return [];
      }))

      console.log("Loaded entries:", allEntries.length);

      // If no entries loaded, show error
      if (allEntries.length === 0) {
        console.error("No leaderboard entries found");
        setUsers([]);
        return;
      }

      // Filter: Show ONLY students, exclude admins (unless current user is admin viewing themselves)
      const isCurrentUserAdmin = user?.role === 'admin';

      // Only load User entity if current user is admin (for admin filtering)
      let allUsers = [];
      if (isCurrentUserAdmin) {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          allUsers = await listAll(base44.entities.User);
        } catch (e) {
          console.log("Admin: Cannot load User.list for filtering");
        }
      }

      // Start with entries from LeaderboardEntry
      let filteredUsersForLeaderboard = allEntries.filter(u => {
        // Check if this entry belongs to an admin (only if we have User data)
        let isEntryAdmin = false;
        if (allUsers.length > 0) {
          const userRecord = allUsers.find(usr => usr.email === u.student_email);
          isEntryAdmin = userRecord?.role === 'admin';
        }

        // Current user can always see themselves
        if (user && u.student_email === user.email) {
          return true;
        }

        // Regular users cannot see admins AT ALL (even if they are also students)
        if (!isCurrentUserAdmin && isEntryAdmin) {
          return false;
        }

        // Filter out demo users and parents from leaderboard
        if (u.user_type === 'demo' || u.user_type === 'parent') {
          return false;
        }

        // Show all students (including those without user_type defined)
        return true;
      });

      // If admin, add students from User entity that are missing from LeaderboardEntry
      if (isCurrentUserAdmin && allUsers.length > 0) {
        const existingEmails = new Set(filteredUsersForLeaderboard.map(u => u.student_email));
        
        allUsers.forEach(userRecord => {
          // Skip if already in leaderboard or not a student
          if (existingEmails.has(userRecord.email)) return;
          if (userRecord.role === 'admin') return;
          if (userRecord.user_type && userRecord.user_type !== 'student') return;
          
          // Add missing student with default LeaderboardEntry-like structure
          filteredUsersForLeaderboard.push({
            student_email: userRecord.email,
            full_name: userRecord.full_name || userRecord.email,
            first_name: userRecord.first_name,
            last_name: userRecord.last_name,
            coins: userRecord.coins || 0,
            ai_tech_level: userRecord.ai_tech_level || 1,
            ai_tech_xp: userRecord.ai_tech_xp || 0,
            personal_dev_level: userRecord.personal_dev_level || 1,
            personal_dev_xp: userRecord.personal_dev_xp || 0,
            social_skills_level: userRecord.social_skills_level || 1,
            social_skills_xp: userRecord.social_skills_xp || 0,
            money_business_level: userRecord.money_business_level || 1,
            money_business_xp: userRecord.money_business_xp || 0,
            total_lessons: userRecord.total_lessons || 0,
            equipped_items: userRecord.equipped_items || {},
            purchased_items: userRecord.purchased_items || [],
            user_type: userRecord.user_type || 'student',
            daily_collaborations: userRecord.daily_collaborations || [],
            total_collaboration_coins: userRecord.total_collaboration_coins || 0,
            total_work_hours: userRecord.total_work_hours || 0,
            total_work_earnings: userRecord.total_work_earnings || 0,
            login_streak: userRecord.login_streak || 0,
            total_login_streak_coins: userRecord.total_login_streak_coins || 0
          });
        });
      }

      // 2️⃣ Build lookup maps to prevent repeated filter/find operations
      const lessonMap = new Map();
      allLessons.forEach(lesson => {
        lessonMap.set(lesson.id, lesson);
      });

      const wordProgressByEmail = new Map();
      allWordProgress.forEach(w => {
        if (!wordProgressByEmail.has(w.student_email)) {
          wordProgressByEmail.set(w.student_email, []);
        }
        wordProgressByEmail.get(w.student_email).push(w);
      });

      const participationsByEmail = new Map();
      allLessonParticipations.forEach(p => {
        if (!participationsByEmail.has(p.student_email)) {
          participationsByEmail.set(p.student_email, []);
        }
        participationsByEmail.get(p.student_email).push(p);
      });

      const investmentsByEmail = new Map();
      allInvestments.forEach(inv => {
        if (!investmentsByEmail.has(inv.student_email)) {
          investmentsByEmail.set(inv.student_email, []);
        }
        investmentsByEmail.get(inv.student_email).push(inv);
      });

      const mathProgressByEmail = new Map();
      allMathProgress.forEach(m => {
        if (!mathProgressByEmail.has(m.student_email)) {
          mathProgressByEmail.set(m.student_email, []);
        }
        mathProgressByEmail.get(m.student_email).push(m);
      });

      const userRecordByEmail = new Map();
      allUsers.forEach(usr => {
        userRecordByEmail.set(usr.email, usr);
      });

      const usersWithAllStats = filteredUsersForLeaderboard.map((u) => {
        const userWordProgress = wordProgressByEmail.get(u.student_email) || [];
        const masteredWords = userWordProgress.filter(w => w.mastered).length;

        // Calculate lesson counts by category from REAL participations
        const userParticipations = (participationsByEmail.get(u.student_email) || []).filter(p => p.attended);

        let aiTechLessons = 0;
        let socialSkillsLessons = 0;
        let moneyBusinessLessons = 0;

        userParticipations.forEach(participation => {
          const lesson = lessonMap.get(participation.lesson_id);
          if (!lesson) return;

          if (lesson.category === 'ai_tech') aiTechLessons++;
          if (lesson.category === 'personal_skills' || lesson.category === 'social_skills') socialSkillsLessons++;
          if (lesson.category === 'money_business') moneyBusinessLessons++;
        });

        // Calculate REAL total lessons from actual participations
        const realTotalLessons = aiTechLessons + socialSkillsLessons + moneyBusinessLessons;

        // Get actual data from User entity (real source of truth)
        const userRecord = userRecordByEmail.get(u.student_email);
        const last_login_date = userRecord?.last_login_date ?? u.last_login_date;
        const actualTotalLessons = realTotalLessons;
        const actualAiTechLevel = userRecord?.ai_tech_level || u.ai_tech_level || 1;
        const actualPersonalDevLevel = userRecord?.personal_dev_level || u.personal_dev_level || 1;
        const actualSocialSkillsLevel = userRecord?.social_skills_level || u.social_skills_level || 1;
        const actualMoneyBusinessLevel = userRecord?.money_business_level || u.money_business_level || 1;
        
        // Count completed math questions directly from MathProgress
        const userMathProgressList = mathProgressByEmail.get(u.student_email) || [];
        const masteredMathQuestions = userMathProgressList.filter(m => (m.total_attempts || 0) > 0).length;
        
        // Login streak - prefer LeaderboardEntry (always accessible)
        let loginStreak = u.login_streak || 0;
        if (userRecord?.login_streak !== undefined) {
          loginStreak = userRecord.login_streak;
        } else if (u.student_email === user?.email && user.login_streak !== undefined) {
          loginStreak = user.login_streak;
        }
        
        // Collaboration count - calculate from daily_collaborations
        let collaborationCount = 0;
        if (userRecord?.total_collaboration_coins !== undefined) {
          collaborationCount = Math.floor(userRecord.total_collaboration_coins / 25);
        } else if (userRecord?.daily_collaborations) {
          const completedCollabs = (userRecord.daily_collaborations || []).filter(c => c && c.completed);
          collaborationCount = completedCollabs.length;
        } else if (u.student_email === user?.email && user.daily_collaborations) {
          const completedCollabs = (user.daily_collaborations || []).filter(c => c && c.completed);
          collaborationCount = completedCollabs.length;
        }

        // Work hours and earnings - ALWAYS use LeaderboardEntry data (accessible to all)
        const workHours = u.total_work_hours || 0;
        const workEarnings = u.total_work_earnings || 0;

        const averageLevel = Math.round(
          (actualAiTechLevel +
          actualPersonalDevLevel +
          actualSocialSkillsLevel +
          actualMoneyBusinessLevel) / 4
        );

        // Calculate net worth including investments (NO pending taxes!)
        const userInvestments = investmentsByEmail.get(u.student_email) || [];
        const investmentsValue = userInvestments.reduce((sum, inv) => sum + inv.current_value, 0);

        const totalValue = calculateTotalValue(u, investmentsValue);

        const totalXP =
          ((u.ai_tech_level || 1) - 1) * 100 + (u.ai_tech_xp || 0) +
          ((u.personal_dev_level || 1) - 1) * 100 + (u.personal_dev_xp || 0) +
          ((u.social_skills_level || 1) - 1) * 100 + (u.social_skills_xp || 0) +
          ((u.money_business_level || 1) - 1) * 100 + (u.money_business_xp || 0);

        // Calculate category earnings for crowns
        const vocabEarnings = userWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);

        const mathEarnings = userRecord?.total_math_earnings || u.total_math_earnings || 0;
        const currentInvestmentValue = investmentsValue;
        const loginStreakEarnings = userRecord?.total_login_streak_coins || u.total_login_streak_coins || 0;

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
          workHours,
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

      // Find kings in each category - ONLY from real students (not demo users)
      const realStudents = usersWithAllStats.filter(u => u.user_type === 'student');
      const mathKing = [...realStudents].sort((a, b) => b.masteredMathQuestions - a.masteredMathQuestions)[0];
      const vocabKing = [...realStudents].sort((a, b) => b.masteredWords - a.masteredWords)[0];
      const investmentKing = [...realStudents].sort((a, b) => b.currentInvestmentValue - a.currentInvestmentValue)[0];
      const loginStreakKing = [...realStudents].sort((a, b) => b.loginStreak - a.loginStreak)[0];
      const workKing = [...realStudents].sort((a, b) => b.workHours - a.workHours)[0];

      // Debug: Log kings
      console.log('Math King:', mathKing?.student_email, 'Questions:', mathKing?.masteredMathQuestions);
      console.log('Vocab King:', vocabKing?.student_email, 'Words:', vocabKing?.masteredWords);
      console.log('Investment King:', investmentKing?.student_email, 'Value:', investmentKing?.currentInvestmentValue);
      console.log('Login Streak King:', loginStreakKing?.student_email, 'Streak:', loginStreakKing?.loginStreak);
      console.log('Work King:', workKing?.student_email, 'Hours:', workKing?.workHours);

      // Add crown flags to users
      usersWithAllStats.forEach(u => {
        u.crowns = [];
        if (mathKing && u.student_email === mathKing.student_email && mathKing.masteredMathQuestions > 0) {
          u.crowns.push({ type: 'math', name: '🔢 מלך החשבון', bonus: '+5 מטבעות לתרגיל' });
        }
        if (vocabKing && u.student_email === vocabKing.student_email && vocabKing.masteredWords > 0) {
          u.crowns.push({ type: 'vocab', name: '📚 מלך האנגלית', bonus: '+5 מטבעות למילה' });
        }
        if (investmentKing && u.student_email === investmentKing.student_email && investmentKing.currentInvestmentValue > 0) {
          u.crowns.push({ type: 'investment', name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' });
        }
        if (loginStreakKing && u.student_email === loginStreakKing.student_email && loginStreakKing.loginStreak > 0) {
          u.crowns.push({ type: 'login', name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' });
        }
        if (workKing && u.student_email === workKing.student_email && workKing.workHours > 0) {
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

    // Prevent collaboration with yourself
    if (targetUser.student_email === currentUser.email) {
      toast.error("לא ניתן לשתף פעולה עם עצמך! 😅");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch fresh user data - use me() for current user
      const currentUserFull = await base44.auth.me();
      
      if (!currentUserFull) {
        toast.error("לא מצאתי את המשתמש שלך במערכת");
        return;
      }

      // For non-admin users: ALWAYS use LeaderboardEntry data (no User entity access)
      // For admins: Try User entity, fall back to LeaderboardEntry
      let targetUserFull = null;

      if (currentUserFull.role === 'admin') {
        try {
          const allUsers = await base44.entities.User.list();
          targetUserFull = allUsers.find(u => u.email === targetUser.student_email);
        } catch (e) {
          console.log("Admin: Cannot access User.list, using LeaderboardEntry data");
        }
      }

      // If not found or not admin, use LeaderboardEntry data
      if (!targetUserFull) {
        targetUserFull = {
          id: targetUser.id,
          email: targetUser.student_email,
          coins: targetUser.coins,
          daily_collaborations: targetUser.daily_collaborations || [],
          total_collaboration_coins: targetUser.total_collaboration_coins || 0
        };
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

        // Mark both collaborations as completed - keep ALL previous collaborations
        const updatedCurrentCollaborations = [
          ...dailyCollaborations,
          { email: targetUser.student_email, date: today, completed: true }
        ];

        const updatedTargetCollaborations = targetDailyCollaborations.map(c => 
          (c && c.email === currentUser.email && c.date === today) 
            ? { ...c, completed: true } 
            : c
        );

        // Update current user
        await base44.auth.updateMe({
          coins: (currentUserFull.coins || 0) + coinsReward,
          daily_collaborations: updatedCurrentCollaborations,
          total_collaboration_coins: (currentUserFull.total_collaboration_coins || 0) + coinsReward
        });

        // Update target user - admins update User entity
        if (currentUserFull.role === 'admin') {
          try {
            await base44.entities.User.update(targetUserFull.id, {
              coins: (targetUserFull.coins || 0) + coinsReward,
              daily_collaborations: updatedTargetCollaborations,
              total_collaboration_coins: (targetUserFull.total_collaboration_coins || 0) + coinsReward
            });
          } catch (userUpdateError) {
            console.log("Admin: Cannot update User entity");
          }
        }

        // Sync to LeaderboardEntry for public visibility
        await syncLeaderboardEntry(targetUser.student_email, {
          coins: (targetUserFull.coins || 0) + coinsReward,
          daily_collaborations: updatedTargetCollaborations,
          total_collaboration_coins: (targetUserFull.total_collaboration_coins || 0) + coinsReward
        });

        // Sync both users to LeaderboardEntry for public visibility
        await Promise.all([
          syncLeaderboardEntry(currentUser.email, {
            coins: (currentUserFull.coins || 0) + coinsReward,
            daily_collaborations: updatedCurrentCollaborations,
            total_collaboration_coins: (currentUserFull.total_collaboration_coins || 0) + coinsReward
          }),
          syncLeaderboardEntry(targetUser.student_email, {
            coins: (targetUserFull.coins || 0) + coinsReward,
            daily_collaborations: updatedTargetCollaborations,
            total_collaboration_coins: (targetUserFull.total_collaboration_coins || 0) + coinsReward
          })
        ]);

        toast.success(`🎉 שיתוף פעולה הדדי! ${targetUser.full_name} ואתה קיבלתם ${coinsReward} מטבעות כל אחד! 💰✨`);
      } else {
        // Just send collaboration request (no coins yet) - keep ALL previous collaborations
        const updatedCollaborations = [
          ...dailyCollaborations,
          { email: targetUser.student_email, date: today, completed: false }
        ];

        await base44.auth.updateMe({
          daily_collaborations: updatedCollaborations
        });

        // Sync to LeaderboardEntry for public visibility
        await syncLeaderboardEntry(currentUser.email, {
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

  const hasPendingRequestFromUser = (targetUser) => {
    if (!currentUser) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const targetCollaborations = targetUser.daily_collaborations || [];
    
    return targetCollaborations.some(
      c => c && c.email === currentUser.email && c.date === today && !c.completed
    );
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
      // For regular users, we can't access other users' full data
      // So we'll just use the student object we already have
      setSelectedStudent(student);
      setShowProfileDialog(true);
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
          🎯 טבלת שיאים 🎯
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
        {users.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE).map((player, index) => {
          const actualIndex = (currentPage - 1) * USERS_PER_PAGE + index;
          
          return (
            <LeaderboardRow
              key={player.id}
              player={player}
              index={index}
              actualIndex={actualIndex}
              currentUserEmail={currentUser?.email}
              onStudentClick={handleStudentClick}
              onCollaborate={handleCollaborate}
              getCollaborationStatus={getCollaborationStatus}
              hasPendingRequestFromUser={hasPendingRequestFromUser}
              getRankColor={getRankColor}
              formatLastLoginDM={formatLastLoginDM}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {users.length > USERS_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            ← הקודם
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.ceil(users.length / USERS_PER_PAGE) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                onClick={() => setCurrentPage(page)}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={currentPage === page 
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                }
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / USERS_PER_PAGE), prev + 1))}
            disabled={currentPage === Math.ceil(users.length / USERS_PER_PAGE)}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            הבא →
          </Button>
        </div>
      )}

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