import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Search, Eye, Calculator } from "lucide-react";
import MaintenanceModeToggle from "./MaintenanceModeToggle";
import { AVATAR_ITEM_PRICES } from "@/components/constants/avatarItemPrices";

// Helper function to compute profile-related coins
const computeProfileCoins = (user) => {
  let profileCompletionCoins = 0;
  if (user.age) profileCompletionCoins += 20;
  if (user.bio && user.bio.length > 10) profileCompletionCoins += 30;
  if (user.phone_number) profileCompletionCoins += 20;

  let socialMissionsCoins = 0;
  if (user.completed_instagram_follow) socialMissionsCoins += 50;
  if (user.completed_youtube_subscribe) socialMissionsCoins += 50;
  if (user.completed_facebook_follow) socialMissionsCoins += 50;
  if (user.completed_discord_join) socialMissionsCoins += 50;
  if (user.completed_share) socialMissionsCoins += 100;

  return { profileCompletionCoins, socialMissionsCoins };
};

export default function EconomyAdminPanel() {
  const [snapshots, setSnapshots] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] });
  const [debugStudent, setDebugStudent] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [isRecalculatingNetWorth, setIsRecalculatingNetWorth] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ current: 0, total: 0, logs: [] });

  useEffect(() => {
    loadSnapshots();
  }, []);



  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();

      if (currentUser.role !== 'admin') {
        toast.error("אין הרשאות גישה");
        setLoading(false);
        return;
      }

      const usersData = await base44.entities.User.list();
      const allStudents = usersData.filter(u => u.user_type === 'student');
      
      // Load math progress to get math questions answered correctly
      const allMathProgress = await base44.entities.MathProgress.list();
      const mathProgressByEmail = new Map();
      allMathProgress.forEach(m => {
        if (!mathProgressByEmail.has(m.student_email)) {
          mathProgressByEmail.set(m.student_email, []);
        }
        mathProgressByEmail.get(m.student_email).push(m);
      });
      
      setStudents(allStudents.map(user => {
        const coins = user.coins || 0;
        const investments_value = user.investments_value || 0;
        const items_value = user.items_value || 0;
        const total_networth = user.total_networth ?? (coins + investments_value + items_value);
        
        return {
          student_email: user.email,
          full_name: user.full_name,
          coins: coins,
          investments_value: investments_value,
          items_value: items_value,
          total_networth: total_networth,
          correctMathAnswers: user.total_correct_math_answers || 0,
          last_calculated_at: user.last_calculated_at || null
        };
      }));
      setSnapshots([]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredSnapshots.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredSnapshots.map(s => s.student_email)));
    }
  };

  const toggleSelect = (email) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const calculateStudentEconomy = async (studentEmail) => {
    const users = await base44.entities.User.filter({ email: studentEmail });
    if (!users || users.length === 0) throw new Error("User not found");
    const user = users[0];

    await new Promise(resolve => setTimeout(resolve, 800));
    const wordProgress = await base44.entities.WordProgress.filter({ student_email: studentEmail });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    const mathProgress = await base44.entities.MathProgress.filter({ student_email: studentEmail });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    const participations = await base44.entities.LessonParticipation.filter({ student_email: studentEmail });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    const quizProgress = await base44.entities.QuizProgress.filter({ student_email: studentEmail });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    const investments = await base44.entities.Investment.filter({ student_email: studentEmail });

    const safeNum = (val) => typeof val === 'number' ? val : 0;

    const income = {
      base: safeNum(user.base_coins ?? user.base ?? 500),
      lessonsCoins: safeNum(user.total_lessons_coins ?? (user.total_lessons * 100)),
      vocabulary: wordProgress.reduce((sum, w) => sum + safeNum(w.coins_earned), 0),
      math: mathProgress.reduce((sum, m) => sum + safeNum(m.coins_earned), 0),
      surveys: safeNum(user.survey_coins ?? user.total_survey_coins) || (participations.filter(p => p.survey_completed).length * 70),
      quizzes: quizProgress.reduce((sum, q) => sum + safeNum(q.coins_earned), 0),
      collaboration: safeNum(user.total_collaboration_coins),
      loginStreakIncome: safeNum(user.total_login_streak_coins),
      workEarnings: safeNum(user.total_work_earnings),
      passiveIncome: safeNum(user.total_passive_income),
      adminCoins: safeNum(user.total_admin_coins)
    };

    const losses = {
      inflation: safeNum(user.total_inflation_lost),
      incomeTax: safeNum(user.total_income_tax),
      dividendTax: safeNum(user.total_dividend_tax),
      capitalGainsTax: safeNum(user.total_capital_gains_tax),
      investmentFees: safeNum(user.total_investment_fees),
      itemSaleLosses: safeNum(user.total_item_sale_losses),
      creditInterest: safeNum(user.total_credit_interest)
    };

    const purchasedItems = user.purchased_items || [];
    const itemsValue = purchasedItems.reduce((sum, itemId) => {
      return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
    }, 0);

    const investmentsSpent = investments.reduce((sum, inv) => sum + safeNum(inv.invested_amount), 0);
    const investmentsValue = investments.reduce((sum, inv) => sum + safeNum(inv.current_value), 0);

    const realizedProfit = safeNum(user.total_realized_investment_profit);
    const unrealized = investmentsValue - investmentsSpent;
    const totalInvestmentProfits = unrealized + realizedProfit;

    income.investmentProfits = totalInvestmentProfits;
    const totalIncome = Object.values(income).reduce((sum, val) => sum + safeNum(val), 0);
    const totalLosses = Object.values(losses).reduce((sum, val) => sum + safeNum(val), 0);

    const coins = Math.round(totalIncome - totalLosses - itemsValue - investmentsValue);
    const total_networth = coins + investmentsValue + itemsValue;

    return {
      email: studentEmail,
      full_name: user.full_name,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      coins: coins,
      investments_value: investmentsValue,
      items_value: itemsValue,
      total_networth: total_networth,
      income_breakdown: income,
      expense_breakdown: losses,
      purchased_items: purchasedItems,
      equipped_items: user.equipped_items || {}
    };
  };

  const previewSelected = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: selectedEmails.size, errors: [] });

    const emails = Array.from(selectedEmails);
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const result = await calculateStudentEconomy(emails[i]);
        results.push(result);
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error for ${emails[i]}:`, error);
        results.push({ email: emails[i], error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }
    }

    setIsRecalculating(false);
    setPreviewResults(results);
    setShowPreview(true);
    toast.success(`👁️ תצוגה מקדימה מוכנה`);
  };

  const applyPreview = async () => {
    if (!previewResults || previewResults.length === 0) return;

    if (!confirm(`לעדכן עו"ש עבור ${previewResults.length} תלמידים?`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: previewResults.length, errors: [] });

    const errors = [];

    for (let i = 0; i < previewResults.length; i++) {
      try {
        const result = previewResults[i];
        if (result.error) {
          errors.push({ email: result.email, error: result.error });
          continue;
        }

        const users = await base44.entities.User.filter({ email: result.email });
        if (!users || users.length === 0) continue;

        const user = users[0];
        await base44.entities.User.update(user.id, { coins: result.coins });

        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${previewResults[i].email}:`, error);
        errors.push({ email: previewResults[i].email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);

    if (errors.length === 0) {
      toast.success(`✅ עודכן עבור ${previewResults.length} תלמידים`);
    } else {
      toast.warning(`⚠️ ${previewResults.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
    setSelectedEmails(new Set());
    setPreviewResults(null);
    setShowPreview(false);
  };







  const balanceSelectedCoins = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    // Calculate preview first
    const selectedStudents = students.filter(s => selectedEmails.has(s.student_email));
    const previewData = [];

    setIsRecalculating(true);
    setProgress({ current: 0, total: selectedStudents.length, errors: [] });

    for (let i = 0; i < selectedStudents.length; i++) {
      try {
        const studentEmail = selectedStudents[i].student_email;
        const users = await base44.entities.User.filter({ email: studentEmail });
        if (!users || users.length === 0) continue;

        const user = users[0];

        await new Promise(resolve => setTimeout(resolve, 1000));
        const wordProgress = await base44.entities.WordProgress.filter({ student_email: studentEmail });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mathProgress = await base44.entities.MathProgress.filter({ student_email: studentEmail });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const participations = await base44.entities.LessonParticipation.filter({ student_email: studentEmail });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const quizProgress = await base44.entities.QuizProgress.filter({ student_email: studentEmail });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const investments = await base44.entities.Investment.filter({ student_email: studentEmail });

        const safeNum = (val) => typeof val === 'number' ? val : 0;

        const { profileCompletionCoins, socialMissionsCoins } = computeProfileCoins(user);

        const income = {
          base: safeNum(user.base_coins ?? user.base ?? 500),
          lessonsCoins: safeNum(user.total_lessons_coins ?? (user.total_lessons * 100)),
          vocabulary: wordProgress.reduce((sum, w) => sum + safeNum(w.coins_earned), 0),
          math: mathProgress.reduce((sum, m) => sum + safeNum(m.coins_earned), 0),
          surveys: safeNum(user.survey_coins ?? user.total_survey_coins) || (participations.filter(p => p.survey_completed).length * 70),
          quizzes: quizProgress.reduce((sum, q) => sum + safeNum(q.coins_earned), 0),
          collaboration: safeNum(user.total_collaboration_coins),
          loginStreakIncome: safeNum(user.total_login_streak_coins),
          workEarnings: safeNum(user.total_work_earnings),
          passiveIncome: safeNum(user.total_passive_income),
          adminCoins: safeNum(user.total_admin_coins)
        };

        const losses = {
          inflation: safeNum(user.total_inflation_lost),
          incomeTax: safeNum(user.total_income_tax),
          dividendTax: safeNum(user.total_dividend_tax),
          capitalGainsTax: safeNum(user.total_capital_gains_tax),
          investmentFees: safeNum(user.total_investment_fees),
          itemSaleLosses: safeNum(user.total_item_sale_losses),
          creditInterest: safeNum(user.total_credit_interest)
        };
        const totalLosses = Object.values(losses).reduce((sum, val) => sum + safeNum(val), 0);

        const purchasedItems = user.purchased_items || [];
        const itemsValue = purchasedItems.reduce((sum, itemId) => {
          return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
        }, 0);

        const investmentsSpent = investments.reduce((sum, inv) => sum + safeNum(inv.invested_amount), 0);
        const investmentsValue = investments.reduce((sum, inv) => sum + safeNum(inv.current_value), 0);

        const realizedProfit = safeNum(user.total_realized_investment_profit);
        let unrealized = 0;
        if (user.investment_profit != null) {
          unrealized = safeNum(user.investment_profit);
        } else {
          unrealized = investmentsValue - investmentsSpent;
        }
        const totalInvestmentProfits = unrealized + realizedProfit;

        income.investmentProfits = totalInvestmentProfits;
        income.profileCompletion = profileCompletionCoins;
        income.socialMissions = socialMissionsCoins;
        const totalIncome = Object.values(income).reduce((sum, val) => sum + safeNum(val), 0);

        const balancedCoins = Math.round(totalIncome - totalLosses - itemsValue - investmentsValue);

        const total_networth = balancedCoins + investmentsValue + itemsValue;
        
        previewData.push({
          email: studentEmail,
          name: user.full_name,
          currentCoins: user.coins || 0,
          newCoins: balancedCoins,
          diff: balancedCoins - (user.coins || 0),
          totalIncome,
          totalLosses,
          items_value: itemsValue,
          investments_value: investmentsValue,
          total_networth: total_networth,
          profileCompletionCoins,
          socialMissionsCoins
        });

        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error for ${selectedStudents[i].student_email}:`, error);
      }
    }

    setIsRecalculating(false);

    // Show preview
    const previewText = previewData.map(p => 
      `${p.name}:\n` +
      `  עו"ש נוכחי: ${p.currentCoins.toLocaleString()}\n` +
      `  עו"ש חדש: ${p.newCoins.toLocaleString()}\n` +
      `  הפרש: ${p.diff >= 0 ? '+' : ''}${p.diff.toLocaleString()}\n` +
      `  (הכנסות: ${p.totalIncome.toLocaleString()} - הפסדים: ${p.totalLosses.toLocaleString()} - פריטים: ${p.items_value.toLocaleString()} - השקעות: ${p.investments_value.toLocaleString()})\n` +
      `  פרופיל: ${p.profileCompletionCoins} | משימות חברתיות: ${p.socialMissionsCoins}`
    ).join('\n\n');

    if (!confirm(`⚠️ לאזן עו"ש עבור ${previewData.length} תלמידים?\n\n${previewText}\n\nלהמשיך?`)) {
      return;
    }

    // Apply changes
    setIsRecalculating(true);
    setProgress({ current: 0, total: previewData.length, errors: [] });

    const errors = [];

    for (let i = 0; i < previewData.length; i++) {
      try {
        const preview = previewData[i];
        const users = await base44.entities.User.filter({ email: preview.email });
        if (!users || users.length === 0) continue;

        const user = users[0];
        await base44.entities.User.update(user.id, { coins: preview.newCoins });

        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${previewData[i].email}:`, error);
        errors.push({ email: previewData[i].email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);

    if (errors.length === 0) {
      toast.success(`✅ אוזן עו"ש עבור ${previewData.length} תלמידים`);
    } else {
      toast.warning(`⚠️ ${previewData.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
    setSelectedEmails(new Set());
  };

  const balanceAllCoins = async () => {
    if (!confirm(`⚠️ לאזן עו"ש עבור כל ${students.length} התלמידים?\n\ncoins = הכנסות - הפסדים - השקעות - פריטים`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: students.length, errors: [] });

    const errors = [];

    for (let i = 0; i < students.length; i++) {
      try {
        const studentEmail = students[i].student_email;

        // Fetch user data
        const users = await base44.entities.User.filter({ email: studentEmail });
        if (!users || users.length === 0) continue;

        const user = users[0];

        // Fetch additional data sequentially with VERY LONG delays to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 800));
        const wordProgress = await base44.entities.WordProgress.filter({ student_email: studentEmail });

        await new Promise(resolve => setTimeout(resolve, 800));
        const mathProgress = await base44.entities.MathProgress.filter({ student_email: studentEmail });

        await new Promise(resolve => setTimeout(resolve, 800));
        const participations = await base44.entities.LessonParticipation.filter({ student_email: studentEmail });

        await new Promise(resolve => setTimeout(resolve, 800));
        const quizProgress = await base44.entities.QuizProgress.filter({ student_email: studentEmail });

        await new Promise(resolve => setTimeout(resolve, 800));
        const investments = await base44.entities.Investment.filter({ student_email: studentEmail });

        const safeNum = (val) => typeof val === 'number' ? val : 0;

        const { profileCompletionCoins, socialMissionsCoins } = computeProfileCoins(user);

        // Calculate total income
        const income = {
          base: safeNum(user.base_coins ?? user.base ?? 500),
          lessonsCoins: safeNum(user.total_lessons_coins ?? (user.total_lessons * 100)),
          vocabulary: wordProgress.reduce((sum, w) => sum + safeNum(w.coins_earned), 0),
          math: mathProgress.reduce((sum, m) => sum + safeNum(m.coins_earned), 0),
          surveys: safeNum(user.survey_coins ?? user.total_survey_coins) || (participations.filter(p => p.survey_completed).length * 70),
          quizzes: quizProgress.reduce((sum, q) => sum + safeNum(q.coins_earned), 0),
          collaboration: safeNum(user.total_collaboration_coins),
          loginStreakIncome: safeNum(user.total_login_streak_coins),
          workEarnings: safeNum(user.total_work_earnings),
          passiveIncome: safeNum(user.total_passive_income),
          adminCoins: safeNum(user.total_admin_coins)
        };

        // Calculate total losses
        const losses = {
          inflation: safeNum(user.total_inflation_lost),
          incomeTax: safeNum(user.total_income_tax),
          dividendTax: safeNum(user.total_dividend_tax),
          capitalGainsTax: safeNum(user.total_capital_gains_tax),
          investmentFees: safeNum(user.total_investment_fees),
          itemSaleLosses: safeNum(user.total_item_sale_losses),
          creditInterest: safeNum(user.total_credit_interest)
        };
        const totalLosses = Object.values(losses).reduce((sum, val) => sum + safeNum(val), 0);

        const purchasedItems = user.purchased_items || [];
        const itemsValue = purchasedItems.reduce((sum, itemId) => {
          return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
        }, 0);

        // Calculate investments - SPENT not current value
        const investmentsSpent = investments.reduce((sum, inv) => sum + safeNum(inv.invested_amount), 0);
        const investmentsValue = investments.reduce((sum, inv) => sum + safeNum(inv.current_value), 0);

        // Calculate investment profits
        const realizedProfit = safeNum(user.total_realized_investment_profit);
        let unrealized = 0;
        if (user.investment_profit != null) {
          unrealized = safeNum(user.investment_profit);
        } else {
          unrealized = investmentsValue - investmentsSpent;
        }
        const totalInvestmentProfits = unrealized + realizedProfit;

        // Calculate total income
        income.investmentProfits = totalInvestmentProfits;
        income.profileCompletion = profileCompletionCoins;
        income.socialMissions = socialMissionsCoins;
        const totalIncome = Object.values(income).reduce((sum, val) => sum + safeNum(val), 0);

        // Calculate balanced coins: coins = totalIncome - totalLosses - itemsValue - investmentsValue
        const balancedCoins = Math.round(totalIncome - totalLosses - itemsValue - investmentsValue);

        // Update user
        await base44.entities.User.update(user.id, { coins: balancedCoins });

        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (error) {
        console.error(`Error for ${students[i].student_email}:`, error);
        errors.push({ email: students[i].student_email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);

    if (errors.length === 0) {
      toast.success(`✅ אוזן עו"ש עבור כל התלמידים`);
    } else {
      toast.warning(`⚠️ ${students.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
  };

  const recalculateAllNetWorth = async () => {
    if (!confirm(`🔄 לחשב מחדש total_networth עבור כל ${students.length} התלמידים?`)) {
      return;
    }

    setIsRecalculatingNetWorth(true);

    try {
      const response = await base44.functions.invoke('recalculateUserNetWorth', {});
      const result = response.data;

      if (result.success) {
        toast.success(`✅ ${result.message}`);
        await loadSnapshots(); // Refresh data
      } else {
        toast.error(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error("Error recalculating net worth:", error);
      toast.error("שגיאה בחישוב מחדש");
    } finally {
      setIsRecalculatingNetWorth(false);
    }
  };

  const recalculateSelectedNetWorth = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    if (!confirm(`🔄 לחשב מחדש total_networth עבור ${selectedEmails.size} תלמידים נבחרים?`)) {
      return;
    }

    setIsRecalculatingNetWorth(true);

    try {
      const emails = Array.from(selectedEmails);
      let successCount = 0;
      let failCount = 0;

      for (const email of emails) {
        try {
          const response = await base44.functions.invoke('recalculateUserNetWorth', { userEmail: email });
          const result = response.data;
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error for ${email}:`, error);
          failCount++;
        }
      }

      toast.success(`✅ ${successCount} הצליחו, ${failCount} נכשלו`);
      await loadSnapshots(); // Refresh data
    } catch (error) {
      console.error("Error recalculating net worth:", error);
      toast.error("שגיאה בחישוב מחדש");
    } finally {
      setIsRecalculatingNetWorth(false);
    }
  };

  const backfillLeaderboardNetWorth = async () => {
    if (!confirm(`🔄 למלא את LeaderboardEntry עבור כל התלמידים?\n\nזה יעדכן/ייצור רשומות עבור כולם`)) {
      return;
    }

    setIsBackfilling(true);
    setBackfillProgress({ current: 0, total: students.length, logs: [] });

    try {
      // Process each student manually with live progress
      let processed = 0;
      let updated = 0;
      let created = 0;
      const errors = [];
      const logs = [];

      for (const student of students) {
        try {
          const email = student.student_email;
          const response = await base44.functions.invoke('backfillLeaderboardNetWorth', { userEmails: [email] });
          const result = response.data;

          if (result.success) {
            const action = result.createdCount > 0 ? '🆕 נוצר' : '♻️ עודכן';
            const log = `${action} ${student.full_name || email}: total_networth=${result.details?.[0]?.total_networth || '?'}`;
            logs.push(log);
            if (result.createdCount > 0) created++;
            else updated++;
          } else {
            logs.push(`❌ ${student.full_name || email}: שגיאה`);
            errors.push({ email, error: result.error });
          }

          processed++;
          setBackfillProgress({ current: processed, total: students.length, logs: [...logs] });
        } catch (error) {
          console.error(`Error for ${student.student_email}:`, error);
          logs.push(`❌ ${student.full_name || student.student_email}: ${error.message}`);
          errors.push({ email: student.student_email, error: error.message });
          processed++;
          setBackfillProgress({ current: processed, total: students.length, logs: [...logs] });
        }
      }

      if (errors.length === 0) {
        toast.success(`✅ הושלם: ${updated} עודכנו, ${created} נוצרו`);
      } else {
        toast.warning(`⚠️ ${updated + created} הצליחו, ${errors.length} נכשלו`);
      }
      await loadSnapshots();
    } catch (error) {
      console.error("Error backfilling leaderboard:", error);
      toast.error("שגיאה במילוי נתונים");
    } finally {
      setIsBackfilling(false);
    }
  };

  const backfillSelectedLeaderboard = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    if (!confirm(`🔄 למלא את LeaderboardEntry עבור ${selectedEmails.size} תלמידים נבחרים?`)) {
      return;
    }

    setIsBackfilling(true);
    const selectedStudents = students.filter(s => selectedEmails.has(s.student_email));
    setBackfillProgress({ current: 0, total: selectedStudents.length, logs: [] });

    try {
      let processed = 0;
      let updated = 0;
      let created = 0;
      const errors = [];
      const logs = [];

      for (const student of selectedStudents) {
        try {
          const email = student.student_email;
          const response = await base44.functions.invoke('backfillLeaderboardNetWorth', { userEmails: [email] });
          const result = response.data;

          if (result.success && result.details && result.details.length > 0) {
            const detail = result.details[0];
            const action = result.createdCount > 0 ? '🆕 נוצר' : '♻️ עודכן';
            const log = `${action} ${student.full_name || email}: net_worth=${detail.total_networth?.toLocaleString()}, coins=${detail.coins?.toLocaleString()}, investments=${detail.investments_value?.toLocaleString()}, items=${detail.items_value?.toLocaleString()}`;
            logs.push(log);
            if (result.createdCount > 0) created++;
            else updated++;
          } else {
            logs.push(`❌ ${student.full_name || email}: שגיאה`);
            errors.push({ email, error: result.error || 'Unknown error' });
          }

          processed++;
          setBackfillProgress({ current: processed, total: selectedStudents.length, logs: [...logs] });
        } catch (error) {
          console.error(`Error for ${student.student_email}:`, error);
          logs.push(`❌ ${student.full_name || student.student_email}: ${error.message}`);
          errors.push({ email: student.student_email, error: error.message });
          processed++;
          setBackfillProgress({ current: processed, total: selectedStudents.length, logs: [...logs] });
        }
      }

      if (errors.length === 0) {
        toast.success(`✅ הושלם: ${updated} עודכנו, ${created} נוצרו`);
      } else {
        toast.warning(`⚠️ ${updated + created} הצליחו, ${errors.length} נכשלו`);
      }
      await loadSnapshots();
    } catch (error) {
      console.error("Error backfilling leaderboard:", error);
      toast.error("שגיאה במילוי נתונים");
    } finally {
      setIsBackfilling(false);
    }
  };





  const loadStudentData = async (studentEmail) => {
    if (loadingStudentData) return; // Prevent double clicks
    
    setLoadingStudentData(true);
    try {
      // Fetch sequentially to avoid rate limits
      const user = await base44.entities.User.filter({ email: studentEmail });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const wordProgress = await base44.entities.WordProgress.filter({ student_email: studentEmail });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const mathProgress = await base44.entities.MathProgress.filter({ student_email: studentEmail });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const participations = await base44.entities.LessonParticipation.filter({ student_email: studentEmail });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const quizProgress = await base44.entities.QuizProgress.filter({ student_email: studentEmail });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const investments = await base44.entities.Investment.filter({ student_email: studentEmail });

      if (user.length === 0) {
        toast.error("תלמיד לא נמצא");
        return;
      }

      const userData = user[0];
      const masteredWords = wordProgress.filter(w => w.mastered === true).length;
      const vocabularyCoins = wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0);
      const mathCoins = mathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0);
      const surveyCoins = participations.filter(p => p.survey_completed === true).length * 70;
      const quizCoins = quizProgress.reduce((sum, q) => sum + (q.coins_earned || 0), 0);
      
      // Profile completion (20 + 30 + 20 = 70 total)
      let profileCompletionCoins = 0;
      if (userData.age) profileCompletionCoins += 20;
      if (userData.bio && userData.bio.length > 10) profileCompletionCoins += 30;
      if (userData.phone_number) profileCompletionCoins += 20;
      
      // Social missions
      let socialMissionsCoins = 0;
      if (userData.completed_instagram_follow) socialMissionsCoins += 50;
      if (userData.completed_youtube_subscribe) socialMissionsCoins += 50;
      if (userData.completed_facebook_follow) socialMissionsCoins += 50;
      if (userData.completed_discord_join) socialMissionsCoins += 50;
      if (userData.completed_share) socialMissionsCoins += 100;

      const purchasedItems = userData.purchased_items || [];
      const itemsValue = purchasedItems.reduce((sum, itemId) => {
        return sum + (AVATAR_ITEM_PRICES[itemId] || 0);
      }, 0);

      // חשב ערך השקעות
      const investmentsSpent = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
      const investmentsValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
      const investmentProfit = investmentsValue - investmentsSpent;

      setDebugStudent({
        ...userData,
        mastered_words: masteredWords,
        vocabulary_coins: vocabularyCoins,
        math_coins: mathCoins,
        survey_coins: surveyCoins,
        quiz_coins: quizCoins,
        profile_completion_coins: profileCompletionCoins,
        social_missions_coins: socialMissionsCoins,
        items_value: itemsValue,
        investments_value: investmentsValue,
        investments_spent: investmentsSpent,
        investment_profit: investmentProfit
      });
      setShowDebug(true);
    } catch (error) {
      console.error("Error loading student data:", error);
      toast.error("שגיאה בטעינת נתוני התלמיד");
    } finally {
      setLoadingStudentData(false);
    }
  };

  const filteredSnapshots = students
    .filter(s => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(query) ||
        s.student_email?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => (b.total_networth || 0) - (a.total_networth || 0));

  return (
    <div className="space-y-6">
      <MaintenanceModeToggle />

      {/* Search and Actions */}
      <div className="bg-white/10 rounded-xl p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש לפי שם או אימייל..."
              className="pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button onClick={toggleSelectAll} className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-bold" disabled={filteredSnapshots.length === 0}>
            {selectedEmails.size === filteredSnapshots.length && filteredSnapshots.length > 0 ? "✓ בטל הכל" : `☐ בחר הכל (${filteredSnapshots.length})`}
          </Button>
        </div>

        {selectedEmails.size > 0 && (
          <div className="bg-emerald-500/20 border-2 border-emerald-500/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">נבחרו {selectedEmails.size} תלמידים:</span>
              <Button 
                onClick={() => setSelectedEmails(new Set())}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                נקה בחירה
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedEmails).slice(0, 10).map(email => {
                const student = students.find(s => s.student_email === email);
                return (
                  <div key={email} className="bg-white/20 rounded px-2 py-1 text-sm text-white flex items-center gap-2">
                    {student?.full_name || email}
                    <button 
                      onClick={() => toggleSelect(email)}
                      className="text-white/80 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {selectedEmails.size > 10 && (
                <div className="bg-white/20 rounded px-2 py-1 text-sm text-white">
                  +{selectedEmails.size - 10} נוספים
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4 flex-wrap">
          <Button
            onClick={previewSelected}
            disabled={isRecalculating || selectedEmails.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            👁️ תצוגה מקדימה ({selectedEmails.size})
          </Button>
          {previewResults && previewResults.length > 0 && (
            <Button
              onClick={applyPreview}
              disabled={isRecalculating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse"
            >
              ✅ עדכן עכשיו ({previewResults.length})
            </Button>
          )}
          {selectedEmails.size > 0 && (
            <Button
              onClick={balanceSelectedCoins}
              disabled={isRecalculating}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              ⚖️ אזן נבחרים ({selectedEmails.size})
            </Button>
          )}
          <Button
            onClick={balanceAllCoins}
            disabled={isRecalculating}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            ⚖️ אזן הכל ({students.length})
          </Button>
          {selectedEmails.size > 0 && (
            <Button
              onClick={recalculateSelectedNetWorth}
              disabled={isRecalculatingNetWorth}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
            >
              <Calculator className="w-4 h-4 mr-2" />
              חשב Net Worth ({selectedEmails.size})
            </Button>
          )}
          <Button
            onClick={recalculateAllNetWorth}
            disabled={isRecalculatingNetWorth}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
          >
            <Calculator className="w-4 h-4 mr-2" />
            חשב Net Worth הכל ({students.length})
          </Button>
          {selectedEmails.size > 0 && (
            <Button
              onClick={backfillSelectedLeaderboard}
              disabled={isBackfilling}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isBackfilling ? 'animate-spin' : ''}`} />
              מלא LeaderboardEntry ({selectedEmails.size})
            </Button>
          )}
          <Button
            onClick={backfillLeaderboardNetWorth}
            disabled={isBackfilling}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isBackfilling ? 'animate-spin' : ''}`} />
            מלא LeaderboardEntry הכל
          </Button>
        </div>

        {isRecalculating && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">
                מעדכן... {progress.current} / {progress.total}
              </span>
              <span className="text-white/60">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.errors.length > 0 && (
              <div className="mt-2 text-red-400 text-sm">
                {progress.errors.length} שגיאות
              </div>
            )}
          </div>
        )}

        {isBackfilling && (
          <div className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">
                ממלא LeaderboardEntry... {backfillProgress.current} / {backfillProgress.total}
              </span>
              <span className="text-white/60">
                {backfillProgress.total > 0 ? Math.round((backfillProgress.current / backfillProgress.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-3">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${backfillProgress.total > 0 ? (backfillProgress.current / backfillProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="max-h-40 overflow-y-auto bg-black/20 rounded p-2 text-xs text-white/80 font-mono space-y-1">
              {backfillProgress.logs.slice(-10).map((log, idx) => (
                <div key={idx} className="whitespace-nowrap overflow-x-auto">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/10 rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-white/80">
            {filteredSnapshots.length} תלמידים
          </div>
          {students.length > 0 && snapshots.length === 0 && !loading && (
            <div className="text-yellow-400 text-sm">
              ⚠️ {students.length} תלמידים ללא snapshots - לחץ "חשב הכל" ליצירתם
            </div>
          )}
        </div>
        {filteredSnapshots.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>טוען...</span>
              </div>
            ) : searchQuery ? (
              <div>
                <div className="text-2xl mb-2">🔍</div>
                <div>לא נמצאו תוצאות עבור "{searchQuery}"</div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📊</div>
                <div className="text-lg mb-2">אין נתונים</div>
                <div className="text-sm text-white/40">
                  יש ליצור StudentEconomySnapshot עבור התלמידים
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSnapshots.map((snapshot) => (
            <div 
              key={snapshot.student_email}
              onClick={() => toggleSelect(snapshot.student_email)}
              className={`
                relative cursor-pointer rounded-lg p-4 border-2 transition-all
                ${snapshot.isPlaceholder ? 'opacity-60' : ''}
                ${selectedEmails.has(snapshot.student_email) 
                  ? 'bg-emerald-500/30 border-emerald-400 shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10'}
              `}
            >
              <div className="absolute top-3 left-3">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  selectedEmails.has(snapshot.student_email)
                    ? 'bg-emerald-500 border-emerald-400'
                    : 'bg-white/10 border-white/40'
                }`}>
                  {selectedEmails.has(snapshot.student_email) && (
                    <span className="text-white text-sm">✓</span>
                  )}
                </div>
              </div>

              <div className="pr-8">
                <div className="text-white font-bold text-lg mb-1">
                  {snapshot.full_name}
                </div>
                <div className="text-white/60 text-xs mb-3">
                  {snapshot.student_email}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-white/60 text-xs">עו"ש</div>
                    <div className="text-white font-bold">{snapshot.coins?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">השקעות</div>
                    <div className="text-emerald-400 font-bold">{snapshot.investments_value?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">פריטים</div>
                    <div className="text-purple-400 font-bold">{snapshot.items_value?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">שווי כולל</div>
                    <div className="text-yellow-400 font-bold">{snapshot.total_networth?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">תרגילים נכונים</div>
                    <div className="text-orange-400 font-bold">{snapshot.correctMathAnswers || 0}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-white/50 text-xs">
                    {snapshot.isPlaceholder ? (
                      <span className="text-yellow-400">⚠️ לא חושב</span>
                    ) : snapshot.last_calculated_at ? (
                      new Date(snapshot.last_calculated_at).toLocaleDateString('he-IL')
                    ) : (
                      'לא עודכן'
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadStudentData(snapshot.student_email);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-white/60 hover:text-white h-6 px-2"
                      disabled={loadingStudentData}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        recalculateVocabularyCoins(snapshot.student_email);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-white/60 hover:text-white h-6 px-2"
                      disabled={loadingStudentData}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Old Table (Hidden) */}
      <div className="bg-white/10 rounded-xl overflow-hidden hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-right">
                <th className="px-4 py-3 text-white font-bold">✓</th>
                <th className="px-4 py-3 text-white font-bold">שם</th>
                <th className="px-4 py-3 text-white font-bold">אימייל</th>
                <th className="px-4 py-3 text-white font-bold">💰 עו״ש</th>
                <th className="px-4 py-3 text-white font-bold">📈 השקעות</th>
                <th className="px-4 py-3 text-white font-bold">🎨 פריטים</th>
                <th className="px-4 py-3 text-white font-bold">🏆 שווי כולל</th>
                <th className="px-4 py-3 text-white font-bold">🕐 עודכן</th>
                <th className="px-4 py-3 text-white font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snapshot) => (
                <tr key={snapshot.student_email} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedEmails.has(snapshot.student_email)}
                        onCheckedChange={() => toggleSelect(snapshot.student_email)}
                        className="border-white/40 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-bold">
                    {snapshot.full_name}
                  </td>
                  <td className="px-4 py-3 text-white/70 text-sm">
                    {snapshot.student_email}
                  </td>
                  <td className="px-4 py-3 text-white font-bold">
                    {snapshot.coins?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {snapshot.investments_value?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-purple-400">
                    {snapshot.items_value?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-yellow-400 font-bold text-lg">
                    {snapshot.total_networth?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm">
                    {snapshot.last_calculated_at 
                      ? new Date(snapshot.last_calculated_at).toLocaleString('he-IL')
                      : 'לא עודכן'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => loadStudentData(snapshot.student_email)}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              👁️ תצוגה מקדימה - {previewResults?.length} תלמידים
            </DialogTitle>
          </DialogHeader>

          {previewResults && (
            <div className="space-y-3">
              {previewResults.map((result) => (
                <div key={result.email} className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold">{result.full_name || result.email}</div>
                      <div className="text-sm text-white/60">{result.email}</div>
                    </div>
                    {result.error ? (
                      <div className="text-red-400 font-bold">❌ שגיאה</div>
                    ) : (
                      <div className={`font-bold text-lg ${result.coins >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.coins?.toLocaleString()} מטבעות
                      </div>
                    )}
                  </div>
                  {!result.error && (
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div>
                        <div className="text-white/60">השקעות</div>
                        <div className="font-bold">{result.investments_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-white/60">פריטים</div>
                        <div className="font-bold">{result.items_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-white/60">שווי כולל</div>
                        <div className="font-bold text-yellow-400">{result.total_networth?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  סגור
                </Button>
                <Button
                  onClick={applyPreview}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  ✅ עדכן עכשיו
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Data Dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">
              📊 נתוני תלמיד - {debugStudent?.full_name}
            </DialogTitle>
          </DialogHeader>

          {debugStudent && (
            <div className="space-y-6">
              {/* Income & Cash Breakdown */}
              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30 mb-6">
                <h3 className="text-yellow-200 text-lg font-bold mb-3">💰 מקורות הכנסה וכסף בעובר ושב</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">base_coins (כסף מההתחלה)</span>
                    <div className="font-bold text-yellow-300">500</div>
                  </div>
                  <div>
                    <span className="text-white/70">lessons_coins (כסף משיעורים)</span>
                    <div className="font-bold text-yellow-300">{((debugStudent.total_lessons || 0) * 100).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">vocabulary_coins (כסף מאנגלית)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.vocabulary_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">math_coins (כסף מחשבון)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.math_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">survey_coins (כסף מסקרים)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.survey_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">quiz_coins (כסף מחידונים)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.quiz_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_collaboration_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_collaboration_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_login_streak_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_login_streak_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_passive_income</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_passive_income || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_admin_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_admin_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_work_earnings (הכנסות עבודה)</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_work_earnings || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">profile_completion_coins (פרטי פרופיל)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.profile_completion_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">social_missions_coins (משימות פרופיל)</span>
                    <div className="font-bold text-yellow-300">{(debugStudent.social_missions_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">investment_profit (רווח/הפסד לא ממומש)</span>
                    <div className={`font-bold ${(debugStudent.investment_profit || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {(debugStudent.investment_profit || 0) >= 0 ? '+' : ''}{(debugStudent.investment_profit || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/70">total_realized_investment_profit (רווח/הפסד מצטבר ממומש)</span>
                    <div className={`font-bold ${(debugStudent.total_realized_investment_profit || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {(debugStudent.total_realized_investment_profit || 0) >= 0 ? '+' : ''}{(debugStudent.total_realized_investment_profit || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Summary Lines */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-4 pt-4 border-t border-yellow-500/30">
                  <div className="col-span-2 md:col-span-3">
                    <div className="text-yellow-100 font-bold mb-2">📊 סיכום לפי קטגוריות:</div>
                  </div>
                  
                  <div className="bg-yellow-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ הכנסות מלימוד</span>
                    <div className="font-bold text-yellow-200 text-lg">
                      {(
                        ((debugStudent.total_lessons || 0) * 100) +
                        (debugStudent.vocabulary_coins || 0) +
                        (debugStudent.math_coins || 0) +
                        (debugStudent.quiz_coins || 0) +
                        (debugStudent.survey_coins || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ הכנסות מפרופיל</span>
                    <div className="font-bold text-yellow-200 text-lg">
                      {(
                        (debugStudent.profile_completion_coins || 0) +
                        (debugStudent.social_missions_coins || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-green-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ הכנסות מעבודה</span>
                    <div className="font-bold text-green-200 text-lg">
                      {(debugStudent.total_work_earnings || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ הכנסות אחרות</span>
                    <div className="font-bold text-blue-200 text-lg">
                      {(
                        500 + // base_coins
                        (debugStudent.total_collaboration_coins || 0) +
                        (debugStudent.total_login_streak_coins || 0) +
                        (debugStudent.total_passive_income || 0) +
                        (debugStudent.total_admin_coins || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ רווחי השקעות</span>
                    <div className={`font-bold text-lg ${
                      ((debugStudent.investment_profit || 0) + (debugStudent.total_realized_investment_profit || 0)) >= 0 
                        ? 'text-emerald-200' 
                        : 'text-red-200'
                    }`}>
                      {((debugStudent.investment_profit || 0) + (debugStudent.total_realized_investment_profit || 0)) >= 0 ? '+' : ''}
                      {(
                        (debugStudent.investment_profit || 0) +
                        (debugStudent.total_realized_investment_profit || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-yellow-400/20 rounded p-2 border-2 border-yellow-400/50">
                    <span className="text-yellow-100 text-xs font-bold">💰 סה"כ הכנסות ברוטו</span>
                    <div className="font-bold text-yellow-100 text-xl">
                      {(
                        500 + // base
                        ((debugStudent.total_lessons || 0) * 100) +
                        (debugStudent.vocabulary_coins || 0) +
                        (debugStudent.math_coins || 0) +
                        (debugStudent.quiz_coins || 0) +
                        (debugStudent.survey_coins || 0) +
                        (debugStudent.profile_completion_coins || 0) +
                        (debugStudent.social_missions_coins || 0) +
                        (debugStudent.total_work_earnings || 0) +
                        (debugStudent.total_collaboration_coins || 0) +
                        (debugStudent.total_login_streak_coins || 0) +
                        (debugStudent.total_passive_income || 0) +
                        (debugStudent.total_admin_coins || 0) +
                        (debugStudent.investment_profit || 0) +
                        (debugStudent.total_realized_investment_profit || 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-lg p-4 border border-green-500/30">
                  <div className="text-green-200 text-xs mb-1 font-bold">total_lessons (שיעורים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.total_lessons || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-purple-200 text-xs mb-1 font-bold">mastered_words (מילים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.mastered_words || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-lg p-4 border border-orange-500/30">
                  <div className="text-orange-200 text-xs mb-1 font-bold">total_correct_math_answers (תרגילים נכונים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.total_correct_math_answers || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 rounded-lg p-4 border border-pink-500/30">
                  <div className="text-pink-200 text-xs mb-1 font-bold">age (גיל)</div>
                  <div className="text-2xl font-bold text-white">{debugStudent.age || '—'}</div>
                </div>
              </div>

              {/* Work & Login Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">total_work_hours (שעות עבודה)</div>
                  <div className="text-xl font-bold text-yellow-300">{(debugStudent.total_work_hours || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">total_work_earnings (הכנסות עבודה)</div>
                  <div className="text-xl font-bold text-emerald-300">{(debugStudent.total_work_earnings || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">login_streak (רצף כניסות)</div>
                  <div className="text-xl font-bold text-pink-300">{(debugStudent.login_streak || 0).toLocaleString()} 🔥</div>
                </div>
              </div>

              {/* Assets */}
              <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/30 mb-6">
                <h3 className="text-cyan-200 text-lg font-bold mb-3">🏦 נכסים</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-yellow-200 text-xs mb-1 font-bold">coins (עו״ש בעובר ושב)</div>
                    <div className={`text-2xl font-bold ${(debugStudent.coins || 0) >= 0 ? 'text-yellow-300' : 'text-red-300'}`}>
                      {(debugStudent.coins || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-lg p-4 border border-emerald-500/30">
                    <div className="text-emerald-200 text-xs mb-1 font-bold">investments_value (השקעות נוכחי)</div>
                    <div className="text-2xl font-bold text-white">{(debugStudent.investments_value || 0).toLocaleString()}</div>
                    <div className="text-white/60 text-xs mt-2">
                      השקעה: {(debugStudent.investments_spent || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                    <div className="text-purple-200 text-xs mb-1 font-bold">items_value (ערך פריטים מהחנות)</div>
                    <div className="text-2xl font-bold text-white">{(debugStudent.items_value || 0).toLocaleString()}</div>
                    <div className="text-white/60 text-xs mt-2">מספר פריטים: {((debugStudent.purchased_items || []).length)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-lg p-4 border border-yellow-500/30">
                    <div className="text-yellow-200 text-xs mb-1 font-bold">total_networth (שווי כולל)</div>
                    <div className="text-2xl font-bold text-white">{(debugStudent.total_networth || ((debugStudent.coins || 0) + (debugStudent.investments_value || 0) + (debugStudent.items_value || 0))).toLocaleString()}</div>
                    <div className="text-white/50 text-[10px] mt-1">
                      {debugStudent.coins || 0} + {debugStudent.investments_value || 0} + {debugStudent.items_value || 0} = {((debugStudent.coins || 0) + (debugStudent.investments_value || 0) + (debugStudent.items_value || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxes & Losses */}
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                <h3 className="text-red-200 text-lg font-bold mb-3">💸 מיסים והוצאות</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">total_inflation_lost</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_inflation_lost || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_income_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_income_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_capital_gains_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_capital_gains_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_dividend_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_dividend_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_credit_interest</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_credit_interest || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_investment_fees</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_investment_fees || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_item_sale_losses</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_item_sale_losses || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Summary Lines */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-4 pt-4 border-t border-red-500/30">
                  <div className="col-span-2 md:col-span-3">
                    <div className="text-red-100 font-bold mb-2">📊 סיכום לפי קטגוריות:</div>
                  </div>

                  <div className="bg-red-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ מיסים</span>
                    <div className="font-bold text-red-200 text-lg">
                      {(
                        (debugStudent.total_income_tax || 0) +
                        (debugStudent.total_capital_gains_tax || 0) +
                        (debugStudent.total_dividend_tax || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-red-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ אינפלציה</span>
                    <div className="font-bold text-red-200 text-lg">
                      {(debugStudent.total_inflation_lost || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-red-500/10 rounded p-2">
                    <span className="text-white/70 text-xs">סה"כ עמלות והפסדים</span>
                    <div className="font-bold text-red-200 text-lg">
                      {(
                        (debugStudent.total_investment_fees || 0) +
                        (debugStudent.total_item_sale_losses || 0) +
                        (debugStudent.total_credit_interest || 0)
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-red-400/20 rounded p-2 border-2 border-red-400/50 col-span-2 md:col-span-3">
                    <span className="text-red-100 text-xs font-bold">💸 סה"כ הוצאות</span>
                    <div className="font-bold text-red-100 text-xl">
                      {(
                        (debugStudent.total_inflation_lost || 0) +
                        (debugStudent.total_income_tax || 0) +
                        (debugStudent.total_capital_gains_tax || 0) +
                        (debugStudent.total_dividend_tax || 0) +
                        (debugStudent.total_credit_interest || 0) +
                        (debugStudent.total_investment_fees || 0) +
                        (debugStudent.total_item_sale_losses || 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <h3 className="text-blue-200 text-lg font-bold mb-3">📈 סטטיסטיקות עסקה</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">age (גיל)</span>
                    <div className="font-bold text-blue-300">{debugStudent.age || '—'}</div>
                  </div>
                  <div>
                    <span className="text-white/70">last_login_date (תאריך כניסה אחרון)</span>
                    <div className="font-bold text-blue-300">{debugStudent.last_login_date ? new Date(debugStudent.last_login_date).toLocaleDateString('he-IL') : '—'}</div>
                  </div>
                  <div>
                    <span className="text-white/70">email</span>
                    <div className="font-bold text-blue-300 text-xs break-all">{debugStudent.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}