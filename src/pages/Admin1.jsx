import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Shield, Edit2, Trash2, FileText, Languages, Filter, Search, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import VocabSuggestionsManager from "../components/admin/VocabSuggestionsManager";
import EconomyAdminPanel from "../components/admin/EconomyAdminPanel";
import InvestmentsManager from "../components/admin/InvestmentsManager";
import ScheduledTasksPanel from "../components/admin/ScheduledTasksPanel";
import CoinLogsPanel from "../components/admin/CoinLogsPanel";
import { AVATAR_ITEMS } from '../components/avatar/TamagotchiAvatar';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [wordProgress, setWordProgress] = useState([]);
  const [mathProgress, setMathProgress] = useState([]);
  const [quizProgress, setQuizProgress] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const [loadedTabs, setLoadedTabs] = useState({});
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [managingQuizLesson, setManagingQuizLesson] = useState(null);
  const [isFixingEverything, setIsFixingEverything] = useState(false);
  const [isRecalculatingCoins, setIsRecalculatingCoins] = useState(false);
  const [coinsPreviewResults, setCoinsPreviewResults] = useState(null);
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterUserType, setFilterUserType] = useState("student");
  const [filterRecommendation, setFilterRecommendation] = useState("all");
  const [filterDuplicates, setFilterDuplicates] = useState("all");
  const [lessonSortBy, setLessonSortBy] = useState("date");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSortBy, setStudentSortBy] = useState("name");
  const [expandedSurveys, setExpandedSurveys] = useState({});
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [bulkAddLesson, setBulkAddLesson] = useState("");
  const [bulkAddDate, setBulkAddDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const STUDENTS_PER_PAGE = 20;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loadedTabs[activeTab]) {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  const [scheduledLessons, setScheduledLessons] = useState([]);

  const loadInitialData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.role !== "admin") {
        window.location.href = "/";
        return;
      }

      setIsLoading(false);
      // Load first tab data
      loadTabData("students");
    } catch (error) {
      console.error("Error loading user:", error);
      toast.error("שגיאה בטעינת נתונים");
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    if (loadedTabs[tab]) return; // Already loaded
    
    try {
      console.log(`Loading ${tab} data...`);
      
      if (tab === "students") {
        // Load all data in parallel for faster loading
        const [
          allUsers,
          allLessons,
          allParticipations,
          allGroups,
          allScheduledLessons,
          allWordProgress,
          allMathProgress,
          allQuizProgress,
          allInvestments
        ] = await Promise.all([
          retryWithBackoff(() => base44.entities.User.list()),
          retryWithBackoff(() => base44.entities.Lesson.list("-lesson_date")),
          retryWithBackoff(() => base44.entities.LessonParticipation.list()),
          retryWithBackoff(() => base44.entities.Group.list()),
          retryWithBackoff(() => base44.entities.ScheduledLesson.list()),
          retryWithBackoff(() => base44.entities.WordProgress.list()),
          retryWithBackoff(() => base44.entities.MathProgress.list()),
          retryWithBackoff(() => base44.entities.QuizProgress.list()),
          retryWithBackoff(() => base44.entities.Investment.list())
        ]);
        
        setStudents(allUsers);
        setLessons(allLessons);
        setParticipations(allParticipations);
        setGroups(allGroups);
        setScheduledLessons(allScheduledLessons);
        setWordProgress(allWordProgress);
        setMathProgress(allMathProgress);
        setQuizProgress(allQuizProgress);
        setInvestments(allInvestments);
      } else if (tab === "lessons") {
        const [allLessons, allParticipations, allUsers] = await Promise.all([
          retryWithBackoff(() => base44.entities.Lesson.list("-lesson_date")),
          retryWithBackoff(() => base44.entities.LessonParticipation.list()),
          retryWithBackoff(() => base44.entities.User.list())
        ]);
        
        setLessons(allLessons);
        setParticipations(allParticipations);
        setStudents(allUsers);
      } else if (tab === "groups") {
        // Groups will load their own data
      } else if (tab === "vocabulary") {
        // Vocabulary will load its own data
      }
      
      setLoadedTabs(prev => ({ ...prev, [tab]: true }));
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
      
      // More specific error message for rate limits
      if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        toast.error("יותר מדי בקשות. רענן את הדף בעוד כמה שניות...");
      } else {
        toast.error("שגיאה בטעינת נתונים");
      }
    }
  };

  const refreshCurrentTab = async () => {
    setLoadedTabs(prev => ({ ...prev, [activeTab]: false }));
    await loadTabData(activeTab);
  };



  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const retryWithBackoff = async (fn, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
          const retryAfter = error?.response?.headers?.['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, i), 8000);
          if (i < maxRetries - 1) {
            console.log(`Rate limit hit, waiting ${delay}ms before retry ${i + 1}/${maxRetries}`);
            await sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }
  };

  const recalculateAllCoinsAccurately = async (previewOnly = true) => {
    setIsRecalculatingCoins(true);
    
    try {
      console.log(`\n💰 ${previewOnly ? 'PREVIEW' : '🚨 APPLYING'} Coins Recalculation\n`);
      
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
      const previewResults = [];
      
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
          const surveyCoins = completedSurveys.length * 70;
          
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
          const passiveIncomeCoins = user.total_passive_income || 0;
          const adminCoins = user.total_admin_coins || 0;

          const userInvestments = investmentsMap.get(user.email) || [];
          const totalInvested = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
          const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
          const unrealizedProfit = investmentsValue - totalInvested;
          const realizedProfit = user.total_realized_investment_profit || 0;
          const totalInvestmentProfit = unrealizedProfit + realizedProfit;

          // Only count REALIZED investment profit, not unrealized (unrealized is in current_value)
          const totalIncome = baseCoins + lessonsCoins + wordCoins + mathCoins + 
                             surveyCoins + quizCoins + profileTasksCoins + 
                             profileDetailsCoins + workCoins + collaborationCoins + 
                             loginStreakCoins + passiveIncomeCoins + realizedProfit + (user.total_admin_coins || 0);

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
          const oldCoins = user.coins || 0;
          const coinsDiff = correctCoins - oldCoins;
          
          // 🔍 DEBUG LOG for each user
          console.log(`\n📊 ${user.full_name} (${user.email}):`);
          console.log(`  oldCoins: ${oldCoins}`);
          console.log(`  correctCoins: ${correctCoins}`);
          console.log(`  diff: ${coinsDiff >= 0 ? '+' : ''}${coinsDiff}`);
          console.log(`  totalIncome: ${totalIncome}`);
          console.log(`  itemsValue: ${itemsValue}`);
          console.log(`  totalLosses: ${totalLosses} (breakdown below)`);
          console.log(`    - inflationLoss: ${inflationLoss}`);
          console.log(`    - incomeTax: ${incomeTax}`);
          console.log(`    - capitalGainsTax: ${capitalGainsTax}`);
          console.log(`    - creditInterest: ${creditInterest} ⚠️`);
          console.log(`    - itemSaleLosses: ${itemSaleLosses}`);
          console.log(`    - investmentFees: ${investmentFees}`);
          console.log(`  ✅ Formula: ${totalIncome} - ${itemsValue} - ${totalLosses} = ${correctCoins}`);
          console.log(`  (investments ${investmentsValue} NOT subtracted - they are assets!)\n`);
          
          // Build preview result
          const resultItem = {
            email: user.email,
            name: user.full_name,
            oldCoins,
            correctCoins,
            diff: coinsDiff,
            totalIncome,
            itemsValue,
            totalLosses,
            creditInterest,
            warning: null,
            willUpdate: true
          };
          
          // 🛡️ SAFEGUARD: Detect anomalies
          if (correctCoins < -5000) {
            resultItem.warning = `⚠️ ANOMALY: correctCoins (${correctCoins}) < -5000`;
            resultItem.willUpdate = false;
            console.log(`  🚨 ${resultItem.warning} - SKIPPING UPDATE!`);
          } else if (Math.abs(coinsDiff) > 5000) {
            resultItem.warning = `⚠️ ANOMALY: diff (${coinsDiff}) > 5000`;
            resultItem.willUpdate = false;
            console.log(`  🚨 ${resultItem.warning} - SKIPPING UPDATE!`);
          }
          
          previewResults.push(resultItem);
          
          // Only update if NOT preview mode AND passes safeguards
          if (!previewOnly && resultItem.willUpdate) {
            await retryWithBackoff(async () => {
              await base44.entities.User.update(user.id, { coins: correctCoins });
            });
            
            await sleep(100);
            
            await retryWithBackoff(async () => {
              await syncLeaderboardEntry(user.email, { coins: correctCoins });
            });
            
            console.log(`  ✅ UPDATED!`);
          } else if (previewOnly) {
            console.log(`  👁️ PREVIEW MODE - no changes made`);
          }
          
          successCount++;
          
          if (i < students.length - 1) {
            await sleep(previewOnly ? 200 : 600);
          }
        } catch (error) {
          failCount++;
        }
      }
      
      // Save preview results to state
      if (previewOnly) {
        setCoinsPreviewResults(previewResults);
        const anomalyCount = previewResults.filter(r => !r.willUpdate).length;
        toast.success(
          `👁️ תצוגה מקדימה: ${successCount} תלמידים נבדקו` + 
          (anomalyCount > 0 ? ` (${anomalyCount} חריגים!)` : ''),
          { duration: 8000 }
        );
      } else {
        setCoinsPreviewResults(null);
        if (failCount === 0) {
          toast.success(`✅ חישוב מחדש הושלם! ${successCount} תלמידים עודכנו`);
        } else {
          toast.warning(`⚠️ הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
        }
        await refreshCurrentTab();
      }
    } catch (error) {
      toast.error("שגיאה קריטית בחישוב מחדש");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };

  const fixAdminCoins = async () => {
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
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        
        try {
          // Calculate expected income from all sources (WITHOUT admin coins)
          const baseCoins = 500;
          const lessonsCoins = (user.total_lessons || 0) * 100;
          
          const userWordProgress = allWordProgress.filter(w => w.student_email === user.email);
          const wordCoins = userWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
          
          const userMathProgress = allMathProgress.filter(m => m.student_email === user.email);
          const mathCoins = userMathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
          
          const userParticipations = allParticipations.filter(p => p.student_email === user.email);
          const surveyCoins = userParticipations.filter(p => p.survey_completed === true).length * 70;
          
          const userQuizProgress = allQuizProgress.filter(q => q.student_email === user.email);
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

          const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
          const totalInvested = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
          const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
          const unrealizedProfit = investmentsValue - totalInvested;
          const realizedProfit = user.total_realized_investment_profit || 0;
          // Investment profits are paid as cash (dividends) and added to coins
          const totalInvestmentProfit = realizedProfit;

          // Calculate expected income WITHOUT admin coins
          const expectedIncome = baseCoins + lessonsCoins + wordCoins + mathCoins + 
                             surveyCoins + quizCoins + profileTasksCoins + 
                             profileDetailsCoins + workCoins + collaborationCoins + 
                             loginStreakCoins + totalInvestmentProfit;

          // Calculate assets
          const purchasedItems = user.purchased_items || [];
          let itemsValue = 0;
          purchasedItems.forEach(itemId => {
            const item = AVATAR_ITEMS[itemId];
            if (item && item.price) {
              itemsValue += item.price;
            }
          });

          // Calculate losses
          const totalLosses = (user.total_inflation_lost || 0) + 
                            (user.total_income_tax || 0) + 
                            (user.total_capital_gains_tax || 0) + 
                            (user.total_credit_interest || 0) + 
                            (user.total_item_sale_losses || 0) + 
                            (user.total_investment_fees || 0);

          // Current coins + items + investments = what they actually have
          const actualAssets = (user.coins || 0) + itemsValue + investmentsValue;
          
          // The difference between actual assets and expected income (minus losses) is admin coins
          const calculatedAdminCoins = Math.round(actualAssets + totalLosses - expectedIncome);

          await retryWithBackoff(async () => {
            await base44.entities.User.update(user.id, { 
              total_admin_coins: calculatedAdminCoins
            });
          });
          
          await sleep(100);
          
          await retryWithBackoff(async () => {
            await syncLeaderboardEntry(user.email, { 
              total_admin_coins: calculatedAdminCoins
            });
          });
          
          successCount++;
          
          if (i < students.length - 1) {
            await sleep(400);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to fix admin coins for ${user.email}:`, error);
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ תיקון הושלם! ${successCount} תלמידים עודכנו`);
      } else {
        toast.warning(`⚠️ הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
      }

      await refreshCurrentTab();
    } catch (error) {
      console.error("Error fixing admin coins:", error);
      toast.error("שגיאה בתיקון");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };

  const resetAllLoginStreaks = async () => {
    setIsRecalculatingCoins(true);
    try {
      const allUsers = await base44.entities.User.list();
      const students = allUsers.filter(u => u.user_type === 'student');
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        try {
          await retryWithBackoff(async () => {
            await base44.entities.User.update(user.id, {
              login_streak: 0,
              last_login_date: null
            });
          });
          await sleep(100);
          await retryWithBackoff(async () => {
            await syncLeaderboardEntry(user.email, {
              login_streak: 0,
              last_login_date: null
            });
          });
          successCount++;
          if (i < students.length - 1) {
            await sleep(700);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to reset login streak for ${user.email}:`, error);
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ איפוס הושלם! ${successCount} תלמידים אופסו - ממחר רצף חדש! 🔥`);
      } else {
        toast.warning(`⚠️ הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
      }
      await refreshCurrentTab();
    } catch (error) {
      console.error("Error resetting login streaks:", error);
      toast.error("שגיאה באיפוס");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };



  const resetAllCreditInterest = async () => {
    if (!confirm("⚠️ לאפס את total_credit_interest לכל התלמידים?\n\nזה ימחק את כל הריבית שנצברה.")) {
      return;
    }
    
    setIsRecalculatingCoins(true);
    
    try {
      const allUsers = await base44.entities.User.list();
      const students = allUsers.filter(u => u.user_type === 'student');
      
      console.log(`\n🔄 Resetting credit interest for ${students.length} students\n`);
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        
        try {
          const oldInterest = user.total_credit_interest || 0;
          
          if (oldInterest !== 0) {
            await retryWithBackoff(async () => {
              await base44.entities.User.update(user.id, { 
                total_credit_interest: 0 
              });
            });
            
            await sleep(100);
            
            await retryWithBackoff(async () => {
              await syncLeaderboardEntry(user.email, { 
                total_credit_interest: 0 
              });
            });
            
            console.log(`  ✅ ${user.full_name}: ${oldInterest} → 0`);
          }
          
          if (i < students.length - 1) {
            await sleep(700);
          }
        } catch (error) {
          console.error(`Failed for ${user.email}:`, error);
        }
      }
      
      toast.success(`✅ אופס! total_credit_interest ל-${students.length} תלמידים`);
      await refreshCurrentTab();
    } catch (error) {
      console.error("Error resetting credit interest:", error);
      toast.error("שגיאה באיפוס ריבית");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };

  const recomputeStudentCashBalance = async (dryRun = true) => {
    setIsRecalculatingCoins(true);
    
    try {
      console.log(`\n💰 ${dryRun ? 'DRY RUN' : '🚨 APPLYING'} - Recompute Cash Balance\n`);
      
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
      const results = [];
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        
        try {
          // === INCOME SOURCES ===
          const baseCoins = 500;
          const lessonsCoins = (user.total_lessons || 0) * 100;
          
          const userWordProgress = allWordProgress.filter(w => w.student_email === user.email);
          const vocabularyCoins = userWordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
          
          const userMathProgress = allMathProgress.filter(m => m.student_email === user.email);
          const mathCoins = userMathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
          
          const userParticipations = allParticipations.filter(p => p.student_email === user.email);
          const surveysCoins = userParticipations.filter(p => p.survey_completed === true).length * 70;
          
          const userQuizProgress = allQuizProgress.filter(q => q.student_email === user.email);
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
          const passiveIncomeCoins = user.total_passive_income || 0;
          const adminCoins = user.total_admin_coins || 0;
          
          // Realized investment profit (dividends paid to cash)
          const realizedInvestmentProfit = user.total_realized_investment_profit || 0;
          
          const totalIncome = baseCoins + lessonsCoins + vocabularyCoins + mathCoins + 
                             surveysCoins + quizCoins + profileTasksCoins + 
                             profileDetailsCoins + workCoins + collaborationCoins + 
                             loginStreakCoins + passiveIncomeCoins + adminCoins + 
                             realizedInvestmentProfit;
          
          // === LOSSES (excluding creditInterest for now) ===
          const inflationLoss = user.total_inflation_lost || 0;
          const incomeTax = user.total_income_tax || 0;
          const capitalGainsTax = user.total_capital_gains_tax || 0;
          const investmentFees = user.total_investment_fees || 0;
          const itemSaleLosses = user.total_item_sale_losses || 0;
          
          const totalLosses = inflationLoss + incomeTax + capitalGainsTax + 
                            investmentFees + itemSaleLosses;
          
          // === ITEMS SPENT ===
          const purchasedItems = user.purchased_items || [];
          let itemsSpent = 0;
          purchasedItems.forEach(itemId => {
            const item = AVATAR_ITEMS[itemId];
            if (item && item.price) {
              itemsSpent += item.price;
            }
          });
          
          // === INVESTMENTS SPENT ===
          // When you buy an investment, cash goes DOWN by invested_amount
          const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
          const investmentsSpent = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
          
          // Current value of investments (for netWorth calculation)
          const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
          
          // === COMPUTE NEW COINS ===
          const newCoins = Math.round(totalIncome - totalLosses - itemsSpent - investmentsSpent);
          const oldCoins = user.coins || 0;
          const diff = newCoins - oldCoins;
          
          // === VALIDATION ===
          const netWorth = newCoins + itemsSpent + investmentsValue;
          
          // === DEBUG LOG ===
          console.log(`\n📊 ${user.full_name} (${user.email}):`);
          console.log(`  === INCOME ===`);
          console.log(`    base: ${baseCoins}, lessons: ${lessonsCoins}, vocab: ${vocabularyCoins}, math: ${mathCoins}`);
          console.log(`    surveys: ${surveysCoins}, quizzes: ${quizCoins}, work: ${workCoins}`);
          console.log(`    collab: ${collaborationCoins}, streak: ${loginStreakCoins}, passive: ${passiveIncomeCoins}`);
          console.log(`    admin: ${adminCoins}, realized_profit: ${realizedInvestmentProfit}`);
          console.log(`    📈 TOTAL INCOME: ${totalIncome}`);
          console.log(`  === LOSSES (no creditInterest) ===`);
          console.log(`    inflation: ${inflationLoss}, incomeTax: ${incomeTax}, capitalGainsTax: ${capitalGainsTax}`);
          console.log(`    investmentFees: ${investmentFees}, itemSaleLosses: ${itemSaleLosses}`);
          console.log(`    📉 TOTAL LOSSES: ${totalLosses}`);
          console.log(`  === SPENDING ===`);
          console.log(`    itemsSpent: ${itemsSpent} (${purchasedItems.length} items)`);
          console.log(`    investmentsSpent: ${investmentsSpent} (${userInvestments.length} investments)`);
          console.log(`  === RESULT ===`);
          console.log(`    oldCoins: ${oldCoins}`);
          console.log(`    newCoins: ${newCoins}`);
          console.log(`    diff: ${diff >= 0 ? '+' : ''}${diff}`);
          console.log(`  === VALIDATION ===`);
          console.log(`    investmentsValue (current): ${investmentsValue}`);
          console.log(`    netWorth: ${netWorth} (coins + items + investments)`);
          console.log(`    ✅ Formula: ${totalIncome} - ${totalLosses} - ${itemsSpent} - ${investmentsSpent} = ${newCoins}\n`);
          
          const resultItem = {
            email: user.email,
            name: user.full_name,
            oldCoins,
            newCoins,
            diff,
            totalIncome,
            totalLosses,
            itemsSpent,
            investmentsSpent,
            investmentsValue,
            netWorth,
            warning: null,
            willUpdate: true
          };
          
          // Safeguards
          if (newCoins < -10000) {
            resultItem.warning = `⚠️ ANOMALY: newCoins (${newCoins}) < -10000`;
            resultItem.willUpdate = false;
          } else if (Math.abs(diff) > 10000) {
            resultItem.warning = `⚠️ ANOMALY: diff (${diff}) > 10000`;
            resultItem.willUpdate = false;
          }
          
          if (resultItem.warning) {
            console.log(`  🚨 ${resultItem.warning} - SKIPPING!`);
          }
          
          results.push(resultItem);
          
          // Apply if not dry run and passes safeguards
          if (!dryRun && resultItem.willUpdate) {
            await retryWithBackoff(async () => {
              await base44.entities.User.update(user.id, { coins: newCoins });
            });
            await sleep(100);
            await retryWithBackoff(async () => {
              await syncLeaderboardEntry(user.email, { coins: newCoins });
            });
            console.log(`  ✅ UPDATED!`);
          } else if (dryRun) {
            console.log(`  👁️ DRY RUN - no changes`);
          }
          
          successCount++;
          if (i < students.length - 1) {
            await sleep(dryRun ? 200 : 600);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed for ${user.email}:`, error);
        }
      }
      
      if (dryRun) {
        setCoinsPreviewResults(results);
        const anomalyCount = results.filter(r => !r.willUpdate).length;
        toast.success(
          `👁️ Dry Run: ${successCount} תלמידים נבדקו` +
          (anomalyCount > 0 ? ` (${anomalyCount} חריגים!)` : ''),
          { duration: 8000 }
        );
      } else {
        setCoinsPreviewResults(null);
        if (failCount === 0) {
          toast.success(`✅ Cash Balance עודכן! ${successCount} תלמידים`);
        } else {
          toast.warning(`⚠️ ${successCount} הצליחו, ${failCount} נכשלו`);
        }
        await refreshCurrentTab();
      }
    } catch (error) {
      console.error("Error recomputing cash balance:", error);
      toast.error("שגיאה בחישוב מחדש");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };

  const addPassiveIncomeBackpay = async () => {
    setIsRecalculatingCoins(true);
    
    try {
      const allUsers = await base44.entities.User.list();
      const students = allUsers.filter(u => u.user_type === 'student');
      
      let successCount = 0;
      let failCount = 0;
      let totalCoinsAdded = 0;
      
      for (let i = 0; i < students.length; i++) {
        const user = students[i];
        
        try {
          // Check if user has a background with passive income
          const equippedBackground = user.equipped_items?.background;
          if (!equippedBackground) continue;
          
          const bgItem = AVATAR_ITEMS[equippedBackground];
          if (!bgItem || !bgItem.passiveIncome) continue;
          
          // Estimate 2 days of backpay
          const dailyIncome = bgItem.passiveIncome;
          const backpayDays = 2;
          const backpayAmount = dailyIncome * backpayDays;
          
          console.log(`💰 ${user.full_name}: ${bgItem.name} - ${dailyIncome}/day × ${backpayDays} days = ${backpayAmount} coins`);
          
          // Add backpay to user
          const newCoins = (user.coins || 0) + backpayAmount;
          const newTotalPassiveIncome = (user.total_passive_income || 0) + backpayAmount;
          
          await retryWithBackoff(async () => {
            await base44.entities.User.update(user.id, {
              coins: newCoins,
              total_passive_income: newTotalPassiveIncome
            });
          });
          
          await sleep(100);
          
          // Sync to LeaderboardEntry
          await retryWithBackoff(async () => {
            await syncLeaderboardEntry(user.email, {
              coins: newCoins,
              total_passive_income: newTotalPassiveIncome
            });
          });
          
          totalCoinsAdded += backpayAmount;
          successCount++;
          
          if (i < students.length - 1) {
            await sleep(400);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to add backpay for ${user.email}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`✅ הוספו ${totalCoinsAdded} סטארטקוין ל-${successCount} תלמידים! 🏠`);
      } else {
        toast.info("אין תלמידים עם מגורים שצריכים הכנסה פסיבית");
      }
      
      if (failCount > 0) {
        toast.warning(`⚠️ ${failCount} עדכונים נכשלו`);
      }

      await refreshCurrentTab();
    } catch (error) {
      console.error("Error adding passive income backpay:", error);
      toast.error("שגיאה בתיקון הכנסה פסיבית");
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
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (failCount === 0) {
        toast.success(`✅ סנכרון הושלם בהצלחה! ${successCount} תלמידים עודכנו`);
      } else {
        toast.warning(`⚠️ סנכרון הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
        console.error("Failed users:", errors);
      }

      await refreshCurrentTab();
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("שגיאה קריטית בסנכרון");
    } finally {
      setIsRecalculatingCoins(false);
    }
  };



  const totalParticipations = participations.length;

  // Memoized student list calculation (MUST be top-level)
  const studentList = React.useMemo(() => {
    const filteredAndSorted = students
      .filter(student => {
        // Filter by user type
        const typeMatch = filterUserType === 'all' || student.user_type === filterUserType;

        // Filter by group
        let groupMatch = true;
        if (filterGroup !== 'all') {
          const group = groups.find(g => g.id === filterGroup);
          groupMatch = group?.student_emails?.includes(student.email);
        }

        // Filter by search term
        let searchMatch = true;
        if (searchTerm.trim()) {
          const fullName = student.full_name?.toLowerCase() || '';
          const firstName = student.first_name?.toLowerCase() || '';
          const lastName = student.last_name?.toLowerCase() || '';
          const search = searchTerm.toLowerCase();
          searchMatch = fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
        }

        // Filter by recommendation
        let recommendationMatch = true;
        if (filterRecommendation === 'pending') {
          const studentGroup = groups.find(g => g.student_emails?.includes(student.email));
          if (!studentGroup) {
            recommendationMatch = false;
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const groupScheduledLessons = scheduledLessons.filter(sl => {
              if (sl.group_id !== studentGroup.id || !sl.lesson_id || sl.is_cancelled) {
                return false;
              }
              const lessonDate = new Date(sl.scheduled_date);
              lessonDate.setHours(0, 0, 0, 0);
              return lessonDate <= today;
            });

            if (groupScheduledLessons.length === 0) {
              recommendationMatch = false;
            } else {
              const sortedLessons = groupScheduledLessons.sort((a, b) => {
                const dateA = new Date(a.scheduled_date);
                const dateB = new Date(b.scheduled_date);
                return dateB - dateA;
              });

              const recommendedLesson = sortedLessons[0];
              const hasParticipation = participations.find(
                p => p.lesson_id === recommendedLesson.lesson_id && p.student_email === student.email
              );

              recommendationMatch = !hasParticipation;
            }
          }
        }

        // Filter by duplicate lessons
        let duplicatesMatch = true;
        if (filterDuplicates === 'has_duplicates') {
          const studentParticipations = participations.filter(p => p.student_email === student.email);
          const lessonCounts = {};
          studentParticipations.forEach(p => {
            lessonCounts[p.lesson_id] = (lessonCounts[p.lesson_id] || 0) + 1;
          });
          duplicatesMatch = Object.values(lessonCounts).some(count => count > 1);
        }

        return typeMatch && groupMatch && searchMatch && recommendationMatch && duplicatesMatch;
      })
      .sort((a, b) => {
        if (studentSortBy === "name") {
          return (a.full_name || '').localeCompare(b.full_name || '', 'he');
        } else if (studentSortBy === "joined") {
          return new Date(a.created_date) - new Date(b.created_date);
        } else if (studentSortBy === "lessons") {
          return (b.total_lessons || 0) - (a.total_lessons || 0);
        }
        return 0;
      });

    const totalPages = Math.ceil(filteredAndSorted.length / STUDENTS_PER_PAGE);
    const startIdx = (currentPage - 1) * STUDENTS_PER_PAGE;
    const paginatedStudents = filteredAndSorted.slice(startIdx, startIdx + STUDENTS_PER_PAGE);

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          {paginatedStudents.map(student => (
            <div key={student.id} className="flex items-start gap-3">
              <Checkbox
                checked={selectedStudents.includes(student.email)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedStudents([...selectedStudents, student.email]);
                  } else {
                    setSelectedStudents(selectedStudents.filter(e => e !== student.email));
                  }
                }}
                className="mt-4"
              />
              <div className="flex-1">
                <StudentRow
                  key={student.id}
                  student={student}
                  lessons={lessons}
                  participations={participations}
                  groups={groups}
                  scheduledLessons={scheduledLessons}
                  wordProgress={wordProgress}
                  mathProgress={mathProgress}
                  quizProgress={quizProgress}
                  investments={investments}
                  onToggleParticipation={async (student, lesson, lessonDate, participationId, wasAttended) => {
                    try {
                      if (participationId) {
                        await base44.entities.LessonParticipation.delete(participationId);
                        toast.success("ההשתתפות הוסרה");
                      } else if (lessonDate) {
                        const existingParticipation = participations.find(
                          p => p.student_email === student.email && p.lesson_id === lesson.id
                        );

                        if (existingParticipation) {
                          await base44.entities.LessonParticipation.update(existingParticipation.id, {
                            lesson_date: lessonDate,
                            attended: wasAttended
                          });
                          toast.success("ההשתתפות עודכנה");
                        } else {
                          await base44.entities.LessonParticipation.create({
                            student_email: student.email,
                            lesson_id: lesson.id,
                            lesson_date: lessonDate,
                            attended: wasAttended
                          });
                          toast.success("השתתפות נוספה");
                        }
                      }
                      await refreshCurrentTab();
                    } catch (error) {
                      console.error("Error toggling participation:", error);
                      toast.error("שגיאה");
                    }
                  }}
                  onUpdateParticipation={async (participationId, lessonDate, wasAttended) => {
                    try {
                      await base44.entities.LessonParticipation.update(participationId, {
                        lesson_date: lessonDate,
                        attended: wasAttended
                      });
                      toast.success("ההשתתפות עודכנה");
                      await refreshCurrentTab();
                    } catch (error) {
                      console.error("Error updating participation:", error);
                      toast.error("שגיאה בעדכון");
                    }
                  }}
                  onRefresh={refreshCurrentTab}
                />
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
            >
              ← הקודם
            </Button>
            <span className="text-white/70 text-sm">
              עמוד {currentPage} מתוך {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
            >
              הבא →
            </Button>
          </div>
        )}
      </div>
    );
  }, [students, filterUserType, filterGroup, searchTerm, filterRecommendation, filterDuplicates, studentSortBy, currentPage, selectedStudents, participations, lessons, groups, scheduledLessons, wordProgress, mathProgress, quizProgress, investments]);

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

      <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-8 overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl">
            <TabsTrigger 
              value="students" 
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <Users className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">תלמידים</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lessons"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <BookOpen className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">שיעורים</span>
            </TabsTrigger>
            <TabsTrigger 
              value="groups"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <Users className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">קבוצות</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vocabulary"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <Languages className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">מילים</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vocab-suggestions"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <span className="text-lg">💡</span>
              <span className="hidden sm:inline mr-1">המלצות</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tools"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <Shield className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">Economy</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <RefreshCw className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">משימות</span>
            </TabsTrigger>
            <TabsTrigger 
              value="coin-logs"
              className="data-[state=active]:bg-white/20 data-[state=active]:shadow-lg rounded-lg transition-all text-white/70 data-[state=active]:text-white whitespace-nowrap px-3 py-2"
            >
              <span className="text-lg">🪙</span>
              <span className="hidden sm:inline mr-1">לוגים</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students">
          {/* Bulk Actions Bar */}
          {selectedStudents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-500/20 border-2 border-purple-500/40 rounded-xl p-4 mb-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{selectedStudents.length} תלמידים נבחרו</span>
                <Button
                  onClick={() => setSelectedStudents([])}
                  variant="ghost"
                  className="text-white/70 hover:text-white"
                >
                  ✕ נקה בחירה
                </Button>
              </div>
              <Button
                onClick={() => setShowBulkAddDialog(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף לשיעור
              </Button>
            </motion.div>
          )}

          {/* Filters Bar */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 mb-6 space-y-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
              <Filter className="w-4 h-4" />
              <span className="font-bold">סינון ומיון:</span>
            </div>
            
            {/* Row 1: Sort + User Type + Group */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-white/70 text-xs">מיין לפי:</span>
                <Select value={studentSortBy} onValueChange={setStudentSortBy}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">שם (א-ת)</SelectItem>
                    <SelectItem value="joined">תאריך הצטרפות</SelectItem>
                    <SelectItem value="lessons">מספר שיעורים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <span className="text-white/70 text-xs">סוג משתמש:</span>
                <Select value={filterUserType} onValueChange={setFilterUserType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
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

              <div className="space-y-1">
                <span className="text-white/70 text-xs">קבוצה:</span>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
            </div>

            {/* Row 2: Recommendations + Duplicates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-white/70 text-xs">המלצות:</span>
                <Select value={filterRecommendation} onValueChange={setFilterRecommendation}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="pending">יש המלצה ממתינה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-white/70 text-xs">כפל שיעורים:</span>
                <Select value={filterDuplicates} onValueChange={setFilterDuplicates}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="has_duplicates">יש כפל שיעורים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Counter */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-white/70 text-sm">
                סה״כ {students.filter(s => {
                  const typeMatch = filterUserType === 'all' || s.user_type === filterUserType;
                  let groupMatch = true;
                  if (filterGroup !== 'all') {
                    const group = groups.find(g => g.id === filterGroup);
                    groupMatch = group?.student_emails?.includes(s.email);
                  }
                  let recommendationMatch = true;
                  if (filterRecommendation === 'pending') {
                    const studentGroup = groups.find(g => g.student_emails?.includes(s.email));
                    if (!studentGroup) {
                      recommendationMatch = false;
                    } else {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const groupScheduledLessons = scheduledLessons.filter(sl => {
                        if (sl.group_id !== studentGroup.id || !sl.lesson_id || sl.is_cancelled) return false;
                        const lessonDate = new Date(sl.scheduled_date);
                        lessonDate.setHours(0, 0, 0, 0);
                        return lessonDate <= today;
                      });
                      if (groupScheduledLessons.length === 0) {
                        recommendationMatch = false;
                      } else {
                        const sortedLessons = groupScheduledLessons.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
                        const recommendedLesson = sortedLessons[0];
                        const hasParticipation = participations.find(p => p.lesson_id === recommendedLesson.lesson_id && p.student_email === s.email);
                        recommendationMatch = !hasParticipation;
                      }
                    }
                  }
                  let duplicatesMatch = true;
                  if (filterDuplicates === 'has_duplicates') {
                    const studentParticipations = participations.filter(p => p.student_email === s.email);
                    const lessonCounts = {};
                    studentParticipations.forEach(p => {
                      lessonCounts[p.lesson_id] = (lessonCounts[p.lesson_id] || 0) + 1;
                    });
                    duplicatesMatch = Object.values(lessonCounts).some(count => count > 1);
                  }
                  return typeMatch && groupMatch && recommendationMatch && duplicatesMatch;
                }).length} מ-{students.length}
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                type="text"
                placeholder="חפש תלמיד לפי שם..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
              />
            </div>
          </div>

          {/* Students List */}
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-white text-lg">
                    ניהול תלמידים ({students.filter(s => filterUserType === 'all' || s.user_type === filterUserType).length}) - עמוד {currentPage}
                  </CardTitle>
                  <Button
                    onClick={refreshCurrentTab}
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    title="רענן נתונים"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      // Generate CSV with all columns
                      if (students.length === 0) {
                        toast.error('אין נתונים לייצוא');
                        return;
                      }
                      
                      // Get all unique keys from all student records
                      const allKeys = new Set();
                      students.forEach(student => {
                        Object.keys(student).forEach(key => allKeys.add(key));
                      });
                      
                      const headers = Array.from(allKeys).sort();
                      const csvRows = [headers.join(',')];
                      
                      students.forEach(student => {
                        const row = headers.map(header => {
                          const value = student[header];
                          if (value === null || value === undefined) return '""';
                          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                          return `"${String(value).replace(/"/g, '""')}"`;
                        });
                        csvRows.push(row.join(','));
                      });
                      
                      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success('קובץ CSV הורד בהצלחה');
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    📥 הורד CSV
                  </Button>
                </div>
                {students.filter(s => {
                  const typeMatch = filterUserType === 'all' || s.user_type === filterUserType;
                  let groupMatch = true;
                  if (filterGroup !== 'all') {
                    const group = groups.find(g => g.id === filterGroup);
                    groupMatch = group?.student_emails?.includes(s.email);
                  }
                  let searchMatch = true;
                  if (searchTerm.trim()) {
                    const fullName = s.full_name?.toLowerCase() || '';
                    const firstName = s.first_name?.toLowerCase() || '';
                    const lastName = s.last_name?.toLowerCase() || '';
                    const search = searchTerm.toLowerCase();
                    searchMatch = fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
                  }
                  return typeMatch && groupMatch && searchMatch;
                }).length > 0 && (
                  <Button
                    onClick={() => {
                      const filteredStudents = students.filter(s => {
                        const typeMatch = filterUserType === 'all' || s.user_type === filterUserType;
                        let groupMatch = true;
                        if (filterGroup !== 'all') {
                          const group = groups.find(g => g.id === filterGroup);
                          groupMatch = group?.student_emails?.includes(s.email);
                        }
                        let searchMatch = true;
                        if (searchTerm.trim()) {
                          const fullName = s.full_name?.toLowerCase() || '';
                          const firstName = s.first_name?.toLowerCase() || '';
                          const lastName = s.last_name?.toLowerCase() || '';
                          const search = searchTerm.toLowerCase();
                          searchMatch = fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
                        }
                        let recommendationMatch = true;
                        if (filterRecommendation === 'pending') {
                          const studentGroup = groups.find(g => g.student_emails?.includes(s.email));
                          if (!studentGroup) {
                            recommendationMatch = false;
                          } else {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const groupScheduledLessons = scheduledLessons.filter(sl => {
                              if (sl.group_id !== studentGroup.id || !sl.lesson_id || sl.is_cancelled) return false;
                              const lessonDate = new Date(sl.scheduled_date);
                              lessonDate.setHours(0, 0, 0, 0);
                              return lessonDate <= today;
                            });
                            if (groupScheduledLessons.length === 0) {
                              recommendationMatch = false;
                            } else {
                              const sortedLessons = groupScheduledLessons.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
                              const recommendedLesson = sortedLessons[0];
                              const hasParticipation = participations.find(p => p.lesson_id === recommendedLesson.lesson_id && p.student_email === s.email);
                              recommendationMatch = !hasParticipation;
                            }
                          }
                        }
                        let duplicatesMatch = true;
                        if (filterDuplicates === 'has_duplicates') {
                          const studentParticipations = participations.filter(p => p.student_email === s.email);
                          const lessonCounts = {};
                          studentParticipations.forEach(p => {
                            lessonCounts[p.lesson_id] = (lessonCounts[p.lesson_id] || 0) + 1;
                          });
                          duplicatesMatch = Object.values(lessonCounts).some(count => count > 1);
                        }
                        return typeMatch && groupMatch && searchMatch && recommendationMatch && duplicatesMatch;
                      });
                      if (selectedStudents.length === filteredStudents.length) {
                        setSelectedStudents([]);
                      } else {
                        setSelectedStudents(filteredStudents.map(s => s.email));
                      }
                    }}
                    variant="ghost"
                    className="text-white/70 hover:text-white text-sm"
                  >
                    {selectedStudents.length === students.filter(s => {
                      const typeMatch = filterUserType === 'all' || s.user_type === filterUserType;
                      let groupMatch = true;
                      if (filterGroup !== 'all') {
                        const group = groups.find(g => g.id === filterGroup);
                        groupMatch = group?.student_emails?.includes(s.email);
                      }
                      let searchMatch = true;
                      if (searchTerm.trim()) {
                        const fullName = s.full_name?.toLowerCase() || '';
                        const firstName = s.first_name?.toLowerCase() || '';
                        const lastName = s.last_name?.toLowerCase() || '';
                        const search = searchTerm.toLowerCase();
                        searchMatch = fullName.includes(search) || firstName.includes(search) || lastName.includes(search);
                      }
                      let recommendationMatch = true;
                      if (filterRecommendation === 'pending') {
                        const studentGroup = groups.find(g => g.student_emails?.includes(s.email));
                        if (!studentGroup) {
                          recommendationMatch = false;
                        } else {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const groupScheduledLessons = scheduledLessons.filter(sl => {
                            if (sl.group_id !== studentGroup.id || !sl.lesson_id || sl.is_cancelled) return false;
                            const lessonDate = new Date(sl.scheduled_date);
                            lessonDate.setHours(0, 0, 0, 0);
                            return lessonDate <= today;
                          });
                          if (groupScheduledLessons.length === 0) {
                            recommendationMatch = false;
                          } else {
                            const sortedLessons = groupScheduledLessons.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
                            const recommendedLesson = sortedLessons[0];
                            const hasParticipation = participations.find(p => p.lesson_id === recommendedLesson.lesson_id && p.student_email === s.email);
                            recommendationMatch = !hasParticipation;
                          }
                        }
                      }
                      let duplicatesMatch = true;
                      if (filterDuplicates === 'has_duplicates') {
                        const studentParticipations = participations.filter(p => p.student_email === s.email);
                        const lessonCounts = {};
                        studentParticipations.forEach(p => {
                          lessonCounts[p.lesson_id] = (lessonCounts[p.lesson_id] || 0) + 1;
                        });
                        duplicatesMatch = Object.values(lessonCounts).some(count => count > 1);
                      }
                      return typeMatch && groupMatch && searchMatch && recommendationMatch && duplicatesMatch;
                    }).length ? '✓ בטל בחירת הכל' : '☑ בחר הכל'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {studentList}
            </CardContent>
                      </Card>
                      </TabsContent>

        <TabsContent value="lessons">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>ניהול שיעורים ({lessons.length})</span>
                <div className="flex items-center gap-3">
                  <Select value={lessonSortBy} onValueChange={setLessonSortBy}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="מיין לפי..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">תאריך (חדש לישן)</SelectItem>
                      <SelectItem value="name">שם השיעור</SelectItem>
                      <SelectItem value="survey">ממוצע סקרים</SelectItem>
                      <SelectItem value="participants">מספר משתתפים</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setShowAddLesson(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    שיעור חדש
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {(() => {
                  // Calculate stats for each lesson
                  const lessonsWithStats = lessons.map(lesson => {
                    const lessonParticipations = participations.filter(p => p.lesson_id === lesson.id);
                    const completedSurveys = lessonParticipations.filter(p => p.survey_completed);

                    let avgSurvey = 0;
                    let avgInterest = 0;
                    let avgFun = 0;
                    let avgLearned = 0;
                    let avgDifficulty = 0;
                    
                    if (completedSurveys.length > 0) {
                      const totalScore = completedSurveys.reduce((sum, p) => {
                        const score = (p.survey_interest || 0) + (p.survey_fun || 0) + 
                                    (p.survey_learned || 0) + (p.survey_difficulty || 0);
                        return sum + score;
                      }, 0);
                      avgSurvey = totalScore / (completedSurveys.length * 4); // Average out of 5
                      
                      // Calculate individual averages
                      avgInterest = completedSurveys.reduce((sum, p) => sum + (p.survey_interest || 0), 0) / completedSurveys.length;
                      avgFun = completedSurveys.reduce((sum, p) => sum + (p.survey_fun || 0), 0) / completedSurveys.length;
                      avgLearned = completedSurveys.reduce((sum, p) => sum + (p.survey_learned || 0), 0) / completedSurveys.length;
                      avgDifficulty = completedSurveys.reduce((sum, p) => sum + (p.survey_difficulty || 0), 0) / completedSurveys.length;
                    }

                    return {
                      ...lesson,
                      participantCount: lessonParticipations.length,
                      avgSurvey,
                      surveyCount: completedSurveys.length,
                      avgInterest,
                      avgFun,
                      avgLearned,
                      avgDifficulty
                    };
                  });

                  // Sort lessons
                  let sortedLessons = [...lessonsWithStats];
                  if (lessonSortBy === "date") {
                    sortedLessons.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                  } else if (lessonSortBy === "name") {
                    sortedLessons.sort((a, b) => a.lesson_name.localeCompare(b.lesson_name, 'he'));
                  } else if (lessonSortBy === "survey") {
                    sortedLessons.sort((a, b) => b.avgSurvey - a.avgSurvey);
                  } else if (lessonSortBy === "participants") {
                    sortedLessons.sort((a, b) => b.participantCount - a.participantCount);
                  }

                  return sortedLessons.map(lesson => (
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedSurveys(prev => ({ ...prev, [`absent_${lesson.id}`]: !prev[`absent_${lesson.id}`] }))}
                          className="text-orange-300 hover:text-orange-200 w-9 h-9 hover:bg-gradient-to-br hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-orange-400/50 rounded-xl"
                          title="תלמידים שלא היו"
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="text-white font-bold text-lg">{lesson.lesson_name}</h3>
                        <p className="text-white/70 text-sm">{lesson.description}</p>
                        <div className="flex items-center justify-end gap-3 mt-2">
                          <p className="text-white/50 text-xs">{lesson.lesson_date}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="bg-blue-500/20 text-blue-200 px-2 py-1 rounded">
                              👥 {lesson.participantCount} משתתפים
                            </span>
                            {lesson.avgSurvey > 0 && (
                              <span className={`px-2 py-1 rounded font-bold ${
                                lesson.avgSurvey >= 4.5 ? 'bg-green-500/20 text-green-200' :
                                lesson.avgSurvey >= 4 ? 'bg-blue-500/20 text-blue-200' :
                                lesson.avgSurvey >= 3.5 ? 'bg-yellow-500/20 text-yellow-200' :
                                'bg-orange-500/20 text-orange-200'
                              }`}>
                                ⭐ {lesson.avgSurvey.toFixed(1)} / 5
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Survey Breakdown */}
                        {lesson.surveyCount > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/60 text-xs">פירוט סקרים ({lesson.surveyCount} סקרים):</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedSurveys(prev => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
                                className="text-white/60 hover:text-white text-xs h-6 px-2"
                              >
                                {expandedSurveys[lesson.id] ? (
                                  <>הסתר מילאו <ChevronUp className="w-3 h-3 mr-1" /></>
                                ) : (
                                  <>הצג מי מילא <ChevronDown className="w-3 h-3 mr-1" /></>
                                )}
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1.5">
                                <p className="text-purple-200 text-[10px] mb-0.5">🎯 עניין</p>
                                <p className="text-white font-bold text-sm">{lesson.avgInterest.toFixed(1)}/5</p>
                              </div>
                              <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg px-2 py-1.5">
                                <p className="text-pink-200 text-[10px] mb-0.5">😄 כיף</p>
                                <p className="text-white font-bold text-sm">{lesson.avgFun.toFixed(1)}/5</p>
                              </div>
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1.5">
                                <p className="text-green-200 text-[10px] mb-0.5">📚 למדתי</p>
                                <p className="text-white font-bold text-sm">{lesson.avgLearned.toFixed(1)}/5</p>
                              </div>
                              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1.5">
                                <p className="text-orange-200 text-[10px] mb-0.5">🧠 קל להבנה</p>
                                <p className="text-white font-bold text-sm">{lesson.avgDifficulty.toFixed(1)}/5</p>
                              </div>
                            </div>
                            
                            {/* List of students who completed survey */}
                            {expandedSurveys[lesson.id] && (
                              <div className="mt-3 bg-white/5 rounded-lg p-3">
                                <p className="text-white/80 text-xs font-bold mb-2">תלמידים שמילאו סקר:</p>
                                <div className="space-y-2">
                                  {participations
                                    .filter(p => p.lesson_id === lesson.id && p.survey_completed)
                                    .map(p => {
                                     const student = students.find(s => s.email === p.student_email);
                                     if (!student) return null;

                                     const displayName = student.first_name && student.last_name
                                       ? `${student.first_name} ${student.last_name}`
                                       : (student.full_name || student.email);

                                     const totalScore = (p.survey_interest || 0) + (p.survey_fun || 0) + 
                                                       (p.survey_learned || 0) + (p.survey_difficulty || 0);
                                     const avgScore = totalScore / 4;

                                     return (
                                       <div key={p.id} className="bg-white/5 rounded px-3 py-2">
                                         <div className="flex items-center justify-between mb-2">
                                           <div className="flex-1">
                                             <p className="text-white text-sm font-medium">{displayName}</p>
                                              <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] text-purple-300">🎯 {p.survey_interest || 0}</span>
                                                <span className="text-[10px] text-pink-300">😄 {p.survey_fun || 0}</span>
                                                <span className="text-[10px] text-green-300">📚 {p.survey_learned || 0}</span>
                                                <span className="text-[10px] text-orange-300">🧠 {p.survey_difficulty || 0}</span>
                                              </div>
                                            </div>
                                            <div className={`text-sm font-bold px-2 py-1 rounded ${
                                              avgScore >= 4.5 ? 'bg-green-500/20 text-green-200' :
                                              avgScore >= 4 ? 'bg-blue-500/20 text-blue-200' :
                                              avgScore >= 3.5 ? 'bg-yellow-500/20 text-yellow-200' :
                                              'bg-orange-500/20 text-orange-200'
                                            }`}>
                                              {avgScore.toFixed(1)}
                                            </div>
                                          </div>
                                          {p.survey_comments && (
                                            <div className="mt-2 pt-2 border-t border-white/10">
                                              <p className="text-white/60 text-[10px] mb-1">💬 הערות:</p>
                                              <p className="text-white/80 text-xs italic">"{p.survey_comments}"</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <LessonStudentsList
                      lesson={lesson}
                      participations={participations}
                      students={students}
                    />

                    {/* Students who haven't participated yet */}
                    {expandedSurveys[`absent_${lesson.id}`] && (() => {
                      const lessonParticipations = participations.filter(p => p.lesson_id === lesson.id);
                      const participatedEmails = lessonParticipations.map(p => p.student_email);

                      const absentStudents = students
                        .filter(s => s.user_type === 'student' && s.role !== 'admin' && !participatedEmails.includes(s.email))
                        .map(student => {
                          const studentGroups = groups.filter(g => g.student_emails?.includes(student.email));
                          const displayName = student.first_name && student.last_name
                            ? `${student.first_name} ${student.last_name}`
                            : (student.full_name || student.email);
                          return { student, groups: studentGroups, displayName };
                        })
                        .filter(item => item.groups.length > 0); // Only show students that are in groups

                      if (absentStudents.length === 0) {
                        return (
                          <div className="mt-3 bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <p className="text-green-200 text-xs">✓ כל התלמידים מהקבוצות כבר השתתפו בשיעור</p>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-3 bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                          <p className="text-orange-200 text-xs font-bold mb-2">תלמידים שעדיין לא היו בשיעור ({absentStudents.length}):</p>
                          <div className="space-y-2">
                            {absentStudents
                              .sort((a, b) => {
                                const groupNameA = a.groups[0]?.group_name || '';
                                const groupNameB = b.groups[0]?.group_name || '';
                                return groupNameA.localeCompare(groupNameB, 'he');
                              })
                              .map(({ student, groups: studentGroups, displayName }) => (
                              <div key={student.email} className="bg-white/5 rounded px-2 py-1.5 flex items-center justify-between">
                                <span className="text-white text-xs">{displayName}</span>
                                <div className="flex gap-1">
                                  {studentGroups.map(g => (
                                    <span key={g.id} className="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded">
                                      {g.group_name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <GroupManagement onRefresh={refreshCurrentTab} />
        </TabsContent>

        <TabsContent value="vocabulary">
          <VocabularyManager />
        </TabsContent>

        <TabsContent value="vocab-suggestions">
          <VocabSuggestionsManager />
        </TabsContent>

        <TabsContent value="tools">
          <div className="space-y-6">
            <InvestmentsManager />
            <EconomyAdminPanel />
          </div>
        </TabsContent>

        <TabsContent value="coin-logs">
          <CoinLogsPanel students={students} />
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="space-y-6">
            <ScheduledTasksPanel />
            
            {/* One-time Functions */}
            <Card className="bg-white/5 backdrop-blur-md border-white/10">
              <CardHeader>
                <CardTitle className="text-white">פונקציות חד-פעמיות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold mb-1">אתחול ספירת תרגילי חשבון</h3>
                      <p className="text-white/70 text-sm">
                        מחשב את total_correct_math_answers לכל התלמידים מתוך MathProgress (פעם אחת בלבד)
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!confirm("האם להריץ אתחול ספירת תרגילי חשבון? (פעם אחת בלבד)")) return;
                        setIsRecalculatingCoins(true);
                        try {
                          const response = await base44.functions.invoke('initializeMathAnswers', {});
                          toast.success(response.message || "האתחול הושלם!");
                          await refreshCurrentTab();
                        } catch (error) {
                          console.error("Error:", error);
                          toast.error("שגיאה באתחול: " + (error.message || error));
                        } finally {
                          setIsRecalculatingCoins(false);
                        }
                      }}
                      disabled={isRecalculatingCoins}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {isRecalculatingCoins ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : "🔢"}
                      הרץ אתחול
                    </Button>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold mb-1">סנכרון מילים ששלטו בהן (mastered_words)</h3>
                      <p className="text-white/70 text-sm">
                        מחשב את mastered_words לכל התלמידים מתוך WordProgress ומסנכרן ל-User
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!confirm("לסנכרן mastered_words לכל התלמידים?")) return;
                        setIsRecalculatingCoins(true);
                        try {
                          const response = await base44.functions.invoke('syncMasteredWords', {});
                          const result = response.data;
                          toast.success(result.message || "הסנכרון הושלם!");
                          await refreshCurrentTab();
                        } catch (error) {
                          console.error("Error:", error);
                          toast.error("שגיאה בסנכרון: " + (error.message || error));
                        } finally {
                          setIsRecalculatingCoins(false);
                        }
                      }}
                      disabled={isRecalculatingCoins}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isRecalculatingCoins ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : "📚"}
                      הרץ סנכרון
                    </Button>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold mb-1">עיגול כל ההשקעות</h3>
                      <p className="text-white/70 text-sm">
                        מעגל את current_value ו-invested_amount לכל ההשקעות במערכת למספרים שלמים
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!confirm("לעגל את כל ההשקעות למספרים שלמים?")) return;
                        setIsRecalculatingCoins(true);
                        try {
                          const response = await base44.functions.invoke('roundAllInvestments', {});
                          const result = response.data;
                          toast.success(result.message || "העיגול הושלם!");
                          await refreshCurrentTab();
                        } catch (error) {
                          console.error("Error:", error);
                          toast.error("שגיאה בעיגול: " + (error.message || error));
                        } finally {
                          setIsRecalculatingCoins(false);
                        }
                      }}
                      disabled={isRecalculatingCoins}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      {isRecalculatingCoins ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : "🔢"}
                      עגל הכל
                    </Button>
                  </div>
                </div>


              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AddLessonDialog
        isOpen={showAddLesson}
        onClose={() => setShowAddLesson(false)}
        onSuccess={refreshCurrentTab}
      />

      <EditLessonDialog
        lesson={editingLesson}
        isOpen={!!editingLesson}
        onClose={() => setEditingLesson(null)}
        onSuccess={refreshCurrentTab}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingLesson}
        onClose={() => setDeletingLesson(null)}
        onConfirm={async () => {
          try {
            await base44.entities.Lesson.delete(deletingLesson.id);
            toast.success("השיעור נמחק בהצלחה");
            setDeletingLesson(null);
            refreshCurrentTab();
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

      {/* Bulk Add to Lesson Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent className="bg-gradient-to-br from-purple-500/95 to-pink-500/95 text-white border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              הוסף {selectedStudents.length} תלמידים לשיעור
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-bold mb-2 block">בחר שיעור:</label>
              <Select value={bulkAddLesson} onValueChange={setBulkAddLesson}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="בחר שיעור..." />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Group lessons by category
                    const categoryNames = {
                      ai_tech: "🤖 AI & Tech",
                      personal_skills: "💪 מיומנויות אישיות",
                      money_business: "💰 כסף ועסקים"
                    };

                    const lessonsByCategory = {};
                    lessons.forEach(lesson => {
                      const cat = lesson.category || 'uncategorized';
                      if (!lessonsByCategory[cat]) lessonsByCategory[cat] = [];
                      lessonsByCategory[cat].push(lesson);
                    });

                    // Check for duplicates
                    const categoriesWithDuplicates = Object.keys(lessonsByCategory).filter(
                      cat => lessonsByCategory[cat].length > 1
                    );

                    return lessons.map(lesson => {
                      const cat = lesson.category || 'uncategorized';
                      const categoryLabel = categoryNames[cat] || cat;
                      const isDuplicate = categoriesWithDuplicates.includes(cat);
                      const duplicateIndex = isDuplicate 
                        ? lessonsByCategory[cat].findIndex(l => l.id === lesson.id) + 1
                        : null;

                      return (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {isDuplicate && `(${duplicateIndex}/${lessonsByCategory[cat].length}) `}
                          {lesson.lesson_name} - {categoryLabel} - {lesson.lesson_date || 'ללא תאריך'}
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold mb-2 block">תאריך השיעור:</label>
              <Input
                type="date"
                value={bulkAddDate}
                onChange={(e) => setBulkAddDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="bg-white/10 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-sm font-bold mb-2">תלמידים נבחרים:</p>
              <div className="space-y-1">
                {selectedStudents.map(email => {
                  const student = students.find(s => s.email === email);
                  const displayName = student?.first_name && student?.last_name
                    ? `${student.first_name} ${student.last_name}`
                    : (student?.full_name || email);
                  return (
                    <div key={email} className="text-sm text-white/90">
                      • {displayName}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowBulkAddDialog(false);
                  setBulkAddLesson("");
                  setBulkAddDate("");
                }}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                ביטול
              </Button>
              <Button
                onClick={async () => {
                  if (!bulkAddLesson || !bulkAddDate) {
                    toast.error("יש לבחור שיעור ותאריך");
                    return;
                  }

                  try {
                    let successCount = 0;
                    let failCount = 0;

                    for (const email of selectedStudents) {
                      try {
                        // בדוק אם התלמיד כבר רשום לשיעור זה
                        const existing = participations.find(
                          p => p.student_email === email && 
                               p.lesson_id === bulkAddLesson
                        );

                        if (existing) {
                          // דרוס את ההשתתפות הקיימת
                          await base44.entities.LessonParticipation.update(existing.id, {
                            lesson_date: bulkAddDate,
                            attended: true
                          });
                        } else {
                          // צור השתתפות חדשה
                          await base44.entities.LessonParticipation.create({
                            student_email: email,
                            lesson_id: bulkAddLesson,
                            lesson_date: bulkAddDate,
                            attended: true
                          });
                        }
                        successCount++;

                        await sleep(100);
                      } catch (error) {
                        failCount++;
                        console.error(`Failed to add ${email}:`, error);
                      }
                    }

                    if (failCount === 0) {
                      toast.success(`✅ ${successCount} תלמידים נוספו בהצלחה!`);
                    } else {
                      toast.warning(`הוספו ${successCount} תלמידים, ${failCount} נכשלו`);
                    }

                    setShowBulkAddDialog(false);
                    setBulkAddLesson("");
                    setBulkAddDate("");
                    setSelectedStudents([]);
                    await refreshCurrentTab();
                  } catch (error) {
                    console.error("Error bulk adding:", error);
                    toast.error("שגיאה בהוספה קבוצתית");
                  }
                }}
                className="flex-1 bg-white text-purple-600 hover:bg-white/90 font-bold"
                disabled={!bulkAddLesson || !bulkAddDate}
              >
                הוסף לשיעור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      );
      }