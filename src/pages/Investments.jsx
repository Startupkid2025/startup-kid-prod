import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Coins, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const BUSINESSES = [
  {
    id: "government_bonds",
    name: "🏛️ אגרות חוב ממשלתיות",
    icon: "🏛️",
    description: "השקעה הכי בטוחה - תשואה נמוכה אך יציבה",
    minInvestment: 200,
    volatility: "ultra_safe",
    riskLevel: 0,
    color: "from-blue-700 to-blue-900"
  },
  {
    id: "real_estate",
    name: "🏢 נדל\"ן מסחרי",
    icon: "🏢",
    description: "נכסים עם רווח איטי אך בטוח",
    minInvestment: 150,
    volatility: "very_low",
    riskLevel: 1,
    color: "from-green-600 to-emerald-600"
  },
  {
    id: "gold",
    name: "💛 זהב",
    icon: "💛",
    description: "מתכת יקרה - מגן מפני אינפלציה",
    minInvestment: 150,
    volatility: "low",
    riskLevel: 1,
    color: "from-yellow-500 to-yellow-700"
  },
  {
    id: "stock_market",
    name: "📈 מניות בורסה",
    icon: "📈",
    description: "מניות חברות גדולות - האיזון הטוב ביותר!",
    minInvestment: 100,
    volatility: "optimal_medium",
    riskLevel: 2,
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "tech_startup",
    name: "🚀 סטארטאפ טכנולוגי",
    icon: "🚀",
    description: "חברת טכנולוגיה צעירה - סיכון גבוה מאוד!",
    minInvestment: 100,
    volatility: "high",
    riskLevel: 4,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "crypto",
    name: "₿ קריפטו",
    icon: "₿",
    description: "מטבעות דיגיטליים - יכול להפסיד הכל!",
    minInvestment: 50,
    volatility: "extreme",
    riskLevel: 5,
    color: "from-purple-500 to-pink-500"
  }
];

const TRANSACTION_FEE = 2;

