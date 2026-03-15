import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, TrendingUp, BookOpen, Star, Crown, Handshake, Check, Heart, Flame, Calculator, MessageSquare, Search, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import TamagotchiAvatar from "../components/avatar/TamagotchiAvatar";
import StudentProfileDialog from "../components/leaderboard/StudentProfileDialog";
import { toast } from "sonner";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";
import { safeRequest } from "../components/utils/base44SafeRequest";

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
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
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
                    avatarStage={(() => {
                      const totalLessons = player.total_lessons || 0;
                      if (totalLessons < 4) return 1;
                      if (totalLessons < 10) return 2;
                      if (totalLessons < 18) return 3;
                      if (totalLessons < 28) return 4;
                      if (totalLessons < 40) return 5;
                      return 6;
                    })()}
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
                {player.groupName && (
                  <span className="text-[9px] sm:text-[11px] bg-indigo-500/40 text-indigo-100 px-1.5 sm:px-2 py-0.5 rounded-full font-bold border border-indigo-400/50">
                    {player.groupName}
                  </span>
                )}
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
            </div>

            {/* Right Side: Networth + Collaborate Button */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 sm:gap-2">
            {/* Total Networth */}
            <div className="text-center">
              <div className={`bg-gradient-to-br ${getRankColor(actualIndex)} text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-xl shadow-lg`}>
                <div className="text-base sm:text-2xl">{player.totalValue}</div>
                <div className="text-[8px] sm:text-[10px] opacity-80">שווי</div>
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
async function listAll(entityHandler, sort = "-created_date", pageSize = 100) {
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
      
      // Brief delay between pages to avoid rate limits
      if (skip > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Handle rate limit errors with exponential backoff
      if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        if (retries >= maxRetries) {
          throw error;
        }
        retries++;
        const delay = Math.min(2000 * Math.pow(2, retries), 10000);
        console.warn(`Rate limit hit, retrying in ${delay}ms (${retries}/${maxRetries})`);
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
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSeason, setActiveSeason] = useState(1);
  const USERS_PER_PAGE = 20;

  // Load current user once
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Fetch leaderboard entries with react-query - filter to ONLY students at query level for backend safety
  const { data: leaderboardEntries = [], isLoading } = useQuery({
    queryKey: ['leaderboardEntries'],
    queryFn: async () => {
      const allEntries = await safeRequest(
        () => listAll(base44.entities.LeaderboardEntry, "-total_networth", 100),
        { key: "leaderboard-entries", ttlMs: 120000 }
      );
      // Backend safety filter: ONLY allow students, exclude all other user types
      return allEntries.filter(entry => entry.user_type === 'student');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch groups with react-query
  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => safeRequest(
      () => base44.entities.Group.list(),
      { key: "leaderboard-groups", ttlMs: 120000 }
    ),
    staleTime: 5 * 60 * 1000,
  });

  // Countdown timer effect
  useEffect(() => {
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

  // Filter to show ONLY students (strictly exclude demo, parent, teacher, admin, and any other non-student types)
  const filteredEntries = useMemo(() => {
    return leaderboardEntries.filter(entry => 
      entry.user_type === 'student'
    );
  }, [leaderboardEntries]);

  // Apply search filter
  const searchedEntries = useMemo(() => {
    if (!searchTerm) return filteredEntries;
    
    const searchLower = searchTerm.toLowerCase();
    return filteredEntries.filter(entry => {
      const fullName = entry.full_name?.toLowerCase() || '';
      const firstName = entry.first_name?.toLowerCase() || '';
      const lastName = entry.last_name?.toLowerCase() || '';
      return fullName.includes(searchLower) || firstName.includes(searchLower) || lastName.includes(searchLower);
    });
  }, [filteredEntries, searchTerm]);

  // Calculate kings from ALL students (memoized) - filteredEntries already contains ONLY students
  const kings = useMemo(() => {
    const allStudents = filteredEntries
      .map(entry => ({
        student_email: entry.student_email,
        masteredWords: entry.mastered_words || 0,
        masteredMathQuestions: entry.total_correct_math_answers || 0,
        currentInvestmentValue: entry.investments_value || 0,
        loginStreak: entry.login_streak || 0,
        workHours: entry.total_work_hours || 0
      }));

    return {
      math: [...allStudents].sort((a, b) => b.masteredMathQuestions - a.masteredMathQuestions)[0],
      vocab: [...allStudents].sort((a, b) => b.masteredWords - a.masteredWords)[0],
      investment: [...allStudents].sort((a, b) => b.currentInvestmentValue - a.currentInvestmentValue)[0],
      loginStreak: [...allStudents].sort((a, b) => b.loginStreak - a.loginStreak)[0],
      work: [...allStudents].sort((a, b) => b.workHours - a.workHours)[0]
    };
  }, [filteredEntries]);

  // Paginate and map to UI model (memoized)
  const users = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    const pageSlice = searchedEntries.slice(start, start + USERS_PER_PAGE);

    return pageSlice.map(entry => {
      const collaborationCount = (entry.daily_collaborations || []).filter(c => c && c.completed).length;
      const studentGroup = allGroups.find(g => g.student_emails?.includes(entry.student_email));

      const crowns = [];
      if (kings.math && entry.student_email === kings.math.student_email && kings.math.masteredMathQuestions > 0) {
        crowns.push({ type: 'math', name: '🔢 מלך החשבון', bonus: '+5 סטארטקוין לתרגיל' });
      }
      if (kings.vocab && entry.student_email === kings.vocab.student_email && kings.vocab.masteredWords > 0) {
        crowns.push({ type: 'vocab', name: '📚 מלך האנגלית', bonus: '+5 סטארטקוין למילה' });
      }
      if (kings.investment && entry.student_email === kings.investment.student_email && kings.investment.currentInvestmentValue > 0) {
        crowns.push({ type: 'investment', name: '💼 מלך ההשקעות', bonus: '+0.1% תשואה יומית' });
      }
      if (kings.loginStreak && entry.student_email === kings.loginStreak.student_email && kings.loginStreak.loginStreak > 0) {
        crowns.push({ type: 'login', name: '🔥 מלך הרצף', bonus: 'פי 2 על בונוס הרצף' });
      }
      if (kings.work && entry.student_email === kings.work.student_email && kings.work.workHours > 0) {
        crowns.push({ type: 'work', name: '💪 מלך העבודה', bonus: '+5 סטארטקוין לשעה' });
      }

      return {
        id: entry.id,
        student_email: entry.student_email,
        full_name: entry.full_name,
        first_name: entry.first_name,
        last_name: entry.last_name,
        user_type: entry.user_type || 'student',
        coins: entry.coins || 0,
        ai_tech_level: entry.ai_tech_level || 1,
        personal_skills_level: entry.personal_skills_level || 1,
        money_business_level: entry.money_business_level || 1,
        total_lessons: entry.total_lessons || 0,
        login_streak: entry.login_streak || 0,
        purchased_items: entry.purchased_items || [],
        equipped_items: entry.equipped_items || {},
        totalValue: entry.total_networth || 0,
        masteredWords: entry.mastered_words || 0,
        masteredMathQuestions: entry.total_correct_math_answers || 0,
        loginStreak: entry.login_streak || 0,
        collaborationCount: collaborationCount,
        workHours: entry.total_work_hours || 0,
        workEarnings: entry.total_work_earnings || 0,
        last_login_date: entry.last_login_date,
        daily_collaborations: entry.daily_collaborations || [],
        currentInvestmentValue: entry.investments_value || 0,
        crowns,
        groupName: studentGroup?.group_name || null
      };
    });
  }, [searchedEntries, currentPage, allGroups, kings]);

  const totalUsers = searchedEntries.length;

  // Check for pending collaboration requests (memoized)
  useEffect(() => {
    if (!currentUser || !leaderboardEntries.length) return;
    
    const today = new Date().toISOString().split('T')[0];
    let pendingCount = 0;
    
    leaderboardEntries.forEach(entry => {
      if (entry.student_email === currentUser.email) return;
      
      const userCollaborations = entry.daily_collaborations || [];
      const hasPendingRequest = userCollaborations.some(
        c => c && c.email === currentUser.email && c.date === today && !c.completed
      );
      
      if (hasPendingRequest) {
        pendingCount++;
      }
    });
    
    if (pendingCount > 0) {
      toast.info(`🤝 יש לך ${pendingCount} בקשות שיתוף פעולה! לחץ על "שתף פעולה" כדי לקבל 25 סטארטקוין! 💰`, {
        duration: 8000
      });
    }
  }, [currentUser, leaderboardEntries]);

  const handleCollaborate = async (targetUser, e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      toast.error("אנא התחבר מחדש");
      return;
    }

    if (targetUser.student_email === currentUser.email) {
      toast.error("לא ניתן לשתף פעולה עם עצמך! 😅");
      return;
    }

    try {
      const response = await base44.functions.invoke('collaborateDaily', { 
        targetEmail: targetUser.student_email 
      });
      
      const result = response.data;

      if (!result.success) {
        toast.error(result.error || 'שגיאה בשיתוף הפעולה');
        return;
      }

      if (result.status === 'already_sent') {
        toast.error(`כבר שלחת בקשה ל-${targetUser.full_name} היום! 🤝`);
      } else if (result.status === 'request_sent') {
        toast.info(`📤 שלחת בקשת שיתוף פעולה ל-${targetUser.full_name}! אם גם הם ישלחו לך, תקבלו 25 סטארטקוין כל אחד! 🤝`);
      } else if (result.status === 'mutual_completed') {
        toast.success(`🎉 שיתוף פעולה הדדי! ${targetUser.full_name} ואתה קיבלתם 25 סטארטקוין כל אחד! 💰✨`);
      }

      // Reload current user to get updated collaborations
      const updatedUser = await base44.auth.me();
      setCurrentUser(updatedUser);
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

  const handleStudentClick = async (student) => {
    try {
      setSelectedStudent(student);
      setShowProfileDialog(true);
    } catch (error) {
      console.error("Error fetching student details:", error);
      toast.error("שגיאה בטעינת פרטי התלמיד");
    }
  };

  return (
    <TooltipProvider>
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

      {/* Season Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 mb-6"
      >
        <Button
          onClick={() => setActiveSeason(1)}
          variant="ghost"
          size="sm"
          disabled={activeSeason === 1}
          className="text-white/60 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <div className="text-white font-black text-xl">
          {activeSeason === 1 ? "🏆 עונה 1" : "🌟 עונה 2"}
        </div>
        <Button
          onClick={() => setActiveSeason(2)}
          variant="ghost"
          size="sm"
          disabled={activeSeason === 2}
          className="text-white/60 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Prizes Section */}
      <motion.div
        key={`season-${activeSeason}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        {activeSeason === 1 ? (
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
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
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
        ) : (
        /* Season 2 */
        <Card className="bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-md border-2 border-purple-400/60 shadow-2xl">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-2">
                <ShoppingBag className="w-7 h-7 text-purple-300" />
                עונה 2 - חנות פרסים!
                <ShoppingBag className="w-7 h-7 text-purple-300" />
              </h2>

              {/* Season 2 Countdown - starts April 1 */}
              <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl p-4 border border-purple-500/40 mb-6">
                <p className="text-white/90 text-sm mb-2 font-bold">🗓️ העונה מתחילה ב-01.04.2026</p>
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

            <p className="text-white/80 text-center text-sm mb-5">
              🎮 בעונה 2 תוכלו לממש את הסטארטקוין שלכם בחנות הפרסים!<br/>
              <span className="text-purple-300 font-bold">צברו כמה שיותר סטארטקוין כדי לקנות פרסים מגניבים</span>
            </p>

            {/* Shop Items */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🖱️", name: "Razer Basilisk V3 X", desc: "עכבר גיימינג אלחוטי", price: "250,000", isCoins: true },
                { emoji: "⌨️", name: "Razer Ornata V3", desc: "מקלדת גיימינג", price: "350,000", isCoins: true },
                { image: "https://media.base44.com/images/public/68e295dfd1c97e3c8c54140e/2855fca09_l_1.jpg", name: "Razer BlackShark V2", desc: "אוזניות גיימינג אלחוטיות", price: "500,000", isCoins: true },
                { image: "https://media.base44.com/images/public/68e295dfd1c97e3c8c54140e/551aea0fb_image.png", name: "400 רובקס", desc: "מטבע Roblox", price: "35,000", isCoins: true },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/15 shadow-xl flex flex-col"
                >
                  {/* Top colored accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

                  <div className="p-4 flex flex-col flex-1">
                    {/* Icon / Image */}
                    <div className="flex items-center justify-center h-16 mb-3">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="h-14 w-14 object-contain drop-shadow-lg" />
                        : <span className="text-5xl drop-shadow-lg">{item.emoji}</span>
                      }
                    </div>

                    {/* Name & desc */}
                    <div className="text-center mb-3 flex-1">
                      <h3 className="font-black text-white text-sm leading-tight mb-1">{item.name}</h3>
                      <p className="text-white/50 text-xs">{item.desc}</p>
                    </div>

                    {/* Price badge */}
                    <div className="bg-white/10 rounded-xl px-3 py-2 text-center mb-3 border border-white/10">
                      <span className="text-xs text-white/60 block mb-0.5">מחיר</span>
                      <span className="font-black text-base text-white">
                        {item.isCoins ? <>{item.price} 🪙</> : item.price}
                      </span>
                    </div>

                    {/* Buy button */}
                    <Button
                      onClick={() => toast.info("⏳ החנות עדיין לא נפתחה! העונה 2 מתחילה ב-01.04.2026", { duration: 4000 })}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-5 rounded-xl shadow-lg text-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 ml-1.5" />
                      קנה
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-lg p-3 border border-purple-500/40">
              <p className="text-white font-bold text-base">
                🛒 החנות תיפתח רשמית ב-01.04.2026 עם תחילת עונה 2!
              </p>
              <p className="text-white/70 text-sm mt-1">
                הסטארטקוין שצברתם בעונה 1 יועברו לעונה 2
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <Input
            type="text"
            placeholder="חפש תלמיד לפי שם..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12 py-6 text-lg"
          />
        </div>
      </motion.div>

      {/* Leaderboard */}
      <div className="space-y-4">
        {users.map((player, index) => {
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
      {totalUsers > USERS_PER_PAGE && (
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
            {Array.from({ length: Math.ceil(totalUsers / USERS_PER_PAGE) }, (_, i) => i + 1).map(page => (
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
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsers / USERS_PER_PAGE), prev + 1))}
            disabled={currentPage === Math.ceil(totalUsers / USERS_PER_PAGE)}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            הבא →
          </Button>
        </div>
      )}

      {/* Empty State */}
      {users.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold text-white mb-2">אין תלמידים</h3>
          <p className="text-white/70 mb-4">טבלת השיאים תמולא כאשר יהיו תלמידים במערכת</p>
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
              כדי לעלות בטבלה, צבור יותר סטארטקוין!<br/>
              השתתף בשיעורים, למד אנגלית, קנה פריטים, ו<span className="text-green-300 font-bold">שתף פעולה</span> עם חברים! 🤝<br/>
              <span className="text-yellow-300 font-bold">שלח בקשת שיתוף פעולה לחבר - אם גם הוא ישלח לך, תקבלו 25 סטארטקוין כל אחד! 💰</span>
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
    </TooltipProvider>
  );
}