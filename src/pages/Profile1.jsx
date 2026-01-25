import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, LogOut, Coins } from "lucide-react";
import MissionsCard from "../components/profile/MissionsCard";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editData, setEditData] = useState({
    age: "",
    bio: "",
    phone_number: ""
  });
  const [actualLessonsCount, setActualLessonsCount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = await base44.auth.me();
    setUserData(user);
    setEditData({
      age: user.age || "",
      bio: user.bio || "",
      phone_number: user.phone_number || ""
    });

    // Calculate actual attended lessons
    try {
      const participations = await base44.entities.LessonParticipation.filter({
        student_email: user.email,
        attended: true
      });
      setActualLessonsCount(participations.length);
    } catch (error) {
      console.error("Error loading participations:", error);
      setActualLessonsCount(0);
    }

    setIsLoading(false);
  };

  const handleSave = async () => {
    const oldUserData = { ...userData };
    
    // Calculate coins for completing profile fields
    let coinsToAdd = 0;
    
    // Age: 20 coins if just filled
    if (!oldUserData.age && editData.age) {
      coinsToAdd += 20;
    }
    
    // Bio: 30 coins if just filled with more than 10 characters
    if ((!oldUserData.bio || oldUserData.bio.length <= 10) && editData.bio && editData.bio.length > 10) {
      coinsToAdd += 30;
    }
    
    // Phone: 20 coins if just filled
    if (!oldUserData.phone_number && editData.phone_number) {
      coinsToAdd += 20;
    }
    
    // Update user data with new coins
    await base44.auth.updateMe({
      ...editData,
      coins: (userData.coins || 0) + coinsToAdd
    });

    // Sync to LeaderboardEntry for public visibility
    await syncLeaderboardEntry(userData.email, {
      coins: (userData.coins || 0) + coinsToAdd,
      age: editData.age,
      bio: editData.bio,
      phone_number: editData.phone_number
    });
    
    setIsEditing(false);
    loadUserData();
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleCompleteTask = async (taskId) => {
    let coinsToAdd = 0;
    let updates = {};

    if (taskId === "instagram") {
      coinsToAdd = 50;
      updates.completed_instagram_follow = true;
    } else if (taskId === "youtube") {
      coinsToAdd = 50;
      updates.completed_youtube_subscribe = true;
    } else if (taskId === "facebook") {
      coinsToAdd = 50;
      updates.completed_facebook_follow = true;
    } else if (taskId === "discord") {
      coinsToAdd = 50;
      updates.completed_discord_join = true;
    } else if (taskId === "share") {
      coinsToAdd = 100;
      updates.completed_share = true;
    }

    if (coinsToAdd > 0) {
      updates.coins = (userData.coins || 0) + coinsToAdd;
      await base44.auth.updateMe(updates);
      
      // Sync to LeaderboardEntry for public visibility
      await syncLeaderboardEntry(userData.email, {
        coins: (userData.coins || 0) + coinsToAdd,
        ...updates
      });
      
      loadUserData();
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
          👤
        </motion.div>
      </div>
    );
  }

  const totalLevels =
    (userData?.ai_tech_level || 1) +
    (userData?.personal_dev_level || 1) +
    (userData?.social_skills_level || 1) +
    (userData?.money_business_level || 1);

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">
          הפרופיל שלי 👤
        </h1>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">מידע אישי</CardTitle>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="bg-white/20 hover:bg-white/30"
                >
                  <Edit2 className="w-4 h-4 ml-2" />
                  ערוך
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Save className="w-4 h-4 ml-2" />
                  שמור
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-white/70 text-sm">שם מלא</Label>
              <p className="text-xl font-bold text-white mt-1">{userData?.first_name + " " + userData?.last_name}</p>
            </div>

            {/* Email */}
            <div>
              <Label className="text-white/70 text-sm">אימייל</Label>
              <p className="text-white mt-1">{userData?.email}</p>
            </div>

            {/* Age */}
            <div>
              <Label htmlFor="age" className="text-white/70 text-sm flex items-center gap-2">
                גיל
                {!userData?.age && (
                  <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +20
                  </span>
                )}
              </Label>
              {isEditing ? (
                <Input
                  id="age"
                  type="number"
                  min="10"
                  max="16"
                  value={editData.age || ""}
                  onChange={(e) => setEditData({ ...editData, age: Number(e.target.value) })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                />
              ) : (
                <p className="text-white mt-1">{userData?.age || "לא צוין"}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-white/70 text-sm flex items-center gap-2">
                קצת עליי
                {(!userData?.bio || userData.bio.length <= 10) && (
                  <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +30
                  </span>
                )}
              </Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white h-24"
                  placeholder="ספר/י משהו על עצמך..."
                />
              ) : (
                <p className="text-white mt-1">{userData?.bio || "לא צוין"}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone" className="text-white/70 text-sm flex items-center gap-2">
                מספר טלפון
                {!userData?.phone_number && (
                  <span className="bg-yellow-500/20 text-yellow-200 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +20
                  </span>
                )}
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={editData.phone_number || ""}
                  onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                  className="mt-1 bg-white/10 border-white/20 text-white"
                  placeholder="05X-XXXXXXX"
                />
              ) : (
                <p className="text-white mt-1">{userData?.phone_number || "לא צוין"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Missions Card - Now below profile info */}
        <MissionsCard 
          userData={userData}
          onCompleteTask={handleCompleteTask}
          onStartEditing={() => setIsEditing(true)}
        />

        {/* Stats Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6 mt-6">
          <CardHeader>
            <CardTitle className="text-white">סטטיסטיקות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-yellow-300 mb-1">
                  {actualLessonsCount}
                </p>
                <p className="text-white/70 text-sm">שיעורים</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-purple-300 mb-1">
                  {totalLevels}
                </p>
                <p className="text-white/70 text-sm">סה"כ רמות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
        >
          <LogOut className="w-5 h-5 ml-2" />
          התנתק
        </Button>
      </motion.div>
    </div>
  );
}