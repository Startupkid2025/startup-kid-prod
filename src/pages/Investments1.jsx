import React, { useState, useEffect, useRef } from "react";
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
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";
import { updateNetWorth } from "../components/utils/networthCalculator";
import { safeRequest } from "../components/utils/base44SafeRequest";
import { ensureSnapshotDefaults } from "../components/utils/portfolioSnapshot";

const BUSINESSES = [
  {
    id: "government_bonds",
    name: "אגרות חוב ממשלתיות",
    icon: "🏛️",
    description: "השקעה הכי בטוחה - תשואה נמוכה אך יציבה",
    minInvestment: 50,
    volatility: "ultra_safe",
    riskLevel: 0,
    color: "from-blue-700 to-blue-900"
  },
  {
    id: "gold",
    name: "זהב",
    icon: "💛",
    description: "מתכת יקרה - מגן מפני אינפלציה",
    minInvestment: 50,
    volatility: "very_low",
    riskLevel: 1,
    color: "from-yellow-500 to-yellow-700"
  },
  {
    id: "real_estate",
    name: "נדל\"ן מסחרי",
    icon: "🏢",
    description: "נכסים עם רווח איטי",
    minInvestment: 50,
    volatility: "low",
    riskLevel: 2,
    color: "from-green-600 to-emerald-600"
  },

  {
    id: "stock_market",
    name: "מניות בורסה",
    icon: "📈",
    description: "מניות חברות גדולות!",
    minInvestment: 50,
    volatility: "optimal_medium",
    riskLevel: 3,
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "crypto",
    name: "קריפטו",
    icon: "₿",
    description: "סטארטקוין דיגיטליים - סיכון גבוה!",
    minInvestment: 50,
    volatility: "high",
    riskLevel: 4,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "tech_startup",
    name: "סטארטאפ טכנולוגי",
    icon: "🚀",
    description: "חברת טכנולוגיה צעירה - מסוכן מאוד!",
    minInvestment: 50,
    volatility: "extreme",
    riskLevel: 5,
    color: "from-blue-500 to-cyan-500"
  }
];

const TRANSACTION_FEE = 2;

// Play ka-ching sound effect
const playKachingSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for the "ka" part
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    oscillator1.frequency.value = 800;
    gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.1);
    
    // Create oscillator for the "ching" part
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    oscillator2.frequency.value = 1200;
    gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
    gainNode2.gain.setValueAtTime(0.4, audioContext.currentTime + 0.12);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
    oscillator2.start(audioContext.currentTime + 0.1);
    oscillator2.stop(audioContext.currentTime + 0.35);
  } catch (error) {
    console.log("Audio not supported");
  }
};

