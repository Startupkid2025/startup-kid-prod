import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function MaintenanceModeToggle() {
  const [maintenanceMode, setMaintenanceMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMaintenanceMode();
  }, []);

  const loadMaintenanceMode = async () => {
    try {
      const modes = await base44.entities.MaintenanceMode.list();
      if (modes.length > 0) {
        setMaintenanceMode(modes[0]);
        setMessage(modes[0].message || "");
      } else {
        // Create default
        const newMode = await base44.entities.MaintenanceMode.create({
          is_active: false,
          message: "האפליקציה במצב תחזוקה. נחזור בקרוב!"
        });
        setMaintenanceMode(newMode);
        setMessage(newMode.message);
      }
    } catch (error) {
      console.error("Error loading maintenance mode:", error);
      toast.error("שגיאה בטעינת מצב תחזוקה");
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenanceMode = async (activate) => {
    if (!maintenanceMode) return;

    const confirmMessage = activate
      ? "⚠️ להפעיל מצב תחזוקה?\n\nכל התלמידים לא יוכלו להיכנס לאפליקציה!"
      : "✅ לכבות מצב תחזוקה?\n\nהתלמידים יוכלו שוב להשתמש באפליקציה.";

    if (!confirm(confirmMessage)) return;

    setIsSaving(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.MaintenanceMode.update(maintenanceMode.id, {
        is_active: activate,
        message: message,
        updated_by: currentUser.email
      });

      await loadMaintenanceMode();
      toast.success(activate ? "🔧 מצב תחזוקה הופעל" : "✅ מצב תחזוקה כובה");
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      toast.error("שגיאה בעדכון מצב תחזוקה");
    } finally {
      setIsSaving(false);
    }
  };

  const updateMessage = async () => {
    if (!maintenanceMode) return;

    setIsSaving(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.MaintenanceMode.update(maintenanceMode.id, {
        message: message,
        updated_by: currentUser.email
      });

      await loadMaintenanceMode();
      toast.success("הודעה עודכנה");
    } catch (error) {
      console.error("Error updating message:", error);
      toast.error("שגיאה בעדכון הודעה");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6 text-center text-white">
          טוען...
        </CardContent>
      </Card>
    );
  }

  const isActive = maintenanceMode?.is_active;

  return (
    <Card className={`backdrop-blur-md border-2 ${
      isActive 
        ? 'bg-red-500/20 border-red-500/50' 
        : 'bg-green-500/20 border-green-500/50'
    }`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          {isActive ? (
            <>
              <AlertTriangle className="w-6 h-6 text-red-300" />
              מצב תחזוקה פעיל 🔧
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 text-green-300" />
              האפליקציה פעילה ✅
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-4 rounded-lg ${
          isActive ? 'bg-red-500/30' : 'bg-green-500/30'
        }`}>
          <p className="text-white font-bold text-center">
            {isActive 
              ? "⚠️ תלמידים לא יכולים להשתמש באפליקציה"
              : "✅ תלמידים יכולים להשתמש באפליקציה"
            }
          </p>
        </div>

        <div>
          <label className="text-white text-sm font-bold mb-2 block">
            הודעה לתלמידים:
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-white/10 border-white/20 text-white min-h-24"
            placeholder="הודעה להציג במצב תחזוקה..."
          />
          <Button
            onClick={updateMessage}
            disabled={isSaving}
            size="sm"
            className="mt-2 bg-white/20 hover:bg-white/30 text-white"
          >
            עדכן הודעה
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => toggleMaintenanceMode(!isActive)}
            disabled={isSaving}
            className={`flex-1 font-bold text-lg py-6 ${
              isActive
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isActive ? '✅ כבה מצב תחזוקה' : '🔧 הפעל מצב תחזוקה'}
          </Button>
        </div>

        {maintenanceMode?.updated_by && (
          <p className="text-white/60 text-xs text-center">
            עודכן לאחרונה על ידי: {maintenanceMode.updated_by}
          </p>
        )}
      </CardContent>
    </Card>
  );
}