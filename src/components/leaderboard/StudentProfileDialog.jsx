import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, MessageSquare, TrendingUp, TrendingDown, Coins, FileText, Package } from "lucide-react";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";
import { base44 } from "@/api/base44Client";
import { AVATAR_ITEMS } from "../avatar/TamagotchiAvatar";
import { toast } from "sonner";

const BUSINESSES = {
  "government_bonds": { name: "🏛️ אג\"ח ממשלתיות", color: "from-blue-700 to-blue-900" },
  "real_estate": { name: "🏢 נדל\"ן מסחרי", color: "from-green-600 to-emerald-600" },
  "gold": { name: "💛 זהב", color: "from-yellow-500 to-yellow-700" },
  "stock_market": { name: "📈 מניות בורסה", color: "from-indigo-500 to-blue-500" },
  "tech_startup": { name: "🚀 סטארטאפ", color: "from-blue-500 to-cyan-500" },
  "crypto": { name: "₿ קריפטו", color: "from-purple-500 to-pink-500" }
};

export default function StudentProfileDialog({ isOpen, onClose, student }) {
  const [investments, setInvestments] = useState([]);
  const [isLoadingInvestments, setIsLoadingInvestments] = useState(true);
  const [financeReport, setFinanceReport] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isOpen && student && (student.email || student.student_email)) {
      setHasError(false);
      setIsLoadingInvestments(true);
      loadData().catch((error) => {
        console.error("Error in loadData:", error);
        setHasError(true);
        setIsLoadingInvestments(false);
      });
    }
  }, [isOpen, student]);

  const loadData = async () => {
    if (!student || (!student.email && !student.student_email)) {
      console.error("Student data is missing or invalid:", student);
      setIsLoadingInvestments(false);
      setHasError(true);
      return;
    }

    const studentEmail = student.email || student.student_email;
    
    // Check if current user is admin
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');
    } catch (error) {
      console.error("Error loading current user:", error);
      setIsAdmin(false);
    }
    
    try {
      // Fetch all investments and filter for student
      let allInvestments = [];
      try {
        allInvestments = await base44.entities.Investment.list();
      } catch (e) {
        console.log("Could not load all investments, trying filter");
        allInvestments = await base44.entities.Investment.filter({ student_email: studentEmail });
      }
      
      const studentInvestments = allInvestments.filter(inv => inv.student_email === studentEmail);

      const [
        participations,
        wordProgress,
        mathProgress,
        quizProgress
      ] = await Promise.all([
        base44.entities.LessonParticipation.filter({ student_email: studentEmail }),
        base44.entities.WordProgress.filter({ student_email: studentEmail }),
        base44.entities.MathProgress.filter({ student_email: studentEmail }),
        base44.entities.QuizProgress.filter({ student_email: studentEmail })
      ]);

      setInvestments(studentInvestments);

      // Calculate investment data
      const totalInvested = studentInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0);
      const totalInvestmentValue = studentInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
      const unrealizedProfit = totalInvestmentValue - totalInvested;
      const realizedProfit = student.total_realized_investment_profit || 0;
      const totalInvestmentProfit = unrealizedProfit + realizedProfit;

      // Calculate finance report
      const income = {
        base: 500,
        lessons: (student.total_lessons || 0) * 100,
        vocabulary: wordProgress.reduce((sum, w) => sum + (w.coins_earned || 0), 0),
        math: mathProgress.reduce((sum, m) => sum + (m.coins_earned || 0), 0),
        surveys: participations.filter(p => p.survey_completed).length * 20,
        quizzes: quizProgress.reduce((sum, q) => sum + (q.coins_earned || 0), 0),
        work: 0,
        profileTasks: 0,
        profileDetails: 0,
        investmentProfits: totalInvestmentProfit
      };

      // Try to get full user data for profile tasks/details (only if admin)
      let fullUserData = student;
      if (isAdmin) {
        try {
          const allUsers = await base44.entities.User.list();
          const foundUser = allUsers.find(u => u.email === studentEmail);
          if (foundUser) {
            fullUserData = foundUser;
          }
        } catch (e) {
          console.log("Cannot access User.list, using student data from leaderboard");
        }

        // Profile tasks (only visible to admin)
        if (fullUserData.completed_instagram_follow) income.profileTasks += 50;
        if (fullUserData.completed_youtube_subscribe) income.profileTasks += 50;
        if (fullUserData.completed_facebook_follow) income.profileTasks += 50;
        if (fullUserData.completed_discord_join) income.profileTasks += 50;
        if (fullUserData.completed_share) income.profileTasks += 100;

        // Profile details (only visible to admin)
        if (fullUserData.age) income.profileDetails += 20;
        if (fullUserData.bio && fullUserData.bio.length > 10) income.profileDetails += 30;
        if (fullUserData.phone_number) income.profileDetails += 20;

        // Collaboration coins (only visible to admin)
        const collaborationCoins = fullUserData.total_collaboration_coins || student.total_collaboration_coins || 0;
        income.collaboration = collaborationCoins;

        // Login streak coins (only visible to admin)
        const loginStreakCoins = fullUserData.total_login_streak_coins || student.total_login_streak_coins || 0;
        income.loginStreak = loginStreakCoins;

        // Work earnings (only visible to admin)
        income.work = fullUserData.total_work_earnings || 0;
      }

      // Assets
      const purchasedItems = fullUserData.purchased_items || student.purchased_items || [];
      let calculatedItemsValue = 0;
      purchasedItems.forEach(itemId => {
        const item = AVATAR_ITEMS[itemId];
        if (item && item.price) {
          calculatedItemsValue += item.price;
        }
      });

      const assets = {
        cash: fullUserData.coins || student.coins || 0,
        items: calculatedItemsValue,
        investments: totalInvestmentValue
      };

      // Losses - Show TOTAL accumulated losses (only to admin)
      const losses = isAdmin ? {
        inflation: fullUserData.total_inflation_lost || student.total_inflation_lost || 0,
        incomeTax: fullUserData.total_income_tax || student.total_income_tax || 0,
        dividendTax: fullUserData.total_dividend_tax || student.total_dividend_tax || 0,
        capitalGainsTax: fullUserData.total_capital_gains_tax || student.total_capital_gains_tax || 0,
        creditInterest: fullUserData.total_credit_interest || student.total_credit_interest || 0,
        investmentFees: fullUserData.total_investment_fees || student.total_investment_fees || 0,
        itemSaleLosses: fullUserData.total_item_sale_losses || student.total_item_sale_losses || 0
      } : {
        inflation: 0,
        incomeTax: 0,
        dividendTax: 0,
        capitalGainsTax: 0,
        creditInterest: 0,
        investmentFees: 0,
        itemSaleLosses: 0
      };

      const totalIncome = Object.values(income).reduce((sum, val) => sum + val, 0);
      const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
      const totalLosses = Object.values(losses).reduce((sum, val) => sum + val, 0);

      // Verification: Income should equal Assets + Losses
      const expectedIncome = totalAssets + totalLosses;
      const incomeMatch = Math.abs(totalIncome - expectedIncome) < 1;

      setFinanceReport({
        income,
        assets,
        losses,
        totalIncome,
        totalAssets,
        totalLosses,
        netWorth: totalAssets,
        expectedIncome,
        incomeMatch
      });

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת נתוני התלמיד");
      setHasError(true);
    }
    setIsLoadingInvestments(false);
  };

  // Group investments by business type
  const investmentsByBusiness = investments.reduce((acc, inv) => {
    if (!acc[inv.business_type]) {
      acc[inv.business_type] = [];
    }
    acc[inv.business_type].push(inv);
    return acc;
  }, {});

  const totalInvested = investments.reduce((sum, inv) => sum + inv.invested_amount, 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalProfit = totalValue - totalInvested;
  const hasInvestments = investments.length > 0;

  if (!student || (!student.email && !student.student_email)) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-purple-500/95 to-pink-500/95 backdrop-blur-xl border-2 border-white/30 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white text-center">
            פרופיל התלמיד
          </DialogTitle>
        </DialogHeader>

        {hasError ? (
          <div className="text-center py-12">
            <p className="text-white text-lg mb-4">⚠️ שגיאה בטעינת הנתונים</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoadingInvestments(true);
                loadData();
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg"
            >
              נסה שוב
            </button>
          </div>
        ) : isLoadingInvestments ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p className="text-white text-lg">טוען נתונים...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <TamagotchiAvatar 
                  equippedItems={student.equipped_items || {}} 
                  size="large"
                  showBackground={true}
                  userEmail={student.email || student.student_email}
                />
              </div>
            </div>

          {/* Name */}
          <Card className="bg-white/20 backdrop-blur-md border-white/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-sm">שם מלא</p>
                  <p className="text-white font-bold text-lg">{student.full_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Age */}
          {(student.age || student.user_age) && (
            <Card className="bg-white/20 backdrop-blur-md border-white/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/70 text-sm">גיל</p>
                    <p className="text-white font-bold text-lg">{student.age || student.user_age}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Bio */}
          {(student.bio || student.user_bio) && (
            <Card className="bg-white/20 backdrop-blur-md border-white/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/70 text-sm mb-2">קצת עליי</p>
                    <p className="text-white text-sm leading-relaxed">{student.bio || student.user_bio}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Report */}
          {financeReport && (
            <Card className="bg-white/20 backdrop-blur-md border-white/30">
              <CardContent className="p-4">
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  דו״ח פיננסי
                </h3>

                {/* Net Worth */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-3 mb-3">
                  <p className="text-white/80 text-sm text-center">💎 שווי כולל</p>
                  <p className="text-white font-black text-3xl text-center">
                    {Math.round(financeReport.netWorth)}
                  </p>
                </div>

                {/* Income */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-green-300 font-bold flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      הכנסות
                    </p>
                    <p className="text-green-300 font-bold">{Math.round(financeReport.totalIncome)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-white/70">🎯 התחלה:</span><span className="text-white font-bold">{Math.round(financeReport.income.base)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">📚 שיעורים:</span><span className="text-white font-bold">{Math.round(financeReport.income.lessons)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">🔤 אנגלית:</span><span className="text-white font-bold">{Math.round(financeReport.income.vocabulary)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">🔢 חשבון:</span><span className="text-white font-bold">{Math.round(financeReport.income.math)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">📝 סקרים:</span><span className="text-white font-bold">{Math.round(financeReport.income.surveys)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">❓ חידונים:</span><span className="text-white font-bold">{Math.round(financeReport.income.quizzes)}</span></div>
                    {isAdmin && <div className="flex justify-between"><span className="text-white/70">💼 עבודות:</span><span className="text-white font-bold">{Math.round(financeReport.income.work)}</span></div>}
                    {isAdmin && <div className="flex justify-between"><span className="text-white/70">✅ משימות:</span><span className="text-white font-bold">{Math.round(financeReport.income.profileTasks)}</span></div>}
                    {isAdmin && <div className="flex justify-between"><span className="text-white/70">👤 פרטי פרופיל:</span><span className="text-white font-bold">{Math.round(financeReport.income.profileDetails)}</span></div>}
                    {isAdmin && <div className="flex justify-between"><span className="text-white/70">🤝 שיתופי פעולה:</span><span className="text-white font-bold">{Math.round(financeReport.income.collaboration)}</span></div>}
                    {isAdmin && <div className="flex justify-between"><span className="text-white/70">🔥 רצף כניסות:</span><span className="text-white font-bold">{Math.round(financeReport.income.loginStreak)}</span></div>}
                    <div className="flex justify-between"><span className="text-white/70">📈 רווחי השקעות:</span><span className="text-white font-bold">{Math.round(financeReport.income.investmentProfits)}</span></div>
                  </div>
                </div>

                {/* Assets */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-blue-300 font-bold flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      נכסים
                    </p>
                    <p className="text-blue-300 font-bold">{Math.round(financeReport.totalAssets)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-white/70">💰 עובר ושב:</span><span className="text-white font-bold">{Math.round(financeReport.assets.cash)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">🛍️ פריטים:</span><span className="text-white font-bold">{Math.round(financeReport.assets.items)}</span></div>
                    <div className="flex justify-between"><span className="text-white/70">📊 השקעות:</span><span className="text-white font-bold">{Math.round(financeReport.assets.investments)}</span></div>
                  </div>
                </div>

                {/* Total Losses - Only visible to admin */}
                {isAdmin && financeReport.totalLosses > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-red-300 font-bold flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        סה״כ הפסדים
                      </p>
                      <p className="text-red-300 font-bold">{Math.round(financeReport.totalLosses)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 space-y-1 text-xs">
                      {financeReport.losses.inflation > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">📉 אינפלציה:</span><span className="text-white font-bold">{Math.round(financeReport.losses.inflation)}</span></div>
                      )}
                      {financeReport.losses.incomeTax > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">🏛️ מס הכנסה:</span><span className="text-white font-bold">{Math.round(financeReport.losses.incomeTax)}</span></div>
                      )}
                      {financeReport.losses.dividendTax > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">💎 מס דיבידנד:</span><span className="text-white font-bold">{Math.round(financeReport.losses.dividendTax)}</span></div>
                      )}
                      {financeReport.losses.capitalGainsTax > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">📈 מס רווחי הון:</span><span className="text-white font-bold">{Math.round(financeReport.losses.capitalGainsTax)}</span></div>
                      )}
                      {financeReport.losses.creditInterest > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">💳 ריבית אשראי:</span><span className="text-white font-bold">{Math.round(financeReport.losses.creditInterest)}</span></div>
                      )}
                      {financeReport.losses.investmentFees > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">💸 עמלות:</span><span className="text-white font-bold">{Math.round(financeReport.losses.investmentFees)}</span></div>
                      )}
                      {financeReport.losses.itemSaleLosses > 0 && (
                        <div className="flex justify-between"><span className="text-white/70">🛍️ מכירת פריטים:</span><span className="text-white font-bold">{Math.round(financeReport.losses.itemSaleLosses)}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Display */}
                {financeReport.expectedIncome !== undefined && (
                  <div className={`mt-3 p-3 rounded-lg border-2 ${
                    financeReport.incomeMatch 
                      ? 'bg-green-500/20 border-green-500/40' 
                      : 'bg-red-500/20 border-red-500/40'
                  }`}>
                    <p className="text-xs text-white/90 text-center font-bold mb-1">
                      {financeReport.incomeMatch ? '✅ חישוב מדויק!' : '⚠️ אי התאמה'}
                    </p>
                    <p className="text-[10px] text-white/70 text-center">
                      הכנסות = נכסים + הפסדים<br/>
                      {Math.round(financeReport.totalIncome)} {financeReport.incomeMatch ? '=' : '≈'} {Math.round(financeReport.totalAssets)} + {Math.round(financeReport.totalLosses)} = {Math.round(financeReport.expectedIncome)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Investment Portfolio */}
          <Card className="bg-white/20 backdrop-blur-md border-white/30">
            <CardContent className="p-4">
              <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                💼 תיק השקעות
              </h3>
              
              {isLoadingInvestments ? (
                <div className="text-center py-4">
                  <div className="text-white/70">טוען...</div>
                </div>
              ) : hasInvestments ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <p className="text-white/70 text-[10px]">הושקע</p>
                      <p className="text-white font-bold text-sm">{Math.round(totalInvested)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <p className="text-white/70 text-[10px]">שווי</p>
                      <p className="text-white font-bold text-sm">{Math.round(totalValue)}</p>
                    </div>
                    <div className={`bg-white/10 rounded-lg p-2 text-center ${totalProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <p className="text-white/70 text-[10px]">רווח</p>
                      <p className={`font-bold text-sm ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {totalProfit >= 0 ? '+' : ''}{Math.round(totalProfit)}
                      </p>
                    </div>
                  </div>

                  {/* Investments by Business */}
                  <div className="space-y-2">
                    {Object.keys(investmentsByBusiness).map((businessType) => {
                      const businessInvestments = investmentsByBusiness[businessType];
                      const totalInvestedInBusiness = businessInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0);
                      const totalValueInBusiness = businessInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
                      const profitInBusiness = totalValueInBusiness - totalInvestedInBusiness;
                      const business = BUSINESSES[businessType];

                      return (
                        <div key={businessType} className={`bg-gradient-to-r ${business.color} rounded-lg p-3`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-bold text-sm">{business.name}</p>
                            <div className="flex items-center gap-1">
                              {profitInBusiness >= 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-200" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-200" />
                              )}
                              <p className={`text-xs font-bold ${profitInBusiness >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                {profitInBusiness >= 0 ? '+' : ''}{Math.round(profitInBusiness)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-white/80">
                            <span>{businessInvestments.length} השקעות</span>
                            <span>{Math.round(totalValueInBusiness)} 🪙</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/70 text-sm">אין השקעות עדיין</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="bg-white/20 backdrop-blur-md border-white/30">
            <CardContent className="p-4">
              <p className="text-white/70 text-sm mb-3 text-center">סטטיסטיקות</p>
              <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-yellow-300">{Math.round(student.total_lessons || 0)}</p>
                <p className="text-white/70 text-xs">שיעורים</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-green-300">{Math.round(student.coins || 0)}</p>
                <p className="text-white/70 text-xs">מטבעות</p>
              </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}