import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Activity, TrendingUp, Coins, Shield } from "lucide-react";

export default function ScheduledTasksPanel() {
  const [nextTriggers, setNextTriggers] = useState({});

  useEffect(() => {
    calculateNextTriggers();
  }, []);

  const calculateNextTriggers = () => {
    const now = new Date();
    
    // Daily economy (midnight)
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    
    // Login streak (midnight)
    const nextLoginCheck = new Date(nextMidnight);
    
    setNextTriggers({
      dailyEconomy: nextMidnight,
      loginStreak: nextLoginCheck,
    });
  };

  const formatTimeUntil = (targetDate) => {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff < 0) return "עבר";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `בעוד ${days} ימים`;
    }
    
    if (hours > 0) {
      return `בעוד ${hours} שעות ו-${minutes} דקות`;
    }
    
    return `בעוד ${minutes} דקות`;
  };

  const tasks = [
    {
      id: "daily_economy",
      name: "עדכון כלכלי יומי",
      description: "אינפלציה (3%), ריבית אשראי (10%), הכנסה פסיבית מרקעים",
      icon: TrendingUp,
      color: "from-emerald-500/20 to-green-500/20",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-300",
      frequency: "יומי בחצות",
      nextTrigger: nextTriggers.dailyEconomy,
      details: [
        "אינפלציה: 3% על יתרת מזומן חיובית",
        "ריבית אשראי: 10% על יתרת חובה שלילית",
        "הכנסה פסיבית: לפי סוג הרקע המצויד",
        "מתבצע אוטומטית עבור כל תלמיד בכניסה הראשונה שלו ביום"
      ],
      location: "Layout.js - applyDailyEconomyForCurrentUser"
    },
    {
      id: "login_streak",
      name: "רצף כניסות יומי",
      description: "בדיקת רצף והענקת מטבעות (10-100)",
      icon: Activity,
      color: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30",
      iconColor: "text-orange-300",
      frequency: "יומי בחצות",
      nextTrigger: nextTriggers.loginStreak,
      details: [
        "רצף רציף: +1 יום, פרס: (רצף × 10) מטבעות",
        "רצף מקסימלי לתגמול: 10 ימים (100 מטבעות)",
        "רצף נשבר: איפוס ל-1, פרס: 10 מטבעות",
        "מתבצע אוטומטית בכניסה הראשונה של התלמיד ביום"
      ],
      location: "Layout.js - updateLoginStreak"
    },
    {
      id: "market_performance",
      name: "עדכון שוק השקעות",
      description: "עדכון יומי של ערכי השקעות וחישוב net worth",
      icon: Coins,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-300",
      frequency: "יומי בחצות",
      nextTrigger: nextTriggers.dailyEconomy,
      details: [
        "יוצר רשומת DailyMarketPerformance עם שינויים אקראיים",
        "מעדכן את כל ההשקעות לפי השינויים בשוק",
        "מחשב מחדש net worth לכל המשתמשים",
        "רץ אוטומטית כל יום בחצות"
      ],
      location: "functions/updateDailyMarket (scheduled automation)"
    },
    {
      id: "kings_update",
      name: "עדכון מלכי הליגה",
      description: "עדכון טבלת המלכים אוטומטי",
      icon: Shield,
      color: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
      iconColor: "text-yellow-300",
      frequency: "אירוע מבוסס",
      nextTrigger: null,
      details: [
        "מתעדכן אוטומטית בכל פעולה רלוונטית",
        "אנגלית: בסיום תרגול",
        "חשבון: בסיום תרגול",
        "השקעות: במכירת השקעה",
        "רצף כניסות: בעדכון רצף",
        "עבודה: בסיום משמרת"
      ],
      location: "functions/updateKingsForStudent"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-300" />
            משימות מתוזמנות במערכת
          </CardTitle>
          <p className="text-white/60 text-sm">
            פירוט כל המשימות האוטומטיות שרצות במערכת והמועד הבא שלהן
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <Card
                  key={task.id}
                  className={`bg-gradient-to-br ${task.color} border ${task.borderColor}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${task.iconColor}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-white font-bold text-lg">{task.name}</h3>
                            <p className="text-white/70 text-sm">{task.description}</p>
                          </div>
                          <Badge className="bg-white/20 text-white border-white/30">
                            {task.frequency}
                          </Badge>
                        </div>
                        
                        {task.nextTrigger && (
                          <div className="flex items-center gap-2 mt-3 mb-3">
                            <Calendar className="w-4 h-4 text-white/60" />
                            <span className="text-white/80 text-sm">
                              הפעלה הבאה: 
                              <span className="font-bold text-white mr-2">
                                {formatTimeUntil(task.nextTrigger)}
                              </span>
                              ({task.nextTrigger.toLocaleString('he-IL')})
                            </span>
                          </div>
                        )}
                        
                        <div className="bg-white/5 rounded-lg p-3 mt-3 space-y-2">
                          <div className="text-white/60 text-xs font-bold mb-2">📋 פרטים:</div>
                          {task.details.map((detail, idx) => (
                            <div key={idx} className="text-white/70 text-xs flex items-start gap-2">
                              <span className="text-white/50 mt-0.5">•</span>
                              <span>{detail}</span>
                            </div>
                          ))}
                          <div className="text-white/50 text-[10px] mt-3 pt-2 border-t border-white/10">
                            📍 מיקום בקוד: <code className="text-white/70">{task.location}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <Card className="mt-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <h4 className="text-white font-bold mb-2">הערות חשובות</h4>
                  <ul className="space-y-1 text-white/70 text-sm">
                    <li>• המשימות היומיות מתבצעות client-side בכניסה הראשונה של התלמיד ביום</li>
                    <li>• הפרמטרים מוגדרים בקוד ואינם משתנים דינמית</li>
                    <li>• כל משימה מתעדכנת ב-LeaderboardEntry בנוסף ל-User</li>
                    <li>• לא קיימות משימות רקע בשרת - הכל מתבצע בזמן אמת בצד הלקוח</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}