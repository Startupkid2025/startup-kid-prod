
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";
import TamagotchiAvatar from "../avatar/TamagotchiAvatar";
import { Group } from "@/entities/Group";
import { WordProgress } from "@/entities/WordProgress";
import { LessonParticipation } from "@/entities/LessonParticipation";

export default function AvatarChat({ userData, equippedItems }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate or get avatar name
  const avatarName = userData?.avatar_name || "חבר";
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `היי! 👋 אני ${avatarName}, האווטאר שלך! אפשר לשאול אותי כל דבר - על השיעורים, איך להתקדם, או סתם לדבר! מה שלומך היום?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Fetch user's groups
      const allGroups = await Group.list();
      const userGroups = allGroups.filter(g => g.student_emails?.includes(userData.email));
      
      // Fetch user's word progress
      const wordProgress = await WordProgress.filter({ student_email: userData.email });
      const masteredWords = wordProgress.filter(w => w.mastered).length;
      
      // Fetch lesson participations
      const participations = await LessonParticipation.filter({ student_email: userData.email });
      const completedSurveys = participations.filter(p => p.survey_completed).length;
      const totalParticipations = participations.filter(p => p.attended !== false).length;
      const pendingSurveys = totalParticipations - completedSurveys;

      const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      
      let groupsInfo = "";
      if (userGroups.length > 0) {
        groupsInfo = "הקבוצות שלך:\n" + userGroups.map(g => 
          `- ${g.group_name}: יום ${dayNames[g.day_of_week]} בשעה ${g.hour}`
        ).join("\n");
      } else {
        groupsInfo = "אתה עדיין לא משויך לאף קבוצה. המורה שלך ישייך אותך בקרוב!";
      }

      const context = `
אתה ${avatarName}, האווטאר האישי של ${userData?.full_name}.

**חשוב מאוד**: תשתמש רק במידע שאני נותן לך. אל תמציא מידע!

## פרטי התלמיד:
- שם: ${userData?.full_name}
- גיל: ${userData?.age || "לא ידוע"}
- עבר ${userData?.total_lessons || 0} שיעורים
- יש לו ${userData?.coins || 0} מטבעות 🪙

${groupsInfo}

## הרמות שלו:
- בינה מלאכותית: רמה ${userData?.ai_tech_level || 1} (${userData?.ai_tech_xp || 0}/100 XP)
- פיתוח אישי: רמה ${userData?.personal_dev_level || 1} (${userData?.personal_dev_xp || 0}/100 XP)
- מיומנויות חברתיות: רמה ${userData?.social_skills_level || 1} (${userData?.social_skills_xp || 0}/100 XP)
- כסף ועסקים: רמה ${userData?.money_business_level || 1} (${userData?.money_business_xp || 0}/100 XP)

## מצב אוצר המילים (משחק אנגלית):
- שלט ב-${masteredWords} מילים באנגלית 📚
- סיים ${completedSurveys} סקרים על שיעורים
- יש לו ${pendingSurveys} סקרים ממתינים (שווה 20 נקודות כל אחד!)

## תפקידך:
1. **לעודד** את התלמיד להשתתף בשיעורים ולהתקדם
2. **להסביר** על האפליקציה ואיך להשתמש בה:
   - איך מרוויחים מטבעות: 100 מטבעות בכל שיעור, מילוי סקרים (20 XP), למידת אנגלית באוצר המילים (1-3 מטבעות למילה), ומילוי שדות בפרופיל
   - איך קונים פריטים לאווטאר: בחנות (כפתור ליד המטבעות בדף הבית)
   - איך מתקדמים ברמות: לקבל XP משיעורים וסקרים
3. **לתת טיפים** על שיעורים קודמים אם הוא שואל (אבל רק אם אתה יודע בוודאות)
4. **להיות חבר תומך** - לשאול איך הוא מרגיש, להיות אמפתי
5. **לעזור בלמידה** - לענות על שאלות על נושאים שהוא רוצה ללמוד
6. **לעודד להרוויח מטבעות**:
   - למלא סקרים על שיעורים (יש לו ${pendingSurveys} סקרים ממתינים!)
   - לשחק באוצר המילים (דף "אנגלית")
   - למלא שדות בפרופיל (גיל, ביו, טלפון)

## חשוב:
- אל תמציא מידע על קבוצות, שיעורים או תלמידים אחרים
- אם אתה לא יודע משהו בוודאות - תגיד שאתה לא יודע
- דבר בעברית, בסגנון צעיר וחברי
- תן תשובות קצרות (2-3 משפטים בדרך כלל)
- השתמש באמוג'ים 😊

השאלה/ההודעה של התלמיד: "${userMessage}"
      `;

      const response = await InvokeLLM({
        prompt: context,
      });

      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error calling LLM:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "אופס! משהו השתבש... נסה שוב בעוד רגע! 😅" 
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 left-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center text-white z-40"
        >
          <MessageCircle className="w-8 h-8" />
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl z-40 overflow-hidden border-2 border-purple-300"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full p-1 flex items-center justify-center overflow-hidden">
                  <div className="scale-[0.6] origin-center">
                    <TamagotchiAvatar 
                      equippedItems={equippedItems} 
                      size="small"
                      showBackground={false}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white">{avatarName}</h3>
                  <p className="text-xs text-white/80">תמיד פה בשבילך! 💜</p>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50 to-pink-50">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-white border-2 border-purple-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-2">
                    <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t-2 border-purple-200">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="כתוב משהו..."
                  className="flex-1 border-2 border-purple-200 focus:border-purple-400 text-gray-900 placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
