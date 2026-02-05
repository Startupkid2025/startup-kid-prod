import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, LogOut, Coins, Trash2 } from "lucide-react";
import MissionsCard from "../components/profile/MissionsCard";
import { syncLeaderboardEntry } from "../components/utils/leaderboardSync";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
    
    const oldCoins = userData.coins || 0;
    const newCoins = oldCoins + coinsToAdd;
    const newProfileCompletionCoins = (userData.profile_completion_coins || 0) + coinsToAdd;
    
    // Log coin change if earned
    if (coinsToAdd > 0) {
      try {
        const { logCoinChange } = await import("../components/utils/coinLogger");
        await logCoinChange(userData.email, oldCoins, newCoins, "השלמת פרטי פרופיל", {
          source: 'Profile',
          details: Object.keys(editData).filter(k => editData[k] && editData[k] !== oldUserData[k]).join(', '),
          coinsEarned: coinsToAdd
        });
      } catch (logError) {
        console.error("Error logging profile completion coins:", logError);
      }
    }
    
    // Update user data with new coins
    await base44.auth.updateMe({
      ...editData,
      coins: newCoins,
      profile_completion_coins: newProfileCompletionCoins
    });

    // Sync to LeaderboardEntry for public visibility
    await syncLeaderboardEntry(userData.email, {
      coins: newCoins,
      profile_completion_coins: newProfileCompletionCoins,
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "STARTUPKID") {
      toast.error("יש לכתוב STARTUPKID בדיוק כדי לאשר מחיקה");
      return;
    }

    setIsDeleting(true);
    try {
      const userEmail = userData.email;

      // Delete all user-related data
      const entitiesToDelete = [
        'CoinLog',
        'WordProgress',
        'MathProgress',
        'LessonParticipation',
        'QuizProgress',
        'Investment',
        'Post',
        'LeaderboardEntry'
      ];

      for (const entityName of entitiesToDelete) {
        try {
          const records = await base44.entities[entityName].filter({ student_email: userEmail });
          for (const record of records) {
            try {
              await base44.entities[entityName].delete(record.id);
            } catch (deleteErr) {
              // Ignore 404 errors (already deleted)
              if (deleteErr.message && !deleteErr.message.includes('not found')) {
                console.error(`Error deleting ${entityName} record:`, deleteErr);
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching ${entityName}:`, err);
        }
      }

      // Delete posts by author_email
      try {
        const posts = await base44.entities.Post.filter({ author_email: userEmail });
        for (const post of posts) {
          try {
            await base44.entities.Post.delete(post.id);
          } catch (deleteErr) {
            if (deleteErr.message && !deleteErr.message.includes('not found')) {
              console.error("Error deleting post:", deleteErr);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching posts:", err);
      }

      // Remove from groups
      try {
        const groups = await base44.entities.Group.list();
        for (const group of groups) {
          if (group.student_emails && group.student_emails.includes(userEmail)) {
            await base44.entities.Group.update(group.id, {
              student_emails: group.student_emails.filter(email => email !== userEmail)
            });
          }
        }
      } catch (err) {
        console.error("Error removing from groups:", err);
      }

      // Delete the User entity itself
      try {
        const users = await base44.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          try {
            await base44.entities.User.delete(users[0].id);
          } catch (deleteErr) {
            if (deleteErr.message && !deleteErr.message.includes('not found')) {
              console.error("Error deleting user record:", deleteErr);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }

      toast.success("החשבון נמחק בהצלחה");
      
      // Logout and redirect
      await base44.auth.logout();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("שגיאה במחיקת החשבון");
      setIsDeleting(false);
    }
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
      const oldCoins = userData.coins || 0;
      updates.coins = oldCoins + coinsToAdd;
      
      // Log coin change
      try {
        const { logCoinChange } = await import("../components/utils/coinLogger");
        const taskNames = {
          instagram: "עקיבה באינסטגרם",
          youtube: "הרשמה ליוטיוב",
          facebook: "עקיבה בפייסבוק",
          discord: "הצטרפות לדיסקורד",
          share: "שיתוף"
        };
        await logCoinChange(userData.email, oldCoins, updates.coins, taskNames[taskId] || "משימת פרופיל", {
          source: 'Profile - Missions',
          task: taskId
        });
      } catch (logError) {
        console.error("Error logging mission coins:", logError);
      }
      
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
          className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white mb-4"
        >
          <LogOut className="w-5 h-5 ml-2" />
          התנתק
        </Button>

        {/* Delete Account Button */}
        <Button
          onClick={() => setShowDeleteDialog(true)}
          variant="outline"
          className="w-full bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-200"
        >
          <Trash2 className="w-5 h-5 ml-2" />
          מחק חשבון לצמיתות
        </Button>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-500/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white text-center">
              ⚠️ אזהרה - מחיקת חשבון
            </DialogTitle>
            <DialogDescription className="text-red-200 text-center text-base">
              פעולה זו תמחק את כל הנתונים שלך לצמיתות ולא ניתן לשחזרם!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-red-950/50 rounded-lg p-4 space-y-2 text-red-200">
              <p className="font-bold">מה יימחק:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>כל המטבעות וההשקעות שלך</li>
                <li>כל התקדמות הלמידה (אנגלית, חשבון)</li>
                <li>ההיסטוריה של השיעורים</li>
                <li>הפוסטים והתגובות שלך</li>
                <li>הסטארטאמון והאביזרים שלך</li>
                <li>כל הנתונים האישיים</li>
              </ul>
            </div>

            <div>
              <Label className="text-white font-bold mb-2 block">
                כתוב <span className="text-yellow-300">STARTUPKID</span> כדי לאשר:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="STARTUPKID"
                className="bg-white/10 border-red-500/50 text-white placeholder:text-white/50"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText("");
                }}
                variant="outline"
                className="flex-1 bg-white/10 hover:bg-white/20 border-white/30 text-white"
                disabled={isDeleting}
              >
                ביטול
              </Button>
              <Button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "STARTUPKID" || isDeleting}
              >
                {isDeleting ? "מוחק..." : "מחק את החשבון שלי"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}