import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react"; // Removed Users import as it's no longer used
import { toast } from "sonner";
import EggHatchingIntro from "./EggHatchingIntro";

export default function GroupSelectionDialog({ isOpen, onComplete }) {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showEggHatching, setShowEggHatching] = useState(false);

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    try {
      const allGroups = await base44.entities.Group.list();
      setGroups(allGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("שגיאה בטעינת קבוצות");
    }
    setIsLoading(false);
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setShowNameInput(true);
  };

  const handleConfirmDetails = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("אנא הזן שם ושם משפחה");
      return;
    }

    try {
      console.log("Starting handleConfirmDetails...");
      const user = await base44.auth.me();
      console.log("Got user:", user.email);
      
      // Add user to group's student_emails
      const currentStudents = selectedGroup.student_emails || [];
      if (!currentStudents.includes(user.email)) {
        console.log("Adding user to group...");
        await base44.entities.Group.update(selectedGroup.id, {
          student_emails: [...currentStudents, user.email]
        });
      }

      // Mark that user has selected a group and save name
      console.log("Updating user profile...");
      await base44.auth.updateMe({
        has_selected_group: true,
        user_type: "student",
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`
      });

      console.log("Profile updated, showing success...");
      toast.success(`הצטרפת לקבוצה ${selectedGroup.group_name}! 🎉`);
      
      // Show egg hatching animation
      console.log("Showing egg hatching...");
      setShowEggHatching(true);
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error(`שגיאה בהצטרפות לקבוצה: ${error.message}`);
    }
  };

  const handleNotRegistered = async () => {
    setSelectedGroup(null);
    setShowNameInput(true);
  };

  const handleConfirmDemoDetails = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("אנא הזן שם ושם משפחה");
      return;
    }

    try {
      console.log("Starting handleConfirmDemoDetails...");
      await base44.auth.updateMe({
        has_selected_group: true,
        user_type: "demo",
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`
      });

      console.log("Demo profile updated, showing success...");
      toast.info("נרשמת כמשתמש דמו - תוכל לשחק באופן חופשי! 🎮");
      
      // Show egg hatching animation
      console.log("Showing egg hatching...");
      setShowEggHatching(true);
    } catch (error) {
      console.error("Error setting demo mode:", error);
      toast.error(`שגיאה בהגדרת מצב דמו: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-white/20 max-w-lg">
          <div className="text-center py-8">
            <motion.div
              className="text-4xl mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              ⏳
            </motion.div>
            <p className="text-white">טוען קבוצות...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showNameInput) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-white text-center mb-2">
              בוא נכיר! 👋
            </DialogTitle>
            <p className="text-white/90 text-center text-lg">
              איך קוראים לך?
            </p>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div>
              <label className="text-white font-bold mb-2 block">שם פרטי</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="הזן שם פרטי"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-lg"
              />
            </div>

            <div>
              <label className="text-white font-bold mb-2 block">שם משפחה</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="הזן שם משפחה"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-lg"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowNameInput(false);
                  setFirstName("");
                  setLastName("");
                  setSelectedGroup(null);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-6"
              >
                חזור
              </Button>
              <Button
                onClick={selectedGroup ? handleConfirmDetails : handleConfirmDemoDetails}
                disabled={!firstName.trim() || !lastName.trim()}
                className="flex-1 bg-white hover:bg-white/90 text-purple-600 font-bold text-lg py-6"
              >
                בואו נתחיל! 🚀
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <EggHatchingIntro 
        isOpen={showEggHatching} 
        onComplete={onComplete}
      />
      
      <Dialog open={isOpen && !showEggHatching} onOpenChange={() => {}}>
        <DialogContent className="bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-white text-center mb-2">
              ברוך הבא לסטארטאפ קיד! 🚀
            </DialogTitle>
            <p className="text-white/90 text-center text-lg">
              באיזו קבוצה אתה לומד?
            </p>
          </DialogHeader>

        <div className="space-y-4 py-6">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => handleSelectGroup(group)}
                className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/20 hover:bg-white/20 transition-all text-right"
              >
                <h3 className="text-2xl font-bold text-white mb-3">
                  {group.group_name}
                </h3>
                <div className="flex flex-wrap gap-4 text-white/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>יום {dayNames[group.day_of_week]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>שעה {group.hour}</span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}

          {groups.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/70 mb-4">אין עדיין קבוצות במערכת</p>
            </div>
          )}

          {/* Not Registered Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={handleNotRegistered}
              className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-6 border-2 border-white/10 hover:bg-white/10 transition-all text-center"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                🎮 לא נרשמתי עדיין
              </h3>
              <p className="text-white/70 text-sm">
                תוכל לשחק באופן חופשי ולחקור את האפליקציה
              </p>
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}