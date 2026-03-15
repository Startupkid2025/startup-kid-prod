import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

export default function ManageGroupStudentsDialog({ isOpen, onClose, group, allStudents, onSubmit, allGroups = [], onGroupChange }) {
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(group?.id);

  useEffect(() => {
    if (group) {
      setSelectedEmails(group.student_emails || []);
    }
  }, [group]);

  const handleToggleStudent = (email) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const handleSubmit = () => {
    onSubmit(selectedEmails);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-purple-300 max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-600 text-center flex items-center justify-center gap-2">
            <Users className="w-6 h-6" />
            ניהול תלמידים בקבוצה
          </DialogTitle>
          <p className="text-sm text-gray-600 text-center mt-2">
            {group?.group_name}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="bg-purple-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-purple-800 text-center font-medium">
              {selectedEmails.length} תלמידים נבחרו
            </p>
          </div>

          {allStudents.map((student) => {
            const isSelected = selectedEmails.includes(student.email);
            
            return (
              <div
                key={student.id}
                className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? "bg-purple-50 border-purple-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <Checkbox
                  id={student.id}
                  checked={isSelected}
                  onCheckedChange={() => handleToggleStudent(student.email)}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label
                  htmlFor={student.id}
                  className="flex-1 cursor-pointer"
                >
                  <p className="font-medium text-gray-900">
                    {student.first_name && student.last_name 
                      ? `${student.first_name} ${student.last_name}`
                      : student.full_name}
                  </p>
                  <p className="text-xs text-gray-500">{student.email}</p>
                </Label>
              </div>
            );
          })}

          {allStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              אין תלמידים במערכת
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
          >
            שמור שינויים ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}