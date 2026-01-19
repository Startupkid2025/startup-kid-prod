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
      let currentUser;
      try {
        currentUser = await base44.auth.me();
      } catch (authError) {
        console.error("Auth error:", authError);
        toast.error("שגיאה באימות משתמש");
        setLoading(false);
        return;
      }

      if (currentUser.role !== 'admin') {
        toast.error("אין הרשאות גישה");
        setLoading(false);
        return;
      }

      console.log("Loading users...");
      let usersData;
      try {
        usersData = await base44.entities.User.list();
        console.log(`Loaded ${usersData.length} users`);
      } catch (userError) {
        console.error("Error loading users:", userError?.response?.status, userError?.response?.data, userError);
        toast.error("שגיאה בטעינת משתמשים");
        setLoading(false);
        return;
      }
      
      const allStudents = usersData.filter(u => u.user_type === 'student');
      console.log(`Found ${allStudents.length} students`);
      
      // Create merged list directly from users
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
      console.error("Unexpected error:", error?.response?.status, error?.response?.data, error?.message, error);
      toast.error(`שגיאה: ${error?.message || 'Unknown error'}`);
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

    console.log("base44.functions keys:", Object.keys(base44.functions || {}));

    for (let i = 0; i < emails.length; i++) {
      try {
        console.log(`Calling recalculateStudentEconomySnapshot for ${emails[i]} (preview mode)`);
        const result = await base44.functions.invoke('recalculateStudentEconomySnapshot', {
          studentEmail: emails[i],
          reason: "preview",
          previewOnly: true
        });
        results.push({ email: emails[i], ...result });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error for ${emails[i]}:`, error, error?.response?.data);
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
        console.log(`Calling recalculateStudentEconomySnapshot for ${previewResults[i].email} (apply mode)`);
        await base44.functions.invoke('recalculateStudentEconomySnapshot', {
          studentEmail: previewResults[i].email,
          reason: "admin_selected",
          previewOnly: false
        });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${previewResults[i].email}:`, error, error?.response?.data);
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
        console.log(`Calling recalculateStudentEconomySnapshot for ${students[i].student_email} (all mode)`);
        await base44.functions.invoke('recalculateStudentEconomySnapshot', {
          studentEmail: students[i].student_email,
          reason: "admin_all",
          previewOnly: false
        });
        setProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error for ${students[i].student_email}:`, error, error?.response?.data);
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

  const loadStudentData = async (studentEmail) => {
    try {
      const [user, wordProgress, mathProgress] = await Promise.all([
        base44.entities.User.filter({ email: studentEmail }),
        base44.entities.WordProgress.filter({ student_email: studentEmail }),
        base44.entities.MathProgress.filter({ student_email: studentEmail })
      ]);
      
      if (user.length === 0) {
        toast.error("תלמיד לא נמצא");
        return;
      }
      
      const userData = user[0];
      const masteredWords = wordProgress.filter(w => w.mastered === true).length;
      const masteredMath = mathProgress.filter(m => m.mastered === true).length;
      
      setDebugStudent({
        ...userData,
        mastered_words: masteredWords,
        mastered_math_questions: masteredMath
      });
      setShowDebug(true);
    } catch (error) {
      console.error("Error loading student data:", error);
      toast.error("שגיאה בטעינת נתוני התלמיד");
    }
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
              key={snapshot.student_email}
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
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadStudentData(snapshot.student_email);
                    }}
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:text-white h-6 px-2"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
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
                <tr key={snapshot.student_email} className="border-t border-white/10 hover:bg-white/5">
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

      {/* Student Data Dialog */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">
              📊 נתוני תלמיד - {debugStudent?.full_name}
            </DialogTitle>
          </DialogHeader>

          {debugStudent && (
            <div className="space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-blue-200 text-xs mb-1 font-bold">coins (עו״ש)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.coins || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-lg p-4 border border-green-500/30">
                  <div className="text-green-200 text-xs mb-1 font-bold">total_lessons (שיעורים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.total_lessons || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-purple-200 text-xs mb-1 font-bold">mastered_words (מילים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.mastered_words || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-lg p-4 border border-orange-500/30">
                  <div className="text-orange-200 text-xs mb-1 font-bold">mastered_math_questions (תרגילים)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.mastered_math_questions || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Work & Login Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">total_work_hours (שעות עבודה)</div>
                  <div className="text-xl font-bold text-yellow-300">{(debugStudent.total_work_hours || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">total_work_earnings (הכנסות עבודה)</div>
                  <div className="text-xl font-bold text-emerald-300">{(debugStudent.total_work_earnings || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-white/70 text-xs mb-1">login_streak (רצף כניסות)</div>
                  <div className="text-xl font-bold text-pink-300">{(debugStudent.login_streak || 0).toLocaleString()} 🔥</div>
                </div>
              </div>

              {/* Assets */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-lg p-4 border border-emerald-500/30">
                  <div className="text-emerald-200 text-xs mb-1 font-bold">investments_value (הערך הנוכחי)</div>
                  <div className="text-2xl font-bold text-white">{(debugStudent.total_realized_investment_profit || 0).toLocaleString()}</div>
                  <div className="text-white/60 text-xs mt-2">investment_profit_realized (רווח ממומש): {(debugStudent.total_realized_investment_profit || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-purple-200 text-xs mb-1 font-bold">purchased_items (פריטים שנרכשו)</div>
                  <div className="text-2xl font-bold text-white">{((debugStudent.purchased_items || []).length).toLocaleString()}</div>
                  <div className="text-white/60 text-xs mt-2">items_value: {(debugStudent.items_value || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-lg p-4 border border-yellow-500/30">
                  <div className="text-yellow-200 text-xs mb-1 font-bold">total_assets (שווי כולל)</div>
                  <div className="text-2xl font-bold text-white">{((debugStudent.coins || 0) + (debugStudent.items_value || 0)).toLocaleString()}</div>
                </div>
              </div>

              {/* Taxes & Losses */}
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                <h3 className="text-red-200 text-lg font-bold mb-3">💸 מיסים והוצאות</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">total_inflation_lost</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_inflation_lost || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_income_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_income_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_capital_gains_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_capital_gains_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_dividend_tax</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_dividend_tax || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_credit_interest</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_credit_interest || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_investment_fees</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_investment_fees || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_item_sale_losses</span>
                    <div className="font-bold text-red-300">{(debugStudent.total_item_sale_losses || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Income Sources */}
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <h3 className="text-green-200 text-lg font-bold mb-3">💰 מקורות הכנסה</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">total_collaboration_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_collaboration_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_login_streak_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_login_streak_coins || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_passive_income</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_passive_income || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-white/70">total_admin_coins</span>
                    <div className="font-bold text-green-300">{(debugStudent.total_admin_coins || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <h3 className="text-blue-200 text-lg font-bold mb-3">📈 סטטיסטיקות עסקה</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-white/70">age (גיל)</span>
                    <div className="font-bold text-blue-300">{debugStudent.age || '—'}</div>
                  </div>
                  <div>
                    <span className="text-white/70">last_login_date (תאריך כניסה אחרון)</span>
                    <div className="font-bold text-blue-300">{debugStudent.last_login_date ? new Date(debugStudent.last_login_date).toLocaleDateString('he-IL') : '—'}</div>
                  </div>
                  <div>
                    <span className="text-white/70">email</span>
                    <div className="font-bold text-blue-300 text-xs break-all">{debugStudent.email}</div>
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