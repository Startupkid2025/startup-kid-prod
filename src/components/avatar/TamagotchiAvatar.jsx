import React from "react";
import { motion } from "framer-motion";

export const AVATAR_ITEMS = {
  // 8 צבעי גוף
  "body_blue": {
    name: "כחול שמיים",
    emoji: "💙",
    color: "#60A5FA",
    category: "body",
    price: 0,
    taxReduction: 0.1,
    description: "מפחית 0.1% מס הכנסה יומי"
  },
  "body_pink": {
    name: "ורוד מתוק",
    emoji: "💗",
    color: "#F472B6",
    category: "body",
    price: 200,
    taxReduction: 0.2,
    description: "מפחית 0.2% מס הכנסה יומי"
  },
  "body_purple": {
    name: "סגול מיסטי",
    emoji: "💜",
    color: "#A855F7",
    category: "body",
    price: 400,
    taxReduction: 0.3,
    description: "מפחית 0.3% מס הכנסה יומי"
  },
  "body_green": {
    name: "ירוק עשבי",
    emoji: "💚",
    color: "#34D399",
    category: "body",
    price: 600,
    unlock: { type: "lessons", value: 8 },
    taxReduction: 0.4,
    description: "מפחית 0.4% מס הכנסה יומי"
  },
  "body_orange": {
    name: "כתום חם",
    emoji: "🧡",
    color: "#FB923C",
    category: "body",
    price: 800,
    unlock: { type: "lessons", value: 16 },
    taxReduction: 0.5,
    description: "מפחית 0.5% מס הכנסה יומי"
  },
  "body_red": {
    name: "אדום לוהט",
    emoji: "❤️",
    color: "#EF4444",
    category: "body",
    price: 1000,
    unlock: { type: "lessons", value: 24 },
    taxReduction: 0.6,
    description: "מפחית 0.6% מס הכנסה יומי"
  },
  "body_gold": {
    name: "זהב מלכותי",
    emoji: "💛",
    color: "#FBBF24",
    category: "body",
    price: 1500,
    unlock: { type: "lessons", value: 32 },
    taxReduction: 0.7,
    description: "מפחית 0.7% מס הכנסה יומי"
  },
  "body_rainbow": {
    name: "קשת בענן",
    emoji: "🌈",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    category: "body",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    taxReduction: 0.8,
    description: "מפחית 0.8% מס הכנסה יומי"
  },

  // 8 סוגי עיניים
  "eyes_sparkle": {
    name: "נוצצות",
    emoji: "✨",
    type: "sparkle",
    category: "eyes",
    price: 0,
    wordBonus: 1,
    description: "+1 מטבע למילה נכונה באנגלית"
  },
  "eyes_determined": {
    name: "נחושות",
    emoji: "👀",
    type: "determined",
    category: "eyes",
    price: 300,
    wordBonus: 2,
    description: "+2 מטבעות למילה נכונה באנגלית"
  },
  "eyes_heart": {
    name: "לבבות",
    emoji: "😍",
    type: "heart",
    category: "eyes",
    price: 500,
    wordBonus: 3,
    description: "+3 מטבעות למילה נכונה באנגלית"
  },
  "eyes_star": {
    name: "כוכבים",
    emoji: "🤩",
    type: "star",
    category: "eyes",
    price: 700,
    unlock: { type: "lessons", value: 8 },
    wordBonus: 4,
    description: "+4 מטבעות למילה נכונה באנגלית"
  },
  "eyes_cool": {
    name: "משקפי שמש",
    emoji: "😎",
    type: "sunglasses",
    category: "eyes",
    price: 1000,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 5,
    description: "+5 מטבעות לשעה בעבודה"
  },
  "eyes_laser": {
    name: "לייזר אדום",
    emoji: "🔴",
    type: "laser",
    category: "eyes",
    price: 1200,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 8,
    description: "+8 מטבעות לשעה בעבודה"
  },
  "eyes_cyber": {
    name: "סייבר",
    emoji: "🤖",
    type: "cyber",
    category: "eyes",
    price: 1500,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 10,
    description: "+10 מטבעות לשעה בעבודה"
  },
  "eyes_diamond": {
    name: "יהלומים",
    emoji: "💎",
    type: "diamond",
    category: "eyes",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 15,
    description: "+15 מטבעות לשעה בעבודה"
  },

  // 8 סוגי פה
  "mouth_smile": {
    name: "חיוך רגיל",
    emoji: "😊",
    type: "smile",
    category: "mouth",
    price: 0,
    wordBonus: 1,
    dividendTaxReduction: 1,
    description: "מפחית 1% מס דיבידנד"
  },
  "mouth_happy": {
    name: "שמח מאוד",
    emoji: "😄",
    type: "happy",
    category: "mouth",
    price: 250,
    wordBonus: 2,
    dividendTaxReduction: 2,
    description: "מפחית 2% מס דיבידנד"
  },
  "mouth_confident": {
    name: "ביטחון עצמי",
    emoji: "😏",
    type: "confident",
    category: "mouth",
    price: 400,
    wordBonus: 3,
    dividendTaxReduction: 3,
    description: "מפחית 3% מס דיבידנד"
  },
  "mouth_cat": {
    name: "חתולי",
    emoji: "😺",
    type: "cat",
    category: "mouth",
    price: 550,
    unlock: { type: "lessons", value: 8 },
    wordBonus: 4,
    dividendTaxReduction: 4,
    description: "מפחית 4% מס דיבידנד"
  },
  "mouth_wink": {
    name: "קריצה",
    emoji: "😉",
    type: "wink",
    category: "mouth",
    price: 700,
    unlock: { type: "lessons", value: 16 },
    wordBonus: 5,
    dividendTaxReduction: 5,
    description: "מפחית 5% מס דיבידנד"
  },
  "mouth_laugh": {
    name: "צחוק גדול",
    emoji: "😂",
    type: "laugh",
    category: "mouth",
    price: 900,
    unlock: { type: "lessons", value: 24 },
    wordBonus: 7,
    dividendTaxReduction: 7,
    description: "מפחית 7% מס דיבידנד"
  },
  "mouth_cool": {
    name: "מגניב",
    emoji: "🆒",
    type: "cool",
    category: "mouth",
    price: 1100,
    unlock: { type: "lessons", value: 32 },
    wordBonus: 10,
    dividendTaxReduction: 10,
    description: "מפחית 10% מס דיבידנד"
  },
  "mouth_boss": {
    name: "בוס",
    emoji: "😤",
    type: "boss",
    category: "mouth",
    price: 1500,
    unlock: { type: "lessons", value: 40 },
    wordBonus: 15,
    dividendTaxReduction: 15,
    description: "מפחית 15% מס דיבידנד"
  },

  // 8 כובעים
  "hat_cap": {
    name: "🧢 כובע בייסבול",
    emoji: "🧢",
    category: "hat",
    price: 300,
    hourlyBonus: 2,
    description: "+2 מטבעות לשעה בעבודה"
  },
  "hat_party": {
    name: "🎉 כובע מסיבה",
    emoji: "🎉",
    category: "hat",
    price: 450,
    hourlyBonus: 3,
    description: "+3 מטבעות לשעה בעבודה"
  },
  "hat_tophat": {
    name: "🎩 כובע צילינדר",
    emoji: "🎩",
    category: "hat",
    price: 600,
    unlock: { type: "lessons", value: 8 },
    hourlyBonus: 5,
    description: "+5 מטבעות לשעה בעבודה"
  },
  "hat_graduate": {
    name: "🎓 כובע בוגר",
    emoji: "🎓",
    category: "hat",
    price: 800,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 7,
    description: "+7 מטבעות לשעה בעבודה"
  },
  "hat_cowboy": {
    name: "🤠 כובע בוקרים",
    emoji: "🤠",
    category: "hat",
    price: 1000,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 10,
    description: "+10 מטבעות לשעה בעבודה"
  },
  "hat_crown": {
    name: "👑 כתר מלכותי",
    emoji: "👑",
    category: "hat",
    price: 1300,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 15,
    description: "+15 מטבעות לשעה בעבודה"
  },
  "hat_wizard": {
    name: "🧙 כובע קוסם",
    emoji: "🧙",
    category: "hat",
    price: 1600,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 20,
    description: "+20 מטבעות לשעה בעבודה"
  },
  "hat_diamond": {
    name: "💎 כתר יהלום",
    emoji: "💎",
    category: "hat",
    price: 2500,
    unlock: { type: "lessons", value: 48 },
    hourlyBonus: 30,
    description: "+30 מטבעות לשעה בעבודה"
  },

  // 8 אביזרים יזמיים
  "accessory_phone": {
    name: "📱 סמארטפון",
    emoji: "📱",
    category: "accessory",
    price: 400,
    hourlyBonus: 3,
    description: "+3 מטבעות לשעה בעבודה"
  },
  "accessory_tie": {
    name: "👔 עניבה עסקית",
    emoji: "👔",
    category: "accessory",
    price: 600,
    hourlyBonus: 5,
    description: "+5 מטבעות לשעה בעבודה"
  },
  "accessory_briefcase": {
    name: "💼 תיק עסקים",
    emoji: "💼",
    category: "accessory",
    price: 800,
    unlock: { type: "lessons", value: 8 },
    hourlyBonus: 8,
    description: "+8 מטבעות לשעה בעבודה"
  },
  "accessory_laptop": {
    name: "💻 מחשב נייד",
    emoji: "💻",
    category: "accessory",
    price: 1000,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 10,
    description: "+10 מטבעות לשעה בעבודה"
  },
  "accessory_suit": {
    name: "🤵 חליפה מלאה",
    emoji: "🤵",
    category: "accessory",
    price: 1300,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 15,
    description: "+15 מטבעות לשעה בעבודה"
  },
  "accessory_rocket": {
    name: "🚀 רקטה",
    emoji: "🚀",
    category: "accessory",
    price: 1600,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 20,
    description: "+20 מטבעות לשעה בעבודה"
  },
  "accessory_trophy": {
    name: "🏆 גביע אלוף",
    emoji: "🏆",
    category: "accessory",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 25,
    description: "+25 מטבעות לשעה בעבודה"
  },
  "accessory_diamond_brief": {
    name: "💎 תיק יהלום",
    emoji: "💎",
    category: "accessory",
    price: 3000,
    unlock: { type: "lessons", value: 48 },
    hourlyBonus: 35,
    description: "+35 מטבעות לשעה בעבודה"
  },

  // 8 נעליים - בונוס מטבעות לתרגילי חשבון
  "shoes_sneakers": {
    name: "👟 נעלי ספורט",
    emoji: "👟",
    category: "shoes",
    price: 0,
    mathBonus: 0,
    description: "נעליים בסיסיות - ללא בונוס"
  },
  "shoes_running": {
    name: "🏃 נעלי ריצה",
    emoji: "🏃",
    category: "shoes",
    price: 350,
    mathBonus: 1,
    description: "+1 מטבע לתרגיל חשבון נכון"
  },
  "shoes_boots": {
    name: "🥾 מגפיים",
    emoji: "🥾",
    category: "shoes",
    price: 500,
    mathBonus: 2,
    description: "+2 מטבעות לתרגיל חשבון נכון"
  },
  "shoes_heels": {
    name: "👠 עקבים",
    emoji: "👠",
    category: "shoes",
    price: 700,
    unlock: { type: "lessons", value: 8 },
    mathBonus: 3,
    description: "+3 מטבעות לתרגיל חשבון נכון"
  },
  "shoes_dress": {
    name: "👞 נעלי אלגנט",
    emoji: "👞",
    category: "shoes",
    price: 1000,
    unlock: { type: "lessons", value: 16 },
    mathBonus: 4,
    description: "+4 מטבעות לתרגיל חשבון נכון"
  },
  "shoes_rocket": {
    name: "🚀 נעלי רקטה",
    emoji: "🚀",
    category: "shoes",
    price: 1400,
    unlock: { type: "lessons", value: 24 },
    mathBonus: 5,
    description: "+5 מטבעות לתרגיל חשבון נכון"
  },
  "shoes_fire": {
    name: "🔥 נעלי אש",
    emoji: "🔥",
    category: "shoes",
    price: 1800,
    unlock: { type: "lessons", value: 32 },
    mathBonus: 7,
    description: "+7 מטבעות לתרגיל חשבון נכון"
  },
  "shoes_diamond": {
    name: "💎 נעלי יהלום",
    emoji: "💎",
    category: "shoes",
    price: 2500,
    unlock: { type: "lessons", value: 40 },
    mathBonus: 10,
    description: "+10 מטבעות לתרגיל חשבון נכון"
  },

  // 8 רקעים - הכנסה פסיבית יומית
  "background_basic": {
    name: "🏠 בית פשוט",
    emoji: "🏠",
    category: "background",
    price: 0,
    passiveIncome: 0,
    description: "רקע בסיסי - ללא הכנסה פסיבית"
  },
  "background_apartment": {
    name: "🏢 דירה בעיר",
    emoji: "🏢",
    category: "background",
    price: 400,
    passiveIncome: 10,
    description: "+10 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_villa": {
    name: "🏡 וילה",
    emoji: "🏡",
    category: "background",
    price: 700,
    passiveIncome: 20,
    description: "+20 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_penthouse": {
    name: "🏙️ פנטהאוז",
    emoji: "🏙️",
    category: "background",
    price: 1000,
    unlock: { type: "lessons", value: 8 },
    passiveIncome: 30,
    description: "+30 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_mansion": {
    name: "🏰 אחוזה",
    emoji: "🏰",
    category: "background",
    price: 1500,
    unlock: { type: "lessons", value: 16 },
    passiveIncome: 50,
    description: "+50 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_island": {
    name: "🏝️ אי פרטי",
    emoji: "🏝️",
    category: "background",
    price: 2000,
    unlock: { type: "lessons", value: 24 },
    passiveIncome: 70,
    description: "+70 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_space": {
    name: "🚀 תחנת חלל",
    emoji: "🚀",
    category: "background",
    price: 2500,
    unlock: { type: "lessons", value: 32 },
    passiveIncome: 100,
    description: "+100 מטבעות ליום (הכנסה פסיבית)"
  },
  "background_universe": {
    name: "🌌 גלקסיה שלמה",
    emoji: "🌌",
    category: "background",
    price: 3500,
    unlock: { type: "lessons", value: 40 },
    passiveIncome: 150,
    description: "+150 מטבעות ליום (הכנסה פסיבית)"
  },

  // 6 תכשיטים - בונוסים מיוחדים
  "jewelry_watch": {
    name: "⌚ שעון יוקרה",
    emoji: "⌚",
    category: "jewelry",
    price: 600,
    specialBonus: "time",
    description: "+10 מטבעות ליום (בונוס רצף כניסות)"
  },
  "jewelry_necklace": {
    name: "📿 שרשרת זהב",
    emoji: "📿",
    category: "jewelry",
    price: 900,
    unlock: { type: "lessons", value: 8 },
    specialBonus: "words",
    description: "+2 מטבעות למילה נכונה באנגלית"
  },
  "jewelry_ring": {
    name: "💍 טבעת יהלום",
    emoji: "💍",
    category: "jewelry",
    price: 1200,
    unlock: { type: "lessons", value: 16 },
    specialBonus: "math",
    description: "+2 מטבעות לתרגיל חשבון נכון"
  },
  "jewelry_crown_small": {
    name: "👑 כתר קטן",
    emoji: "👑",
    category: "jewelry",
    price: 1500,
    unlock: { type: "lessons", value: 24 },
    specialBonus: "quiz",
    description: "+5 מטבעות לחידון מושלם"
  },
  "jewelry_amulet": {
    name: "🧿 קמע מזל",
    emoji: "🧿",
    category: "jewelry",
    price: 2000,
    unlock: { type: "lessons", value: 32 },
    specialBonus: "investment",
    description: "מפחית 20% מעמלות קנייה ומכירה בהשקעות"
  },
  "jewelry_infinity": {
    name: "♾️ תכשיט אינסוף",
    emoji: "♾️",
    category: "jewelry",
    price: 3000,
    unlock: { type: "lessons", value: 40 },
    specialBonus: "all",
    description: "מוסיף 5% לכל הכנסה במשחק"
  }
};

// Generate unique avatar variation based on email
const generateAvatarVariation = (email) => {
  if (!email) return { bodyVariant: 0, eyeOffset: 0, mouthOffset: 0, earSize: 1 };
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return {
    bodyVariant: (Math.abs(hash % 10) - 5) * 2, // -10 to 10
    eyeOffset: (Math.abs((hash >> 8) % 6) - 3), // -3 to 3
    mouthOffset: (Math.abs((hash >> 16) % 4) - 2), // -2 to 2
    earSize: 0.9 + (Math.abs((hash >> 24) % 3) * 0.1) // 0.9 to 1.1
  };
};

export default function TamagotchiAvatar({ equippedItems = {}, size = "large", showBackground = true, avatarStage = 1, userEmail = "", level = 0 }) {
  const sizeMap = {
    small: 80,
    medium: 120,
    large: 180
  };
  
  const avatarSize = sizeMap[size] || 180;
  
  // Scale based on stage
  const stageScale = {
    1: 0.75,
    2: 0.85,
    3: 0.95,
    4: 1.0,
    5: 1.1,
    6: 1.2
  }[avatarStage] || 1;

  const variation = generateAvatarVariation(userEmail);
  
  // Get Startamon image based on level (0-9)
  const safeLevel = Math.max(0, Math.min(9, Number(level) || 0));
  const imageNumber = safeLevel + 1; // level 0 = 1.png, level 1 = 2.png, etc.
  const startamonImageUrl = `/Startamons/Startamon1/${imageNumber}.png`;
  
  const selectedBody = AVATAR_ITEMS[equippedItems.body || "body_blue"];
  const bodyColor = selectedBody?.color || "#60A5FA";
  const eyesType = AVATAR_ITEMS[equippedItems.eyes || "eyes_sparkle"]?.type || "sparkle";
  const mouthType = AVATAR_ITEMS[equippedItems.mouth || "mouth_smile"]?.type || "smile";
  const hat = equippedItems.hat ? AVATAR_ITEMS[equippedItems.hat]?.emoji : null;
  const accessory = equippedItems.accessory ? AVATAR_ITEMS[equippedItems.accessory]?.emoji : null;

  // Eye rendering with variation - Pokemon style!
  const renderEyes = () => {
    const eyeTop = `${32 + variation.eyeOffset}%`;

    if (eyesType === "sunglasses") {
      return (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '23%', width: '20%', height: '15%', background: '#1F2937', borderRadius: '50%' }} />
          <div className="absolute" style={{ top: eyeTop, right: '23%', width: '20%', height: '15%', background: '#1F2937', borderRadius: '50%' }} />
          <div className="absolute" style={{ top: `calc(${eyeTop} + 6%)`, left: '23%', right: '23%', height: '2px', background: '#1F2937' }} />
        </>
      );
    }

    const eyeShapes = {
      sparkle: (
        <>
          {/* Left Eye - Bigger Pokemon Style */}
          <div className="absolute" style={{ top: eyeTop, left: '24%', width: '20%', height: '28%', background: '#1F2937', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '20%', left: '20%', width: '45%', height: '45%', background: 'white', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: '25%', height: '25%', background: 'white', borderRadius: '50%', opacity: 0.9 }} />
          </div>
          {/* Right Eye - Bigger Pokemon Style */}
          <div className="absolute" style={{ top: eyeTop, right: '24%', width: '20%', height: '28%', background: '#1F2937', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '20%', left: '20%', width: '45%', height: '45%', background: 'white', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '20%', right: '25%', width: '25%', height: '25%', background: 'white', borderRadius: '50%', opacity: 0.9 }} />
          </div>
        </>
      ),
      determined: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '24%', width: '20%', height: '25%', background: '#1F2937', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: 'white', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '24%', width: '20%', height: '25%', background: '#1F2937', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: 'white', borderRadius: '50%' }} />
          </div>
        </>
      ),
      heart: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', fontSize: avatarSize * 0.18 + 'px' }}>❤️</div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', fontSize: avatarSize * 0.18 + 'px' }}>❤️</div>
        </>
      ),
      star: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', fontSize: avatarSize * 0.18 + 'px' }}>⭐</div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', fontSize: avatarSize * 0.18 + 'px' }}>⭐</div>
        </>
      ),
      laser: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '24%', width: '20%', height: '25%', background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 15px #EF4444', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: '#FEE2E2', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '24%', width: '20%', height: '25%', background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 15px #EF4444', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: '#FEE2E2', borderRadius: '50%' }} />
          </div>
        </>
      ),
      cyber: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '24%', width: '20%', height: '25%', background: '#06B6D4', borderRadius: '50%', boxShadow: '0 0 20px #06B6D4', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: '#E0F2FE', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '24%', width: '20%', height: '25%', background: '#06B6D4', borderRadius: '50%', boxShadow: '0 0 20px #06B6D4', border: '2px solid rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: '#E0F2FE', borderRadius: '50%' }} />
          </div>
        </>
      ),
      diamond: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', fontSize: avatarSize * 0.18 + 'px' }}>💎</div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', fontSize: avatarSize * 0.18 + 'px' }}>💎</div>
        </>
      )
    };

    return eyeShapes[eyesType] || eyeShapes.sparkle;
  };

  // Mouth rendering with variation
  const renderMouth = () => {
    const mouthTop = `${58 + variation.mouthOffset}%`;
    const mouthTopHappyOrLaugh = `${55 + variation.mouthOffset}%`; // For happy or laugh mouths

    const mouths = {
      smile: (
        <div className="absolute" style={{ 
          top: mouthTop, 
          left: '35%', 
          width: '30%', 
          height: '8%', 
          borderBottom: '3px solid #1F2937',
          borderRadius: '0 0 50% 50%'
        }} />
      ),
      happy: (
        <div className="absolute" style={{ 
          top: mouthTopHappyOrLaugh, 
          left: '32%', 
          width: '36%', 
          height: '12%', 
          background: '#1F2937',
          borderRadius: '0 0 50% 50%'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: '10%', 
            width: '80%', 
            height: '40%', 
            background: bodyColor,
            borderRadius: '0 0 50% 50%'
          }} />
        </div>
      ),
      confident: (
        <div className="absolute" style={{ 
          top: mouthTop, 
          left: '32%', 
          width: '36%', 
          height: '10%', 
          background: '#1F2937',
          borderRadius: '0 0 50% 50%'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: '10%', 
            width: '80%', 
            height: '30%', 
            background: bodyColor,
            borderRadius: '0 0 50% 50%'
          }} />
        </div>
      ),
      cat: (
        <div className="absolute" style={{ top: mouthTop, left: '42%', width: '16%', height: '8%' }}>
          <div style={{ position: 'absolute', width: '8px', height: '8px', borderLeft: '2px solid #1F2937', borderBottom: '2px solid #1F2937', transform: 'translateX(-4px)' }} />
          <div style={{ position: 'absolute', right: 0, width: '8px', height: '8px', borderRight: '2px solid #1F2937', borderBottom: '2px solid #1F2937', transform: 'translateX(4px)' }} />
        </div>
      ),
      wink: (
        <div className="absolute" style={{ 
          top: mouthTop, 
          left: '38%', 
          width: '24%', 
          height: '6%', 
          borderBottom: '3px solid #1F2937',
          borderRadius: '0 0 40% 40%',
          transform: 'rotate(-5deg)'
        }} />
      ),
      laugh: (
        <div className="absolute" style={{ 
          top: mouthTopHappyOrLaugh, 
          left: '30%', 
          width: '40%', 
          height: '14%', 
          background: '#1F2937',
          borderRadius: '0 0 50% 50%'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: '15%', 
            width: '70%', 
            height: '35%', 
            background: bodyColor,
            borderRadius: '0 0 50% 50%'
          }} />
        </div>
      ),
      cool: (
        <div className="absolute" style={{ 
          top: mouthTop, 
          left: '35%', 
          width: '30%', 
          height: '6%', 
          borderBottom: '3px solid #1F2937',
          borderRadius: '0 0 30% 30%'
        }} />
      ),
      boss: (
        <div className="absolute" style={{ 
          top: mouthTop, 
          left: '38%', 
          width: '24%', 
          height: '5%', 
          background: '#1F2937',
          borderRadius: '2px'
        }} />
      )
    };

    return mouths[mouthType] || mouths.smile;
  };

  const bodyBackgroundStyle = bodyColor.startsWith('linear-gradient')
    ? bodyColor
    : `linear-gradient(135deg, ${bodyColor} 0%, ${bodyColor}dd 100%)`;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: avatarSize, height: avatarSize }}
    >
      {/* Glow effect */}
      {showBackground && (
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl opacity-40"
          style={{ background: bodyColor.startsWith('linear-gradient') ? bodyColor.split(',')[0].replace('linear-gradient(135deg,', '').trim() : bodyColor }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Startamon Image based on Level */}
      <motion.div
        className="relative"
        style={{ 
          width: avatarSize * 0.85, 
          height: avatarSize * 0.85,
          transform: `scale(${stageScale})`
        }}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <img 
          src={startamonImageUrl}
          alt={`Startamon Level ${safeLevel}`}
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.3))'
          }}
        />

        {/* Hat */}
        {hat && (
          <div className="absolute" style={{ 
            top: '-15%', 
            left: '50%', 
            transform: 'translateX(-50%)',
            fontSize: avatarSize * 0.25 + 'px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}>
            {hat}
          </div>
        )}

        {/* Accessory */}
        {accessory && (
          <div className="absolute" style={{ 
            bottom: '5%', 
            right: '-15%',
            fontSize: avatarSize * 0.22 + 'px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}>
            {accessory}
          </div>
        )}
      </motion.div>
    </div>
  );
}