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

  const recalculateAllCoinsAccurately = async () => {
    setIsRecalculatingCoins(true);
    let totalFixed = 0;
    const report = [];

    try {
      const allUsers = await base44.entities.User.list();
      const allParticipations = await base44.entities.LessonParticipation.list();
      const allWordProgress = await base44.entities.WordProgress.list();
      const allMathProgress = await base44.entities.MathProgress.list();
      const allQuizProgress = await base44.entities.QuizProgress.list();
      const allInvestments = await base44.entities.Investment.list();

      for (const user of allUsers) {
        const breakdown = {
          email: user.email,
          name: user.full_name
        };

        // ═══════════════════════════════════════════════════
        // שלב 1: חישוב הכנסות
        // ═══════════════════════════════════════════════════
        
        const baseCoins = 500;
        breakdown.baseCoins = baseCoins;

        const attendedLessons = allParticipations.filter(
          p => p.student_email === user.email && p.attended === true
        );
        const lessonsCoins = attendedLessons.length * 100;
        breakdown.lessonsCoins = lessonsCoins;
        breakdown.attendedCount = attendedLessons.length;

        const wordCoins = allWordProgress
          .filter(w => w.student_email === user.email)
          .reduce((sum, w) => sum + (w.coins_earned || 0), 0);
        breakdown.wordCoins = wordCoins;

        const mathCoins = allMathProgress
          .filter(m => m.student_email === user.email)
          .reduce((sum, m) => sum + (m.coins_earned || 0), 0);
        breakdown.mathCoins = mathCoins;

        const completedSurveys = allParticipations.filter(
          p => p.student_email === user.email && p.survey_completed === true
        );
        const surveyCoins = completedSurveys.length * 20;
        breakdown.surveyCoins = surveyCoins;

        const quizCoins = allQuizProgress
          .filter(q => q.student_email === user.email)
          .reduce((sum, q) => sum + (q.coins_earned || 0), 0);
        breakdown.quizCoins = quizCoins;

        let profileTasksCoins = 0;
        if (user.completed_instagram_follow) profileTasksCoins += 50;
        if (user.completed_youtube_subscribe) profileTasksCoins += 50;
        if (user.completed_facebook_follow) profileTasksCoins += 50;
        if (user.completed_discord_join) profileTasksCoins += 50;
        if (user.completed_share) profileTasksCoins += 100;
        breakdown.profileTasksCoins = profileTasksCoins;

        let profileDetailsCoins = 0;
        if (user.age) profileDetailsCoins += 20;
        if (user.bio && user.bio.length > 10) profileDetailsCoins += 30;
        if (user.phone_number) profileDetailsCoins += 20;
        breakdown.profileDetailsCoins = profileDetailsCoins;

        const workCoins = user.total_work_earnings || 0;
        breakdown.workCoins = workCoins;

        const collaborationCoins = user.total_collaboration_coins || 0;
        breakdown.collaborationCoins = collaborationCoins;

        const loginStreakCoins = user.total_login_streak_coins || 0;
        breakdown.loginStreakCoins = loginStreakCoins;

        // רווחי השקעות
        const userInvestments = allInvestments.filter(inv => inv.student_email === user.email);
        const totalInvested = userInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
        const investmentsValue = userInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
        const investmentProfits = Math.max(0, investmentsValue - totalInvested);
        breakdown.investmentProfits = investmentProfits;
        breakdown.totalInvested = totalInvested;
        breakdown.investmentsValue = investmentsValue;

        const totalIncome = baseCoins + lessonsCoins + wordCoins + mathCoins + 
                           surveyCoins + quizCoins + profileTasksCoins + 
                           profileDetailsCoins + workCoins + collaborationCoins + 
                           loginStreakCoins + investmentProfits;
        breakdown.totalIncome = totalIncome;

        // ═══════════════════════════════════════════════════
        // שלב 2: חישוב נכסים
        // ═══════════════════════════════════════════════════
        
        const currentCoins = user.coins || 0;
        breakdown.oldCoins = currentCoins;

        // שווי פריטים
        const purchasedItems = user.purchased_items || [];
        let itemsValue = 0;
        purchasedItems.forEach(itemId => {
          const item = AVATAR_ITEMS[itemId];
          if (item && item.price) {
            itemsValue += item.price;
          }
        });
        breakdown.itemsValue = itemsValue;

        // ═══════════════════════════════════════════════════
        // שלב 3: חישוב הפסדים
        // ═══════════════════════════════════════════════════
        
        const inflationLoss = user.total_inflation_lost || 0;
        breakdown.inflationLoss = inflationLoss;

        const incomeTax = user.total_income_tax || 0;
        breakdown.incomeTax = incomeTax;

        const capitalGainsTax = user.total_capital_gains_tax || 0;
        breakdown.capitalGainsTax = capitalGainsTax;

        const creditInterest = user.total_credit_interest || 0;
        breakdown.creditInterest = creditInterest;

        // Dividend tax - refund to all users who paid it
        const dividendTaxPaid = user.total_dividend_tax || 0;
        breakdown.dividendTax = 0; // No longer charging dividend tax
        breakdown.dividendTaxRefund = dividendTaxPaid;

        const investmentLoss = Math.max(0, totalInvested - investmentsValue);
        breakdown.investmentLoss = investmentLoss;

        const itemSaleLosses = user.total_item_sale_losses || 0;
        breakdown.itemSaleLosses = itemSaleLosses;

        // עמלות
        let investmentFees = user.total_investment_fees || 0;
        let needsFeesUpdate = false;
        
        if (investmentFees === 0 && totalInvested > 0) {
          const estimatedPurchases = Math.ceil(totalInvested / 100);
          const estimatedFees = estimatedPurchases * 2;
          investmentFees = estimatedFees;
          breakdown.investmentFeesEstimated = true;
          needsFeesUpdate = true;
        } else {
          breakdown.investmentFeesEstimated = false;
        }
        
        breakdown.investmentFees = investmentFees;

        // Total losses WITHOUT dividend tax (it's refunded)
        const totalLosses = inflationLoss + incomeTax + capitalGainsTax + creditInterest + investmentLoss + itemSaleLosses + investmentFees;
        breakdown.totalLosses = totalLosses;

        // ═══════════════════════════════════════════════════
        // חישוב המטבעות הנכונים + החזר מס דיבידנד!
        // ═══════════════════════════════════════════════════
        
        // Add dividend tax refund to income
        const totalIncomeWithRefund = totalIncome + dividendTaxPaid;
        breakdown.totalIncomeWithRefund = totalIncomeWithRefund;
        
        const correctCoins = Math.round(totalIncomeWithRefund - itemsValue - investmentsValue - totalLosses);
        breakdown.correctCoins = correctCoins;
        
        const totalAssets = correctCoins + itemsValue + investmentsValue;
        breakdown.totalAssets = totalAssets;

        const expectedIncome = totalAssets + totalLosses;
        breakdown.expectedIncome = expectedIncome;
        breakdown.incomeMatch = Math.abs(totalIncome - expectedIncome) < 1;

        breakdown.coinsDiff = correctCoins - currentCoins;

        report.push(breakdown);

        // עדכון המשתמש
        const updates = {
          coins_recalculated_v14: true
        };

        let needsUpdate = false;

        if (needsFeesUpdate) {
          updates.total_investment_fees = investmentFees;
          breakdown.feesWereUpdated = true;
          needsUpdate = true;
        }

        // Reset dividend tax counters
        if (user.total_dividend_tax && user.total_dividend_tax > 0) {
          updates.total_dividend_tax = 0;
          updates.daily_dividend_tax = 0;
          needsUpdate = true;
        }

        if (Math.abs(breakdown.coinsDiff) >= 1) {
          updates.coins = correctCoins;
          breakdown.coinsWereUpdated = true;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await base44.entities.User.update(user.id, updates);
          
          try {
            const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: user.email });
            if (leaderboardEntries.length > 0) {
              await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
                coins: correctCoins
              });
            }
          } catch (error) {
            console.error("Error updating leaderboard:", error);
          }
          
          totalFixed++;
        }
      }

      console.log("📊 Final Coins Verification Report (v14 - DIVIDEND TAX REFUNDED!):");
      report.forEach(r => {
        console.log(`\n👤 ${r.name} (${r.email})`);
        console.log(`  💰 INCOME: ${Math.round(r.totalIncome)} ${r.dividendTaxRefund > 0 ? `+ ${Math.round(r.dividendTaxRefund)} (refund) = ${Math.round(r.totalIncomeWithRefund)}` : ''}`);
        console.log(`  💎 ASSETS: ${Math.round(r.totalAssets)} (Cash: ${Math.round(r.correctCoins)}${r.coinsWereUpdated ? ' ✅' : ''}, Items: ${Math.round(r.itemsValue)}, Inv: ${Math.round(r.investmentsValue)})`);
        console.log(`  📉 LOSSES: ${Math.round(r.totalLosses)} (Inflation: ${Math.round(r.inflationLoss)}, Income Tax: ${Math.round(r.incomeTax)}, Capital Gains: ${Math.round(r.capitalGainsTax)}, Credit: ${Math.round(r.creditInterest)}, Inv Loss: ${Math.round(r.investmentLoss)}, Fees: ${Math.round(r.investmentFees)}${r.feesWereUpdated ? ' ✅' : ''})`);
        if (r.dividendTaxRefund > 0) {
          console.log(`  💸 DIVIDEND TAX REFUND: +${Math.round(r.dividendTaxRefund)} החזר!`);
        }
        if (Math.abs(r.coinsDiff) >= 1) {
          console.log(`  🔧 FIX: ${Math.round(r.oldCoins)} → ${Math.round(r.correctCoins)} (${r.coinsDiff >= 0 ? '+' : ''}${Math.round(r.coinsDiff)})`);
        }
        console.log(`  ${r.incomeMatch ? '✅ PERFECT!' : `⚠️ Diff: ${Math.round((r.totalIncomeWithRefund || r.totalIncome) - r.expectedIncome)}`}`);
      });
      
      if (totalFixed > 0) {
        const coinsFixed = report.filter(r => r.coinsWereUpdated).length;
        const feesFixed = report.filter(r => r.feesWereUpdated).length;
        const totalRefunded = report.reduce((sum, r) => sum + (r.dividendTaxRefund || 0), 0);
        
        let message = `✅ תיקנתי ${totalFixed} משתמשים! `;
        if (coinsFixed > 0) message += `${coinsFixed} מטבעות, `;
        if (feesFixed > 0) message += `${feesFixed} עמלות, `;
        if (totalRefunded > 0) message += `החזרתי ${Math.round(totalRefunded)} מטבעות ממס דיבידנד`;
        message += ' 💯';
        
        toast.success(message, { duration: 5000 });
      } else {
        toast.success(`✅ הכל מדויק! 💯`, { duration: 5000 });
      }
      
      loadData();
    } catch (error) {
      console.error("Error verifying coins:", error);
      toast.error("שגיאה בבדיקת המטבעות");
    }

    setIsRecalculatingCoins(false);
  };

  const fixEverything = async () => {
    setIsFixingEverything(true);
    let totalChanges = {
      userTypesFixed: 0,
      leaderboardRemoved: 0,
      leaderboardAdded: 0,
      leaderboardSynced: 0,
      duplicatesRemoved: 0
    };

    try {
      const allUsers = await base44.entities.User.list();
      for (const user of allUsers) {
        if (!user.user_type) {
          await base44.entities.User.update(user.id, { user_type: "demo" });
          totalChanges.userTypesFixed++;
        }
      }

      const allLeaderboardEntries = await base44.entities.LeaderboardEntry.list();
      
      for (const entry of allLeaderboardEntries) {
        const user = allUsers.find(u => u.email === entry.student_email);
        if (!user || user.user_type !== 'student') {
          await base44.entities.LeaderboardEntry.delete(entry.id);
          totalChanges.leaderboardRemoved++;
        }
      }
      
      for (const user of allUsers) {
        if (user.user_type === 'student') {
          const existingEntry = allLeaderboardEntries.find(e => e.student_email === user.email);
          
          const leaderboardData = {
            student_email: user.email,
            full_name: user.full_name,
            first_name: user.first_name || null,
            last_name: user.last_name || null,
            ai_tech_level: user.ai_tech_level || 1,
            ai_tech_xp: user.ai_tech_xp || 0,
            personal_dev_level: user.personal_dev_level || 1,
            personal_dev_xp: user.personal_dev_xp || 0,
            social_skills_level: user.social_skills_level || 1,
            social_skills_xp: user.social_skills_xp || 0,
            money_business_level: user.money_business_level || 1,
            money_business_xp: user.money_business_xp || 0,
            total_lessons: user.total_lessons || 0,
            coins: user.coins || 0,
            equipped_items: user.equipped_items || {},
            purchased_items: user.purchased_items || [],
            user_type: user.user_type
          };

          if (existingEntry) {
            await base44.entities.LeaderboardEntry.update(existingEntry.id, leaderboardData);
            totalChanges.leaderboardSynced++;
          } else {
            await base44.entities.LeaderboardEntry.create(leaderboardData);
            totalChanges.leaderboardAdded++;
          }
        }
      }

      const allParticipations = await base44.entities.LessonParticipation.list();
      
      const participationMap = {};
      for (const participation of allParticipations) {
        const key = `${participation.student_email}_${participation.lesson_id}`;
        if (!participationMap[key]) {
          participationMap[key] = [];
        }
        participationMap[key].push(participation);
      }

      for (const key in participationMap) {
        const group = participationMap[key];
        if (group.length > 1) {
          group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          
          for (let i = 1; i < group.length; i++) {
            try {
              await base44.entities.LessonParticipation.delete(group[i].id);
              totalChanges.duplicatesRemoved++;
            } catch (error) {
              console.error(`Error deleting duplicate participation ${group[i].id}:`, error);
            }
          }
        }
      }

      const messages = [];
      if (totalChanges.userTypesFixed > 0) {
        messages.push(`${totalChanges.userTypesFixed} משתמשים עודכנו`);
      }
      if (totalChanges.leaderboardRemoved > 0) {
        messages.push(`${totalChanges.leaderboardRemoved} רשומות נמחקו מטבלת השיאים`);
      }
      if (totalChanges.leaderboardAdded > 0) {
        messages.push(`${totalChanges.leaderboardAdded} תלמידים נוספו לטבלת השיאים`);
      }
      if (totalChanges.leaderboardSynced > 0) {
        messages.push(`${totalChanges.leaderboardSynced} תלמידים סונכרנו בטבלת השיאים`);
      }
      if (totalChanges.duplicatesRemoved > 0) {
        messages.push(`${totalChanges.duplicatesRemoved} השתתפויות כפולות נמחקו`);
      }

      if (messages.length > 0) {
        toast.success(`✨ הכל מסודר! ${messages.join(', ')}`, { duration: 5000 });
      } else {
        toast.info("הכל כבר מסודר! אין מה לתקן 👍");
      }

      loadData();
    } catch (error) {
      console.error("Error fixing everything:", error);
      toast.error("שגיאה בתיקון המערכת");
    }
    setIsFixingEverything(false);
  };

  const handleAddLesson = async (lessonData) => {
    try {
      const createdLesson = await base44.entities.Lesson.create(lessonData);
      
      const lessonDate = new Date(lessonData.lesson_date);
      const dayOfWeek = lessonDate.getDay();
      
      const allGroups = await base44.entities.Group.list();
      const matchingGroups = allGroups.filter(group => group.day_of_week === dayOfWeek);
      
      const studentEmails = new Set();
      matchingGroups.forEach(group => {
        if (group.student_emails && Array.isArray(group.student_emails)) {
          group.student_emails.forEach(email => studentEmails.add(email));
        }
      });
      
      let addedStudents = 0;
      for (const email of studentEmails) {
        try {
          const existingParticipation = participations.find(
            p => p.lesson_id === createdLesson.id && p.student_email === email
          );
          
          if (!existingParticipation) {
            await base44.entities.LessonParticipation.create({
              lesson_id: createdLesson.id,
              student_email: email,
              lesson_date: lessonData.lesson_date,
              attended: false
            });
            addedStudents++;
          }
        } catch (error) {
          console.error(`Error adding student ${email} to lesson:`, error);
        }
      }
      
      setShowAddLesson(false);
      
      if (addedStudents > 0) {
        toast.success(`השיעור נוסף בהצלחה! 🎉 ${addedStudents} תלמידים נוספו אוטומטית מהקבוצות!`, {
          duration: 5000
        });
      } else {
        toast.success("השיעור נוסף בהצלחה! 🎉");
      }
      
      loadData();
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("שגיאה בהוספת השיעור");
    }
  };

  const handleEditLesson = async (lessonData) => {
    if (!editingLesson) return;

    await base44.entities.Lesson.update(editingLesson.id, lessonData);

    setEditingLesson(null);
    toast.success("השיעור עודכן בהצלחה! ✨");
    loadData();
  };

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return;

    const lessonParticipants = participations.filter(p => p.lesson_id === deletingLesson.id);

    for (const participation of lessonParticipants) {
      try {
        if (participation.attended) {
          const allUsers = await base44.entities.User.list();
          const studentData = allUsers.find(u => u.email === participation.student_email);
          
          if (studentData) {
            const updates = {
              total_lessons: Math.max(0, (studentData.total_lessons || 0) - 1),
              coins: Math.max(0, (studentData.coins || 0) - 100)
            };

            const skillKeys = ["ai_tech", "personal_dev", "social_skills", "money_business"];
            for (const skillKey of skillKeys) {
              const xpKey = `${skillKey}_xp`;
              const levelKey = `${skillKey}_level`;
              const xpToSubtract = deletingLesson[`${skillKey}_xp`] || 0;
              
              if (xpToSubtract > 0) {
                const currentXP = studentData[xpKey] || 0;
                const currentLevel = studentData[levelKey] || 1;
                
                const totalXP = (currentLevel - 1) * 100 + currentXP;
                const newTotalXP = Math.max(0, totalXP - xpToSubtract);
                const newLevel = Math.floor(newTotalXP / 100) + 1;
                const newXP = newTotalXP % 100;
                
                updates[xpKey] = newXP;
                updates[levelKey] = newLevel;
              }
            }

            if (Object.keys(updates).length > 2 || (Object.keys(updates).length === 2 && (updates.total_lessons !== studentData.total_lessons || updates.coins !== studentData.coins))) {
              await base44.entities.User.update(studentData.id, updates);

              try {
                const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: studentData.email });
                const updatedData = {
                  student_email: studentData.email,
                  full_name: studentData.full_name,
                  ai_tech_level: updates.ai_tech_level || studentData.ai_tech_level,
                  ai_tech_xp: updates.ai_tech_xp || studentData.ai_tech_xp,
                  personal_dev_level: updates.personal_dev_level || studentData.personal_dev_level,
                  personal_dev_xp: updates.personal_dev_xp || studentData.personal_dev_xp,
                  social_skills_level: updates.social_skills_level || studentData.social_skills_level,
                  social_skills_xp: updates.social_skills_xp || studentData.social_skills_xp,
                  money_business_level: updates.money_business_level || studentData.money_business_level,
                  money_business_xp: updates.money_business_xp || studentData.money_business_xp,
                  total_lessons: updates.total_lessons,
                  coins: updates.coins,
                  equipped_items: studentData.equipped_items || {},
                  purchased_items: studentData.purchased_items || [],
                  user_type: updates.user_type || studentData.user_type || "student"
                };

                if (leaderboardEntries.length > 0) {
                  await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, updatedData);
                } else {
                  await base44.entities.LeaderboardEntry.create(updatedData);
                }
              } catch (leaderboardError) {
                console.error("Error updating leaderboard during lesson deletion:", leaderboardError);
              }
            }
          }
        }

        await base44.entities.LessonParticipation.delete(participation.id);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`Participation ${participation.id} already deleted, skipping`);
        } else {
          console.error(`Error deleting participation ${participation.id}:`, error);
        }
      }
    }

    await base44.entities.Lesson.delete(deletingLesson.id);

    setDeletingLesson(null);
    toast.success("השיעור נמחק בהצלחה");
    loadData();
  };

  const handleToggleParticipation = async (student, lesson, date, participationIdToRemove, attended = true) => {
    if (participationIdToRemove) {
      try {
        const participationToRemove = participations.find(p => p.id === participationIdToRemove);
        
        if (!participationToRemove) {
          console.log("Participation not found in local state, reloading data");
          toast.error("ההשתתפות כבר לא קיימת. מרענן נתונים.");
          loadData();
          return;
        }

        try {
          await base44.entities.LessonParticipation.delete(participationIdToRemove);
        } catch (deleteError) {
          if (deleteError.response?.status === 404 || deleteError.message?.includes('not found')) {
            console.log("Participation already deleted on server.");
            toast.info("ההשתתפות כבר נמחק. מרענן נתונים.");
            loadData();
            return;
          } else {
            throw deleteError;
          }
        }

        if (participationToRemove.attended) {
          const allUsers = await base44.entities.User.list();
          const studentData = allUsers.find(u => u.email === student.email);
          
          if (studentData) {
            const updates = {
              total_lessons: Math.max(0, (studentData.total_lessons || 0) - 1),
              coins: Math.max(0, (studentData.coins || 0) - 100)
            };

            const skillKeys = ["ai_tech", "personal_dev", "social_skills", "money_business"];
            for (const skillKey of skillKeys) {
              const xpKey = `${skillKey}_xp`;
              const levelKey = `${skillKey}_level`;
              const xpToSubtract = lesson[`${skillKey}_xp`] || 0;
              
              if (xpToSubtract > 0) {
                const currentXP = studentData[xpKey] || 0;
                const currentLevel = studentData[levelKey] || 1;
                
                const totalXP = (currentLevel - 1) * 100 + currentXP;
                const newTotalXP = Math.max(0, totalXP - xpToSubtract);
                const newLevel = Math.floor(newTotalXP / 100) + 1;
                const newXP = newTotalXP % 100;
                
                updates[xpKey] = newXP;
                updates[levelKey] = newLevel;
              }
            }

            if (Object.keys(updates).length > 2 || (Object.keys(updates).length === 2 && (updates.total_lessons !== studentData.total_lessons || updates.coins !== studentData.coins))) {
              await base44.entities.User.update(studentData.id, updates);

              try {
                const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: student.email });
                const updatedData = {
                  student_email: student.email,
                  full_name: studentData.full_name,
                  ai_tech_level: updates.ai_tech_level || studentData.ai_tech_level,
                  ai_tech_xp: updates.ai_tech_xp || studentData.ai_tech_xp,
                  personal_dev_level: updates.personal_dev_level || studentData.personal_dev_level,
                  personal_dev_xp: updates.personal_dev_xp || studentData.personal_dev_xp,
                  social_skills_level: updates.social_skills_level || studentData.social_skills_level,
                  social_skills_xp: updates.social_skills_xp || studentData.social_skills_xp,
                  money_business_level: updates.money_business_level || studentData.money_business_level,
                  money_business_xp: updates.money_business_xp || studentData.money_business_xp,
                  total_lessons: updates.total_lessons,
                  coins: updates.coins,
                  equipped_items: studentData.equipped_items || {},
                  purchased_items: studentData.purchased_items || [],
                  user_type: updates.user_type || studentData.user_type || "student"
                };

                if (leaderboardEntries.length > 0) {
                  await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, updatedData);
                } else {
                  await base44.entities.LeaderboardEntry.create(updatedData);
                }
              } catch (leaderboardError) {
                console.error("Error updating leaderboard:", leaderboardError);
              }
            }
          }
        }
        
        toast.success("ההשתתפות הוסרה בהצלחה");
      } catch (error) {
        console.error("Error in handleToggleParticipation (removal):", error);
        if (error.response?.status === 404 || error.message?.includes('not found')) {
          toast.info("ההשתתפות כבר נמחק. מרענן נתונים.");
        } else {
          toast.error("שגיאה בעדכון ההשתתפות");
        }
      }
    } else {
      try {
        const existingParticipation = participations.find(
          p => p.lesson_id === lesson.id && p.student_email === student.email
        );

        if (existingParticipation) {
          toast.error(`${student.full_name} כבר רשום לשיעור "${lesson.lesson_name}"! 🚫`);
          return;
        }

        await base44.entities.LessonParticipation.create({
          lesson_id: lesson.id,
          student_email: student.email,
          lesson_date: date,
          attended: attended
        });

        if (attended) {
          const allUsers = await base44.entities.User.list();
          const studentData = allUsers.find(u => u.email === student.email);
          
          if (studentData) {
            const updates = {
              total_lessons: (studentData.total_lessons || 0) + 1,
              coins: (studentData.coins || 0) + 100
            };

            const skillKeys = ["ai_tech", "personal_dev", "social_skills", "money_business"];
            for (const skillKey of skillKeys) {
              const xpKey = `${skillKey}_xp`;
              const levelKey = `${skillKey}_level`;
              const xpToAdd = lesson[`${skillKey}_xp`] || 0;
              
              if (xpToAdd > 0) {
                const currentXP = studentData[xpKey] || 0;
                const currentLevel = studentData[levelKey] || 1;
                
                const totalXPBeforeAdd = (currentLevel - 1) * 100 + currentXP;
                const newTotalXP = totalXPBeforeAdd + xpToAdd;
                
                const newLevel = Math.floor(newTotalXP / 100) + 1;
                const finalXP = newTotalXP % 100;
                
                updates[xpKey] = finalXP;
                updates[levelKey] = newLevel;
              }
            }

            if (Object.keys(updates).length > 2 || (Object.keys(updates).length === 2 && (updates.total_lessons !== studentData.total_lessons || updates.coins !== studentData.coins))) {
              await base44.entities.User.update(studentData.id, updates);
            }

            try {
              const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: student.email });
              const updatedData = {
                student_email: student.email,
                full_name: studentData.full_name,
                ai_tech_level: updates.ai_tech_level || studentData.ai_tech_level,
                ai_tech_xp: updates.ai_tech_xp || studentData.ai_tech_xp,
                personal_dev_level: updates.personal_dev_level || studentData.personal_dev_level,
                personal_dev_xp: updates.personal_dev_xp || studentData.personal_dev_xp,
                social_skills_level: updates.social_skills_level || studentData.social_skills_level,
                social_skills_xp: updates.social_skills_xp || studentData.social_skills_xp,
                money_business_level: updates.money_business_level || studentData.money_business_level,
                money_business_xp: updates.money_business_xp || studentData.money_business_xp,
                total_lessons: updates.total_lessons,
                coins: updates.coins,
                equipped_items: studentData.equipped_items || {},
                purchased_items: studentData.purchased_items || [],
                user_type: updates.user_type || studentData.user_type || "student"
              };

              if (leaderboardEntries.length > 0) {
                await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, updatedData);
              } else {
                await base44.entities.LeaderboardEntry.create(updatedData);
              }
            } catch (leaderboardError) {
              console.error("Error updating leaderboard:", leaderboardError);
            }
          }
        }
        
        toast.success("ההשתתפות נוספה בהצלחה");
      } catch (error) {
        console.error("Error adding participation:", error);
        toast.error("שגיאה בהוספת ההשתתפות");
      }
    }

    loadData();
  };

  const handleUpdateParticipation = async (participationId, newDate, newAttended) => {
    const participation = participations.find(p => p.id === participationId);
    if (!participation) {
      console.error(`Participation with ID ${participationId} not found.`);
      toast.error("השתתפות לא נמצאה. מרענן נתונים.");
      loadData();
      return;
    }

    const wasAttendedBefore = participation.attended;
    const lesson = lessons.find(l => l.id === participation.lesson_id);
    const allUsers = await base44.entities.User.list();
    const studentData = allUsers.find(u => u.email === participation.student_email);

    if (!lesson) {
      console.error(`Lesson with ID ${participation.lesson_id} not found for participation ${participationId}.`);
      toast.error("השיעור המשויך להשתתפות לא נמצא.");
      return;
    }
    if (!studentData) {
      console.error(`Student with email ${participation.student_email} not found for participation ${participationId}.`);
      toast.error("התלמיד המשויך להשתתפות לא נמצא.");
      return;
    }

    await base44.entities.LessonParticipation.update(participationId, {
      lesson_date: newDate,
      attended: newAttended
    });

    if (wasAttendedBefore !== newAttended) {
      const updates = {};
      const skillKeys = ["ai_tech", "personal_dev", "social_skills", "money_business"];

      if (newAttended) {
        updates.total_lessons = (studentData.total_lessons || 0) + 1;
        updates.coins = (studentData.coins || 0) + 100;

        for (const skillKey of skillKeys) {
          const xpKey = `${skillKey}_xp`;
          const levelKey = `${skillKey}_level`;
          const xpToAdd = lesson[`${skillKey}_xp`] || 0;
          
          if (xpToAdd > 0) {
            const currentXP = studentData[xpKey] || 0;
            const currentLevel = studentData[levelKey] || 1;
            
            const totalXPBeforeAdd = (currentLevel - 1) * 100 + currentXP;
            const newTotalXP = totalXPBeforeAdd + xpToAdd;
            
            const newLevel = Math.floor(newTotalXP / 100) + 1;
            const finalXP = newTotalXP % 100;
            
            updates[xpKey] = finalXP;
            updates[levelKey] = newLevel;
          }
        }
      } else {
        updates.total_lessons = Math.max(0, (studentData.total_lessons || 0) - 1);
        updates.coins = Math.max(0, (studentData.coins || 0) - 100);

        for (const skillKey of skillKeys) {
          const xpKey = `${skillKey}_xp`;
          const levelKey = `${skillKey}_level`;
          const xpToSubtract = lesson[`${skillKey}_xp`] || 0;
          
          if (xpToSubtract > 0) {
            const currentXP = studentData[xpKey] || 0;
            const currentLevel = studentData[levelKey] || 1;
            
            const totalXP = (currentLevel - 1) * 100 + currentXP;
            const newTotalXP = Math.max(0, totalXP - xpToSubtract);
            const newLevel = Math.floor(newTotalXP / 100) + 1;
            const newXP = newTotalXP % 100;
            
            updates[xpKey] = newXP;
            updates[levelKey] = newLevel;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.User.update(studentData.id, updates);

        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: studentData.email });
          const updatedData = {
            student_email: studentData.email,
            full_name: studentData.full_name,
            ai_tech_level: updates.ai_tech_level || studentData.ai_tech_level,
            ai_tech_xp: updates.ai_tech_xp || studentData.ai_tech_xp,
            personal_dev_level: updates.personal_dev_level || studentData.personal_dev_level,
            personal_dev_xp: updates.personal_dev_xp || studentData.personal_dev_xp,
            social_skills_level: updates.social_skills_level || studentData.social_skills_level,
            social_skills_xp: updates.social_skills_xp || studentData.social_skills_xp,
            money_business_level: updates.money_business_level || studentData.money_business_level,
            money_business_xp: updates.money_business_xp || studentData.money_business_xp,
            total_lessons: updates.total_lessons,
            coins: updates.coins,
            equipped_items: studentData.equipped_items || {},
            purchased_items: studentData.purchased_items || [],
            user_type: updates.user_type || studentData.user_type || "student"
          };

          if (leaderboardEntries.length > 0) {
            await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, updatedData);
          } else {
            await base44.entities.LeaderboardEntry.create(updatedData);
          }
        } catch (leaderboardError) {
          console.error("Error updating leaderboard:", leaderboardError);
        }
      }
      toast.success("נוכחות עודכנה בהצלחה! ✨");
    } else {
      toast.success("תאריך השתתפות עודכן בהצלחה! ✨");
    }

    loadData();
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

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row justify-center gap-4"
      >
        <Button
          onClick={fixEverything}
          disabled={isFixingEverything}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 shadow-2xl"
        >
          {isFixingEverything ? (
            <>
              <motion.div
                className="inline-block mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ⚙️
              </motion.div>
              מסדר...
            </>
          ) : (
            <>
              ✨ סדר הכל אוטומטית
            </>
          )}
        </Button>

        <Button
          onClick={recalculateAllCoinsAccurately}
          disabled={isRecalculatingCoins}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 shadow-2xl"
        >
          {isRecalculatingCoins ? (
            <>
              <motion.div
                className="inline-block mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                💰
              </motion.div>
              מתקן...
            </>
          ) : (
            <>
              💰 תקן מטבעות
            </>
          )}
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4"
      >
        <p className="text-blue-800 text-sm text-center">
          <span className="font-bold">✨ סדר הכל:</span> מתקן סוגי משתמשים, טבלת שיאים, והשתתפויות כפולות<br/>
          <span className="font-bold">💰 תקן מטבעות:</span> מחשב מחדש ומתקן את כמות המטבעות לפי כל ההכנסות וההוצאות<br/>
          <span className="font-bold">💸 מיסים אוטומטיים:</span> המערכת מפעילה אינפלציה ומס הכנסה אוטומטית לכל התלמידים בכל כניסה לאפליקציה ⚠️
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{students.length}</p>
                  <p className="text-white/70 text-sm">תלמידים</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{lessons.length}</p>
                  <p className="text-white/70 text-sm">שיעורים</p>
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
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{totalParticipations}</p>
                  <p className="text-white/70 text-sm">השתתפויות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <div className="flex justify-end overflow-x-auto">
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
            <TabsTrigger value="students" className="data-[state=active]:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-4">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">תלמידים ושיעורים</span>
              <span className="sm:hidden">תלמידים</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="data-[state=active]:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-4">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ניהול שיעורים</span>
              <span className="sm:hidden">שיעורים</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-4">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ניהול קבוצות</span>
              <span className="sm:hidden">קבוצות</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="data-[state=active]:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-4">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">ניהול מורים</span>
              <span className="sm:hidden">מורים</span>
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="data-[state=active]:bg-white/20 text-white text-xs sm:text-sm px-2 sm:px-4">
              <Languages className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">מילים באנגלית</span>
              <span className="sm:hidden">אנגלית</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-center bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">סינון:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs">קבוצה:</span>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[140px] bg-white/20 border-white/30 text-white text-sm h-8">
                  <SelectValue placeholder="כל הקבוצות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקבוצות</SelectItem>
                  <SelectItem value="no_group">ללא קבוצה</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs">סוג משתמש:</span>
              <Select value={filterUserType} onValueChange={setFilterUserType}>
                <SelectTrigger className="w-[120px] bg-white/20 border-white/30 text-white text-sm h-8">
                  <SelectValue placeholder="הכל" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="student">תלמיד</SelectItem>
                  <SelectItem value="demo">דמו</SelectItem>
                  <SelectItem value="parent">הורה</SelectItem>
                  <SelectItem value="teacher">מורה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-white/50 text-xs mr-auto">
              {(() => {
                const filtered = students.filter((student) => {
                  // Filter by user type
                  if (filterUserType !== "all" && student.user_type !== filterUserType) {
                    return false;
                  }
                  
                  // Filter by group
                  if (filterGroup === "no_group") {
                    const isInAnyGroup = groups.some(g => 
                      g.student_emails && g.student_emails.includes(student.email)
                    );
                    return !isInAnyGroup;
                  }
                  if (filterGroup !== "all") {
                    const group = groups.find(g => g.id === filterGroup);
                    if (!group || !group.student_emails || !group.student_emails.includes(student.email)) {
                      return false;
                    }
                  }
                  
                  return true;
                });
                return `מציג ${filtered.length} מתוך ${students.length}`;
              })()}
            </span>
          </div>

          <div className="space-y-4">
            {students
              .filter((student) => {
                // Filter by user type
                if (filterUserType !== "all" && student.user_type !== filterUserType) {
                  return false;
                }
                
                // Filter by group
                if (filterGroup === "no_group") {
                  const isInAnyGroup = groups.some(g => 
                    g.student_emails && g.student_emails.includes(student.email)
                  );
                  return !isInAnyGroup;
                }
                if (filterGroup !== "all") {
                  const group = groups.find(g => g.id === filterGroup);
                  if (!group || !group.student_emails || !group.student_emails.includes(student.email)) {
                    return false;
                  }
                }
                
                return true;
              })
              .map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                lessons={lessons}
                participations={participations}
                onToggleParticipation={handleToggleParticipation}
                onUpdateParticipation={handleUpdateParticipation}
                onRefresh={loadData}
              />
            ))}

            {students.filter((student) => {
              if (filterUserType !== "all" && student.user_type !== filterUserType) return false;
              if (filterGroup === "no_group") {
                return !groups.some(g => g.student_emails && g.student_emails.includes(student.email));
              }
              if (filterGroup !== "all") {
                const group = groups.find(g => g.id === filterGroup);
                if (!group || !group.student_emails || !group.student_emails.includes(student.email)) return false;
              }
              return true;
            }).length === 0 && students.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="py-12 text-center">
                  <Filter className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">לא נמצאו תלמידים לפי הסינון הנוכחי</p>
                </CardContent>
              </Card>
            )}

            {students.length === 0 && (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">אין תלמידים במערכת</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lessons">
          <div className="mb-6">
            <Button
              onClick={() => setShowAddLesson(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              הוסף שיעור חדש
            </Button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson) => {
              const participantCount = participations.filter(
                p => p.lesson_id === lesson.id && p.attended
              ).length;

              const completedSurveys = participations.filter(
                p => p.lesson_id === lesson.id && p.survey_completed
              );
              
              const surveyStats = completedSurveys.length > 0 ? {
                count: completedSurveys.length,
                interest: (completedSurveys.reduce((sum, p) => sum + (p.survey_interest || 0), 0) / completedSurveys.length).toFixed(1),
                fun: (completedSurveys.reduce((sum, p) => sum + (p.survey_fun || 0), 0) / completedSurveys.length).toFixed(1),
                learned: (completedSurveys.reduce((sum, p) => sum + (p.survey_learned || 0), 0) / completedSurveys.length).toFixed(1),
                easyToUnderstand: (completedSurveys.reduce((sum, p) => sum + (6 - (p.survey_difficulty || 0)), 0) / completedSurveys.length).toFixed(1)
              } : null;

              return (
                <Card key={lesson.id} className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 text-right">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {lesson.lesson_name}
                        </h3>
                        {lesson.description && (
                          <p className="text-white/60 text-sm mb-3">{lesson.description}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {lesson.ai_tech_xp > 0 && (
                            <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full">
                              🤖 +{lesson.ai_tech_xp}
                            </span>
                          )}
                          {(lesson.personal_dev_xp > 0 || lesson.social_skills_xp > 0) && (
                            <span className="text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded-full">
                              🌱 +{(lesson.personal_dev_xp || 0) + (lesson.social_skills_xp || 0)}
                            </span>
                          )}
                          {lesson.money_business_xp > 0 && (
                            <span className="text-xs bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded-full">
                              💸 +{lesson.money_business_xp}
                            </span>
                          )}
                        </div>

                        {surveyStats && (
                          <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-yellow-200 text-sm font-bold">
                                📊 ממוצע סקרים ({surveyStats.count} תשובות)
                              </p>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="text-center">
                                <div className="text-yellow-300 font-bold text-lg">{surveyStats.interest}</div>
                                <div className="text-white/60">🎯 עניין</div>
                              </div>
                              <div className="text-center">
                                <div className="text-yellow-300 font-bold text-lg">{surveyStats.fun}</div>
                                <div className="text-white/60">😄 כיף</div>
                              </div>
                              <div className="text-center">
                                <div className="text-yellow-300 font-bold text-lg">{surveyStats.learned}</div>
                                <div className="text-white/60">📚 למידה</div>
                              </div>
                              <div className="text-center">
                                <div className="text-yellow-300 font-bold text-lg">{surveyStats.easyToUnderstand}</div>
                                <div className="text-white/60">💡 קל להבנה</div>
                              </div>
                            </div>

                            {/* Individual survey responses */}
                            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                              {completedSurveys.map((survey) => {
                                const student = students.find(s => s.email === survey.student_email);
                                return (
                                  <div key={survey.id} className="bg-white/5 rounded-lg p-2 border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-white/90 text-xs font-medium">
                                        {student?.full_name || survey.student_email}
                                      </span>
                                      <div className="flex gap-2 text-xs">
                                        <span className="text-blue-300">🎯 {survey.survey_interest}</span>
                                        <span className="text-yellow-300">😄 {survey.survey_fun}</span>
                                        <span className="text-green-300">📚 {survey.survey_learned}</span>
                                        <span className="text-purple-300">💡 {6 - (survey.survey_difficulty || 0)}</span>
                                      </div>
                                    </div>
                                    {survey.survey_comments && (
                                      <div className="bg-white/5 rounded p-2 border-r-2 border-yellow-500">
                                        <p className="text-white/70 text-xs">{survey.survey_comments}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-3">
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold px-4 py-2 rounded-full">
                            {participantCount}
                          </div>
                          <p className="text-white/60 text-xs mt-1">נוכחים</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingLesson(lesson)}
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setDeletingLesson(lesson)}
                            size="sm"
                            variant="outline"
                            className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-200 hover:text-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <Button
                        onClick={() => setManagingQuizLesson(managingQuizLesson?.id === lesson.id ? null : lesson)}
                        variant="outline"
                        className="w-full bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-200"
                      >
                        {managingQuizLesson?.id === lesson.id ? "סגור ניהול חידון" : "נהל שאלות חידון"}
                      </Button>

                      {managingQuizLesson?.id === lesson.id && (
                        <div className="mt-4">
                          <QuizQuestionsManager lesson={lesson} />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <LessonStudentsList
                        lesson={lesson}
                        participations={participations}
                        students={students}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {lessons.length === 0 && (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70 mb-4">אין שיעורים במערכת</p>
                  <Button
                    onClick={() => setShowAddLesson(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    צור שיעור ראשון
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="groups">
          <GroupManagement />
        </TabsContent>

        <TabsContent value="teachers">
          <TeacherManagement />
        </TabsContent>

        <TabsContent value="vocabulary">
          <VocabularyManager />
        </TabsContent>
      </Tabs>

      <AddLessonDialog
        isOpen={showAddLesson}
        onClose={() => setShowAddLesson(false)}
        onSubmit={handleAddLesson}
      />

      {editingLesson && (
        <EditLessonDialog
          isOpen={!!editingLesson}
          onClose={() => setEditingLesson(null)}
          lesson={editingLesson}
          onSubmit={handleEditLesson}
        />
      )}

      {deletingLesson && (
        <DeleteConfirmDialog
          isOpen={!!deletingLesson}
          onClose={() => setDeletingLesson(null)}
          onConfirm={handleDeleteLesson}
          lessonName={deletingLesson.lesson_name}
          participantCount={participations.filter(p => p.lesson_id === deletingLesson.id && p.attended).length}
        />
      )}
    </div>
  );
}