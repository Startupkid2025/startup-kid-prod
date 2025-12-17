import React, { useState, useEffect } from "react";
import { LessonParticipation } from "@/entities/LessonParticipation";
import { Lesson } from "@/entities/Lesson";
import { User } from "@/entities/User";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function Progress() {
  const [userData, setUserData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await User.me();
    
    // Get user's participations
    const myParticipations = await LessonParticipation.filter(
      { student_email: user.email, attended: true },
      "-lesson_date"
    );
    
    setUserData(user);
    
    // Prepare cumulative chart data from participations
    if (myParticipations.length > 0) {
      const allLessons = await Lesson.list();
      const lessonsMap = {};
      allLessons.forEach(lesson => {
        lessonsMap[lesson.id] = lesson;
      });

      const reversedParticipations = [...myParticipations].reverse();
      let cumulativeAI = 0;
      let cumulativePersonal = 0;
      let cumulativeSocial = 0;
      let cumulativeMoney = 0;
      
      const data = reversedParticipations.map((participation) => {
        const lesson = lessonsMap[participation.lesson_id];
        if (!lesson) return null;

        cumulativeAI += lesson.ai_tech_xp || 0;
        cumulativePersonal += lesson.personal_dev_xp || 0;
        cumulativeSocial += lesson.social_skills_xp || 0;
        cumulativeMoney += lesson.money_business_xp || 0;
        
        return {
          name: format(new Date(participation.lesson_date), "d/M", { locale: he }),
          lessonName: lesson.lesson_name,
          "בינה מלאכותית": cumulativeAI,
          "פיתוח אישי": cumulativePersonal,
          "מיומנויות חברתיות": cumulativeSocial,
          "כסף ועסקים": cumulativeMoney
        };
      }).filter(Boolean);
      
      setChartData(data);
    }
    
    setIsLoading(false);
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

  const totalXP = 
    (userData?.ai_tech_xp || 0) + 
    ((userData?.ai_tech_level || 1) - 1) * 100 +
    (userData?.personal_dev_xp || 0) + 
    ((userData?.personal_dev_level || 1) - 1) * 100 +
    (userData?.social_skills_xp || 0) + 
    ((userData?.social_skills_level || 1) - 1) * 100 +
    (userData?.money_business_xp || 0) + 
    ((userData?.money_business_level || 1) - 1) * 100;

  const stats = [
    { 
      name: "סה\"כ נקודות", 
      value: totalXP, 
      icon: "⭐",
      color: "from-yellow-400 to-orange-400"
    },
    { 
      name: "שיעורים", 
      value: userData?.total_lessons || 0, 
      icon: "📚",
      color: "from-blue-400 to-cyan-400"
    },
    { 
      name: "רמה ממוצעת", 
      value: Math.round(
        ((userData?.ai_tech_level || 1) +
        (userData?.personal_dev_level || 1) +
        (userData?.social_skills_level || 1) +
        (userData?.money_business_level || 1)) / 4
      ), 
      icon: "🎯",
      color: "from-purple-400 to-pink-400"
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-2xl border-2 border-purple-300">
          <p className="font-bold text-purple-600 mb-2">{payload[0]?.payload?.lessonName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value} נקודות מצטברות</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          ההתקדמות שלי 📈
        </h1>
        <p className="text-white/80 text-lg">
          הצמיחה המצטברת שלך לאורך זמן
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-center">
              <CardContent className="pt-6">
                <div className={`text-4xl mb-2 w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-white/70 text-sm">{stat.name}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                נקודות מצטברות לפי שיעורים
              </CardTitle>
              <p className="text-white/60 text-sm mt-2">
                הגרף מראה את הנקודות שהצטברו לך מההתחלה ועד היום
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.7)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.7)"
                    style={{ fontSize: '12px' }}
                    label={{ 
                      value: 'נקודות מצטברות', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="בינה מלאכותית" 
                    stroke="#60A5FA" 
                    strokeWidth={3}
                    dot={{ fill: '#60A5FA', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="פיתוח אישי" 
                    stroke="#34D399" 
                    strokeWidth={3}
                    dot={{ fill: '#34D399', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="מיומנויות חברתיות" 
                    stroke="#F472B6" 
                    strokeWidth={3}
                    dot={{ fill: '#F472B6', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="כסף ועסקים" 
                    stroke="#FBBF24" 
                    strokeWidth={3}
                    dot={{ fill: '#FBBF24', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-white mb-2">אין עדיין נתונים להצגה</h3>
          <p className="text-white/70">התחל להשתתף בשיעורים כדי לראות את ההתקדמות שלך!</p>
        </motion.div>
      )}

      {/* Skills Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">סיכום מיומנויות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "בינה מלאכותית", icon: "🤖", level: userData?.ai_tech_level, xp: userData?.ai_tech_xp },
                { name: "פיתוח אישי", icon: "🌱", level: userData?.personal_dev_level, xp: userData?.personal_dev_xp },
                { name: "מיומנויות חברתיות", icon: "❤️", level: userData?.social_skills_level, xp: userData?.social_skills_xp },
                { name: "כסף ועסקים", icon: "💸", level: userData?.money_business_level, xp: userData?.money_business_xp }
              ].map((skill) => (
                <div key={skill.name} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <p className="font-bold text-white">{skill.name}</p>
                  </div>
                  <p className="text-white/70 text-sm">
                    רמה {skill.level} • {skill.xp}/100 XP
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}