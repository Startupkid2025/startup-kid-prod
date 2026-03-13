import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { safeRequest } from "../utils/base44SafeRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};
const formatDate = (d) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({ title, value, subtitle, trend, color = "purple", icon }) {
  const colors = {
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    green: "from-green-500/20 to-green-600/10 border-green-500/30",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    red: "from-red-500/20 to-red-600/10 border-red-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/60 text-sm">{title}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="flex items-center gap-1 mt-1">
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span className="text-white/40 text-xs">{subtitle}</span>}
      </div>
    </div>
  );
}

// ── CSS Bar Chart ──────────────────────────────────────────
function BarChart({ data, maxVal, labelKey, valueKey, colorFn }) {
  const max = maxVal || Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-white/50 text-xs w-12 text-left shrink-0">{d[labelKey]}</span>
          <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorFn ? colorFn(d, i) : "bg-purple-500/60"}`}
              style={{ width: `${pct(d[valueKey], max)}%`, minWidth: d[valueKey] > 0 ? "4px" : "0" }}
            />
          </div>
          <span className="text-white text-xs font-medium w-8 text-left">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mini Sparkline (SVG) ───────────────────────────────────
function Sparkline({ data, color = "#a78bfa", height = 40, width = 120 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Progress Ring ──────────────────────────────────────────
function ProgressRing({ value, max, size = 60, label, color = "#a78bfa" }) {
  const pctVal = pct(value, max);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pctVal / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="white" fontSize="12" fontWeight="bold">
          {pctVal}%
        </text>
      </svg>
      {label && <span className="text-white/50 text-xs text-center">{label}</span>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Main Dashboard Component
// ════════════════════════════════════════════════════════════
export default function ActivityDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState(30); // days
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const TTL = 120000;
      const [users, participations, coinLogs, wordProg, mathProg, quizProg, groups] = await Promise.all([
        safeRequest(() => base44.entities.User.list(), { key: "activity-users", ttlMs: TTL }),
        safeRequest(() => base44.entities.LessonParticipation.list(), { key: "activity-participations", ttlMs: TTL }),
        safeRequest(() => base44.entities.CoinLog.list("-created_date"), { key: "activity-coinlogs", ttlMs: TTL }),
        safeRequest(() => base44.entities.WordProgress.list(), { key: "activity-wordprog", ttlMs: TTL }),
        safeRequest(() => base44.entities.MathProgress.list(), { key: "activity-mathprog", ttlMs: TTL }),
        safeRequest(() => base44.entities.QuizProgress.list(), { key: "activity-quizprog", ttlMs: TTL }),
        safeRequest(() => base44.entities.Group.list(), { key: "activity-groups", ttlMs: TTL }),
      ]);
      setData({ users, participations, coinLogs, wordProg, mathProg, quizProg, groups });
    } catch (err) {
      console.error("Activity load error:", err);
      toast.error("שגיאה בטעינת נתוני פעילות");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Computed Metrics ───────────────────────────────────
  const metrics = useMemo(() => {
    if (!data) return null;
    const { users, participations, coinLogs, wordProg, mathProg, quizProg, groups } = data;
    const todayStr = today();
    const cutoff = daysAgo(range);
    const yesterdayStr = daysAgo(1);
    const prevCutoff = daysAgo(range * 2);

    // Only count real students (exclude demo/teacher)
    const realStudents = users.filter((u) => u.user_type === "student");
    const totalStudents = realStudents.length;

    // ── DAU: users who logged in today ──
    const dauUsers = realStudents.filter((u) => u.last_login_date?.split("T")[0] === todayStr);
    const dau = dauUsers.length;
    const yesterdayDAU = realStudents.filter((u) => u.last_login_date?.split("T")[0] === yesterdayStr).length;

    // ── WAU: logged in within 7 days ──
    const wauCutoff = daysAgo(7);
    const wau = realStudents.filter((u) => u.last_login_date?.split("T")[0] >= wauCutoff).length;

    // ── MAU: logged in within 30 days ──
    const mauCutoff = daysAgo(30);
    const mau = realStudents.filter((u) => u.last_login_date?.split("T")[0] >= mauCutoff).length;

    // ── Stickiness ──
    const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;

    // ── DAU trend (per day for chart) ──
    const dauByDay = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = daysAgo(i);
      const count = realStudents.filter((u) => u.last_login_date?.split("T")[0] === d).length;
      dauByDay.push({ date: d, label: formatDate(d), count });
    }

    // ── DAU trend % (current range vs previous range) ──
    const currentRangeDAU = dauByDay.reduce((s, d) => s + d.count, 0);
    const prevRangeDays = [];
    for (let i = range * 2 - 1; i >= range; i--) {
      const d = daysAgo(i);
      prevRangeDays.push(realStudents.filter((u) => u.last_login_date?.split("T")[0] === d).length);
    }
    const prevRangeDAU = prevRangeDays.reduce((s, v) => s + v, 0);
    const dauTrend = prevRangeDAU > 0 ? Math.round(((currentRangeDAU - prevRangeDAU) / prevRangeDAU) * 100) : 0;

    // ── New users in range ──
    const newUsersInRange = realStudents.filter((u) => u.created_date?.split("T")[0] >= cutoff);
    const newUsersCount = newUsersInRange.length;
    const prevNewUsers = realStudents.filter(
      (u) => u.created_date?.split("T")[0] >= prevCutoff && u.created_date?.split("T")[0] < cutoff
    ).length;
    const newUsersTrend = prevNewUsers > 0 ? Math.round(((newUsersCount - prevNewUsers) / prevNewUsers) * 100) : 0;

    // ── New users per day ──
    const newUsersByDay = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = daysAgo(i);
      const count = realStudents.filter((u) => u.created_date?.split("T")[0] === d).length;
      newUsersByDay.push({ date: d, label: formatDate(d), count });
    }

    // ── Lesson attendance in range ──
    const lessonsInRange = participations.filter((p) => p.lesson_date?.split("T")[0] >= cutoff && p.attended);
    const totalLessonsAttended = lessonsInRange.length;
    const uniqueLessonStudents = new Set(lessonsInRange.map((p) => p.student_email)).size;

    // ── Activity breakdown ──
    const lessonActive = new Set(participations.filter((p) => p.lesson_date?.split("T")[0] >= cutoff).map((p) => p.student_email)).size;
    const mathActive = mathProg.filter((m) => m.updated_at?.split("T")[0] >= cutoff).length;
    const vocabActive = wordProg.filter((w) => w.updated_at?.split("T")[0] >= cutoff).length;
    const quizActive = quizProg.filter((q) => q.updated_at?.split("T")[0] >= cutoff).length;
    const economyActive = new Set(coinLogs.filter((c) => c.created_date?.split("T")[0] >= cutoff).map((c) => c.student_email)).size;

    const featureBreakdown = [
      { name: "שיעורים", count: lessonActive, icon: "📚" },
      { name: "כלכלה", count: economyActive, icon: "🪙" },
      { name: "אוצר מילים", count: vocabActive, icon: "📖" },
      { name: "חשבון", count: mathActive, icon: "🔢" },
      { name: "חידונים", count: quizActive, icon: "❓" },
    ].sort((a, b) => b.count - a.count);

    // ── Login streak distribution ──
    const streakBuckets = [
      { label: "0", min: 0, max: 0, count: 0 },
      { label: "1-3", min: 1, max: 3, count: 0 },
      { label: "4-7", min: 4, max: 7, count: 0 },
      { label: "8-14", min: 8, max: 14, count: 0 },
      { label: "15-30", min: 15, max: 30, count: 0 },
      { label: "30+", min: 31, max: 9999, count: 0 },
    ];
    for (const u of realStudents) {
      const s = u.login_streak || 0;
      const bucket = streakBuckets.find((b) => s >= b.min && s <= b.max);
      if (bucket) bucket.count++;
    }
    const avgStreak = totalStudents > 0
      ? (realStudents.reduce((s, u) => s + (u.login_streak || 0), 0) / totalStudents).toFixed(1)
      : 0;

    // ── Group engagement ──
    const groupEngagement = groups
      .filter((g) => g.student_emails?.length > 0)
      .map((g) => {
        const emails = g.student_emails || [];
        const activeCount = emails.filter((e) =>
          realStudents.find((u) => u.email === e && u.last_login_date?.split("T")[0] >= daysAgo(7))
        ).length;
        const lessonsCount = participations.filter(
          (p) => emails.includes(p.student_email) && p.lesson_date?.split("T")[0] >= cutoff && p.attended
        ).length;
        return {
          name: g.group_name,
          total: emails.length,
          active: activeCount,
          activePct: pct(activeCount, emails.length),
          lessons: lessonsCount,
        };
      })
      .sort((a, b) => b.activePct - a.activePct);

    // ── At-risk users (active 7-30 days ago, NOT active last 7 days) ──
    const atRiskUsers = realStudents
      .filter((u) => {
        const last = u.last_login_date?.split("T")[0];
        return last && last < daysAgo(7) && last >= daysAgo(30);
      })
      .map((u) => ({
        name: u.full_name || u.email,
        email: u.email,
        lastLogin: u.last_login_date?.split("T")[0],
        daysSince: Math.floor((Date.now() - new Date(u.last_login_date).getTime()) / 86400000),
        streak: u.login_streak || 0,
        group: groups.find((g) => g.student_emails?.includes(u.email))?.group_name || "—",
      }))
      .sort((a, b) => a.daysSince - b.daysSince);

    // ── Dormant users (no login in 30+ days) ──
    const dormantUsers = realStudents.filter((u) => {
      const last = u.last_login_date?.split("T")[0];
      return !last || last < daysAgo(30);
    });

    // ── Retention: new users from 2 weeks ago, how many still active? ──
    const cohortStart = daysAgo(21);
    const cohortEnd = daysAgo(14);
    const cohortUsers = realStudents.filter(
      (u) => u.created_date?.split("T")[0] >= cohortStart && u.created_date?.split("T")[0] < cohortEnd
    );
    const cohortRetained = cohortUsers.filter(
      (u) => u.last_login_date?.split("T")[0] >= daysAgo(7)
    );
    const retentionRate = pct(cohortRetained.length, cohortUsers.length);

    // ── Economy insights ──
    const coinsEarned = coinLogs
      .filter((c) => c.created_date?.split("T")[0] >= cutoff && c.amount > 0)
      .reduce((s, c) => s + c.amount, 0);
    const coinsSpent = Math.abs(
      coinLogs.filter((c) => c.created_date?.split("T")[0] >= cutoff && c.amount < 0)
        .reduce((s, c) => s + c.amount, 0)
    );

    // Coin reasons breakdown
    const coinReasons = {};
    for (const c of coinLogs.filter((c) => c.created_date?.split("T")[0] >= cutoff && c.amount > 0)) {
      const r = c.reason || "אחר";
      coinReasons[r] = (coinReasons[r] || 0) + c.amount;
    }
    const topCoinReasons = Object.entries(coinReasons)
      .map(([reason, amount]) => ({ reason, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ── Learning velocity ──
    const avgLessonsPerStudent = totalStudents > 0
      ? (totalLessonsAttended / totalStudents).toFixed(1)
      : 0;
    const totalMasteredWords = wordProg.filter((w) => w.mastered).length;
    const totalMathCorrect = mathProg.reduce((s, m) => s + (m.correct_answers || 0), 0);
    const totalQuizCompleted = quizProg.filter((q) => q.completed).length;

    // ── Peak login day of week ──
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    for (const d of dauByDay) {
      const dow = new Date(d.date).getDay();
      dayOfWeekCounts[dow] += d.count;
    }
    const peakDayIdx = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const dayOfWeekData = dayOfWeekCounts.map((count, i) => ({
      label: dayNames[i],
      count: Math.round(count / Math.ceil(range / 7)),
    }));

    // ── Health score (0-100) ──
    const healthFactors = [
      Math.min(pct(dau, totalStudents), 100) * 0.3,           // 30% weight: daily engagement
      Math.min(stickiness, 100) * 0.2,                         // 20% weight: stickiness
      Math.min(retentionRate, 100) * 0.25,                     // 25% weight: retention
      Math.min(pct(totalStudents - dormantUsers.length, totalStudents), 100) * 0.15, // 15%: non-dormant
      Math.min(pct(wau, totalStudents), 100) * 0.1,           // 10% weight: weekly reach
    ];
    const healthScore = Math.round(healthFactors.reduce((s, v) => s + v, 0));

    return {
      dau, yesterdayDAU, wau, mau, stickiness, totalStudents,
      dauByDay, dauTrend,
      newUsersCount, newUsersTrend, newUsersByDay,
      totalLessonsAttended, uniqueLessonStudents,
      featureBreakdown,
      streakBuckets, avgStreak,
      groupEngagement,
      atRiskUsers, dormantUsers,
      retentionRate, cohortUsers: cohortUsers.length, cohortRetained: cohortRetained.length,
      coinsEarned, coinsSpent, topCoinReasons,
      avgLessonsPerStudent, totalMasteredWords, totalMathCorrect, totalQuizCompleted,
      dayOfWeekData, peakDayIdx, dayNames,
      healthScore,
    };
  }, [data, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
        <span className="text-white/60 mr-3">טוען נתוני פעילות...</span>
      </div>
    );
  }

  // ── Push to Monday (direct API call) ────────────────────
  const MONDAY_BOARD_ID = 5093150109;
  const MONDAY_API = "https://api.monday.com/v2";

  const mondayQuery = async (token, query) => {
    const res = await fetch(MONDAY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  };

  const syncToMonday = async () => {
    if (!metrics) return;
    const token = import.meta.env.VITE_MONDAY_API_TOKEN
      || "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYzMjg0ODQ0NywiYWFpIjoxMSwidWlkIjo5NzE5MTA1OCwiaWFkIjoiMjAyNi0wMy0xM1QxNDo1ODozMi40NzZaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI4NDY3MzUsInJnbiI6ImV1YzEifQ.LPUVmeRscSwlDXCL2XCaEjMVeQ7tuEp7zP49oE9tfC8";
    if (!token) {
      toast.error("חסר VITE_MONDAY_API_TOKEN בהגדרות");
      return;
    }
    setSyncing(true);
    try {
      const dateStr = today();

      // Find existing item for today
      const boardData = await mondayQuery(token, `{
        boards(ids: [${MONDAY_BOARD_ID}]) {
          items_page(limit: 50) {
            items { id name column_values(ids: ["date_col"]) { id value } }
          }
        }
      }`);
      const items = boardData.boards[0]?.items_page?.items || [];
      let itemId = null;
      for (const item of items) {
        const dateCol = item.column_values.find((c) => c.id === "date_col");
        try { if (JSON.parse(dateCol?.value)?.date === dateStr) { itemId = item.id; break; } } catch {}
      }

      const colVals = JSON.stringify({
        date_col: { date: dateStr },
        dau: String(metrics.dau || 0),
        wau: String(metrics.wau || 0),
        mau: String(metrics.mau || 0),
        stickiness: String(metrics.stickiness || 0),
        new_users: String(metrics.newUsersCount || 0),
        total_students: String(metrics.totalStudents || 0),
        lessons: String(metrics.totalLessonsAttended || 0),
        math_answers: String(metrics.totalMathCorrect || 0),
        words: String(metrics.totalMasteredWords || 0),
        quizzes: String(metrics.totalQuizCompleted || 0),
        coinsin: String(metrics.coinsEarned || 0),
        coinsout: String(metrics.coinsSpent || 0),
        streak: String(metrics.avgStreak || 0),
        retention: String(metrics.retentionRate || 0),
        atrisk: String(metrics.atRiskUsers.length || 0),
        dormant: String(metrics.dormantUsers.length || 0),
        health: String(metrics.healthScore || 0),
      });

      if (itemId) {
        await mondayQuery(token, `mutation {
          change_multiple_column_values(board_id: ${MONDAY_BOARD_ID}, item_id: ${itemId}, column_values: ${JSON.stringify(colVals)}) { id }
        }`);
      } else {
        await mondayQuery(token, `mutation {
          create_item(board_id: ${MONDAY_BOARD_ID}, item_name: "${dateStr}", column_values: ${JSON.stringify(colVals)}) { id }
        }`);
      }

      toast.success(`סונכרן ל-Monday בהצלחה (${dateStr})`);
    } catch (err) {
      console.error("Monday sync error:", err);
      toast.error("שגיאה בסנכרון ל-Monday: " + err.message);
    }
    setSyncing(false);
  };

  if (!metrics) return null;
  const m = metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">דשבורד פעילות</h2>
          <p className="text-white/40 text-sm">סטטוס ותובנות על המשתמשים</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={range === d ? "default" : "ghost"}
              className={range === d ? "bg-purple-500 text-white" : "text-white/50"}
              onClick={() => setRange(d)}
            >
              {d}d
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load} className="text-white/50">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={syncToMonday} disabled={syncing || !metrics} className="text-white/50">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            <span className="text-xs mr-1">Monday</span>
          </Button>
        </div>
      </div>

      {/* Health Score + KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`bg-gradient-to-br border rounded-xl p-4 flex flex-col items-center justify-center ${
          m.healthScore >= 70 ? "from-green-500/20 to-green-600/10 border-green-500/30" :
          m.healthScore >= 40 ? "from-amber-500/20 to-amber-600/10 border-amber-500/30" :
          "from-red-500/20 to-red-600/10 border-red-500/30"
        }`}>
          <span className="text-white/60 text-sm mb-1">בריאות האפליקציה</span>
          <ProgressRing
            value={m.healthScore} max={100} size={70}
            color={m.healthScore >= 70 ? "#4ade80" : m.healthScore >= 40 ? "#fbbf24" : "#f87171"}
          />
          <div className="text-white/30 text-[10px] text-center leading-tight mt-1 max-w-[120px]">
            ציון משוקלל: כניסות יומיות, שימור, דביקות, משתמשים פעילים ולא רדומים
          </div>
        </div>
        <KpiCard title="משתמשים היום (DAU)" value={m.dau} icon="👥"
          subtitle={`מתוך ${m.totalStudents} — כמה נכנסו היום`}
          trend={m.yesterdayDAU > 0 ? Math.round(((m.dau - m.yesterdayDAU) / m.yesterdayDAU) * 100) : undefined}
          color="purple" />
        <KpiCard title="שבועי (WAU)" value={m.wau} icon="📅"
          subtitle={`${pct(m.wau, m.totalStudents)}% — נכנסו ב-7 ימים אחרונים`} color="blue" />
        <KpiCard title="חודשי (MAU)" value={m.mau} icon="📆"
          subtitle={`${pct(m.mau, m.totalStudents)}% — נכנסו ב-30 יום אחרונים`} color="cyan" />
        <KpiCard title="חזרו שוב" value={`${m.stickiness}%`} icon="🧲"
          subtitle="מהפעילים החודשיים — כמה חוזרים כל יום" color={m.stickiness >= 20 ? "green" : "amber"} />
        <KpiCard title="תלמידים חדשים" value={m.newUsersCount} icon="🆕"
          trend={m.newUsersTrend} subtitle={`ב-${range} ימים`} color="green" />
      </div>

      {/* DAU Chart + New Users Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              משתמשים יומיים פעילים
              <Sparkline data={m.dauByDay.map((d) => d.count)} color="#a78bfa" width={80} height={24} />
              {m.dauTrend !== 0 && (
                <span className={`text-xs ${m.dauTrend >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {m.dauTrend >= 0 ? "▲" : "▼"} {Math.abs(m.dauTrend)}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={m.dauByDay.slice(-14)}
              labelKey="label" valueKey="count"
              colorFn={(d) => d.date === today() ? "bg-purple-400" : "bg-purple-500/50"}
            />
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              תלמידים חדשים
              <Sparkline data={m.newUsersByDay.map((d) => d.count)} color="#4ade80" width={80} height={24} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={m.newUsersByDay.slice(-14)}
              labelKey="label" valueKey="count"
              colorFn={() => "bg-green-500/50"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown + Day of Week + Login Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">פעילות לפי תחום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {m.featureBreakdown.map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-white/70 text-sm flex-1">{f.name}</span>
                  <span className="text-white font-bold text-sm">{f.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
              פעילות לפי יום
              <span className="text-white/40 text-xs mr-2">(ממוצע)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={m.dayOfWeekData}
              labelKey="label" valueKey="count"
              colorFn={(d, i) => i === m.peakDayIdx ? "bg-amber-400" : "bg-blue-500/50"}
            />
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              התפלגות רצף התחברויות
              <span className="text-white/40 text-xs">(ממוצע: {m.avgStreak})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={m.streakBuckets}
              labelKey="label" valueKey="count"
              colorFn={(d) => d.label === "30+" ? "bg-amber-400" : d.label === "15-30" ? "bg-green-400" : "bg-cyan-500/50"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Retention + Economy + Learning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">שימור משתמשים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ProgressRing
                value={m.retentionRate} max={100} size={80} label="שימור 2 שבועות"
                color={m.retentionRate >= 50 ? "#4ade80" : m.retentionRate >= 25 ? "#fbbf24" : "#f87171"}
              />
              <div className="space-y-1 text-sm">
                <div className="text-white/60">קוהורט: <span className="text-white font-medium">{m.cohortUsers}</span> חדשים</div>
                <div className="text-white/60">חזרו: <span className="text-green-400 font-medium">{m.cohortRetained}</span></div>
                <div className="text-white/60">נטשו: <span className="text-red-400 font-medium">{m.cohortUsers - m.cohortRetained}</span></div>
                <div className="text-white/40 text-xs mt-2">רדומים (30+ יום): <span className="text-red-300">{m.dormantUsers.length}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">כלכלה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">הוכנסו</span>
                <span className="text-green-400 font-bold">{m.coinsEarned.toLocaleString()} 🪙</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">הוצאו</span>
                <span className="text-red-400 font-bold">{m.coinsSpent.toLocaleString()} 🪙</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="text-white/40 text-xs mb-1">מקורות הכנסה עיקריים</div>
                {m.topCoinReasons.map((r) => (
                  <div key={r.reason} className="flex justify-between text-xs">
                    <span className="text-white/50">{r.reason}</span>
                    <span className="text-white/70">{r.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">למידה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{m.avgLessonsPerStudent}</div>
                <div className="text-white/40 text-xs">שיעורים/תלמיד</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{m.totalMasteredWords}</div>
                <div className="text-white/40 text-xs">מילים נשלטו</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{m.totalMathCorrect.toLocaleString()}</div>
                <div className="text-white/40 text-xs">תשובות חשבון</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{m.totalQuizCompleted}</div>
                <div className="text-white/40 text-xs">חידונים הושלמו</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Engagement */}
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">מעורבות קבוצות (7 ימים אחרונים)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs">
                  <th className="text-right pb-2">קבוצה</th>
                  <th className="text-center pb-2">סה״כ</th>
                  <th className="text-center pb-2">פעילים</th>
                  <th className="text-center pb-2">% פעילים</th>
                  <th className="text-center pb-2">שיעורים</th>
                  <th className="text-right pb-2 w-32">מעורבות</th>
                </tr>
              </thead>
              <tbody>
                {m.groupEngagement.map((g) => (
                  <tr key={g.name} className="border-t border-white/5">
                    <td className="text-white py-2 font-medium">{g.name}</td>
                    <td className="text-white/60 text-center">{g.total}</td>
                    <td className="text-center">
                      <span className={g.activePct >= 50 ? "text-green-400" : g.activePct >= 25 ? "text-amber-400" : "text-red-400"}>
                        {g.active}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        g.activePct >= 50 ? "bg-green-500/20 text-green-400" :
                        g.activePct >= 25 ? "bg-amber-500/20 text-amber-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {g.activePct}%
                      </span>
                    </td>
                    <td className="text-white/60 text-center">{g.lessons}</td>
                    <td className="py-2">
                      <div className="bg-white/5 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            g.activePct >= 50 ? "bg-green-500/60" : g.activePct >= 25 ? "bg-amber-500/60" : "bg-red-500/60"
                          }`}
                          style={{ width: `${g.activePct}%`, minWidth: g.activePct > 0 ? "4px" : "0" }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Users */}
      {m.atRiskUsers.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-md border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              משתמשים בסיכון נטישה ({m.atRiskUsers.length})
              <span className="text-white/30 text-xs font-normal">פעילים 7-30 יום אחרונים, לא פעילים השבוע</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs">
                    <th className="text-right pb-2">שם</th>
                    <th className="text-right pb-2">קבוצה</th>
                    <th className="text-center pb-2">התחברות אחרונה</th>
                    <th className="text-center pb-2">ימים</th>
                    <th className="text-center pb-2">רצף</th>
                  </tr>
                </thead>
                <tbody>
                  {m.atRiskUsers.slice(0, 15).map((u) => (
                    <tr key={u.email} className="border-t border-white/5">
                      <td className="text-white py-1.5">{u.name}</td>
                      <td className="text-white/50">{u.group}</td>
                      <td className="text-white/50 text-center">{formatDate(u.lastLogin)}</td>
                      <td className="text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.daysSince >= 14 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {u.daysSince}
                        </span>
                      </td>
                      <td className="text-white/50 text-center">{u.streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {m.atRiskUsers.length > 15 && (
                <div className="text-white/30 text-xs mt-2 text-center">
                  ועוד {m.atRiskUsers.length - 15} משתמשים...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
