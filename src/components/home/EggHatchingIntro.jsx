import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EggHatchingIntro({ isOpen, onComplete }) {
  const [stage, setStage] = useState("video");
  const [avatarName, setAvatarName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    
    // Fallback: if video doesn't start in 2 seconds, skip to name selection
    const timer = setTimeout(() => {
      console.log("Video timeout - skipping to name selection");
      setStage("nameSelection");
    }, 2000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleVideoEnd = () => {
    console.log("Video ended, moving to name selection");
    setStage("nameSelection");
  };

  const handleVideoError = (e) => {
    console.error("Video error:", e);
    console.log("Skipping to name selection due to video error");
    setStage("nameSelection");
  };

  const handleSaveName = async () => {
    if (!avatarName.trim()) {
      toast.error("אנא בחר שם לסטארטאמון שלך");
      return;
    }

    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        avatar_name: avatarName.trim(),
        has_seen_egg_hatching: true
      });

      toast.success(`פגוש את ${avatarName.trim()}! 🎉`);
      onComplete();
    } catch (error) {
      console.error("Error saving avatar name:", error);
      toast.error("שגיאה בשמירת השם");
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-4 border-white/30 max-w-3xl p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {stage === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <video
                src="/Startamons/Startamon1/Egg.mp4"
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnd}
                onError={handleVideoError}
                onLoadStart={() => console.log("Video loading started")}
                onLoadedData={() => console.log("Video data loaded")}
                className="w-full h-auto"
                style={{ maxHeight: "80vh" }}
              />
            </motion.div>
          )}

          {stage === "nameSelection" && (
            <motion.div
              key="nameSelection"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="p-8 text-center"
            >
              {/* Startamon Image */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 1, bounce: 0.6 }}
                className="mb-6"
              >
                <img 
                  src="/Startamons/Startamon1/2.png"
                  alt="Startamon"
                  className="w-48 h-48 mx-auto drop-shadow-2xl"
                />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-black text-white mb-4"
              >
                🎉 הסטארטאמון שלך בקע! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/90 text-xl mb-8"
              >
                בחר לו שם מגניב!
              </motion.p>

              {/* Name Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="max-w-md mx-auto space-y-6"
              >
                <div className="relative">
                  <Input
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    placeholder="למשל: ספארקי, נובה, פיקסל..."
                    className="bg-white/20 border-2 border-white/40 text-white placeholder:text-white/50 text-xl text-center py-6 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-300/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && avatarName.trim()) {
                        handleSaveName();
                      }
                    }}
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleSaveName}
                    disabled={!avatarName.trim() || isSaving}
                    className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 text-white font-black text-2xl py-8 shadow-2xl border-4 border-white/50 disabled:opacity-50"
                  >
                    {isSaving ? "שומר..." : "בואו נתחיל! 🚀"}
                  </Button>
                </motion.div>

                <p className="text-white/60 text-sm">
                  💡 תוכל לשנות את השם בכל עת בדף הבית
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}