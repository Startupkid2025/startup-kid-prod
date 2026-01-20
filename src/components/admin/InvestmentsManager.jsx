import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Edit2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const BUSINESSES = {
  "government_bonds": { name: "🏛️ אג\"ח ממשלתיות", color: "from-blue-700 to-blue-900" },
  "real_estate": { name: "🏢 נדל\"ן מסחרי", color: "from-green-600 to-emerald-600" },
  "gold": { name: "💛 זהב", color: "from-yellow-500 to-yellow-700" },
  "stock_market": { name: "📈 מניות בורסה", color: "from-indigo-500 to-blue-500" },
  "tech_startup": { name: "🚀 סטארטאפ", color: "from-blue-500 to-cyan-500" },
  "crypto": { name: "₿ קריפטו", color: "from-purple-500 to-pink-500" }
};

export default function InvestmentsManager() {
  const [students, setStudents] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentInvestments, setStudentInvestments] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allInvestments] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Investment.list()
      ]);

      const studentsOnly = allUsers.filter(u => u.user_type === 'student');
      setStudents(studentsOnly);
      setInvestments(allInvestments);
    } catch (error) {
      console.error("Error loading investments:", error);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (student) => {
    const studentInvs = investments.filter(inv => inv.student_email === student.email);
    
    // Group by business type
    const grouped = {};
    Object.keys(BUSINESSES).forEach(type => {
      const typeInvestments = studentInvs.filter(inv => inv.business_type === type);
      grouped[type] = {
        total_invested: typeInvestments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0),
        total_value: typeInvestments.reduce((sum, inv) => sum + (inv.current_value || 0), 0),
        count: typeInvestments.length
      };
    });

    setStudentInvestments(grouped);
    setEditingStudent(student);
  };

  const handleSave = async () => {
    if (!editingStudent) return;

    try {
      // Delete all existing investments for this student
      const existingInvestments = investments.filter(inv => inv.student_email === editingStudent.email);
      for (const inv of existingInvestments) {
        await base44.entities.Investment.delete(inv.id);
      }

      // Create new investments based on edited values
      for (const [businessType, data] of Object.entries(studentInvestments)) {
        if (data.total_value > 0) {
          await base44.entities.Investment.create({
            student_email: editingStudent.email,
            business_type: businessType,
            invested_amount: data.total_invested,
            current_value: data.total_value,
            daily_change_percent: 0
          });
        }
      }

      toast.success("השקעות עודכנו בהצלחה");
      setEditingStudent(null);
      await loadData();
    } catch (error) {
      console.error("Error saving investments:", error);
      toast.error("שגיאה בשמירת השקעות");
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-12 text-center">
          <div className="text-white text-lg">טוען השקעות...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>ניהול השקעות 💼</span>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חפש תלמיד..."
                className="bg-white/10 border-white/20 text-white pr-10"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStudents.map(student => {
              const studentInvs = investments.filter(inv => inv.student_email === student.email);
              const totalInvested = studentInvs.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
              const totalValue = studentInvs.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
              const profit = totalValue - totalInvested;

              return (
                <div
                  key={student.email}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-bold">{student.full_name}</h3>
                      <span className="text-white/60 text-sm">{student.email}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-white/60">השקעות:</span>
                        <span className="text-white font-bold mr-2">{studentInvs.length}</span>
                      </div>
                      <div>
                        <span className="text-white/60">סכום מושקע:</span>
                        <span className="text-white font-bold mr-2">{totalInvested.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-white/60">שווי נוכחי:</span>
                        <span className="text-white font-bold mr-2">{totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {profit >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className={profit >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => openEditDialog(student)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit2 className="w-4 h-4 ml-2" />
                    ערוך
                  </Button>
                </div>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-white/60">
                לא נמצאו תלמידים
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent className="bg-gradient-to-br from-purple-500/95 to-pink-500/95 text-white border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              עריכת השקעות - {editingStudent?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {Object.entries(BUSINESSES).map(([businessType, businessInfo]) => {
              const data = studentInvestments[businessType] || { total_invested: 0, total_value: 0, count: 0 };
              const profit = data.total_value - data.total_invested;

              return (
                <div
                  key={businessType}
                  className={`bg-gradient-to-r ${businessInfo.color} rounded-lg p-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-lg">{businessInfo.name}</h3>
                    <div className="flex items-center gap-2">
                      {profit !== 0 && (
                        <>
                          {profit >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-200" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-200" />
                          )}
                          <span className={`font-bold ${profit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/80 text-xs mb-1 block">סכום שהושקע</label>
                      <Input
                        type="number"
                        value={data.total_invested}
                        onChange={(e) => {
                          setStudentInvestments({
                            ...studentInvestments,
                            [businessType]: {
                              ...data,
                              total_invested: Number(e.target.value) || 0
                            }
                          });
                        }}
                        className="bg-white/20 border-white/30 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white/80 text-xs mb-1 block">שווי נוכחי</label>
                      <Input
                        type="number"
                        value={data.total_value}
                        onChange={(e) => {
                          setStudentInvestments({
                            ...studentInvestments,
                            [businessType]: {
                              ...data,
                              total_value: Number(e.target.value) || 0
                            }
                          });
                        }}
                        className="bg-white/20 border-white/30 text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setEditingStudent(null)}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-white text-purple-600 hover:bg-white/90 font-bold"
              >
                שמור שינויים
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}