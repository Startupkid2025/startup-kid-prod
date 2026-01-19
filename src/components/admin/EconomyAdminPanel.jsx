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
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, errors: [] });
  const [debugStudent, setDebugStudent] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      // Check admin permissions first
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        toast.error("אין הרשאות גישה");
        setLoading(false);
        return;
      }

      console.log("Loading users...");
      const usersData = await base44.entities.User.list();
      console.log(`Loaded ${usersData.length} users`);
      
      const allStudents = usersData.filter(u => u.user_type === 'student');
      console.log(`Found ${allStudents.length} students`);
      
      // Create merged list directly from users
      // Don't try to load StudentEconomySnapshot - it may not exist or may cause errors
      const merged = allStudents.map(user => ({
        student_email: user.email,
        full_name: user.full_name,
        coins_cash: 0,
        investments_value: 0,
        items_value: 0,
        total_assets: 0,
        last_calculated_at: null,
        isPlaceholder: true
      }));
      
      console.log(`Created ${merged.length} student placeholders`);
      setStudents(merged);
      setSnapshots([]);
    } catch (error) {
      console.error("Error loading data:", error?.response?.status, error?.message, error);
      toast.error(`שגיאה בטעינת נתונים: ${error?.message || 'Unknown error'}`);
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

  const previewSelected = async () => {
    if (selectedEmails.size === 0) {
      toast.error("בחר לפחות תלמיד אחד");
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: selectedEmails.size, errors: [] });

    const emails = Array.from(selectedEmails);
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const result = await base44.functions.recalculateStudentEconomySnapshot({
          student_email: emails[i],
          reason: "preview"
        });
        results.push({ email: emails[i], ...result });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error for ${emails[i]}:`, error);
        results.push({ email: emails[i], error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1 }));
      }
    }

    setIsRecalculating(false);
    setPreviewResults(results);
    setShowPreview(true);
    toast.success(`👁️ תצוגה מקדימה מוכנה`);
  };

  const applyPreview = async () => {
    if (!previewResults || previewResults.length === 0) return;

    if (!confirm(`לעדכן ${previewResults.length} תלמידים?`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: previewResults.length, errors: [] });

    const errors = [];

    for (let i = 0; i < previewResults.length; i++) {
      try {
        await base44.functions.recalculateStudentEconomySnapshot({
          student_email: previewResults[i].email,
          reason: "admin_selected"
        });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${previewResults[i].email}:`, error);
        errors.push({ email: previewResults[i].email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);
    
    if (errors.length === 0) {
      toast.success(`✅ עודכן עבור ${previewResults.length} תלמידים`);
    } else {
      toast.warning(`⚠️ ${previewResults.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
    setSelectedEmails(new Set());
    setPreviewResults(null);
    setShowPreview(false);
  };

  const recalculateAll = async () => {
    if (!confirm(`⚠️ לחשב מחדש עבור כל ${students.length} התלמידים?`)) {
      return;
    }

    setIsRecalculating(true);
    setProgress({ current: 0, total: students.length, errors: [] });

    const errors = [];

    for (let i = 0; i < students.length; i++) {
      try {
        await base44.functions.recalculateStudentEconomySnapshot({
          student_email: students[i].student_email,
          reason: "admin_all"
        });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${students[i].student_email}:`, error);
        errors.push({ email: students[i].student_email, error: error.message });
        setProgress(prev => ({ ...prev, current: i + 1, errors }));
      }
    }

    setIsRecalculating(false);
    
    if (errors.length === 0) {
      toast.success(`✅ חושב מחדש עבור כל התלמידים`);
    } else {
      toast.warning(`⚠️ ${students.length - errors.length} הצליחו, ${errors.length} נכשלו`);
    }

    await loadSnapshots();
  };

  const showDebugBreakdown = async (snapshot) => {
    setDebugStudent(snapshot);
    setShowDebug(true);
  };

  const filteredSnapshots = students.filter(s => {
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
        <Button onClick={loadSnapshots} disabled={loading} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
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
              className="pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button onClick={toggleSelectAll} className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-bold" disabled={filteredSnapshots.length === 0}>
            {selectedEmails.size === filteredSnapshots.length && filteredSnapshots.length > 0 ? "✓ בטל הכל" : `☐ בחר הכל (${filteredSnapshots.length})`}
          </Button>
        </div>

        {/* Selected Students Preview */}
        {selectedEmails.size > 0 && (
          <div className="bg-emerald-500/20 border-2 border-emerald-500/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">נבחרו {selectedEmails.size} תלמידים:</span>
              <Button 
                onClick={() => setSelectedEmails(new Set())}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                נקה בחירה
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedEmails).slice(0, 10).map(email => {
                const student = students.find(s => s.student_email === email);
                return (
                  <div key={email} className="bg-white/20 rounded px-2 py-1 text-sm text-white flex items-center gap-2">
                    {student?.full_name || email}
                    <button 
                      onClick={() => toggleSelect(email)}
                      className="text-white/80 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {selectedEmails.size > 10 && (
                <div className="bg-white/20 rounded px-2 py-1 text-sm text-white">
                  +{selectedEmails.size - 10} נוספים
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            onClick={previewSelected}
            disabled={isRecalculating || selectedEmails.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg border-2 border-blue-400/50"
          >
            👁️ תצוגה מקדימה ({selectedEmails.size})
          </Button>
          {previewResults && previewResults.length > 0 && (
            <Button
              onClick={applyPreview}
              disabled={isRecalculating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg border-2 border-emerald-400/50 animate-pulse"
            >
              ✅ עדכן עכשיו ({previewResults.length})
            </Button>
          )}
          <Button
            onClick={recalculateAll}
            disabled={isRecalculating}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg border-2 border-orange-400/50"
          >
            🚨 חשב הכל ({students.length})
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

      {/* Students Grid */}
      <div className="bg-white/10 rounded-xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-white/80">
            {filteredSnapshots.length} תלמידים
          </div>
          {students.length > 0 && snapshots.length === 0 && !loading && (
            <div className="text-yellow-400 text-sm">
              ⚠️ {students.length} תלמידים ללא snapshots - לחץ "חשב הכל" ליצירתם
            </div>
          )}
        </div>
        {filteredSnapshots.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>טוען...</span>
              </div>
            ) : searchQuery ? (
              <div>
                <div className="text-2xl mb-2">🔍</div>
                <div>לא נמצאו תוצאות עבור "{searchQuery}"</div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📊</div>
                <div className="text-lg mb-2">אין נתונים</div>
                <div className="text-sm text-white/40">
                  יש ליצור StudentEconomySnapshot עבור התלמידים
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSnapshots.map((snapshot) => (
            <div 
              key={snapshot.id || snapshot.student_email}
              onClick={() => toggleSelect(snapshot.student_email)}
              className={`
                relative cursor-pointer rounded-lg p-4 border-2 transition-all
                ${snapshot.isPlaceholder ? 'opacity-60' : ''}
                ${selectedEmails.has(snapshot.student_email) 
                  ? 'bg-emerald-500/30 border-emerald-400 shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10'}
              `}
            >
              <div className="absolute top-3 left-3">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  selectedEmails.has(snapshot.student_email)
                    ? 'bg-emerald-500 border-emerald-400'
                    : 'bg-white/10 border-white/40'
                }`}>
                  {selectedEmails.has(snapshot.student_email) && (
                    <span className="text-white text-sm">✓</span>
                  )}
                </div>
              </div>

              <div className="pr-8">
                <div className="text-white font-bold text-lg mb-1">
                  {snapshot.full_name}
                </div>
                <div className="text-white/60 text-xs mb-3">
                  {snapshot.student_email}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-white/60 text-xs">עו"ש</div>
                    <div className="text-white font-bold">{snapshot.coins_cash?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">השקעות</div>
                    <div className="text-emerald-400 font-bold">{snapshot.investments_value?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">פריטים</div>
                    <div className="text-purple-400 font-bold">{snapshot.items_value?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">שווי כולל</div>
                    <div className="text-yellow-400 font-bold">{snapshot.total_assets?.toLocaleString() || 0}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-white/50 text-xs">
                    {snapshot.isPlaceholder ? (
                      <span className="text-yellow-400">⚠️ לא חושב</span>
                    ) : snapshot.last_calculated_at ? (
                      new Date(snapshot.last_calculated_at).toLocaleDateString('he-IL')
                    ) : (
                      'לא עודכן'
                    )}
                  </div>
                  {!snapshot.isPlaceholder && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        showDebugBreakdown(snapshot);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-white/60 hover:text-white h-6 px-2"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Old Table (Hidden) */}
      <div className="bg-white/10 rounded-xl overflow-hidden hidden">
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
                <tr key={snapshot.id || snapshot.student_email} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedEmails.has(snapshot.student_email)}
                        onCheckedChange={() => toggleSelect(snapshot.student_email)}
                        className="border-white/40 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              👁️ תצוגה מקדימה - {previewResults?.length} תלמידים
            </DialogTitle>
          </DialogHeader>

          {previewResults && (
            <div className="space-y-3">
              {previewResults.map((result) => (
                <div key={result.email} className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold">{result.full_name || result.email}</div>
                      <div className="text-sm text-white/60">{result.email}</div>
                    </div>
                    {result.error ? (
                      <div className="text-red-400 font-bold">❌ שגיאה</div>
                    ) : (
                      <div className={`font-bold text-lg ${result.coins_cash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.coins_cash?.toLocaleString()} מטבעות
                      </div>
                    )}
                  </div>
                  {!result.error && (
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div>
                        <div className="text-white/60">השקעות</div>
                        <div className="font-bold">{result.investments_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-white/60">פריטים</div>
                        <div className="font-bold">{result.items_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-white/60">שווי כולל</div>
                        <div className="font-bold text-yellow-400">{result.total_assets?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  סגור
                </Button>
                <Button
                  onClick={applyPreview}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  ✅ עדכן עכשיו
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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