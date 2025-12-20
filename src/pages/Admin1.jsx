import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Shield, Edit2, Trash2, FileText, Languages, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";

import StudentRow from "../components/admin/StudentRow";
import AddLessonDialog from "../components/admin/AddLessonDialog";
import EditLessonDialog from "../components/admin/EditLessonDialog";
import DeleteConfirmDialog from "../components/admin/DeleteConfirmDialog";
import LessonCard from "../components/lessons/LessonCard";
import LessonStudentsList from "../components/admin/LessonStudentsList";
import GroupManagement from "../components/admin/GroupManagement";
import TeacherManagement from "../components/admin/TeacherManagement";
import QuizQuestionsManager from "../components/admin/QuizQuestionsManager";
import VocabularyManager from "../components/admin/VocabularyManager";
import { AVATAR_ITEMS } from '../components/avatar/TamagotchiAvatar';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [managingQuizLesson, setManagingQuizLesson] = useState(null);
  const [isFixingEverything, setIsFixingEverything] = useState(false);
  const [isRecalculatingCoins, setIsRecalculatingCoins] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterUserType, setFilterUserType] = useState("student");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Loading admin data...");
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const allUsers = await base44.entities.User.list();
      const studentUsers = allUsers;
      
      const allLessons = await base44.entities.Lesson.list("-lesson_date");
      const allParticipations = await base44.entities.LessonParticipation.list();
      const allGroups = await base44.entities.Group.list();

      console.log("Loaded users:", allUsers.length);
      
      setStudents(studentUsers);
      setLessons(allLessons);
      setParticipations(allParticipations);
      setGroups(allGroups);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת נתונים");
      setIsLoading(false);
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const retryWithBackoff = async (fn, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error?.response?.status === 429 || error?.message?.includes('429')) {
          const retryAfter = error?.response?.headers?.['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(500 * Math.pow(2, i), 8000);
          if (i < maxRetries - 1) {
            await sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }
  };

  const recalculateAllCoinsAccurately = async () => {
    setIsRecalculatingCoins(true);
    
    try {
      const [
        allUsers,
        allWordProgress,
        allMathProgress,
        allParticipations,
        allQuizProgress,
        allInvestments
      ] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.WordProgress.list(),
        base44.entities.MathProgress.list(),
        base44.entities.LessonParticipation.list(),
        base44.entities.QuizProgress.list(),
        base44.entities.Investment.list()
      ]);

      const students = allUsers.filter(u => u.user_type === 'student');
      
      const wordProgressMap = new Map();
      const mathProgressMap = new Map();
      const participationsMap = new Map();
      const quizProgressMap = new Map();
      const investmentsMap = new Map();
      
      allWordProgress.forEach(w => {
        if (!wordProgressMap.has(w.student_email)) wordProgressMap.set(w.student_email, []);
        wordProgressMap.get(w.student_email).push(w);
      });
      
      allMathProgress.forEach(m => {
        if (!mathProgressMap.has(m.student_email)) mathProgressMap.set(m.student_email, []);
        mathProgressMap.get(m.student_email).push(m);
      });
      
      allParticipations.forEach(p => {
        if (!participationsMap.has(p.student_email)) participationsMap.set(p.student_email, []);
        participationsMap.get(p.student_email).push(p);
      });
      
      allQuizProgress.forEach(q => {
        if (!quizProgressMap.has(q.student_email)) quizProgressMap.set(q.student_email, []);
        quizProgressMap.get(q.student_email).push(q);
      });
      
      allInvestments.forEach(inv => {
        if (!investmentsMap.has(inv.student_email)) investmentsMap.set(inv.student_email, []);
        investmentsMap.get(inv.student_email).push(inv);
      });
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        
        try {
          const baseCoins = 500;
          const lessonsCoins = (user.total_lessons || 0) * 100;
          
          const userWordProgress = wordProgressMap.get(user.email) || [];
          const wordCoins = userWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
          
          const userMathProgress = mathProgressMap.get(user.email) || [];
          const mathCoins = userMathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
          
          const userParticipations = participationsMap.get(user.email) || [];
          const completedSurveys = userParticipations.filter(p => p.survey_completed === true);
          const surveyCoins = completedSurveys.length * 20;
          
          const userQuizProgress = quizProgressMap.get(user.email) || [];
          const quizCoins = userQuizProgress.reduce((sum, q) => sum + (q.coins_earned || 0), 0);
          
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

          const userInvestments = investmentsMap.get(user.email) || [];
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

          await retryWithBackoff(async () => {
            await base44.entities.User.update(user.id, { coins: correctCoins });
          });
          
          await sleep(100);
          
          await retryWithBackoff(async () => {
            await syncLeaderboardEntry(user.email, { coins: correctCoins });
          });
          
          successCount++;
          
          if (i < students.length - 1) {
            await sleep(400);
          }
        } catch (error) {
          failCount++;
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ חישוב מחדש הושלם! ${successCount} תלמידים עודכנו`);
      } else {
        toast.warning(`⚠️ הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
      }
      
      await loadData();
    } catch (error) {
      toast.error("שגיאה קריטית בחישוב מחדש");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };

  const migrateAllDataToLeaderboard = async () => {
    setIsRecalculatingCoins(true);
    
    try {
      const allUsers = await base44.entities.User.list();
      const students = allUsers.filter(u => u.user_type === 'student');
      
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        batches.push(students.slice(i, i + BATCH_SIZE));
      }
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const results = await Promise.allSettled(
          batch.map(async (user) => {
            // Sync ALL relevant fields from User to LeaderboardEntry
            // sanitizeLeaderboardPatch will clean all fields automatically
            await syncLeaderboardEntry(user.email, {
              coins: user.coins || 0,
              total_collaboration_coins: user.total_collaboration_coins || 0,
              total_login_streak_coins: user.total_login_streak_coins || 0,
              login_streak: user.login_streak || 0,
              total_capital_gains_tax: user.total_capital_gains_tax || 0,
              total_investment_fees: user.total_investment_fees || 0,
              total_inflation_lost: user.total_inflation_lost || 0,
              total_income_tax: user.total_income_tax || 0,
              total_dividend_tax: user.total_dividend_tax || 0,
              total_credit_interest: user.total_credit_interest || 0,
              total_item_sale_losses: user.total_item_sale_losses || 0,
              total_realized_investment_profit: user.total_realized_investment_profit || 0,
              total_work_earnings: user.total_work_earnings || 0,
              total_work_hours: user.total_work_hours || 0,
              total_lessons: user.total_lessons || 0,
              equipped_items: user.equipped_items || {},
              purchased_items: user.purchased_items || [],
              daily_collaborations: user.daily_collaborations || [],
              age: user.age,
              bio: user.bio,
              phone_number: user.phone_number,
              completed_instagram_follow: user.completed_instagram_follow || false,
              completed_youtube_subscribe: user.completed_youtube_subscribe || false,
              completed_facebook_follow: user.completed_facebook_follow || false,
              completed_discord_join: user.completed_discord_join || false,
              completed_share: user.completed_share || false
            });
            
            return user.email;
          })
        );
        
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++;
            console.log(`✅ Synced: ${result.value}`);
          } else {
            failCount++;
            const email = batch[idx].email;
            errors.push({ email, error: result.reason?.message || 'Unknown error' });
            console.error(`❌ Failed: ${email}`, result.reason);
          }
        });
        
        // Delay between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ סנכרון הושלם בהצלחה! ${successCount} תלמידים עודכנו`);
      } else {
        toast.warning(`⚠️ סנכרון הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
        console.error("Failed users:", errors);
      }
      
      await loadData();
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("שגיאה קריטית בסנכרון");
    } finally {
      setIsRecalculatingCoins(false);
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
          ⚙️
        </motion.div>
      </div>
    );
  }

  const totalParticipations = participations.length;

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          פאנל ניהול 🛠️
        </h1>
        <p className="text-white/80 text-lg">
          שלום {currentUser?.full_name}, ברוך הבא למערכת הניהול
        </p>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">השתתפויות</p>
                  <p className="text-4xl font-black text-white">{totalParticipations}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-green-500/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">שיעורים</p>
                  <p className="text-4xl font-black text-white">{lessons.length}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">תלמידים</p>
                  <p className="text-4xl font-black text-white">{students.filter(s => s.user_type === 'student').length}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8 bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl">
          <TabsTrigger 
            value="students" 
            className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 ml-2" />
            תלמידים ושיעורים
          </TabsTrigger>
          <TabsTrigger 
            value="lessons"
            className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white"
          >
            <BookOpen className="w-4 h-4 ml-2" />
            ניהול שיעורים
          </TabsTrigger>
          <TabsTrigger 
            value="groups"
            className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 ml-2" />
            ניהול קבוצות
          </TabsTrigger>
          <TabsTrigger 
            value="vocabulary"
            className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white"
          >
            <Languages className="w-4 h-4 ml-2" />
            ניהול מילים
          </TabsTrigger>
          <TabsTrigger 
            value="tools"
            className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white"
          >
            <Shield className="w-4 h-4 ml-2" />
            כלים באנגלית
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {/* Filters Bar */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Filter className="w-4 h-4" />
              <span>סינון:</span>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">קבוצה:</span>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="כל הקבוצות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הקבוצות</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.group_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">סוג משתמש:</span>
                <Select value={filterUserType} onValueChange={setFilterUserType}>
                  <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">תלמיד</SelectItem>
                    <SelectItem value="demo">דמו</SelectItem>
                    <SelectItem value="parent">הורה</SelectItem>
                    <SelectItem value="all">הכל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-white/70 text-sm">
              סה״כ {students.filter(s => {
                const typeMatch = filterUserType === 'all' || s.user_type === filterUserType;
                if (filterGroup === 'all') return typeMatch;
                const group = groups.find(g => g.id === filterGroup);
                return typeMatch && group?.student_emails?.includes(s.email);
              }).length} מ-{students.length}
            </div>
          </div>

          {/* Students List */}
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white text-lg">
                ניהול תלמידים ({students.filter(s => filterUserType === 'all' || s.user_type === filterUserType).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {students
                  .filter(student => {
                    const typeMatch = filterUserType === 'all' || student.user_type === filterUserType;
                    if (filterGroup === 'all') return typeMatch;
                    const group = groups.find(g => g.id === filterGroup);
                    return typeMatch && group?.student_emails?.includes(student.email);
                  })
                  .map(student => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      lessons={lessons}
                      participations={participations}
                      onRefresh={loadData}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>ניהול שיעורים ({lessons.length})</span>
                <Button
                  onClick={() => setShowAddLesson(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  שיעור חדש
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {lessons.map(lesson => (
                  <div key={lesson.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setManagingQuizLesson(lesson)}
                          className="text-blue-300 hover:text-blue-200 w-9 h-9 hover:bg-gradient-to-br hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-blue-400/50 rounded-xl"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLesson(lesson)}
                          className="text-yellow-300 hover:text-yellow-200 w-9 h-9 hover:bg-gradient-to-br hover:from-yellow-500/30 hover:to-orange-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-yellow-400/50 rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingLesson(lesson)}
                          className="text-red-300 hover:text-red-200 w-9 h-9 hover:bg-gradient-to-br hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-red-400/50 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="text-white font-bold text-lg">{lesson.lesson_name}</h3>
                        <p className="text-white/70 text-sm">{lesson.description}</p>
                        <p className="text-white/50 text-xs mt-1">{lesson.lesson_date}</p>
                      </div>
                    </div>
                    <LessonStudentsList
                      lesson={lesson}
                      participations={participations}
                      students={students}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <GroupManagement onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="vocabulary">
          <VocabularyManager />
        </TabsContent>

        <TabsContent value="tools">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">כלי ניהול</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={recalculateAllCoinsAccurately}
                disabled={isRecalculatingCoins}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isRecalculatingCoins ? "מחשב מחדש..." : "חשב מחדש מטבעות לכל המשתמשים"}
              </Button>
              <Button
                onClick={migrateAllDataToLeaderboard}
                disabled={isRecalculatingCoins}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isRecalculatingCoins ? "מסנכרן..." : "🔄 סנכרן כל נתוני User ל-LeaderboardEntry (מיגרציה)"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddLessonDialog
        isOpen={showAddLesson}
        onClose={() => setShowAddLesson(false)}
        onSuccess={loadData}
      />

      <EditLessonDialog
        lesson={editingLesson}
        isOpen={!!editingLesson}
        onClose={() => setEditingLesson(null)}
        onSuccess={loadData}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingLesson}
        onClose={() => setDeletingLesson(null)}
        onConfirm={async () => {
          try {
            await base44.entities.Lesson.delete(deletingLesson.id);
            toast.success("השיעור נמחק בהצלחה");
            setDeletingLesson(null);
            loadData();
          } catch (error) {
            console.error("Error deleting lesson:", error);
            toast.error("שגיאה במחיקת השיעור");
          }
        }}
        title="מחיקת שיעור"
        description={`האם אתה בטוח שברצונך למחוק את השיעור "${deletingLesson?.lesson_name}"?`}
      />

      <QuizQuestionsManager
        lesson={managingQuizLesson}
        isOpen={!!managingQuizLesson}
        onClose={() => setManagingQuizLesson(null)}
      />
    </div>
  );
}