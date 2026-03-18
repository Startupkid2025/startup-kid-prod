import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BirthdayDialog({ isOpen, onComplete }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValid = () => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    if (!d || !m || !y) return false;
    if (d < 1 || d > 31 || m < 1 || m > 12) return false;
    if (y < 2000 || y > new Date().getFullYear()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isValid()) {
      toast.error("נא להזין תאריך לידה תקין");
      return;
    }

    const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

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

          <div className="flex gap-2 items-center justify-center">
            {/* Day */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/70 text-xs font-bold">יום</span>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="DD"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/40 text-center text-xl py-5 w-20 [color-scheme:dark]"
              />
            </div>
            <span className="text-white text-2xl font-black mt-5">/</span>
            {/* Month */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/70 text-xs font-bold">חודש</span>
              <Input
                type="number"
                min="1"
                max="12"
                placeholder="MM"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/40 text-center text-xl py-5 w-20 [color-scheme:dark]"
              />
            </div>
            <span className="text-white text-2xl font-black mt-5">/</span>
            {/* Year */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/70 text-xs font-bold">שנה</span>
              <Input
                type="number"
                min="2000"
                max={new Date().getFullYear()}
                placeholder="YYYY"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/40 text-center text-xl py-5 w-24 [color-scheme:dark]"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValid() || isSaving}
            className="w-full bg-white text-purple-700 hover:bg-white/90 font-black text-lg py-6"
          >
            {isSaving ? "שומר..." : "המשך 🚀"}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}