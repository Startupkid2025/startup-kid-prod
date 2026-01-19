import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Search, Eye } from "lucide-react";

export default function EconomyAdminPanel() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] });
  const [debugStudent, setDebugStudent] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.StudentEconomySnapshot.list('-total_assets');
      setSnapshots(data);
    } catch (error) {
      console.error("Error loading snapshots:", error);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredSnapshots.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredSnapshots.map(s => s.student_email)));
    }
  };

  const toggleSelect = (email) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const recalculateSelected = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    if (!confirm(`לחשב מחדש עבור ${selectedEmails.size} תלמידים?`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: selectedEmails.size, errors: [] });

    const emails = Array.from(selectedEmails);
    const errors = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const { recalculateStudentEconomySnapshot } = await import("@/functions/recalculateStudentEconomySnapshot");
        await recalculateStudentEconomySnapshot(emails[i], "admin_selected");
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${emails[i]}:`, error);
        errors.push({ email: emails[i], error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);
    
    if (errors.length === 0) {
      toast.success(`✅ חושב מחדש עבור ${selectedEmails.size} תלמידים`);
    } else {
      toast.warning(`⚠️ ${selectedEmails.size - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
    setSelectedEmails(new Set());
  };

  const recalculateAll = async () => {
    if (!confirm(`⚠️ לחשב מחדש עבור כל ${snapshots.length} התלמידים?`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: snapshots.length, errors: [] });

    const errors = [];

    for (let i = 0; i < snapshots.length; i++) {
      try {
        const { recalculateStudentEconomySnapshot } = await import("@/functions/recalculateStudentEconomySnapshot");
        await recalculateStudentEconomySnapshot(snapshots[i].student_email, "admin_all");
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${snapshots[i].student_email}:`, error);
        errors.push({ email: snapshots[i].student_email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);
    
    if (errors.length === 0) {
      toast.success(`✅ חושב מחדש עבור כל התלמידים`);
    } else {
      toast.warning(`⚠️ ${snapshots.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
  };

  const showDebugBreakdown = async (snapshot) => {
    setDebugStudent(snapshot);
    setShowDebug(true);
  };

  const filteredSnapshots = snapshots.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(query) ||
      s.student_email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Economy Admin Panel</h2>
        <Button onClick={loadSnapshots} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Search and Actions */}
      <div className="bg-white/10 rounded-xl p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש לפי שם או אימייל..."
              className="pr-10 bg-white/5 border-white/20 text-white"
            />
          </div>
          <Button onClick={toggleSelectAll} variant="outline">
            {selectedEmails.size === filteredSnapshots.length ? "בטל הכל" : "בחר הכל"}
          </Button>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={recalculateSelected}
            disabled={isRecalculating || selectedEmails.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg border-2 border-emerald-400/50"
          >
            🔄 חשב מחדש ({selectedEmails.size})
          </Button>
          <Button
            onClick={recalculateAll}
            disabled={isRecalculating}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg border-2 border-orange-400/50"
          >
            🚨 חשב הכל ({snapshots.length})
          </Button>
        </div>

        {isRecalculating && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">
                מעדכן... {progress.current} / {progress.total}
              </span>
              <span className="text-white/60">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.errors.length > 0 && (
              <div className="mt-2 text-red-400 text-sm">
                {progress.errors.length} שגיאות
              </div>
            )}
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-right">
                <th className="px-4 py-3 text-white font-bold">✓</th>
                <th className="px-4 py-3 text-white font-bold">שם</th>
                <th className="px-4 py-3 text-white font-bold">אימייל</th>
                <th className="px-4 py-3 text-white font-bold">💰 עו״ש</th>
                <th className="px-4 py-3 text-white font-bold">📈 השקעות</th>
                <th className="px-4 py-3 text-white font-bold">🎨 פריטים</th>
                <th className="px-4 py-3 text-white font-bold">🏆 שווי כולל</th>
                <th className="px-4 py-3 text-white font-bold">🕐 עודכן</th>
                <th className="px-4 py-3 text-white font-bold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snapshot) => (
                <tr key={snapshot.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedEmails.has(snapshot.student_email)}
                      onCheckedChange={() => toggleSelect(snapshot.student_email)}
                    />
                  </td>
                  <td className="px-4 py-3 text-white font-bold">
                    {snapshot.full_name}
                  </td>
                  <td className="px-4 py-3 text-white/70 text-sm">
                    {snapshot.student_email}
                  </td>
                  <td className="px-4 py-3 text-white font-bold">
                    {snapshot.coins_cash?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {snapshot.investments_value?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-purple-400">
                    {snapshot.items_value?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-yellow-400 font-bold text-lg">
                    {snapshot.total_assets?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm">
                    {snapshot.last_calculated_at 
                      ? new Date(snapshot.last_calculated_at).toLocaleString('he-IL')
                      : 'לא עודכן'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => showDebugBreakdown(snapshot)}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug Dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              🔍 Breakdown - {debugStudent?.full_name}
            </DialogTitle>
          </DialogHeader>

          {debugStudent && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/60 text-sm">עובר ושב</div>
                  <div className="text-2xl font-bold">{debugStudent.coins_cash?.toLocaleString()}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/60 text-sm">השקעות</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {debugStudent.investments_value?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/60 text-sm">פריטים</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {debugStudent.items_value?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/60 text-sm">שווי כולל</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {debugStudent.total_assets?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Income Breakdown */}
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-xl font-bold mb-3">📈 הכנסות</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(debugStudent.income_breakdown || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-white/70">{key}:</span>
                      <span className="text-emerald-400 font-bold">{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex justify-between font-bold">
                  <span>סה״כ הכנסות:</span>
                  <span className="text-emerald-400">
                    {Object.values(debugStudent.income_breakdown || {})
                      .reduce((sum, val) => sum + val, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-xl font-bold mb-3">📉 הוצאות</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(debugStudent.expense_breakdown || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-white/70">{key}:</span>
                      <span className="text-red-400 font-bold">{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex justify-between font-bold">
                  <span>סה״כ הוצאות:</span>
                  <span className="text-red-400">
                    {Object.values(debugStudent.expense_breakdown || {})
                      .reduce((sum, val) => sum + val, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Investment Info */}
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-xl font-bold mb-3">💼 השקעות</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">שווי נוכחי:</span>
                    <span className="font-bold">{debugStudent.investments_value?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">רווח לא ממומש:</span>
                    <span className={`font-bold ${debugStudent.investment_profit_unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {debugStudent.investment_profit_unrealized?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">רווח ממומש:</span>
                    <span className="font-bold text-emerald-400">
                      {debugStudent.investment_profit_realized?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}