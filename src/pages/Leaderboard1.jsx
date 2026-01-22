import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, TrendingUp, BookOpen, Star, Crown, Handshake, Check, Heart, Flame, Calculator, MessageSquare, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import TamagotchiAvatar from "../components/avatar/TamagotchiAvatar";
import StudentProfileDialog from "../components/leaderboard/StudentProfileDialog";
import { toast } from "sonner";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";
import { calculateStudentNetWorth } from "@/functions/calculateStudentNetWorth";

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
      
      // Add longer delay between pages to avoid rate limits
      if (skip > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      // Handle rate limit errors with exponential backoff
      if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        if (retries >= maxRetries) {
          throw error;
        }
        retries++;
        const delay = Math.min(2000 * Math.pow(2, retries), 10000);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
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

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Call backend to calculate net worth
      console.log("Calling calculateStudentNetWorth...");
      const response = await calculateStudentNetWorth({});
      console.log("Backend response:", response);
      const netWorthResponse = response.data;
      console.log("Backend data:", netWorthResponse);

      if (!netWorthResponse || !netWorthResponse.success) {
        console.error("Backend error:", netWorthResponse);
        throw new Error(netWorthResponse?.error || "Failed to calculate net worth");
      }

      const studentsFromBackend = netWorthResponse.students || [];
      console.log("Students from backend:", studentsFromBackend.length);

      // Load all users to get additional data not in backend response
      const allUsers = await base44.entities.User.list();

      // Load word/math progress for stats
      const allWordProgress = await base44.entities.WordProgress.list();
      const allMathProgress = await base44.entities.MathProgress.list();

      const usersByEmail = new Map();
      allUsers.forEach(u => usersByEmail.set(u.email, u));

      // Build word progress map
      const wordProgressByEmail = new Map();
      allWordProgress.forEach(w => {
        if (!wordProgressByEmail.has(w.student_email)) {
          wordProgressByEmail.set(w.student_email, []);
        }
        wordProgressByEmail.get(w.student_email).push(w);
      });

      // Build math progress map
      const mathProgressByEmail = new Map();
      allMathProgress.forEach(m => {
        if (!mathProgressByEmail.has(m.student_email)) {
          mathProgressByEmail.set(m.student_email, []);
        }
        mathProgressByEmail.get(m.student_email).push(m);
      });

      // Merge backend net worth data with frontend user data
      const studentsWithStats = studentsFromBackend.map(student => {
        const fullUser = usersByEmail.get(student.email);
        if (!fullUser) return null;

        const userWordProgress = wordProgressByEmail.get(student.email) || [];
        const masteredWords = userWordProgress.filter(w => w.mastered).length;

        const userMathProgress = mathProgressByEmail.get(student.email) || [];
        const masteredMathQuestions = userMathProgress.filter(m => m.mastered).length;

        const collaborationCount = (fullUser.daily_collaborations || []).filter(c => c && c.completed).length;

        return {
          id: fullUser.id,
          student_email: student.email,
          full_name: student.full_name,
          first_name: student.first_name,
          last_name: student.last_name,
          user_type: fullUser.user_type || 'student',
          coins: student.coins,
          ai_tech_level: student.ai_tech_level,
          personal_skills_level: student.personal_skills_level,
          money_business_level: student.money_business_level,
          total_lessons: student.total_lessons,
          login_streak: student.login_streak,
          purchased_items: fullUser.purchased_items || [],
          equipped_items: fullUser.equipped_items || {},
          totalValue: student.net_worth,
          masteredWords: masteredWords,
          masteredMathQuestions: masteredMathQuestions,
          loginStreak: student.login_streak,
          collaborationCount: collaborationCount,
          workHours: fullUser.total_work_hours || 0,
          workEarnings: fullUser.total_work_earnings || 0,
          last_login_date: fullUser.last_login_date,
          daily_collaborations: fullUser.daily_collaborations || [],
          currentInvestmentValue: student.investments_value,
          crowns: []
        };
      }).filter(Boolean); // Remove nulls

      // Find kings - ONLY from real students
      const realStudents = studentsWithStats.filter(u => u.user_type === 'student');
      const mathKing = [...realStudents].sort((a, b) => b.masteredMathQuestions - a.masteredMathQuestions)[0];
      const vocabKing = [...realStudents].sort((a, b) => b.masteredWords - a.masteredWords)[0];
      const investmentKing = [...realStudents].sort((a, b) => b.currentInvestmentValue - a.currentInvestmentValue)[0];
      const loginStreakKing = [...realStudents].sort((a, b) => b.loginStreak - a.loginStreak)[0];
      const workKing = [...realStudents].sort((a, b) => b.workHours - a.workHours)[0];

      // Add crowns
      studentsWithStats.forEach(u => {
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

      console.log("Final students with stats:", studentsWithStats.length);
      setUsers(studentsWithStats);
      } catch (error) {
      console.error("Error loading leaderboard:", error);
      console.error("Error details:", error.message, error.stack);
      toast.error("שגיאה בטעינת טבלת השיאים");
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
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-12 py-6 text-lg"
          />
        </div>
      </motion.div>

      {/* Leaderboard */}
      <div className="space-y-4">
        {users
          .filter(user => {
            if (!searchTerm.trim()) return true;
            const fullName = user.full_name?.toLowerCase() || '';
            const firstName = user.first_name?.toLowerCase() || '';
            const lastName = user.last_name?.toLowerCase() || '';
            const search = searchTerm.toLowerCase();
            return fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
          })
          .slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE).map((player, index) => {
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
      {users.filter(user => {
        if (!searchTerm.trim()) return true;
        const fullName = user.full_name?.toLowerCase() || '';
        const firstName = user.first_name?.toLowerCase() || '';
        const lastName = user.last_name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
      }).length > USERS_PER_PAGE && (
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
            {Array.from({ length: Math.ceil(users.filter(user => {
              if (!searchTerm.trim()) return true;
              const fullName = user.full_name?.toLowerCase() || '';
              const firstName = user.first_name?.toLowerCase() || '';
              const lastName = user.last_name?.toLowerCase() || '';
              const search = searchTerm.toLowerCase();
              return fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
            }).length / USERS_PER_PAGE) }, (_, i) => i + 1).map(page => (
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
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.filter(user => {
              if (!searchTerm.trim()) return true;
              const fullName = user.full_name?.toLowerCase() || '';
              const firstName = user.first_name?.toLowerCase() || '';
              const lastName = user.last_name?.toLowerCase() || '';
              const search = searchTerm.toLowerCase();
              return fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
            }).length / USERS_PER_PAGE), prev + 1))}
            disabled={currentPage === Math.ceil(users.filter(user => {
              if (!searchTerm.trim()) return true;
              const fullName = user.full_name?.toLowerCase() || '';
              const firstName = user.first_name?.toLowerCase() || '';
              const lastName = user.last_name?.toLowerCase() || '';
              const search = searchTerm.toLowerCase();
              return fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
            }).length / USERS_PER_PAGE)}
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