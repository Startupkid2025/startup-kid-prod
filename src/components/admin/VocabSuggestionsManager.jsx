import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, X, Loader2, User } from "lucide-react";

export default function VocabSuggestionsManager() {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const allSuggestions = await base44.entities.VocabularyWordSuggestion.filter(
        { status: "pending" },
        "-created_date"
      );
      setSuggestions(allSuggestions);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast.error("שגיאה בטעינת ההמלצות");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  };

  const approveSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("לא נבחרו המלצות");
      return;
    }

    setIsProcessing(true);
    try {
      const selectedSuggestions = suggestions.filter(s => selectedIds.has(s.id));
      
      for (const suggestion of selectedSuggestions) {
        // Find the vocabulary word
        const vocabWords = await base44.entities.VocabularyWord.filter({
          word_english: suggestion.word_english
        });
        
        if (vocabWords.length > 0) {
          const vocabWord = vocabWords[0];
          // Append the new translation
          const currentHebrew = vocabWord.word_hebrew || "";
          const newHebrew = currentHebrew.includes(suggestion.suggested_hebrew)
            ? currentHebrew
            : `${currentHebrew}, ${suggestion.suggested_hebrew}`;
          
          await base44.entities.VocabularyWord.update(vocabWord.id, {
            word_hebrew: newHebrew
          });
        }
        
        // Mark suggestion as approved
        await base44.entities.VocabularyWordSuggestion.update(suggestion.id, {
          status: "approved"
        });
      }
      
      toast.success(`✅ ${selectedIds.size} המלצות אושרו!`);
      setSelectedIds(new Set());
      loadSuggestions();
    } catch (error) {
      console.error("Error approving suggestions:", error);
      toast.error("שגיאה באישור ההמלצות");
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("לא נבחרו המלצות");
      return;
    }

    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        await base44.entities.VocabularyWordSuggestion.update(id, {
          status: "rejected"
        });
      }
      
      toast.success(`❌ ${selectedIds.size} המלצות נדחו`);
      setSelectedIds(new Set());
      loadSuggestions();
    } catch (error) {
      console.error("Error rejecting suggestions:", error);
      toast.error("שגיאה בדחיית ההמלצות");
    } finally {
      setIsProcessing(false);
    }
  };

  const approveSingle = async (suggestion) => {
    setIsProcessing(true);
    try {
      // Find the vocabulary word
      const vocabWords = await base44.entities.VocabularyWord.filter({
        word_english: suggestion.word_english
      });
      
      if (vocabWords.length > 0) {
        const vocabWord = vocabWords[0];
        // Append the new translation
        const currentHebrew = vocabWord.word_hebrew || "";
        const newHebrew = currentHebrew.includes(suggestion.suggested_hebrew)
          ? currentHebrew
          : `${currentHebrew}, ${suggestion.suggested_hebrew}`;
        
        await base44.entities.VocabularyWord.update(vocabWord.id, {
          word_hebrew: newHebrew
        });
      }
      
      // Mark suggestion as approved
      await base44.entities.VocabularyWordSuggestion.update(suggestion.id, {
        status: "approved"
      });
      
      toast.success("✅ ההמלצה אושרה!");
      loadSuggestions();
    } catch (error) {
      console.error("Error approving suggestion:", error);
      toast.error("שגיאה באישור ההמלצה");
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectSingle = async (suggestionId) => {
    setIsProcessing(true);
    try {
      await base44.entities.VocabularyWordSuggestion.update(suggestionId, {
        status: "rejected"
      });
      
      toast.success("❌ ההמלצה נדחתה");
      loadSuggestions();
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
      toast.error("שגיאה בדחיית ההמלצה");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-2xl flex items-center justify-between">
          <span>💡 המלצות פירושים למילים ({suggestions.length})</span>
          {suggestions.length > 0 && (
            <div className="flex gap-2">
              <Button
                onClick={approveSelected}
                disabled={selectedIds.size === 0 || isProcessing}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-4 h-4 ml-1" />
                אשר ({selectedIds.size})
              </Button>
              <Button
                onClick={rejectSelected}
                disabled={selectedIds.size === 0 || isProcessing}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <X className="w-4 h-4 ml-1" />
                דחה ({selectedIds.size})
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-white/70 text-lg">אין המלצות ממתינות</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedIds.size === suggestions.length}
                onCheckedChange={toggleSelectAll}
                className="border-white/30"
              />
              <span className="text-white/70 text-sm">בחר הכל</span>
            </div>
            
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(suggestion.id)}
                    onCheckedChange={() => toggleSelection(suggestion.id)}
                    className="mt-1 border-white/30"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg" dir="ltr" translate="no" lang="en">
                        {suggestion.word_english}
                      </span>
                    </div>
                    
                    <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                      <p className="text-orange-200 text-sm mb-1">פירוש נוכחי:</p>
                      <p className="text-white font-bold">{suggestion.current_hebrew}</p>
                    </div>
                    
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                      <p className="text-green-200 text-sm mb-1">פירוש מוצע:</p>
                      <p className="text-white font-bold">{suggestion.suggested_hebrew}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <User className="w-4 h-4" />
                      <span>{suggestion.suggested_by_name}</span>
                      <span>•</span>
                      <span>{new Date(suggestion.created_date).toLocaleDateString("he-IL")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}