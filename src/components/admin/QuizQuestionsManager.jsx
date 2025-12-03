import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function QuizQuestionsManager({ lesson }) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [lesson]);

  const loadQuestions = async () => {
    try {
      const quizQuestions = await base44.entities.QuizQuestion.filter(
        { lesson_id: lesson.id },
        "order"
      );
      setQuestions(quizQuestions);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("שגיאה בטעינת שאלות");
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      lesson_id: lesson.id,
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      order: questions.length
    });
    setIsAddingNew(true);
  };

  const handleSaveQuestion = async () => {
    try {
      if (!editingQuestion.question.trim() || 
          !editingQuestion.option_a.trim() ||
          !editingQuestion.option_b.trim() ||
          !editingQuestion.option_c.trim() ||
          !editingQuestion.option_d.trim()) {
        toast.error("יש למלא את כל השדות");
        return;
      }

      if (isAddingNew) {
        await base44.entities.QuizQuestion.create(editingQuestion);
        toast.success("שאלה נוספה בהצלחה!");
      } else {
        await base44.entities.QuizQuestion.update(editingQuestion.id, editingQuestion);
        toast.success("שאלה עודכנה בהצלחה!");
      }

      setEditingQuestion(null);
      setIsAddingNew(false);
      loadQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("שגיאה בשמירת השאלה");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק שאלה זו?")) return;

    try {
      await base44.entities.QuizQuestion.delete(questionId);
      toast.success("שאלה נמחקה");
      loadQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("שגיאה במחיקת השאלה");
    }
  };

  if (isLoading) {
    return <div className="text-white text-center py-8">טוען...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">
          שאלות חידון ({questions.length})
        </h3>
        {!isAddingNew && !editingQuestion && (
          <Button
            onClick={handleAddQuestion}
            size="sm"
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף שאלה
          </Button>
        )}
      </div>

      {/* Edit/Add Question Form */}
      {editingQuestion && (
        <Card className="bg-white/20 backdrop-blur-md border-white/30">
          <CardHeader>
            <CardTitle className="text-white">
              {isAddingNew ? "שאלה חדשה" : "ערוך שאלה"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">השאלה</Label>
              <Textarea
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
                placeholder="כתוב את השאלה..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">תשובה A</Label>
                <Input
                  value={editingQuestion.option_a}
                  onChange={(e) => setEditingQuestion({...editingQuestion, option_a: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white">תשובה B</Label>
                <Input
                  value={editingQuestion.option_b}
                  onChange={(e) => setEditingQuestion({...editingQuestion, option_b: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white">תשובה C</Label>
                <Input
                  value={editingQuestion.option_c}
                  onChange={(e) => setEditingQuestion({...editingQuestion, option_c: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white">תשובה D</Label>
                <Input
                  value={editingQuestion.option_d}
                  onChange={(e) => setEditingQuestion({...editingQuestion, option_d: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">תשובה נכונה</Label>
              <select
                value={editingQuestion.correct_answer}
                onChange={(e) => setEditingQuestion({...editingQuestion, correct_answer: e.target.value})}
                className="w-full bg-white/10 border border-white/20 text-white rounded-md p-2"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveQuestion}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
              <Button
                onClick={() => {
                  setEditingQuestion(null);
                  setIsAddingNew(false);
                }}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {!editingQuestion && questions.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="py-8 text-center">
            <p className="text-white/70">אין עדיין שאלות לחידון זה</p>
          </CardContent>
        </Card>
      )}

      {!editingQuestion && questions.map((question, index) => (
        <Card key={question.id} className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <p className="text-white font-medium">{question.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`text-white/70 ${question.correct_answer === 'A' ? 'font-bold text-green-300' : ''}`}>
                    A. {question.option_a}
                  </div>
                  <div className={`text-white/70 ${question.correct_answer === 'B' ? 'font-bold text-green-300' : ''}`}>
                    B. {question.option_b}
                  </div>
                  <div className={`text-white/70 ${question.correct_answer === 'C' ? 'font-bold text-green-300' : ''}`}>
                    C. {question.option_c}
                  </div>
                  <div className={`text-white/70 ${question.correct_answer === 'D' ? 'font-bold text-green-300' : ''}`}>
                    D. {question.option_d}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditingQuestion(question);
                    setIsAddingNew(false);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  ערוך
                </Button>
                <Button
                  onClick={() => handleDeleteQuestion(question.id)}
                  size="sm"
                  variant="outline"
                  className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}