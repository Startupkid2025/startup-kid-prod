import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Coins } from "lucide-react";
import { motion } from "framer-motion";

export default function MissionsCard({ userData, onCompleteTask, onStartEditing }) {
  const allMissions = [
    {
      id: "profile",
      title: "מלא את הפרופיל שלך",
      description: "הוסף גיל, ביו ומספר טלפון",
      reward: 70,
      completed: userData?.age && userData?.bio && userData?.bio.length > 10 && userData?.phone_number,
      action: () => onStartEditing(),
      actionText: "מלא עכשיו",
      icon: "👤",
      minAge: 0
    },
    {
      id: "instagram",
      title: "עקוב אחרינו באינסטגרם",
      description: "@startup_kid_",
      reward: 50,
      completed: userData?.completed_instagram_follow,
      action: () => {
        window.open("https://www.instagram.com/startup_kid_/", "_blank");
        onCompleteTask("instagram");
      },
      actionText: "עקוב עכשיו",
      icon: "📸",
      minAge: 11
    },
    {
      id: "youtube",
      title: "הירשם לערוץ היוטיוב",
      description: "Startup Kid",
      reward: 50,
      completed: userData?.completed_youtube_subscribe,
      action: () => {
        window.open("https://www.youtube.com/@Startup-kid", "_blank");
        onCompleteTask("youtube");
      },
      actionText: "הירשם עכשיו",
      icon: "🎬",
      minAge: 11
    },
    {
      id: "facebook",
      title: "עקוב אחרינו בפייסבוק",
      description: "Startup Kid",
      reward: 50,
      completed: userData?.completed_facebook_follow,
      action: () => {
        window.open("https://www.facebook.com/profile.php?id=61580855076416", "_blank");
        onCompleteTask("facebook");
      },
      actionText: "עקוב עכשיו",
      icon: "👥",
      minAge: 11
    },
    {
      id: "discord",
      title: "הצטרף לשרת הדיסקורד",
      description: "תצטרף לקהילת התלמידים שלנו",
      reward: 50,
      completed: userData?.completed_discord_join,
      action: () => {
        window.open("https://discord.gg/UknsPbhT", "_blank");
        onCompleteTask("discord");
      },
      actionText: "הצטרף עכשיו",
      icon: "🎮",
      minAge: 11
    },
    {
      id: "share",
      title: "שתף עם חברים",
      description: "הזמן חבר להצטרף לקורס",
      reward: 100,
      completed: userData?.completed_share,
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: "סטארטאפ קיד",
            text: "בוא תצטרף אליי לקורס סטארטאפ קיד! 🚀",
            url: window.location.origin
          }).then(() => {
            onCompleteTask("share");
          });
        } else {
          navigator.clipboard.writeText(window.location.origin);
          onCompleteTask("share");
          alert("הקישור הועתק! שתף אותו עם חברים");
        }
      },
      actionText: "שתף עכשיו",
      icon: "🔗",
      minAge: 11
    }
  ];

  // Filter missions based on age
  const userAge = userData?.age || 0;
  const missions = allMissions.filter(mission => mission.minAge <= userAge);

  const completedCount = missions.filter(m => m.completed).length;
  const totalReward = missions.reduce((sum, m) => sum + m.reward, 0);
  const earnedReward = missions.filter(m => m.completed).reduce((sum, m) => sum + m.reward, 0);

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            🎯 משימות בונוס
          </CardTitle>
          <div className="text-sm text-white/70">
            {completedCount}/{missions.length} הושלמו
          </div>
        </div>
        <div className="mt-2 bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <span className="text-yellow-200 text-sm">סה"כ פוטנציאל רווח:</span>
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 font-bold">{earnedReward}/{totalReward}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border-2 ${
              mission.completed
                ? "bg-green-500/10 border-green-500/30"
                : "bg-white/5 border-white/10 hover:border-white/20"
            } transition-all`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{mission.icon}</span>
                  <h4 className="font-bold text-white">{mission.title}</h4>
                  {mission.completed && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </div>
                <p className="text-white/60 text-sm mb-2">{mission.description}</p>
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +{mission.reward}
                  </div>
                </div>
              </div>
              {!mission.completed && (
                <Button
                  onClick={mission.action}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold whitespace-nowrap"
                >
                  {mission.actionText}
                  <ExternalLink className="w-3 h-3 mr-1" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}