export default function Investments() {
  const [userData, setUserData] = useState(null);
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [investmentAmounts, setInvestmentAmounts] = useState({});
  const [sellAmounts, setSellAmounts] = useState({});
  const [confirmSellDialog, setConfirmSellDialog] = useState({ isOpen: false, businessId: null, amount: 0, tax: 0, netAmount: 0 });
  const [confirmInvestDialog, setConfirmInvestDialog] = useState({ isOpen: false, businessId: null, amount: 0 });
  const [todayPerformance, setTodayPerformance] = useState({});
  const [yesterdayPerformance, setYesterdayPerformance] = useState({});
  const [isInvesting, setIsInvesting] = useState({});
  const [isSelling, setIsSelling] = useState({});
  const didLoadRef = useRef(false);
  const loadInFlightRef = useRef(false);

  useEffect(() => {
    // Prevent double loading (React StrictMode in dev)
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    
    // Session lock - prevent burst on remount (2 seconds)
    const sessionKey = 'investments_last_load';
    const lastLoad = sessionStorage.getItem(sessionKey);
    if (lastLoad) {
      const elapsed = Date.now() - parseInt(lastLoad);
      if (elapsed < 2000) {
        console.log('⏸️ Skipping load - recent session lock');
        // Try to restore from cache instead
        const cachedUser = sessionStorage.getItem('investments_user_cache');
        const cachedSnapshot = sessionStorage.getItem('investments_snapshot_cache');
        const cachedToday = sessionStorage.getItem('investments_today_cache');
        const cachedYesterday = sessionStorage.getItem('investments_yesterday_cache');
        
        if (cachedUser && cachedSnapshot && cachedToday && cachedYesterday) {
          try {
            setUserData(JSON.parse(cachedUser));
            setPortfolioSnapshot(JSON.parse(cachedSnapshot));
            setTodayPerformance(JSON.parse(cachedToday));
            setYesterdayPerformance(JSON.parse(cachedYesterday));
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }
        setIsLoading(false);
        return;
      }
    }
    sessionStorage.setItem(sessionKey, Date.now().toString());
    
    console.log("TODAY KEY:", getDateKeyJerusalem(0), "YESTERDAY KEY:", getDateKeyJerusalem(-1));
    loadData();
  }, []);

  const DATE_TZ = "Asia/Jerusalem";
  const fmtIL = new Intl.DateTimeFormat("en-CA", {
    timeZone: DATE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // YYYY-MM-DD string with offset support
  const getDateKeyJerusalem = (daysOffset = 0) => {
    const todayKey = fmtIL.format(new Date()); // "YYYY-MM-DD" של היום בירושלים
    const [y, m, d] = todayKey.split("-").map(Number);

    // מייצרים "תאריך UTC" מהחלקים ואז מזיזים ימים – יציב ולא תלוי ב-timezone של המחשב
    const dt = new Date(Date.UTC(y, m - 1, d + daysOffset));

    // מחזירים שוב כ-YYYY-MM-DD לפי Asia/Jerusalem (כדי להישאר עקבי עם ה-DB)
    return fmtIL.format(dt);
  };



  const getTodayMarket = async () => {
    const today = getDateKeyJerusalem(0);
    
    // Calculate TTL until end of day in Jerusalem timezone
    const now = new Date();
    const [y, m, d] = today.split('-').map(Number);
    const endOfDay = new Date(Date.UTC(y, m - 1, d, 21, 0, 0, 0)); // 00:00 next day in Jerusalem = 21:00 UTC
    const ttlUntilEndOfDay = Math.max(endOfDay - now, 60 * 1000); // Minimum 1 minute
    
    try {
      const existingMarket = await safeRequest(
        () => base44.entities.DailyMarketPerformance.filter({ date: today }),
        { key: `DMP:${today}`, ttlMs: ttlUntilEndOfDay, retries: 1 }
      );
      
      if (existingMarket.length > 0) {
        const market = existingMarket[0];
        return {
          government_bonds: market.government_bonds_change || 0,
          real_estate: market.real_estate_change || 0,
          gold: market.gold_change || 0,
          stock_market: market.stock_market_change || 0,
          tech_startup: market.tech_startup_change || 0,
          crypto: market.crypto_change || 0
        };
      } else {
        // No market data for today - return zeros
        const defaultMarket = {};
        BUSINESSES.forEach(business => {
          defaultMarket[business.id] = 0;
        });
        return { ...defaultMarket, notCreatedYet: true };
      }
    } catch (error) {
      console.error("Error in getOrCreateTodayMarket:", error);
      const defaultMarket = {};
      BUSINESSES.forEach(business => {
        defaultMarket[business.id] = 0;
      });
      return defaultMarket;
    }
  };

  const getYesterdayMarket = async () => {
    const yesterday = getDateKeyJerusalem(-1);
    
    // Yesterday data never changes - cache for 24 hours
    try {
      const yesterdayMarket = await safeRequest(
        () => base44.entities.DailyMarketPerformance.filter({ date: yesterday }),
        { key: `DMP:${yesterday}`, ttlMs: 24 * 60 * 60 * 1000, retries: 1 }
      );
      
      if (yesterdayMarket.length > 0) {
        const market = yesterdayMarket[0];
        return {
          government_bonds: market.government_bonds_change || 0,
          real_estate: market.real_estate_change || 0,
          gold: market.gold_change || 0,
          stock_market: market.stock_market_change || 0,
          tech_startup: market.tech_startup_change || 0,
          crypto: market.crypto_change || 0
        };
      } else {
        // No market data for yesterday - return zeros
        const defaultMarket = {};
        BUSINESSES.forEach(business => {
          defaultMarket[business.id] = 0;
        });
        return { ...defaultMarket, noDataAvailable: true };
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
    // Prevent multiple simultaneous loads
    if (loadInFlightRef.current) {
      console.log('⏸️ loadData already in-flight, skipping');
      return;
    }
    loadInFlightRef.current = true;
    
    try {
      // READ ONLY: Load user data ONCE
      const user = await base44.auth.me();
      setUserData(user);

      // Extract portfolio snapshot from user (NO Investment.filter call)
      const snapshot = ensureSnapshotDefaults(user);
      snapshot.investments_value = user.investments_value || 0;
      snapshot.total_invested_amount = user.total_invested_amount || 0;
      snapshot.investment_count_total = user.investment_count_total || 0;
      
      setPortfolioSnapshot(snapshot);

      // READ ONLY: Load market data in parallel (cached)
      const [todayMarket, yesterdayMarket] = await Promise.all([
        getTodayMarket(),
        getYesterdayMarket()
      ]);
      
      setTodayPerformance(todayMarket);
      setYesterdayPerformance(yesterdayMarket);
      
      // Cache data in session storage for quick remounts
      try {
        sessionStorage.setItem('investments_user_cache', JSON.stringify(user));
        sessionStorage.setItem('investments_snapshot_cache', JSON.stringify(snapshot));
        sessionStorage.setItem('investments_today_cache', JSON.stringify(todayMarket));
        sessionStorage.setItem('investments_yesterday_cache', JSON.stringify(yesterdayMarket));
      } catch (e) {
        console.error('Session storage error:', e);
      }
    } catch (error) {
      console.error("Error loading investments:", error);
      toast.error("שגיאה בטעינת נתונים. אנא רענן את הדף.");
    } finally {
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const openInvestDialog = (businessId) => {
    const business = BUSINESSES.find(b => b.id === businessId);
    const amount = investmentAmounts[businessId] || 0;

    // Validate amount entered
    if (!amount || amount <= 0) {
      toast.error(`אנא הזן סכום להשקעה`);
      return;
    }

    // Total cost is what user entered (includes fee)
    if (amount > userData.coins) {
      toast.error(`❌ אין לך מספיק סטארטקוין!\n\nיש לך: ${userData.coins} 🪙\nצריך: ${amount} 🪙\nחסר: ${amount - userData.coins} 🪙`);
      return;
    }

    // Minimum amount is 50 (will invest amount - fee)
    if (amount < business.minInvestment) {
      toast.error(`השקעה מינימלית: ${business.minInvestment} סטארטקוין (בפועל יושקעו ${business.minInvestment - TRANSACTION_FEE} אחרי עמלה)`);
      return;
    }
    
    const actualInvestment = amount - TRANSACTION_FEE;

    setConfirmInvestDialog({
      isOpen: true,
      businessId,
      amount
    });
  };

  const handleInvest = async () => {
    const { businessId, amount } = confirmInvestDialog;
    
    // Prevent multiple clicks
    if (isInvesting[businessId]) {
      return;
    }

    setConfirmInvestDialog({ ...confirmInvestDialog, isOpen: false });
    setIsInvesting({ ...isInvesting, [businessId]: true });

    try {
      const business = BUSINESSES.find(b => b.id === businessId);
      
      // Deduct fee from amount - actual investment is amount - fee
      const actualInvestment = amount - TRANSACTION_FEE;
      
      const createdInvestment = await base44.entities.Investment.create({
        student_email: userData.email,
        business_type: businessId,
        invested_amount: Math.round(actualInvestment),
        current_value: Math.round(actualInvestment),
        daily_change_percent: 0,
        last_updated: new Date().toISOString(),
        last_updated_date_key: getDateKeyJerusalem(0)
      });

      const oldCoins = userData.coins;
      const newCoinsBalance = oldCoins - amount;
      
      // Update snapshot with deltas (NO Investment.filter call)
      const newInvestmentsValue = (portfolioSnapshot.investments_value || 0) + actualInvestment;
      const newTotalInvestedAmount = (portfolioSnapshot.total_invested_amount || 0) + actualInvestment;
      const newInvestmentCountTotal = (portfolioSnapshot.investment_count_total || 0) + 1;
      
      const newCountByType = { ...portfolioSnapshot.investment_count_by_type };
      const newValueByType = { ...portfolioSnapshot.investment_value_by_type };
      const newInvestedByType = { ...portfolioSnapshot.investment_invested_by_type };
      
      newCountByType[businessId] = (newCountByType[businessId] || 0) + 1;
      newValueByType[businessId] = (newValueByType[businessId] || 0) + actualInvestment;
      newInvestedByType[businessId] = (newInvestedByType[businessId] || 0) + actualInvestment;
      
      // Calculate net worth locally (READ ONLY page)
      const itemsValue = userData.items_value || 0;
      const newNetWorth = newCoinsBalance + newInvestmentsValue + itemsValue;
      
      // Log coin change
      try {
        const { logCoinChange } = await import("../components/utils/coinLogger");
        
        // Get leaderboard networth
        let leaderboardNetworth = 0;
        try {
          const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ student_email: userData.email });
          if (leaderboardEntries.length > 0) {
            leaderboardNetworth = leaderboardEntries[0].total_networth || 0;
          }
        } catch (err) {
          console.error("Error fetching leaderboard:", err);
        }
        
        await logCoinChange(userData.email, oldCoins, newCoinsBalance, "רכישת השקעה", {
          source: 'Investments',
          business: business.name,
          invested_amount: actualInvestment,
          fee: TRANSACTION_FEE,
          total_cost: amount,
          investments_value: newInvestmentsValue,
          user_networth: newNetWorth,
          leaderboard_networth: leaderboardNetworth
        });
      } catch (logError) {
        console.error("Error logging investment purchase:", logError);
      }

      // Update user with snapshot deltas
      await base44.auth.updateMe({
        coins: newCoinsBalance,
        total_investment_fees: (userData.total_investment_fees || 0) + TRANSACTION_FEE,
        investments_value: newInvestmentsValue,
        total_invested_amount: newTotalInvestedAmount,
        investment_count_total: newInvestmentCountTotal,
        investment_count_by_type: newCountByType,
        investment_value_by_type: newValueByType,
        investment_invested_by_type: newInvestedByType,
        last_portfolio_snapshot_date_key: getDateKeyJerusalem(0),
        total_networth: newNetWorth
      });

      // Update local state
      setPortfolioSnapshot({
        investments_value: newInvestmentsValue,
        total_invested_amount: newTotalInvestedAmount,
        investment_count_total: newInvestmentCountTotal,
        investment_count_by_type: newCountByType,
        investment_value_by_type: newValueByType,
        investment_invested_by_type: newInvestedByType
      });

      // Sync to LeaderboardEntry for public visibility
      const freshUser = await base44.auth.me();
      await syncLeaderboardEntry(freshUser, {
        coins: newCoinsBalance,
        total_investment_fees: (userData.total_investment_fees || 0) + TRANSACTION_FEE,
        investments_value: newInvestmentsValue,
        total_networth: newNetWorth
      });

      playKachingSound();
      toast.success(`השקעת ${actualInvestment} סטארטקוין ב${business.name}! (עמלה: ${TRANSACTION_FEE}) 🎉`);
      setInvestmentAmounts({ ...investmentAmounts, [businessId]: 0 });
      setUserData({ ...userData, coins: newCoinsBalance });
    } catch (error) {
      console.error("Error investing:", error);
      toast.error("שגיאה בהשקעה");
    } finally {
      setIsInvesting({ ...isInvesting, [businessId]: false });
    }
  };

  const openConfirmDialog = (businessId, sellAmount) => {
    // Use snapshot instead of local investments array
    const totalValue = portfolioSnapshot?.investment_value_by_type?.[businessId] || 0;
    
    if (totalValue === 0) {
      toast.error("אין לך השקעות במוצר זה");
      return;
    }
    
    // Validate amount entered
    if (!sellAmount || sellAmount <= 0) {
      toast.error("אנא הזן סכום למכירה");
      return;
    }
    
    if (sellAmount > totalValue) {
      toast.error(`❌ אין לך מספיק למכירה!\n\nיש לך: ${Math.round(totalValue)} 🪙\nמנסה למכור: ${sellAmount} 🪙\nעודף: ${sellAmount - Math.round(totalValue)} 🪙`);
      return;
    }

    const amountAfterFee = sellAmount - TRANSACTION_FEE;
    
    if (amountAfterFee <= 0) {
      toast.error("הסכום קטן מדי למכירה (אחרי עמלה)");
      return;
    }

    // Estimate profit using snapshot (proportional calculation)
    const totalInvestedInBusiness = portfolioSnapshot?.investment_invested_by_type?.[businessId] || 0;
    const percentSelling = totalValue > 0 ? sellAmount / totalValue : 0;
    const totalInvestedSold = totalInvestedInBusiness * percentSelling;
    
    const investmentProfit = sellAmount - totalInvestedSold;
    const tax = investmentProfit > 0 ? investmentProfit * 0.25 : 0;
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

    // Use snapshot to validate
    const totalValue = portfolioSnapshot?.investment_value_by_type?.[businessId] || 0;
    const totalInvested = portfolioSnapshot?.investment_invested_by_type?.[businessId] || 0;
    
    if (totalValue === 0) {
      toast.error("אין לך השקעות במוצר זה");
      return;
    }
    
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
      // Fetch investments for this business type only
      const businessInvestments = await base44.entities.Investment.filter({
        student_email: userData.email,
        business_type: businessId
      });
      
      let remainingToSell = sellAmount;
      let totalInvestedSold = 0;
      const investmentsToDelete = [];
      let deletedCount = 0;

      // Sort investments by current_value ascending to sell smallest first
      const sortedInvestments = [...businessInvestments].sort((a, b) => a.current_value - b.current_value);

      for (const investment of sortedInvestments) {
        if (remainingToSell <= 0) break;

        if (investment.current_value <= remainingToSell) {
          // Delete entire investment
          investmentsToDelete.push(investment.id);
          totalInvestedSold += investment.invested_amount;
          remainingToSell -= investment.current_value;
          deletedCount++;
        } else {
          // Partial sell - reduce investment proportionally
          const percentToSell = remainingToSell / investment.current_value;
          const investedToDeduct = investment.invested_amount * percentToSell;
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

      const investmentProfit = sellAmount - totalInvestedSold;
      const amountAfterFee = sellAmount - TRANSACTION_FEE;
      const capitalGainsTax = investmentProfit > 0 ? investmentProfit * 0.25 : 0;

      // Check if user is investment king and add bonus (using LeaderboardKings to avoid heavy User.list)
      let kingBonus = 0;
      try {
        const kings = await safeRequest(
          () => base44.entities.LeaderboardKings.list(),
          { key: 'kings', ttlMs: 10 * 60 * 1000, retries: 1 }
        );
        
        if (kings && kings.length > 0) {
          const king = kings[0];
          if (king.investment_king_email === userData.email && investmentProfit > 0) {
            kingBonus = Math.round(investmentProfit * 0.10); // Investment king gets 10% bonus on profits!
          }
        }
      } catch (error) {
        console.error("Error checking investment king status:", error);
        // Continue without king bonus if can't access LeaderboardKings
      }

      const netAmount = amountAfterFee - capitalGainsTax + kingBonus;
      const oldCoins = userData.coins;
      const newCoins = oldCoins + Math.round(netAmount);
      
      // Update snapshot with deltas (NO Investment.filter call)
      const newInvestmentsValue = Math.max(0, (portfolioSnapshot.investments_value || 0) - sellAmount);
      const newTotalInvestedAmount = Math.max(0, (portfolioSnapshot.total_invested_amount || 0) - totalInvestedSold);
      const newInvestmentCountTotal = Math.max(0, (portfolioSnapshot.investment_count_total || 0) - deletedCount);
      
      const newCountByType = { ...portfolioSnapshot.investment_count_by_type };
      const newValueByType = { ...portfolioSnapshot.investment_value_by_type };
      const newInvestedByType = { ...portfolioSnapshot.investment_invested_by_type };
      
      newCountByType[businessId] = Math.max(0, (newCountByType[businessId] || 0) - deletedCount);
      newValueByType[businessId] = Math.max(0, (newValueByType[businessId] || 0) - sellAmount);
      newInvestedByType[businessId] = Math.max(0, (newInvestedByType[businessId] || 0) - totalInvestedSold);
      
      // Calculate net worth locally (READ ONLY page)
      const itemsValue = userData.items_value || 0;
      const newNetWorth = newCoins + newInvestmentsValue + itemsValue;
      
      // Log 3 separate transactions: sale proceeds, fee, and tax
      try {
        const { logCoinChange } = await import("../components/utils/coinLogger");
        const business = BUSINESSES.find(b => b.id === businessId);
        
        // 1. Log the sale proceeds (adding coins from selling)
        await logCoinChange(userData.email, oldCoins, oldCoins + sellAmount, "מכירת השקעות", {
          source: 'Investments',
          business: business?.name,
          sold_for: sellAmount,
          investments_value: newInvestmentsValue
        });
        
        // 2. Log the transaction fee (deducting)
        await logCoinChange(userData.email, oldCoins + sellAmount, oldCoins + sellAmount - TRANSACTION_FEE, "עמלות השקעות", {
          source: 'Investments',
          business: business?.name,
          fee: TRANSACTION_FEE,
          investments_value: newInvestmentsValue
        });
        
        // 3. Log capital gains tax if applicable (deducting)
        if (capitalGainsTax > 0) {
          await logCoinChange(userData.email, oldCoins + sellAmount - TRANSACTION_FEE, oldCoins + sellAmount - TRANSACTION_FEE - capitalGainsTax, "מס רווח הון", {
            source: 'Investments',
            business: business?.name,
            profit: investmentProfit,
            tax: Math.round(capitalGainsTax),
            investments_value: newInvestmentsValue
          });
        }
      } catch (logError) {
        console.error("Error logging investment sale:", logError);
      }
      const newCapitalGainsTax = (userData.total_capital_gains_tax || 0) + Math.round(capitalGainsTax);
      const newRealizedProfit = (userData.total_realized_investment_profit || 0) + Math.round(investmentProfit);
      const newTotalFees = (userData.total_investment_fees || 0) + TRANSACTION_FEE;

      // Update user with snapshot deltas
      await base44.auth.updateMe({ 
        coins: newCoins,
        total_investment_fees: newTotalFees,
        total_capital_gains_tax: newCapitalGainsTax,
        total_realized_investment_profit: newRealizedProfit,
        investments_value: newInvestmentsValue,
        total_invested_amount: newTotalInvestedAmount,
        investment_count_total: newInvestmentCountTotal,
        investment_count_by_type: newCountByType,
        investment_value_by_type: newValueByType,
        investment_invested_by_type: newInvestedByType,
        last_portfolio_snapshot_date_key: getDateKeyJerusalem(0),
        total_networth: newNetWorth
      });

      // Update local state
      setPortfolioSnapshot({
        investments_value: newInvestmentsValue,
        total_invested_amount: newTotalInvestedAmount,
        investment_count_total: newInvestmentCountTotal,
        investment_count_by_type: newCountByType,
        investment_value_by_type: newValueByType,
        investment_invested_by_type: newInvestedByType
      });

      // Sync to LeaderboardEntry for public visibility
      await syncLeaderboardEntry(userData.email, {
        coins: newCoins,
        total_investment_fees: newTotalFees,
        total_capital_gains_tax: newCapitalGainsTax,
        total_realized_investment_profit: newRealizedProfit,
        investments_value: newInvestmentsValue,
        total_networth: newNetWorth
      });

      const grossProfit = investmentProfit;
      const netProfit = netAmount - TRANSACTION_FEE;

      if (grossProfit > 0) {
        playKachingSound();
        toast.success(`מכרת! רווח נטו: ${Math.round(netProfit)} סטארטקוין (עמלה: ${TRANSACTION_FEE}, מס: ${Math.round(capitalGainsTax)}) 💰`);
      } else {
        toast.error(`מכרת בהפסד של ${Math.round(Math.abs(grossProfit))} סטארטקוין (כולל עמלה ${TRANSACTION_FEE}) 😢`);
      }

      setSellAmounts({ ...sellAmounts, [businessId]: 0 });
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

  // Use snapshot for all totals
  const totalInvested = portfolioSnapshot?.total_invested_amount || 0;
  const totalValue = portfolioSnapshot?.investments_value || 0;
  const unrealizedProfit = totalValue - totalInvested;
  const realizedProfit = userData?.total_realized_investment_profit || 0;
  const totalProfit = unrealizedProfit + realizedProfit;
  const totalProfitPercent = totalInvested > 0 ? Math.round((unrealizedProfit / totalInvested) * 100) : 0;
  
  // Calculate total daily profit from snapshot using today's market performance
  const todayKey = getDateKeyJerusalem(0);
  let totalDailyProfit = 0;
  
  if (portfolioSnapshot && userData?.last_portfolio_snapshot_date_key !== todayKey) {
    BUSINESSES.forEach(business => {
      const businessValue = portfolioSnapshot.investment_value_by_type?.[business.id] || 0;
      const todayChange = todayPerformance[business.id] || 0;
      totalDailyProfit += Math.round(businessValue * (todayChange / 100));
    });
  }

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
          השקע חכם והרווח סטארטקוין!
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">סטארטקוין זמינים</p>
                  <p className="text-2xl font-black text-white">{userData?.coins || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">כסף מושקע</p>
                  <p className="text-2xl font-black text-white">{Math.round(totalValue)}</p>
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
                  <p className="text-white/70 text-sm">רווח/הפסד לא ממומש</p>
                  <p className={`text-2xl font-black ${unrealizedProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {unrealizedProfit >= 0 ? '+' : ''}{Math.round(unrealizedProfit)} ({totalProfitPercent}%)
                  </p>
                  <p className={`text-xs text-white/60 mt-1`}>
                    ממומש: {realizedProfit >= 0 ? '+' : ''}{Math.round(realizedProfit)} 🪙
                  </p>
                  <p className={`text-sm font-bold ${totalDailyProfit >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    היום: {totalDailyProfit >= 0 ? '+' : ''}{totalDailyProfit} 🪙
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
              📊 השוק היום
            </CardTitle>
            <p className="text-white/60 text-sm mt-2">
              השקעות משתנות כל יום! עסקים בסיכון גבוה יכולים להרוויח יותר אבל גם להפסיד הרבה.
              פזר את ההשקעות שלך למספר עסקים כדי להקטין סיכון! 
              <span className="block mt-1 text-yellow-300 font-bold">
                שים לב: כל קניה ומכירה כוללת עמלה של {TRANSACTION_FEE} סטארטקוין!
              </span>
              {todayPerformance?.notCreatedYet && (
                <span className="block mt-2 text-white/50 text-xs">
                  ⚠️ השוק עדיין לא עודכן היום
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {BUSINESSES.map((business) => {
              const todayChange = todayPerformance[business.id] || 0;
              const yesterdayChange = yesterdayPerformance[business.id] || 0;
              const isPositive = todayChange >= 0;
              
              return (
                <div key={business.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{business.icon}</div>
                    <div>
                      <p className="font-bold text-white text-sm">{business.name}</p>
                      <p className="text-xs text-white/60">{business.description}</p>
                      <p className="text-[10px] text-white/50 mt-0.5">
                        {business.riskLevel === 0 ? '🛡️ בטוח' : '⚠️'.repeat(business.riskLevel) + ' סיכון'} • מינימום: {business.minInvestment} 🪙
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className={`px-4 py-2 rounded-lg ${
                      isPositive ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <p className={`font-black text-lg ${
                        isPositive ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {isPositive ? '+' : ''}{todayChange.toFixed(1)}%
                      </p>
                    </div>
                    {!yesterdayPerformance?.noDataAvailable && (
                      <p className="text-[10px] text-white/50 text-center">
                        אתמול: {yesterdayChange >= 0 ? '+' : ''}{yesterdayChange.toFixed(1)}%
                      </p>
                    )}
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
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              תיק ההשקעות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {BUSINESSES.map((business) => {
              // Use snapshot for all business-level data
              const totalValueInBusiness = portfolioSnapshot?.investment_value_by_type?.[business.id] || 0;
              const totalInvestedInBusiness = portfolioSnapshot?.investment_invested_by_type?.[business.id] || 0;
              const hasInvestments = totalValueInBusiness > 0;
              
              const profitInBusiness = totalValueInBusiness - totalInvestedInBusiness;
              const profitPercent = totalInvestedInBusiness > 0 ? ((profitInBusiness / totalInvestedInBusiness) * 100).toFixed(1) : 0;
              
              // Calculate today's profit from snapshot
              const todayProfit = (userData?.last_portfolio_snapshot_date_key !== todayKey && totalValueInBusiness > 0) ? 
                Math.round(totalValueInBusiness * ((todayPerformance[business.id] || 0) / 100)) : 0;

              return (
                <div key={business.id} className={`bg-gradient-to-r ${business.color} rounded-lg p-3`}>
                 <div className="flex items-start gap-2 mb-3">
                   <div className="text-2xl flex-shrink-0">{business.icon}</div>
                   <div className="flex-1 min-w-0">
                     <h3 className="font-bold text-white text-sm mb-0.5">{business.name}</h3>
                     <div className="flex items-center gap-2 text-[10px] text-white/80">
                       <span>מינימום: {business.minInvestment} 🪙</span>
                       <span>•</span>
                       <span>{business.riskLevel === 0 ? '🛡️ בטוח' : '⚠️'.repeat(business.riskLevel)}</span>
                     </div>
                     </div>
                     {hasInvestments && (
                     <div className="text-right flex-shrink-0">
                       <p className="font-black text-white text-lg">{Math.round(totalValueInBusiness)}</p>
                       <p className={`text-xs font-bold ${profitInBusiness >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                         {profitInBusiness >= 0 ? '+' : ''}{Math.round(profitInBusiness)}
                       </p>
                       <p className={`text-[10px] font-bold ${todayProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                         היום: {todayProfit >= 0 ? '+' : ''}{todayProfit} 🪙
                       </p>
                     </div>
                     )}
                     </div>

                  {/* Investment Actions */}
                  <div className="space-y-2">
                    <Input
                     type="number"
                     inputMode="numeric"
                     placeholder={`השקע ${business.minInvestment}+ 🪙`}
                     value={investmentAmounts[business.id] || ''}
                     onChange={(e) => setInvestmentAmounts({
                       ...investmentAmounts,
                       [business.id]: parseInt(e.target.value) || 0
                     })}
                     className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-9 text-sm"
                    />
                    <Button
                      onClick={() => openInvestDialog(business.id)}
                      disabled={!investmentAmounts[business.id] || investmentAmounts[business.id] < business.minInvestment || isInvesting[business.id]}
                      className="bg-white/20 hover:bg-white/30 text-white font-bold text-sm h-9 w-full disabled:opacity-50 transition-all"
                    >
                      {isInvesting[business.id] ? (
                        <span className="flex items-center gap-2 justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            ⏳
                          </motion.div>
                          משקיע...
                        </span>
                      ) : (
                        '📈 השקע'
                      )}
                    </Button>

                     {hasInvestments && (
                     <>
                       <Input
                         type="number"
                         inputMode="numeric"
                         placeholder={`מכור עד ${Math.round(totalValueInBusiness)} 🪙`}
                         value={sellAmounts[business.id] || ''}
                         onChange={(e) => setSellAmounts({
                           ...sellAmounts,
                           [business.id]: parseInt(e.target.value) || 0
                         })}
                         className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-9 text-sm"
                       />
                         <Button
                           onClick={() => openConfirmDialog(business.id, sellAmounts[business.id] || totalValueInBusiness)}
                           disabled={isSelling[business.id]}
                           className="bg-red-500/30 hover:bg-red-500/40 text-white font-bold text-sm h-9 w-full disabled:opacity-50 transition-all"
                         >
                           {isSelling[business.id] ? (
                             <span className="flex items-center gap-2 justify-center">
                               <motion.div
                                 animate={{ rotate: 360 }}
                                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                               >
                                 ⏳
                               </motion.div>
                               מוכר...
                             </span>
                           ) : (
                             '💰 מכור'
                           )}
                         </Button>
                         </>
                         )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>



      {/* Invest Confirmation Dialog */}
      <AlertDialog open={confirmInvestDialog.isOpen} onOpenChange={(open) => !open && setConfirmInvestDialog({ ...confirmInvestDialog, isOpen: false })}>
        <AlertDialogContent className="bg-gradient-to-br from-green-500/95 to-emerald-600/95 backdrop-blur-xl border-2 border-white/30" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-2xl font-black flex items-center gap-2 justify-end">
              💰 אישור השקעה
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/90 space-y-3 text-base text-right">
              {(() => {
                const business = BUSINESSES.find(b => b.id === confirmInvestDialog.businessId);
                if (!business) return null;
                
                return (
                  <>
                    <div className="flex items-center gap-3 justify-end bg-white/10 rounded-lg p-3">
                      <div className="text-right">
                        <p className="font-bold text-white text-lg">{business.name}</p>
                        <p className="text-white/70 text-sm">{business.description}</p>
                      </div>
                      <div className="text-3xl">{business.icon}</div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xl">{confirmInvestDialog.amount} 🪙</span>
                        <span>סה״כ לתשלום:</span>
                      </div>
                      <div className="flex justify-between items-center text-red-300">
                        <span className="font-bold">-{TRANSACTION_FEE} 🪙</span>
                        <span>עמלת קנייה:</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between items-center text-green-300">
                        <span className="font-black text-2xl">{confirmInvestDialog.amount - TRANSACTION_FEE} 🪙</span>
                        <span className="font-bold">סכום בפועל להשקעה:</span>
                      </div>
                    </div>

                    <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold">{userData?.coins || 0} 🪙</span>
                        <span>יתרה נוכחית:</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold">{(userData?.coins || 0) - confirmInvestDialog.amount} 🪙</span>
                        <span>יתרה לאחר ההשקעה:</span>
                      </div>
                    </div>

                    <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3">
                      <p className="text-yellow-100 text-sm text-center font-bold">
                        {business.riskLevel === 0 && "🛡️ השקעה בטוחה - תנודות קטנות"}
                        {business.riskLevel === 1 && "⚠️ סיכון נמוך - עלייה ירידה קטנה"}
                        {business.riskLevel === 2 && "⚠️ סיכון בינוני-נמוך"}
                        {business.riskLevel === 3 && "⚠️⚠️ סיכון בינוני - אפשר רווח או הפסד"}
                        {business.riskLevel === 4 && "⚠️⚠️⚠️ סיכון גבוה - תנודות חזקות!"}
                        {business.riskLevel === 5 && "⚠️⚠️⚠️⚠️ סיכון מאוד גבוה! רווח גדול או הפסד גדול!"}
                      </p>
                    </div>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={handleInvest}
              className="bg-white hover:bg-white/90 text-green-600 font-black"
            >
              ✅ אישור השקעה
            </AlertDialogAction>
            <AlertDialogCancel className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell Confirmation Dialog */}
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
                 <span className="font-bold">{Math.round(confirmSellDialog.amount)} 🪙</span>
                 <span>סכום למכירה:</span>
               </div>
               <div className="flex justify-between items-center text-red-300">
                 <span className="font-bold">-{TRANSACTION_FEE} 🪙</span>
                 <span>עמלת מכירה:</span>
               </div>
               {confirmSellDialog.tax > 0 && (
                 <div className="flex justify-between items-center text-red-300">
                   <span className="font-bold">-{Math.round(confirmSellDialog.tax)} 🪙</span>
                   <span>מס רווח הון (25% מהרווח):</span>
                 </div>
               )}
               <div className="border-t border-white/20 pt-2 flex justify-between items-center text-green-300">
                 <span className="font-black text-xl">{Math.round(confirmSellDialog.netAmount)} 🪙</span>
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