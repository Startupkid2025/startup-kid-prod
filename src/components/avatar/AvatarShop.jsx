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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Coins, ShoppingCart, Check, Lock } from "lucide-react";
import { AVATAR_ITEMS } from "./TamagotchiAvatar";
import TamagotchiAvatar from "./TamagotchiAvatar";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const categories = {
  body: { name: "גוף", icon: "🎨" },
  eyes: { name: "עיניים", icon: "👀" },
  mouth: { name: "פה", icon: "😊" },
  hat: { name: "כובע", icon: "🎩" },
  accessory: { name: "אביזרים", icon: "💼" },
  shoes: { name: "נעליים", icon: "👟" },
  background: { name: "רקע", icon: "🏠" },
  jewelry: { name: "תכשיטים", icon: "💍" }
};

export default function AvatarShop({ 
  isOpen, 
  onClose, 
  equippedItems, 
  userData,
  onPurchase,
  onEquipItem 
}) {
  const [selectedCategory, setSelectedCategory] = useState("body");
  const [activeTab, setActiveTab] = useState("shop");

  const currentCoins = userData?.coins || 0;
  const currentPurchasedItems = userData?.purchased_items || [];

  const checkUnlocked = (item) => {
    if (!item.unlock) return true;
    
    if (item.unlock.type === "lessons") {
      return (userData?.total_lessons || 0) >= item.unlock.value;
    }
    
    if (item.unlock.type === "skill") {
      return (userData?.[item.unlock.skill] || 0) >= item.unlock.value;
    }
    
    return true;
  };

  const getUnlockText = (item) => {
    if (!item.unlock) return "";
    
    if (item.unlock.type === "lessons") {
      return `נדרש ${item.unlock.value} שיעורים`;
    }
    
    if (item.unlock.type === "skill") {
      const skillNames = {
        ai_tech_level: "AI",
        personal_dev_level: "פיתוח",
        social_skills_level: "חברתי",
        money_business_level: "עסקים"
      };
      return `נדרש רמה ${item.unlock.value} ${skillNames[item.unlock.skill]}`;
    }
    
    return "";
  };

  const getItemsByCategory = (category) => {
    return Object.entries(AVATAR_ITEMS)
      .filter(([_, item]) => item.category === category)
      .map(([id, item]) => ({
        id,
        ...item,
        isPurchased: item.price === 0 || currentPurchasedItems.includes(id),
        isEquipped: equippedItems[category] === id,
        canAfford: currentCoins >= item.price,
        isUnlocked: checkUnlocked(item),
        unlockText: getUnlockText(item)
      }))
      .sort((a, b) => a.price - b.price);
  };

  const handlePurchase = async (itemId) => {
    const item = AVATAR_ITEMS[itemId];
    
    if (!checkUnlocked(item)) {
      toast.error(`🔒 ${getUnlockText(item)}`);
      return;
    }
    
    if (currentCoins < item.price) {
      toast.error("אין לך מספיק מטבעות! 💰");
      return;
    }
    
    const newPurchasedItems = [...currentPurchasedItems, itemId];
    const newCoins = currentCoins - item.price;

    await base44.auth.updateMe({
      purchased_items: newPurchasedItems,
      coins: newCoins
    });

    // Update leaderboard entry
    try {
      const leaderboardEntries = await base44.entities.LeaderboardEntry.filter({ 
        student_email: userData.email 
      });

      if (leaderboardEntries.length > 0 && userData.user_type !== 'parent' && userData.user_type !== 'demo') {
        await base44.entities.LeaderboardEntry.update(leaderboardEntries[0].id, {
          purchased_items: newPurchasedItems,
          coins: newCoins
        });
      }
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }

    toast.success(`רכשת את ${item.name}! 🎉`);
    
    if (onPurchase && typeof onPurchase === 'function') {
      await onPurchase();
    }
    
    onClose();
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

  const purchasedItemsInCategory = getItemsByCategory(selectedCategory).filter(item => item.isPurchased);
  const unpurchasedItemsInCategory = getItemsByCategory(selectedCategory).filter(item => !item.isPurchased);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border-4 border-yellow-400/50 max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-2xl font-black text-white">
              🛍️ חנות היזמים
            </DialogTitle>
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-xl border-2 border-white/30">
              <Coins className="w-5 h-5" />
              <span className="text-lg font-black">{currentCoins}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Avatar */}
        <div className="flex justify-center py-2">
          <TamagotchiAvatar 
            equippedItems={equippedItems} 
            size="medium"
            showBackground={true}
            userEmail={userData?.email}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl">
            <TabsTrigger 
              value="shop"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white text-white/70 font-bold rounded-lg text-sm"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              קנה פריטים
            </TabsTrigger>
            <TabsTrigger 
              value="wardrobe"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/70 font-bold rounded-lg text-sm"
            >
              <Check className="w-3 h-3 mr-1" />
              הארון שלי
            </TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <div className="flex gap-2 bg-black/20 p-2 rounded-xl overflow-x-auto">
              {Object.entries(categories).map(([key, { icon }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                    selectedCategory === key
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-110 shadow-lg'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shop Tab */}
          <TabsContent value="shop">
            <TooltipProvider>
              <div className="mt-3 max-h-[300px] overflow-y-auto px-1">
                <div className="grid grid-cols-4 gap-2">
                  <AnimatePresence>
                    {unpurchasedItemsInCategory.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`relative p-2 rounded-lg border-2 ${
                              item.isUnlocked ? 'border-purple-300/50 bg-white/10' : 'border-gray-500 bg-gray-800/50'
                            }`}>
                        {!item.isUnlocked && (
                          <div className="absolute top-1 right-1 bg-gray-800 text-white rounded-full p-0.5 z-10">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}

                        {/* Bonus Badges - Top Left */}
                        {item.hourlyBonus > 0 && item.isUnlocked && (
                          <div className="absolute top-1 left-1 bg-black/80 text-yellow-300 text-[10px] px-2 py-1 rounded-full font-black shadow-xl z-10 flex items-center gap-0.5 border border-yellow-400/50">
                            <Coins className="w-2.5 h-2.5" />
                            <span>+{item.hourlyBonus}/ש</span>
                          </div>
                        )}
                        {item.taxReduction > 0 && item.isUnlocked && (
                          <div className="absolute top-1 left-1 bg-black/80 text-green-300 text-[10px] px-2 py-1 rounded-full font-black shadow-xl z-10 flex items-center gap-0.5 border border-green-400/50">
                            <span>-{item.taxReduction}% מס</span>
                          </div>
                        )}
                        {item.mathBonus > 0 && item.isUnlocked && (
                          <div className="absolute top-1 left-1 bg-black/80 text-blue-300 text-[10px] px-2 py-1 rounded-full font-black shadow-xl z-10 flex items-center gap-0.5 border border-blue-400/50">
                            <Coins className="w-2.5 h-2.5" />
                            <span>+{item.mathBonus} חשבון</span>
                          </div>
                        )}
                        {item.inflationProtection > 0 && item.isUnlocked && (
                          <div className="absolute top-1 left-1 bg-black/80 text-purple-300 text-[10px] px-2 py-1 rounded-full font-black shadow-xl z-10 flex items-center gap-0.5 border border-purple-400/50">
                            <span>-{item.inflationProtection}% 📉</span>
                          </div>
                        )}
                        {item.specialBonus && item.isUnlocked && (
                          <div className="absolute top-1 left-1 bg-black/80 text-pink-300 text-[10px] px-2 py-1 rounded-full font-black shadow-xl z-10 flex items-center gap-0.5 border border-pink-400/50">
                            <span>✨</span>
                          </div>
                        )}

                        {/* Preview - Show actual item */}
                        {item.category === "body" ? (
                          <div 
                            className={`mb-2 h-20 rounded-full border-2 border-white/30 ${
                              !item.isUnlocked ? 'opacity-40 grayscale' : ''
                            }`}
                            style={{ 
                              background: item.color.includes('gradient') ? item.color : item.color,
                              boxShadow: item.isUnlocked ? `0 0 20px ${item.color}50` : 'none'
                            }}
                          />
                        ) : (
                          <div className={`mb-2 h-20 flex items-center justify-center text-4xl ${
                            !item.isUnlocked ? 'opacity-40 grayscale' : ''
                          }`}>
                            {item.emoji || "🎨"}
                          </div>
                        )}

                        <p className={`font-bold text-sm mb-1.5 text-center line-clamp-2 min-h-[28px] ${
                          item.isUnlocked ? 'text-white' : 'text-gray-400'
                        }`}>
                          {item.name}
                        </p>

                        {!item.isUnlocked ? (
                          <div className="text-xs text-center text-gray-400 leading-tight font-bold">
                            🔒 {item.unlockText}
                          </div>
                        ) : (
                          <Button
                            onClick={() => handlePurchase(item.id)}
                            disabled={!item.canAfford}
                            className={`w-full text-sm py-2 h-auto ${
                              item.canAfford
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                                : 'bg-gray-600 cursor-not-allowed opacity-50'
                            } text-white font-bold`}
                          >
                            <Coins className="w-4 h-4 mr-1" />
                            {item.price}
                          </Button>
                        )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-black/90 text-white border-purple-400/50">
                            <p className="font-bold">{item.name}</p>
                            {item.description && <p className="text-xs text-white/80">{item.description}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {unpurchasedItemsInCategory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-white font-medium text-base">
                    רכשת את כל הפריטים!
                  </p>
                  </div>
                )}
              </div>
            </TooltipProvider>
          </TabsContent>

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe">
            <TooltipProvider>
              <div className="mt-3 max-h-[300px] overflow-y-auto px-1">
                <div className="grid grid-cols-4 gap-2">
                  <AnimatePresence>
                    {purchasedItemsInCategory.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                        onClick={() => handleEquip(selectedCategory, item.id)}
                        className={`relative w-full p-2 rounded-lg border-2 transition-all ${
                          item.isEquipped
                            ? 'border-green-400 bg-green-900/30 shadow-lg scale-105'
                            : 'border-purple-300/30 bg-white/10 hover:border-purple-300/60'
                        }`}
                      >
                        {item.isEquipped && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 z-10"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}

                        {/* Bonus Badges */}
                        {item.hourlyBonus > 0 && (
                          <div className="absolute top-1 left-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg z-10 flex items-center gap-0.5">
                            <Coins className="w-2.5 h-2.5" />
                            <span>+{item.hourlyBonus}/ש</span>
                          </div>
                        )}
                        {item.taxReduction > 0 && (
                          <div className="absolute top-1 left-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg z-10 flex items-center gap-0.5">
                            <span>-{item.taxReduction}% מס</span>
                          </div>
                        )}
                        {item.mathBonus > 0 && (
                          <div className="absolute top-1 left-1 bg-gradient-to-r from-blue-400 to-cyan-500 text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg z-10 flex items-center gap-0.5">
                            <Coins className="w-2.5 h-2.5" />
                            <span>+{item.mathBonus}</span>
                          </div>
                        )}
                        {item.inflationProtection > 0 && (
                          <div className="absolute top-1 left-1 bg-gradient-to-r from-purple-400 to-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg z-10 flex items-center gap-0.5">
                            <span>-{item.inflationProtection}% 📉</span>
                          </div>
                        )}
                        {item.specialBonus && (
                          <div className="absolute top-1 left-1 bg-gradient-to-r from-pink-400 to-rose-500 text-white text-[10px] px-2 py-1 rounded-full font-black shadow-lg z-10 flex items-center gap-0.5">
                            <span>✨ מיוחד</span>
                          </div>
                        )}

                        {/* Preview - Show actual item */}
                        {item.category === "body" ? (
                          <div 
                            className="mb-2 h-20 rounded-full border-2 border-white/30"
                            style={{ 
                              background: item.color.includes('gradient') ? item.color : item.color,
                              boxShadow: `0 0 20px ${item.color}50`
                            }}
                          />
                        ) : (
                          <div className="mb-2 h-20 flex items-center justify-center text-4xl">
                            {item.emoji || "🎨"}
                          </div>
                        )}

                              <p className="font-bold text-sm text-white text-center line-clamp-2 min-h-[28px]">
                                {item.name}
                              </p>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-black/90 text-white border-purple-400/50">
                            <p className="font-bold">{item.name}</p>
                            {item.description && <p className="text-xs text-white/80">{item.description}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {purchasedItemsInCategory.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-white/70 text-base">
                    עדיין לא רכשת פריטים בקטגוריה זו
                  </p>
                  </div>
                )}
              </div>
            </TooltipProvider>
          </TabsContent>
        </Tabs>

        <div className="mt-3 pt-3 border-t border-white/20">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-base py-4 rounded-xl"
          >
            סגור חנות 👋
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}