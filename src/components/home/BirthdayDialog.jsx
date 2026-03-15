import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BirthdayDialog({ isOpen, onComplete }) {
  const [birthDate, setBirthDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!birthDate) {
      toast.error("נא להזין תאריך לידה");
      return;
    }

    setIsSaving(true);
    try {
      await base44.auth.updateMe({ birth_date: birthDate });
      toast.success("🎂 תאריך הלידה נשמר!");
      onComplete();
    } catch (error) {
      console.error("Error saving birth date:", error);
      toast.error("שגיאה בשמירת תאריך הלידה");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-white/20 text-white max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white text-center">
            🎂 תאריך הלידה שלך
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 py-2"
        >
          <p className="text-white/90 text-center text-base">
            כדי שנוכל להכיר אותך טוב יותר,<br />אנא הזן את תאריך הלידה שלך
          </p>

          <div className="text-center text-5xl mb-2">🎉</div>

          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            min="2000-01-01"
            className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center text-lg py-5 [color-scheme:dark]"
          />

          <Button
            onClick={handleSave}
            disabled={!birthDate || isSaving}
            className="w-full bg-white text-purple-700 hover:bg-white/90 font-black text-lg py-6"
          >
            {isSaving ? "שומר..." : "המשך 🚀"}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}