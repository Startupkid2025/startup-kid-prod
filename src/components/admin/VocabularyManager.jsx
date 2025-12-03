import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Search, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import CleanupWordProgress from "./CleanupWordProgress";

export default function VocabularyManager() {
  const [words, setWords] = useState([]);
  const [wordStats, setWordStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [wordForm, setWordForm] = useState({
    word_english: "",
    word_hebrew: "",
    example_sentence: "",
    example_translation: "",
    difficulty_level: 1,
    category: "",
    part_of_speech: "noun"
  });

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const allWords = await base44.entities.VocabularyWord.list();
      const allProgress = await base44.entities.WordProgress.list();
      
      // Calculate statistics for each word
      const stats = {};
      allWords.forEach(word => {
        const progressEntries = allProgress.filter(p => p.word_english.toLowerCase() === word.word_english.toLowerCase());
        
        stats[word.word_english] = {
          totalAppearances: progressEntries.reduce((sum, p) => sum + (p.total_attempts || 0), 0),
          correctOnce: progressEntries.filter(p => p.correct_streak >= 1).length,
          correctTwice: progressEntries.filter(p => p.correct_streak >= 2).length,
          mastered: progressEntries.filter(p => p.mastered).length,
          mistakes: progressEntries.reduce((sum, p) => sum + Math.max(0, (p.total_attempts || 0) - (p.correct_streak || 0)), 0)
        };
      });
      
      setWordStats(stats);
      setWords(allWords);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("שגיאה בטעינת מילים");
    }
    setIsLoading(false);
  };

  const handleOpenAddDialog = () => {
    setWordForm({
      word_english: "",
      word_hebrew: "",
      example_sentence: "",
      example_translation: "",
      difficulty_level: 1,
      category: "",
      part_of_speech: "noun"
    });
    setEditingWord(null);
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (word) => {
    setWordForm({
      word_english: word.word_english,
      word_hebrew: word.word_hebrew,
      example_sentence: word.example_sentence || "",
      example_translation: word.example_translation || "",
      difficulty_level: word.difficulty_level,
      category: word.category || "",
      part_of_speech: word.part_of_speech || "noun"
    });
    setEditingWord(word);
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    if (!wordForm.word_english || !wordForm.word_hebrew) {
      toast.error("יש למלא מילה באנגלית ופירוש בעברית");
      return;
    }

    try {
      if (editingWord) {
        await base44.entities.VocabularyWord.update(editingWord.id, wordForm);
        toast.success("המילה עודכנה בהצלחה! ✨");
      } else {
        await base44.entities.VocabularyWord.create(wordForm);
        toast.success("המילה נוספה בהצלחה! 🎉");
      }
      setShowAddDialog(false);
      loadWords();
    } catch (error) {
      console.error("Error saving word:", error);
      toast.error("שגיאה בשמירת המילה");
    }
  };

  const handleDelete = async (wordId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק מילה זו?")) {
      return;
    }

    try {
      await base44.entities.VocabularyWord.delete(wordId);
      toast.success("המילה נמחקה בהצלחה");
      loadWords();
    } catch (error) {
      console.error("Error deleting word:", error);
      toast.error("שגיאה במחיקת המילה");
    }
  };

  const filteredWords = words.filter(word => {
    const matchesSearch = word.word_english.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.word_hebrew.includes(searchTerm);
    const matchesLevel = filterLevel === "all" || word.difficulty_level === parseInt(filterLevel);
    return matchesSearch && matchesLevel;
  });

  const getLevelBadge = (level) => {
    const badges = {
      1: { text: "קל", color: "bg-green-500/30 text-green-200" },
      2: { text: "בינוני", color: "bg-yellow-500/30 text-yellow-200" },
      3: { text: "קשה", color: "bg-red-500/30 text-red-200" }
    };
    return badges[level] || badges[1];
  };

  const getPartOfSpeechText = (pos) => {
    const posMap = {
      noun: "שם עצם",
      verb: "פועל",
      adjective: "שם תואר",
      adverb: "תואר הפועל",
      other: "אחר"
    };
    return posMap[pos] || pos;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="text-4xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          📚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cleanup Tool */}
      <CleanupWordProgress onComplete={loadWords} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">📚 ניהול מילים באנגלית</h2>
          <p className="text-white/70 text-sm">סה"כ {words.length} מילים במאגר</p>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
        >
          <Plus className="w-5 h-5 mr-2" />
          הוסף מילה חדשה
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                placeholder="חפש מילה באנגלית או עברית..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full sm:w-40 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="רמת קושי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הרמות</SelectItem>
                <SelectItem value="1">קל</SelectItem>
                <SelectItem value="2">בינוני</SelectItem>
                <SelectItem value="3">קשה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Words List */}
      <div className="grid gap-4">
        {filteredWords.map((word) => {
          const levelBadge = getLevelBadge(word.difficulty_level);
          const stats = wordStats[word.word_english] || { totalAppearances: 0, correctOnce: 0, correctTwice: 0, mistakes: 0 };
          
          return (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{word.word_english}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${levelBadge.color}`}>
                          {levelBadge.text}
                        </span>
                        {word.part_of_speech && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/30 text-blue-200">
                            {getPartOfSpeechText(word.part_of_speech)}
                          </span>
                        )}
                        {word.category && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/30 text-purple-200">
                            {word.category}
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 mb-2">{word.word_hebrew}</p>
                      
                      {/* Statistics */}
                      <div className="flex gap-4 text-xs mb-2 flex-wrap">
                        <div className="text-white/70">
                          📊 הופיע: <span className="font-bold text-white">{stats.totalAppearances}</span>
                        </div>
                        <div className="text-green-300">
                          ✓ נכון פעם: <span className="font-bold">{stats.correctOnce}</span>
                        </div>
                        <div className="text-blue-300">
                          ✓✓ נכון פעמיים: <span className="font-bold">{stats.correctTwice}</span>
                        </div>
                        <div className="text-red-300">
                          ✗ טעויות: <span className="font-bold">{stats.mistakes}</span>
                        </div>
                      </div>

                      {word.example_sentence && (
                        <div className="bg-white/5 rounded-lg p-3 mt-2">
                          <p className="text-white/70 text-sm mb-1 italic">"{word.example_sentence}"</p>
                          {word.example_translation && (
                            <p className="text-white/60 text-sm">"{word.example_translation}"</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenEditDialog(word)}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(word.id)}
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
            </motion.div>
          );
        })}

        {filteredWords.length === 0 && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 mb-4">לא נמצאו מילים</p>
              {searchTerm && (
                <p className="text-white/50 text-sm">נסה לשנות את החיפוש או הסינון</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gradient-to-br from-purple-500/95 to-pink-500/95 backdrop-blur-xl border-2 border-white/30 max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-black">
              {editingWord ? "✏️ ערוך מילה" : "➕ הוסף מילה חדשה"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">מילה באנגלית *</label>
                <Input
                  placeholder="example"
                  value={wordForm.word_english}
                  onChange={(e) => setWordForm({ ...wordForm, word_english: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">פירוש בעברית * (ניתן להוסיף מספר פירושים מופרדים בפסיק)</label>
                <Textarea
                  placeholder="דוגמה, מופת, למשל"
                  value={wordForm.word_hebrew}
                  onChange={(e) => setWordForm({ ...wordForm, word_hebrew: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-20"
                />
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">משפט לדוגמא באנגלית</label>
              <Textarea
                placeholder="This is an example sentence."
                value={wordForm.example_sentence}
                onChange={(e) => setWordForm({ ...wordForm, example_sentence: e.target.value })}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">תרגום המשפט</label>
              <Textarea
                placeholder="זה משפט לדוגמא."
                value={wordForm.example_translation}
                onChange={(e) => setWordForm({ ...wordForm, example_translation: e.target.value })}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-20"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">רמת קושי *</label>
                <Select
                  value={wordForm.difficulty_level.toString()}
                  onValueChange={(value) => setWordForm({ ...wordForm, difficulty_level: parseInt(value) })}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">קל</SelectItem>
                    <SelectItem value="2">בינוני</SelectItem>
                    <SelectItem value="3">קשה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">חלק דיבר</label>
                <Select
                  value={wordForm.part_of_speech}
                  onValueChange={(value) => setWordForm({ ...wordForm, part_of_speech: value })}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="noun">שם עצם</SelectItem>
                    <SelectItem value="verb">פועל</SelectItem>
                    <SelectItem value="adjective">שם תואר</SelectItem>
                    <SelectItem value="adverb">תואר הפועל</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">קטגוריה</label>
                <Input
                  placeholder="בעלי חיים, אוכל..."
                  value={wordForm.category}
                  onChange={(e) => setWordForm({ ...wordForm, category: e.target.value })}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {editingWord ? "שמור שינויים" : "הוסף מילה"}
            </Button>
            <Button
              onClick={() => setShowAddDialog(false)}
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}