export default function Investments() {
  const [userData, setUserData] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [investmentAmounts, setInvestmentAmounts] = useState({});
  const [sellAmounts, setSellAmounts] = useState({});
  const [confirmSellDialog, setConfirmSellDialog] = useState({ isOpen: false, businessId: null, amount: 0, tax: 0, netAmount: 0 });
  const [todayPerformance, setTodayPerformance] = useState({});
  const [yesterdayPerformance, setYesterdayPerformance] = useState({});
  const [isInvesting, setIsInvesting] = useState({});
  const [isSelling, setIsSelling] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const calculateDailyChange = (volatility) => {
    const ranges = {
      ultra_safe: { min: 0.8, max: 1.2 },
      very_low: { min: -1.8, max: 2.0 },
      low: { min: -3, max: 5 },
      optimal_medium: { min: -4, max: 10 },
      high: { min: -12, max: 15 },
      extreme: { min: -15, max: 20 }
    };

    const range = ranges[volatility];
    if (!range) {
      console.warn(`Volatility range not found for: ${volatility}. Defaulting to 0.`);
      return 0;
    }
    return Math.random() * (range.max - range.min) + range.min;
  };

  const getOrCreateTodayMarket = async () => {
    const today = getTodayDate();
    
    try {
      const existingMarket = await base44.entities.DailyMarketPerformance.filter({ date: today });
      
      if (existingMarket.length > 0) {
        const market = existingMarket[0];
        return {
          government_bonds: market.government_bonds_change,
          real_estate: market.real_estate_change,
          gold: market.gold_change,
          stock_market: market.stock_market_change,
          tech_startup: market.tech_startup_change,
          crypto: market.crypto_change
        };
      } else {
        const newMarket = {};
        BUSINESSES.forEach(business => {
          newMarket[business.id] = calculateDailyChange(business.volatility);
        });

        await base44.entities.DailyMarketPerformance.create({
          date: today,
          government_bonds_change: newMarket.government_bonds,
          real_estate_change: newMarket.real_estate,
          gold_change: newMarket.gold,
          stock_market_change: newMarket.stock_market,
          tech_startup_change: newMarket.tech_startup,
          crypto_change: newMarket.crypto
        });

        return newMarket;
      }
    } catch (error) {
      console.error("Error in getOrCreateTodayMarket:", error);
      // Return default values if there's an error
      const defaultMarket = {};
      BUSINESSES.forEach(business => {
        defaultMarket[business.id] = 0;
      });
      return defaultMarket;
    }
  };

  const getOrCreateYesterdayMarket = async () => {
    const yesterday = getYesterdayDate();
    
    try {
      const yesterdayMarket = await base44.entities.DailyMarketPerformance.filter({ date: yesterday });
      
      if (yesterdayMarket.length > 0) {
        const market = yesterdayMarket[0];
        return {
          government_bonds: market.government_bonds_change,
          real_estate: market.real_estate_change,
          gold: market.gold_change,
          stock_market: market.stock_market_change,
          tech_startup: market.tech_startup_change,
          crypto: market.crypto_change
        };
      } else {
        const newMarket = {};
        BUSINESSES.forEach(business => {
          newMarket[business.id] = calculateDailyChange(business.volatility);
        });

        await base44.entities.DailyMarketPerformance.create({
          date: yesterday,
          government_bonds_change: newMarket.government_bonds,
          real_estate_change: newMarket.real_estate,
          gold_change: newMarket.gold,
          stock_market_change: newMarket.stock_market,
          tech_startup_change: newMarket.tech_startup,
          crypto_change: newMarket.crypto
        });

        return newMarket;
      }
    } catch (error) {
      console.error("Error in getOrCreateYesterdayMarket:", error);
      const defaultMarket = {};
      BUSINESSES.forEach(business => {
        defaultMarket[business.id] = 0;
      });
      return defaultMarket;
    }
  };

  const loadData = async () => {
    if (isLoading === false) {
      // Prevent multiple simultaneous loads
      return;
    }
    
    try {
      // Load user data
      const user = await base44.auth.me();
      setUserData(user);

      // Load market data in parallel
      const [todayMarket, yesterdayMarket] = await Promise.all([
        getOrCreateTodayMarket(),
        getOrCreateYesterdayMarket()
      ]);
      
      setTodayPerformance(todayMarket);
      setYesterdayPerformance(yesterdayMarket);

      // Load investments
      const myInvestments = await base44.entities.Investment.filter({ student_email: user.email });
      
      // Check if any investments need updating
      const today = getTodayDate();
      const investmentsNeedingUpdate = myInvestments.filter(investment => {
        const lastUpdate = investment.last_updated.split('T')[0];
        return lastUpdate !== today;
      });

      // Update investments in batches to avoid rate limiting
      if (investmentsNeedingUpdate.length > 0) {
        // Update in smaller batches with delays
        for (let i = 0; i < investmentsNeedingUpdate.length; i++) {
          const investment = investmentsNeedingUpdate[i];
          const changePercent = todayMarket[investment.business_type] || 0;
          
          try {
            const newValue = Math.round(investment.current_value * (1 + changePercent / 100));
            await base44.entities.Investment.update(investment.id, {
              current_value: newValue,
              daily_change_percent: Math.round(changePercent * 10) / 10,
              last_updated: new Date().toISOString()
            });
            
            // Add small delay between updates to avoid rate limiting
            if (i < investmentsNeedingUpdate.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(`Error updating investment ${investment.id}:`, error);
          }
        }

        // Reload investments after updates
        const updatedInvestments = await base44.entities.Investment.filter({ student_email: user.email });
        setInvestments(updatedInvestments);
      } else {
        setInvestments(myInvestments);
      }
    } catch (error) {
      console.error("Error loading investments:", error);
      toast.error("שגיאה בטעינת נתונים. אנא נסה שוב מאוחר יותר.");
    }
    setIsLoading(false);
  };

  const handleInvest = async (businessId) => {
    // Prevent multiple clicks
    if (isInvesting[businessId]) {
      return;
    }

    const business = BUSINESSES.find(b => b.id === businessId);
    const amount = investmentAmounts[businessId] || 0;

    if (amount < business.minInvestment) {
      toast.error(`השקעה מינימלית: ${business.minInvestment} מטבעות`);
      return;
    }

    const totalCost = amount + TRANSACTION_FEE;

    if (totalCost > userData.coins) {
      toast.error(`אין לך מספיק מטבעות! (${amount} + עמלה ${TRANSACTION_FEE} = ${totalCost})`);
      return;
    }

    setIsInvesting({ ...isInvesting, [businessId]: true });

    try {
      await base44.entities.Investment.create({
        student_email: userData.email,
        business_type: businessId,
        invested_amount: amount,
        current_value: amount,
        daily_change_percent: 0,
        last_updated: new Date().toISOString()
      });

      const newCoinsBalance = userData.coins - totalCost;
      await base44.auth.updateMe({
        coins: newCoinsBalance,
        total_investment_fees: (userData.total_investment_fees || 0) + TRANSACTION_FEE
      });

      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
        if (leaderboardEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            coins: newCoinsBalance
          });
        }
      } catch (error) {
        console.error("Error updating leaderboard:", error);
      }

      toast.success(`השקעת ${amount} מטבעות ב${business.name}! (עמלה: ${TRANSACTION_FEE}) 🎉`);
      setInvestmentAmounts({ ...investmentAmounts, [businessId]: 0 });
      
      // Update local state instead of full reload
      const newInvestment = {
        student_email: userData.email,
        business_type: businessId,
        invested_amount: amount,
        current_value: amount,
        daily_change_percent: 0,
        last_updated: new Date().toISOString()
      };
      setInvestments([...investments, newInvestment]);
      setUserData({ ...userData, coins: newCoinsBalance });
    } catch (error) {
      console.error("Error investing:", error);
      toast.error("שגיאה בהשקעה");
    } finally {
      setIsInvesting({ ...isInvesting, [businessId]: false });
    }
  };

  const openConfirmDialog = (businessId, sellAmount) => {
    const businessInvestments = investmentsByBusiness[businessId] || [];
    if (businessInvestments.length === 0) return;

    const totalValue = businessInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
    const totalInvested = businessInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0);
    
    if (sellAmount > totalValue) {
      toast.error("אין לך מספיק להשקעות למכירה");
      return;
    }

    const amountAfterFee = sellAmount - TRANSACTION_FEE;
    
    if (amountAfterFee <= 0) {
      toast.error("הסכום קטן מדי למכירה (אחרי עמלה)");
      return;
    }

    // Calculate approximate profit and tax
    const percentToSell = sellAmount / totalValue;
    const investedPortion = totalInvested * percentToSell;
    const grossProfit = amountAfterFee - investedPortion;
    const tax = grossProfit > 0 ? Math.round(grossProfit * 0.25) : 0;
    const netAmount = amountAfterFee - tax;

    setConfirmSellDialog({
      isOpen: true,
      businessId,
      amount: sellAmount,
      tax,
      netAmount
    });
  };

  const handleSell = async (businessId, sellAmount) => {
    // Prevent multiple clicks
    if (isSelling[businessId]) {
      return;
    }

    const businessInvestments = investmentsByBusiness[businessId] || [];
    if (businessInvestments.length === 0) return;

    const totalValue = businessInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
    const totalInvested = businessInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0);
    
    if (sellAmount > totalValue) {
      toast.error("אין לך מספיק להשקעות למכירה");
      return;
    }

    const amountAfterFee = sellAmount - TRANSACTION_FEE;
    
    if (amountAfterFee <= 0) {
      toast.error("הסכום קטן מדי למכירה (אחרי עמלה)");
      return;
    }

    setIsSelling({ ...isSelling, [businessId]: true });

    try {
      let remainingToSell = sellAmount;
      let totalInvestedSold = 0;
      const investmentsToDelete = [];

      // Sort investments by current_value ascending to sell smallest first
      const sortedInvestments = [...businessInvestments].sort((a, b) => a.current_value - b.current_value);

      for (const investment of sortedInvestments) {
        if (remainingToSell <= 0) break;

        if (investment.current_value <= remainingToSell) {
          // Delete entire investment
          investmentsToDelete.push(investment.id);
          totalInvestedSold += investment.invested_amount;
          remainingToSell -= investment.current_value;
        } else {
          // Partial sell - reduce investment proportionally
          const percentToSell = remainingToSell / investment.current_value;
          const investedToDeduct = Math.round(investment.invested_amount * percentToSell);
          totalInvestedSold += investedToDeduct;

          await base44.entities.Investment.update(investment.id, {
            current_value: Math.round(investment.current_value - remainingToSell),
            invested_amount: Math.round(investment.invested_amount - investedToDeduct)
          });
          remainingToSell = 0;
        }
      }

      // Delete marked investments
      for (const id of investmentsToDelete) {
        await base44.entities.Investment.delete(id);
      }

      const grossProfit = amountAfterFee - totalInvestedSold;
      const capitalGainsTax = grossProfit > 0 ? Math.round(grossProfit * 0.25) : 0;
      const netProfit = grossProfit - capitalGainsTax;
      const newCoins = userData.coins + amountAfterFee - capitalGainsTax;

      await base44.auth.updateMe({ 
        coins: newCoins,
        total_investment_fees: (userData.total_investment_fees || 0) + TRANSACTION_FEE,
        total_capital_gains_tax: (userData.total_capital_gains_tax || 0) + capitalGainsTax
      });

      try {
        const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
        if (leaderboardEntries.length > 0) {
          await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
            coins: newCoins,
            purchased_items: userData.purchased_items || [],
            equipped_items: userData.equipped_items || {}
          });
        }
      } catch (error) {
        console.error("Error updating leaderboard:", error);
      }

      if (grossProfit > 0) {
        toast.success(`מכרת! רווח נטו: ${Math.round(netProfit)} מטבעות (עמלה: ${TRANSACTION_FEE}, מס: ${capitalGainsTax}) 💰`);
      } else {
        toast.error(`מכרת בהפסד של ${Math.round(Math.abs(grossProfit))} מטבעות (כולל עמלה ${TRANSACTION_FEE}) 😢`);
      }

      setSellAmounts({ ...sellAmounts, [businessId]: 0 });
      
      // Update local state instead of full reload
      const updatedInvestments = await base44.entities.Investment.filter({ student_email: userData.email });
      setInvestments(updatedInvestments);
      setUserData({ ...userData, coins: newCoins });
    } catch (error) {
      console.error("Error selling:", error);
      toast.error("שגיאה במכירה");
    } finally {
      setIsSelling({ ...isSelling, [businessId]: false });
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
          📈
        </motion.div>
      </div>
    );
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.invested_amount, 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalProfit = totalValue - totalInvested;
  const totalProfitPercent = totalInvested > 0 ? Math.round((totalProfit / totalInvested) * 100) : 0;

  const investmentsByBusiness = investments.reduce((acc, inv) => {
    if (!acc[inv.business_type]) {
      acc[inv.business_type] = [];
    }
    acc[inv.business_type].push(inv);
    return acc;
  }, {});

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          💼 תיק ההשקעות שלי
        </h1>
        <p className="text-white/80 text-lg">
          השקע חכם והרווח מטבעות!
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">מטבעות זמינים</p>
                  <p className="text-2xl font-black text-white">{userData?.coins || 0}</p>
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
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                  totalProfit >= 0 ? 'from-green-400 to-emerald-400' : 'from-red-400 to-pink-400'
                } flex items-center justify-center`}>
                  {totalProfit >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <p className="text-white/70 text-sm">סה"כ רווח/הפסד</p>
                  <p className={`text-2xl font-black ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {totalProfit >= 0 ? '+' : ''}{Math.round(totalProfit)} ({totalProfitPercent}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📊 השוק היום - מה קרה אתמול?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {BUSINESSES.map((business) => {
              const yesterdayChange = yesterdayPerformance[business.id] || 0;
              const isPositive = yesterdayChange >= 0;
              
              return (
                <div key={business.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold text-white">{business.name}</p>
                      <p className="text-xs text-white/60">
                        {business.riskLevel === 0 ? '🛡️ בטוח' : '⚠️'.repeat(business.riskLevel) + ' סיכון'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <p className={`font-black text-lg ${
                      isPositive ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {isPositive ? '+' : ''}{yesterdayChange.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              תיק ההשקעות
            </CardTitle>
            <p className="text-white/70 text-xs">עמלת קניה: {TRANSACTION_FEE} מטבעות</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {BUSINESSES.map((business) => {
              const businessInvestments = investmentsByBusiness[business.id] || [];
              const yesterdayChange = yesterdayPerformance[business.id] || 0;
              const inputAmount = investmentAmounts[business.id] || 0;
              const totalCost = inputAmount > 0 ? inputAmount + TRANSACTION_FEE : 0;

              const hasInvestments = businessInvestments.length > 0;
              const totalInvestedInBusiness = hasInvestments ? businessInvestments.reduce((sum, inv) => sum + inv.invested_amount, 0) : 0;
              const totalValueInBusiness = hasInvestments ? businessInvestments.reduce((sum, inv) => sum + inv.current_value, 0) : 0;
              const profitInBusiness = totalValueInBusiness - totalInvestedInBusiness;
              const profitPercent = totalInvestedInBusiness > 0 ? ((profitInBusiness / totalInvestedInBusiness) * 100).toFixed(1) : 0;

              return (
                <div key={business.id} className={`bg-gradient-to-r ${business.color} rounded-lg p-3`}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="text-2xl">{business.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-sm mb-0.5">{business.name}</h3>
                      <p className="text-white/90 text-xs mb-1">{business.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/80 mb-1">
                        <div>מינימום: {business.minInvestment} 🪙</div>
                        <div>
                          {business.riskLevel === 0 ? '🛡️ בטוח' : '⚠️'.repeat(business.riskLevel) + ' סיכון'}
                        </div>
                      </div>
                      {yesterdayPerformance && Object.keys(yesterdayPerformance).length > 0 && (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          yesterdayChange >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'
                        }`}>
                          {yesterdayChange >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-200" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-200" />
                          )}
                          <span className={`font-bold text-[10px] ${
                            yesterdayChange >= 0 ? 'text-green-200' : 'text-red-200'
                          }`}>
                            אתמול: {yesterdayChange >= 0 ? '+' : ''}{yesterdayChange.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {hasInvestments && (
                      <div className="text-right">
                        <p className="font-black text-white text-base">{Math.round(totalValueInBusiness)}</p>
                        <p className={`text-[10px] font-bold ${profitInBusiness >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                          {profitInBusiness >= 0 ? '+' : ''}{Math.round(profitInBusiness)} ({Math.round(profitPercent)}%)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Existing Investments */}
                  {hasInvestments && (
                    <div className="bg-white/10 rounded-lg p-2 mb-2">
                      <div className="mb-2">
                        <p className="text-white/80 text-[10px]">{businessInvestments.length} השקעות פעילות</p>
                        <p className="text-white font-bold text-sm">
                          {Math.round(totalInvestedInBusiness)} 🪙 ← {Math.round(totalValueInBusiness)} 🪙
                        </p>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder={`מכור עד ${Math.round(totalValueInBusiness)} 🪙`}
                            value={sellAmounts[business.id] || ''}
                            onChange={(e) => setSellAmounts({
                              ...sellAmounts,
                              [business.id]: parseInt(e.target.value) || 0
                            })}
                            className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-8 text-sm"
                          />
                          {sellAmounts[business.id] > 0 && (() => {
                            const sellValue = sellAmounts[business.id];
                            const afterFee = Math.round(sellValue - TRANSACTION_FEE);
                            const percentToSell = sellValue / totalValueInBusiness;
                            const investedPortion = Math.round(totalInvestedInBusiness * percentToSell);
                            const grossProfit = Math.round(afterFee - investedPortion);
                            const tax = grossProfit > 0 ? Math.round(grossProfit * 0.25) : 0;
                            const netAmount = Math.round(afterFee - tax);
                            
                            return (
                              <div className="text-[10px] mt-0.5 space-y-0.5">
                                <p className="text-white/70">
                                 עמלה: {TRANSACTION_FEE} 🪙
                                </p>
                                {tax > 0 && (
                                 <p className="text-white/70">
                                   מס רווח הון: {Math.round(tax)} 🪙
                                 </p>
                                )}
                                <p className="text-green-300 font-bold">
                                  תקבל: {Math.round(netAmount)} מטבעות
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        <Button
                          onClick={() => openConfirmDialog(business.id, sellAmounts[business.id] || totalValueInBusiness)}
                          disabled={isSelling[business.id]}
                          size="sm"
                          className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSelling[business.id] ? '⏳' : '💰'} מכור
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* New Investment Input */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder={`השקע ${business.minInvestment}+ 🪙`}
                        value={investmentAmounts[business.id] || ''}
                        onChange={(e) => setInvestmentAmounts({
                          ...investmentAmounts,
                          [business.id]: parseInt(e.target.value) || 0
                        })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-8 text-sm"
                      />
                      {totalCost > 0 && (
                        <p className="text-white/70 text-[10px] mt-0.5">
                          סה"כ: {totalCost} מטבעות (כולל עמלה)
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleInvest(business.id)}
                      disabled={!investmentAmounts[business.id] || investmentAmounts[business.id] < business.minInvestment || isInvesting[business.id]}
                      className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInvesting[business.id] ? '⏳' : '💰'} השקע
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-white mb-2">💡 טיפ</h3>
            <p className="text-white/70 text-sm">
              השקעות משתנות כל יום! עסקים בסיכון גבוה יכולים להרוויח יותר אבל גם להפסיד הרבה.<br/>
              פזר את ההשקעות שלך למספר עסקים כדי להקטין סיכון! 📊<br/>
              <span className="text-yellow-300 font-bold">שים לב: כל קניה ומכירה כוללת עמלה של {TRANSACTION_FEE} מטבעות!</span>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmSellDialog.isOpen} onOpenChange={(open) => !open && setConfirmSellDialog({ ...confirmSellDialog, isOpen: false })}>
        <AlertDialogContent className="bg-gradient-to-br from-orange-500/95 to-red-500/95 backdrop-blur-xl border-2 border-white/30" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl font-black flex items-center gap-2 justify-end">
              אישור מכירה
              <AlertTriangle className="w-6 h-6 text-yellow-300" />
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/90 space-y-3 text-base text-right">
              <p className="font-bold">⚠️ שים לב: במכירת השקעות ברווח יגבה מס רווח הון מתוך הרווח!</p>

              <div className="bg-white/10 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{confirmSellDialog.amount} 🪙</span>
                  <span>סכום למכירה:</span>
                </div>
                <div className="flex justify-between items-center text-red-300">
                  <span className="font-bold">-{TRANSACTION_FEE} 🪙</span>
                  <span>עמלת מכירה:</span>
                </div>
                {confirmSellDialog.tax > 0 && (
                  <div className="flex justify-between items-center text-red-300">
                    <span className="font-bold">-{confirmSellDialog.tax} 🪙</span>
                    <span>מס רווח הון (25% מהרווח):</span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-2 flex justify-between items-center text-green-300">
                  <span className="font-black text-xl">{confirmSellDialog.netAmount} 🪙</span>
                  <span className="font-bold">תקבל בפועל:</span>
                </div>
              </div>

              <p className="text-sm text-white/70 text-center">האם אתה בטוח שברצונך למכור?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={() => {
                handleSell(confirmSellDialog.businessId, confirmSellDialog.amount);
                setConfirmSellDialog({ ...confirmSellDialog, isOpen: false });
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              אישור מכירה
            </AlertDialogAction>
            <AlertDialogCancel className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}