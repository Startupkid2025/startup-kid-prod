import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Check } from "lucide-react";
import { AVATAR_ITEMS } from "./TamagotchiAvatar";

const categories = {
  body: { name: "גוף", icon: "🎨" },
  eyes: { name: "עיניים", icon: "👀" },
  mouth: { name: "פה", icon: "😊" },
  hat: { name: "כובע", icon: "🎩" },
  cheeks: { name: "לחיים", icon: "💕" },
  background: { name: "רקע", icon: "✨" }
};

export default function TamagotchiWardrobe({ 
  isOpen, 
  onClose, 
  equippedItems, 
  totalLessons,
  onEquipItem 
}) {
  const [selectedCategory, setSelectedCategory] = useState("body");

  const getItemsByCategory = (category) => {
    return Object.entries(AVATAR_ITEMS)
      .filter(([_, item]) => item.category === category)
      .map(([id, item]) => ({
        id,
        ...item,
        unlockRequirement: item.unlock?.value || 0,
        isUnlocked: totalLessons >= (item.unlock?.value || 0),
        isEquipped: equippedItems?.[category] === id
      }));
  };

  const handleEquip = (category, itemId) => {
    const newEquipped = { ...(equippedItems || {}) };
    if (newEquipped[category] === itemId) {
      delete newEquipped[category];
    } else {
      newEquipped[category] = itemId;
    }
    onEquipItem(newEquipped);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ארון הבגדים שלי 👔
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            השלמת {totalLessons} שיעורים • לחץ על פריט כדי ללבוש
          </p>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mt-4">
          <TabsList className="grid grid-cols-6 gap-2 bg-white/50 p-1">
            {Object.entries(categories).map(([key, { name, icon }]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
              >
                <span className="text-lg">{icon}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6 max-h-[400px] overflow-y-auto px-2">
            {Object.entries(categories).map(([categoryKey]) => (
              <TabsContent key={categoryKey} value={categoryKey}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {getItemsByCategory(categoryKey).map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <button
                          onClick={() => item.isUnlocked && handleEquip(categoryKey, item.id)}
                          disabled={!item.isUnlocked}
                          className={`relative w-full p-4 rounded-2xl border-2 transition-all ${
                            item.isEquipped
                              ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                              : item.isUnlocked
                              ? 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-md'
                              : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {item.isEquipped && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}

                          {/* Preview */}
                          <div className="relative mb-2 h-20 flex items-center justify-center">
                            {item.isUnlocked ? (
                              <img src={item.image} alt={item.name} className="w-16 h-16 object-contain" />
                            ) : (
                              <div className="text-4xl opacity-30">
                                <Lock className="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          <p className={`font-bold text-sm mb-1 ${
                            item.isUnlocked ? 'text-gray-800' : 'text-gray-500'
                          }`}>
                            {item.name}
                          </p>

                          {!item.isUnlocked && (
                            <p className="text-xs text-gray-500">
                              נפתח ב-{item.unlockRequirement} שיעורים
                            </p>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="mt-4 pt-4 border-t border-purple-200">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
          >
            סיימתי להתלבש ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}