import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function CoinLogsPanel({ students = [] }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 50;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await base44.entities.CoinLog.list("-created_date");
      setLogs(allLogs);
    } catch (error) {
      console.error("Error loading coin logs:", error);
      toast.error("שגיאה בטעינת לוגים");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const studentMatch = filterStudent === "all" || log.student_email === filterStudent;
    const searchMatch = !searchTerm || 
      log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return studentMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const startIdx = (currentPage - 1) * LOGS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIdx, startIdx + LOGS_PER_PAGE);

  const getStudentName = (email) => {
    const student = students.find(s => s.email === email);
    return student?.full_name || student?.first_name || email;
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/10">
        <CardContent className="p-8 text-center">
          <div className="text-white/70">טוען לוגים...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white text-lg">
            🪙 רישום שינויי מטבעות ({filteredLogs.length} רשומות)
          </CardTitle>
          <Button
            onClick={loadLogs}
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
          <div className="space-y-2">
            <label className="text-white/70 text-sm">סנן לפי תלמיד:</label>
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התלמידים</SelectItem>
                {students
                  .filter(s => s.user_type === 'student')
                  .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'he'))
                  .map(student => (
                    <SelectItem key={student.email} value={student.email}>
                      {student.full_name || student.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-white/70 text-sm">חיפוש חופשי:</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                type="text"
                placeholder="חפש סיבה או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/10 border-b border-white/10">
               <tr>
                 <th className="text-right p-3 text-white/90 font-bold">תאריך ושעה</th>
                 <th className="text-right p-3 text-white/90 font-bold">תלמיד</th>
                 <th className="text-right p-3 text-white/90 font-bold">סיבה</th>
                 <th className="text-right p-3 text-white/90 font-bold">מקור</th>
                 <th className="text-right p-3 text-white/90 font-bold">שינוי</th>
                 <th className="text-right p-3 text-white/90 font-bold">יתרה לפני</th>
                 <th className="text-right p-3 text-white/90 font-bold">יתרה אחרי</th>
                 <th className="text-right p-3 text-white/90 font-bold">השקעות</th>
                 <th className="text-right p-3 text-white/90 font-bold">שווי נטו</th>
                 <th className="text-right p-3 text-white/90 font-bold">שווי לידרבורד</th>
               </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-white/50">
                      אין רשומות להצגה
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(log => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white/80">
                        <div className="text-xs">
                          {moment(log.created_date).format('DD/MM/YY')}
                        </div>
                        <div className="text-[10px] text-white/50">
                          {moment(log.created_date).format('HH:mm:ss')}
                        </div>
                      </td>
                      <td className="p-3 text-white/80">
                        {getStudentName(log.student_email)}
                      </td>
                      <td className="p-3 text-white/80">
                        {log.reason}
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {log.metadata?.source || '-'}
                      </td>
                      <td className="p-3">
                        <div className={`flex items-center gap-1 font-bold ${
                          log.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {log.amount > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </div>
                      </td>
                      <td className="p-3 text-white/60">
                        {log.previous_balance?.toLocaleString() || 0}
                      </td>
                      <td className="p-3 text-white/80 font-bold">
                        {log.new_balance?.toLocaleString() || 0}
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {log.metadata?.investments_value !== undefined ? log.metadata.investments_value.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {log.metadata?.user_networth !== undefined ? log.metadata.user_networth.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {log.metadata?.leaderboard_networth !== undefined ? log.metadata.leaderboard_networth.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
            >
              ← הקודם
            </Button>
            <span className="text-white/70 text-sm">
              עמוד {currentPage} מתוך {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
            >
              הבא →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}