import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CleanupWordProgress({ onComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orphanedWords, setOrphanedWords] = useState([]);
  const [wordsToAdd, setWordsToAdd] = useState([]);
  const [duplicateWords, setDuplicateWords] = useState([]);
  const [hasChecked, setHasChecked] = useState(false);

  const checkOrphanedWords = async () => {
    setIsProcessing(true);
    try {
      const allProgress = await base44.entities.WordProgress.list();
      const allVocabWords = await base44.entities.VocabularyWord.list();
      
      // מצא כפילויות במאגר מילים
      const wordCounts = {};
      const duplicates = [];
      allVocabWords.forEach(word => {
        const key = word.word_english.toLowerCase();
        if (wordCounts[key]) {
          duplicates.push(word);
        } else {
          wordCounts[key] = word;
        }
      });
      
      setDuplicateWords(duplicates);
      
      const vocabWordsSet = new Set(
        allVocabWords.map(w => w.word_english.toLowerCase())
      );
      
      const orphaned = allProgress.filter(
        p => !vocabWordsSet.has(p.word_english.toLowerCase())
      );
      
      // מילים שצריך להוסיף למאגר (יש להן תשובות נכונות)
      const toAdd = orphaned.filter(p => 
        (p.correct_streak > 0 || p.mastered)
      );
      
      // מילים למחיקה (אין להן תשובות נכונות)
      const toDelete = orphaned.filter(p => 
        (!p.correct_streak || p.correct_streak === 0) && !p.mastered
      );
      
      setWordsToAdd(toAdd);
      setOrphanedWords(toDelete);
      setHasChecked(true);
      
      if (toAdd.length === 0 && toDelete.length === 0 && duplicates.length === 0) {
        toast.success("כל המילים תקינות! אין מה לנקות 👍");
      }
    } catch (error) {
      console.error("Error checking words:", error);
      toast.error("שגיאה בבדיקת מילים");
    }
    setIsProcessing(false);
  };

  const cleanupOrphanedWords = async () => {
    if (orphanedWords.length === 0 && wordsToAdd.length === 0 && duplicateWords.length === 0) return;
    
    setIsProcessing(true);
    try {
      // הוסף מילים עם תשובות נכונות למאגר בבת אחת
      if (wordsToAdd.length > 0) {
        const wordsData = wordsToAdd.map(word => ({
          word_english: word.word_english,
          word_hebrew: word.word_hebrew,
          difficulty_level: word.difficulty_level || 1,
          category: "",
          part_of_speech: "noun"
        }));
        
        await base44.entities.VocabularyWord.bulkCreate(wordsData);
      }
      
      // מחק כפילויות - בקבוצות של 5
      if (duplicateWords.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < duplicateWords.length; i += batchSize) {
          const batch = duplicateWords.slice(i, i + batchSize);
          await Promise.all(
            batch.map(word => base44.entities.VocabularyWord.delete(word.id))
          );
        }
      }
      
      // מחק מילים ללא תשובות נכונות - בקבוצות של 5
      if (orphanedWords.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < orphanedWords.length; i += batchSize) {
          const batch = orphanedWords.slice(i, i + batchSize);
          await Promise.all(
            batch.map(word => base44.entities.WordProgress.delete(word.id))
          );
        }
      }
      
      let message = "";
      if (wordsToAdd.length > 0) {
        message += `נוספו ${wordsToAdd.length} מילים למאגר. `;
      }
      if (duplicateWords.length > 0) {
        message += `נמחקו ${duplicateWords.length} כפילויות. `;
      }
      if (orphanedWords.length > 0) {
        message += `נמחקו ${orphanedWords.length} מילים ישנות.`;
      }
      
      toast.success(`✨ ${message}`);
      setOrphanedWords([]);
      setWordsToAdd([]);
      setDuplicateWords([]);
      setHasChecked(false);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error cleaning up:", error);
      toast.error("שגיאה בניקוי");
    }
    setIsProcessing(false);
  };

  return (
    <Card className="bg-orange-500/20 border-orange-500/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-300 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">🧹 ניקוי מילים ישנות</h3>
            <p className="text-white/80 text-sm mb-3">
              בדוק אם יש מילים שנלמדו על ידי תלמידים אבל לא קיימות במאגר המילים
            </p>
            
            {!hasChecked ? (
              <Button
                onClick={checkOrphanedWords}
                disabled={isProcessing}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isProcessing ? "בודק..." : "בדוק מילים"}
              </Button>
            ) : (
              <div>
                {(wordsToAdd.length > 0 || orphanedWords.length > 0 || duplicateWords.length > 0) ? (
                  <div>
                    <div className="bg-white/10 rounded-lg p-3 mb-3 max-h-60 overflow-y-auto">
                      {duplicateWords.length > 0 && (
                        <div className="mb-3">
                          <p className="text-yellow-300 font-bold mb-2">
                            🔁 {duplicateWords.length} כפילויות למחיקה:
                          </p>
                          <div className="text-white/70 text-xs space-y-1">
                            {duplicateWords.slice(0, 10).map(word => (
                              <div key={word.id}>• {word.word_english}</div>
                            ))}
                            {duplicateWords.length > 10 && (
                              <div>ועוד {duplicateWords.length - 10}...</div>
                            )}
                          </div>
                        </div>
                      )}
                      {wordsToAdd.length > 0 && (
                        <div className="mb-3">
                          <p className="text-green-300 font-bold mb-2">
                            ✓ {wordsToAdd.length} מילים להוספה למאגר (יש תשובות נכונות):
                          </p>
                          <div className="text-white/70 text-xs space-y-1">
                            {wordsToAdd.slice(0, 10).map(word => (
                              <div key={word.id}>• {word.word_english} ({word.word_hebrew})</div>
                            ))}
                            {wordsToAdd.length > 10 && (
                              <div>ועוד {wordsToAdd.length - 10}...</div>
                            )}
                          </div>
                        </div>
                      )}
                      {orphanedWords.length > 0 && (
                        <div>
                          <p className="text-red-300 font-bold mb-2">
                            ✗ {orphanedWords.length} מילים למחיקה (אין תשובות נכונות):
                          </p>
                          <div className="text-white/70 text-xs space-y-1">
                            {orphanedWords.slice(0, 10).map(word => (
                              <div key={word.id}>• {word.word_english}</div>
                            ))}
                            {orphanedWords.length > 10 && (
                              <div>ועוד {orphanedWords.length - 10}...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={cleanupOrphanedWords}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isProcessing ? "מעבד..." : "בצע ניקוי"}
                      </Button>
                      <Button
                        onClick={() => { 
                          setOrphanedWords([]); 
                          setWordsToAdd([]);
                          setDuplicateWords([]);
                          setHasChecked(false); 
                        }}
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white"
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-300">
                    ✅ כל המילים תקינות!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}