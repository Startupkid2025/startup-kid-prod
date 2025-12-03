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
import { ITEMS_LIBRARY } from "./RPGAvatar";

const UNLOCK_REQUIREMENTS = {
  // Head items
  "cap_basic": 0,
  "cap_startup": 5,
  "crown": 20,
  
  // Face items
  "glasses_basic": 3,
  "glasses_cool": 10,
  "vr_headset": 25,
  
  // Body items
  "tshirt": 0,
  "suit": 8,
  "hoodie": 15,
  
  // Accessories
  "laptop": 2,
  "phone": 6,
  "briefcase": 12,
  "rocket": 30,
  
  // Backgrounds
  "bg_office": 4,
  "bg_cafe": 14,
  "bg_space": 35
};

const RARITY_COLORS = {
  common: "from-gray-400 to-gray-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-500"
};

const getRarity = (requirement) => {
  if (requirement >= 30) return "legendary";
  if (requirement >= 15) return "epic";
  if (requirement >= 5) return "rare";
  return "common";
};

export default function WardrobeDialog({ 
  isOpen, 
  onClose, 
  equippedItems, 
  unlockedItems, 
  totalLessons,
  onEquipItem 
}) {
  const [selectedCategory, setSelectedCategory] = useState("head");

  const categories = {
    head: { name: "ראש", icon: "🎩" },
    face: { name: "פנים", icon: "👓" },
    body: { name: "גוף", icon: "👕" },
    accessory: { name: "אבזרים", icon: "💼" },
    background: { name: "רקע", icon: "🎨" }
  };

  const getItemsByCategory = (category) => {
    return Object.entries(ITEMS_LIBRARY)
      .filter(([_, item]) => item.category === category)
      .map(([id, item]) => ({
        id,
        ...item,
        unlockRequirement: UNLOCK_REQUIREMENTS[id] || 0,
        isUnlocked: totalLessons >= (UNLOCK_REQUIREMENTS[id] || 0),
        isEquipped: equippedItems[category] === id,
        rarity: getRarity(UNLOCK_REQUIREMENTS[id] || 0)
      }));
  };

  const handleEquip = (category, itemId) => {
    const newEquipped = { ...equippedItems };
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
          <TabsList className="grid grid-cols-5 gap-2 bg-white/50 p-1">
            {Object.entries(categories).map(([key, { name, icon }]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
              >
                <span className="text-lg mr-1">{icon}</span>
                <span className="hidden sm:inline">{name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6 max-h-[400px] overflow-y-auto px-2">
            {Object.entries(categories).map(([categoryKey, { name }]) => (
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
                          {/* Rarity Border Glow */}
                          {item.isUnlocked && (
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${RARITY_COLORS[item.rarity]} opacity-20 blur-sm -z-10`} />
                          )}

                          {/* Item Icon */}
                          <div className="text-5xl mb-2 relative">
                            {item.icon}
                            {item.isEquipped && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1"
                              >
                                <Check className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                            {!item.isUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                <Lock className="w-8 h-8 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Item Name */}
                          <p className={`font-bold text-sm mb-1 ${
                            item.isUnlocked ? 'text-gray-800' : 'text-gray-500'
                          }`}>
                            {item.name}
                          </p>

                          {/* Unlock Requirement */}
                          {!item.isUnlocked && (
                            <p className="text-xs text-gray-500">
                              נפתח ב-{item.unlockRequirement} שיעורים
                            </p>
                          )}

                          {/* Rarity Badge */}
                          {item.isUnlocked && (
                            <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${RARITY_COLORS[item.rarity]} text-white`}>
                              {item.rarity === "legendary" && "אגדי"}
                              {item.rarity === "epic" && "אפי"}
                              {item.rarity === "rare" && "נדיר"}
                              {item.rarity === "common" && "רגיל"}
                            </div>
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