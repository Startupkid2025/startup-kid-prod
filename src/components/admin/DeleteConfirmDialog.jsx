import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DeleteConfirmDialog({ isOpen, onClose, onConfirm, lessonName, participantCount }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-red-300 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-red-600">
              מחיקת שיעור
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-700 text-base pt-4">
            האם אתה בטוח שברצונך למחוק את השיעור{" "}
            <span className="font-bold text-gray-900">"{lessonName}"</span>?
            
            {participantCount > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">
                  ⚠️ שים לב: {participantCount} תלמידים משתתפים בשיעור זה.
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  מחיקת השיעור תסיר את כל ההשתתפויות ותעדכן את הנקודות של התלמידים.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
          >
            מחק שיעור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}