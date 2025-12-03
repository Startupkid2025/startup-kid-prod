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
    taxReduction: 0.05,
    description: "-0.05% מס הכנסה"
  },
  "body_pink": {
    name: "ורוד מתוק",
    emoji: "💗",
    color: "#F472B6",
    category: "body",
    price: 200,
    taxReduction: 0.10,
    description: "-0.10% מס הכנסה"
  },
  "body_purple": {
    name: "סגול מיסטי",
    emoji: "💜",
    color: "#A855F7",
    category: "body",
    price: 400,
    taxReduction: 0.15,
    description: "-0.15% מס הכנסה"
  },
  "body_green": {
    name: "ירוק עשבי",
    emoji: "💚",
    color: "#34D399",
    category: "body",
    price: 600,
    unlock: { type: "lessons", value: 8 },
    taxReduction: 0.20,
    description: "-0.20% מס הכנסה"
  },
  "body_orange": {
    name: "כתום חם",
    emoji: "🧡",
    color: "#FB923C",
    category: "body",
    price: 800,
    unlock: { type: "lessons", value: 16 },
    taxReduction: 0.25,
    description: "-0.25% מס הכנסה"
  },
  "body_red": {
    name: "אדום לוהט",
    emoji: "❤️",
    color: "#EF4444",
    category: "body",
    price: 1000,
    unlock: { type: "lessons", value: 24 },
    taxReduction: 0.30,
    description: "-0.30% מס הכנסה"
  },
  "body_gold": {
    name: "זהב מלכותי",
    emoji: "💛",
    color: "#FBBF24",
    category: "body",
    price: 1500,
    unlock: { type: "lessons", value: 32 },
    taxReduction: 0.35,
    description: "-0.35% מס הכנסה"
  },
  "body_rainbow": {
    name: "קשת בענן",
    emoji: "🌈",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    category: "body",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    taxReduction: 0.40,
    description: "-0.40% מס הכנסה"
  },

  // 8 סוגי עיניים
  "eyes_sparkle": {
    name: "נוצצות",
    emoji: "✨",
    type: "sparkle",
    category: "eyes",
    price: 0
  },
  "eyes_determined": {
    name: "נחושות",
    emoji: "👀",
    type: "determined",
    category: "eyes",
    price: 300
  },
  "eyes_heart": {
    name: "לבבות",
    emoji: "😍",
    type: "heart",
    category: "eyes",
    price: 500
  },
  "eyes_star": {
    name: "כוכבים",
    emoji: "🤩",
    type: "star",
    category: "eyes",
    price: 700,
    unlock: { type: "lessons", value: 8 }
  },
  "eyes_cool": {
    name: "משקפי שמש",
    emoji: "😎",
    type: "sunglasses",
    category: "eyes",
    price: 1000,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 5
  },
  "eyes_laser": {
    name: "לייזר אדום",
    emoji: "🔴",
    type: "laser",
    category: "eyes",
    price: 1200,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 8
  },
  "eyes_cyber": {
    name: "סייבר",
    emoji: "🤖",
    type: "cyber",
    category: "eyes",
    price: 1500,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 10
  },
  "eyes_diamond": {
    name: "יהלומים",
    emoji: "💎",
    type: "diamond",
    category: "eyes",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 15
  },

  // 8 סוגי פה
  "mouth_smile": {
    name: "חיוך רגיל",
    emoji: "😊",
    type: "smile",
    category: "mouth",
    price: 0
  },
  "mouth_happy": {
    name: "שמח מאוד",
    emoji: "😄",
    type: "happy",
    category: "mouth",
    price: 250
  },
  "mouth_confident": {
    name: "ביטחון עצמי",
    emoji: "😏",
    type: "confident",
    category: "mouth",
    price: 400
  },
  "mouth_cat": {
    name: "חתולי",
    emoji: "😺",
    type: "cat",
    category: "mouth",
    price: 550,
    unlock: { type: "lessons", value: 8 }
  },
  "mouth_wink": {
    name: "קריצה",
    emoji: "😉",
    type: "wink",
    category: "mouth",
    price: 700,
    unlock: { type: "lessons", value: 16 }
  },
  "mouth_laugh": {
    name: "צחוק גדול",
    emoji: "😂",
    type: "laugh",
    category: "mouth",
    price: 900,
    unlock: { type: "lessons", value: 24 }
  },
  "mouth_cool": {
    name: "מגניב",
    emoji: "🆒",
    type: "cool",
    category: "mouth",
    price: 1100,
    unlock: { type: "lessons", value: 32 }
  },
  "mouth_boss": {
    name: "בוס",
    emoji: "😤",
    type: "boss",
    category: "mouth",
    price: 1500,
    unlock: { type: "lessons", value: 40 }
  },

  // 8 כובעים
  "hat_cap": {
    name: "🧢 כובע בייסבול",
    emoji: "🧢",
    category: "hat",
    price: 300,
    hourlyBonus: 2
  },
  "hat_party": {
    name: "🎉 כובע מסיבה",
    emoji: "🎉",
    category: "hat",
    price: 450,
    hourlyBonus: 3
  },
  "hat_tophat": {
    name: "🎩 כובע צילינדר",
    emoji: "🎩",
    category: "hat",
    price: 600,
    unlock: { type: "lessons", value: 8 },
    hourlyBonus: 5
  },
  "hat_graduate": {
    name: "🎓 כובע בוגר",
    emoji: "🎓",
    category: "hat",
    price: 800,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 7
  },
  "hat_cowboy": {
    name: "🤠 כובע בוקרים",
    emoji: "🤠",
    category: "hat",
    price: 1000,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 10
  },
  "hat_crown": {
    name: "👑 כתר מלכותי",
    emoji: "👑",
    category: "hat",
    price: 1300,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 15
  },
  "hat_wizard": {
    name: "🧙 כובע קוסם",
    emoji: "🧙",
    category: "hat",
    price: 1600,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 20
  },
  "hat_diamond": {
    name: "💎 כתר יהלום",
    emoji: "💎",
    category: "hat",
    price: 2500,
    unlock: { type: "lessons", value: 48 },
    hourlyBonus: 30
  },

  // 8 אביזרים יזמיים
  "accessory_phone": {
    name: "📱 סמארטפון",
    emoji: "📱",
    category: "accessory",
    price: 400,
    hourlyBonus: 3,
    description: "+3 מטבעות/שעה"
  },
  "accessory_tie": {
    name: "👔 עניבה עסקית",
    emoji: "👔",
    category: "accessory",
    price: 600,
    hourlyBonus: 5,
    description: "+5 מטבעות/שעה"
  },
  "accessory_briefcase": {
    name: "💼 תיק עסקים",
    emoji: "💼",
    category: "accessory",
    price: 800,
    unlock: { type: "lessons", value: 8 },
    hourlyBonus: 8,
    description: "+8 מטבעות/שעה"
  },
  "accessory_laptop": {
    name: "💻 מחשב נייד",
    emoji: "💻",
    category: "accessory",
    price: 1000,
    unlock: { type: "lessons", value: 16 },
    hourlyBonus: 10,
    description: "+10 מטבעות/שעה"
  },
  "accessory_suit": {
    name: "🤵 חליפה מלאה",
    emoji: "🤵",
    category: "accessory",
    price: 1300,
    unlock: { type: "lessons", value: 24 },
    hourlyBonus: 15,
    description: "+15 מטבעות/שעה"
  },
  "accessory_rocket": {
    name: "🚀 רקטה",
    emoji: "🚀",
    category: "accessory",
    price: 1600,
    unlock: { type: "lessons", value: 32 },
    hourlyBonus: 20,
    description: "+20 מטבעות/שעה"
  },
  "accessory_trophy": {
    name: "🏆 גביע אלוף",
    emoji: "🏆",
    category: "accessory",
    price: 2000,
    unlock: { type: "lessons", value: 40 },
    hourlyBonus: 25,
    description: "+25 מטבעות/שעה"
  },
  "accessory_diamond_brief": {
    name: "💎 תיק יהלום",
    emoji: "💎",
    category: "accessory",
    price: 3000,
    unlock: { type: "lessons", value: 48 },
    hourlyBonus: 35,
    description: "+35 מטבעות/שעה"
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

export default function TamagotchiAvatar({ equippedItems = {}, size = "large", showBackground = true, avatarStage = 1, userEmail = "" }) {
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
  
  const selectedBody = AVATAR_ITEMS[equippedItems.body || "body_blue"];
  const bodyColor = selectedBody?.color || "#60A5FA";
  const eyesType = AVATAR_ITEMS[equippedItems.eyes || "eyes_sparkle"]?.type || "sparkle";
  const mouthType = AVATAR_ITEMS[equippedItems.mouth || "mouth_smile"]?.type || "smile";
  const hat = equippedItems.hat ? AVATAR_ITEMS[equippedItems.hat]?.emoji : null;
  const accessory = equippedItems.accessory ? AVATAR_ITEMS[equippedItems.accessory]?.emoji : null;

  // Eye rendering with variation
  const renderEyes = () => {
    const eyeTop = `${35 + variation.eyeOffset}%`;
    
    if (eyesType === "sunglasses") {
      return (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '25%', width: '18%', height: '12%', background: '#1F2937', borderRadius: '50%' }} />
          <div className="absolute" style={{ top: eyeTop, right: '25%', width: '18%', height: '12%', background: '#1F2937', borderRadius: '50%' }} />
          <div className="absolute" style={{ top: `calc(${eyeTop} + 4%)`, left: '25%', right: '25%', height: '2px', background: '#1F2937' }} />
        </>
      );
    }

    const eyeShapes = {
      sparkle: (
        <>
          {/* Left Eye */}
          <div className="absolute" style={{ top: eyeTop, left: '27%', width: '16%', height: '20%', background: '#1F2937', borderRadius: '50%' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: 'white', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: '20%', height: '20%', background: 'white', borderRadius: '50%', opacity: 0.8 }} />
          </div>
          {/* Right Eye */}
          <div className="absolute" style={{ top: eyeTop, right: '27%', width: '16%', height: '20%', background: '#1F2937', borderRadius: '50%' }}>
            <div style={{ position: 'absolute', top: '25%', left: '25%', width: '40%', height: '40%', background: 'white', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: '20%', height: '20%', background: 'white', borderRadius: '50%', opacity: 0.8 }} />
          </div>
        </>
      ),
      determined: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', width: '16%', height: '18%', background: '#1F2937', borderRadius: '50%' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: 'white', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', width: '16%', height: '18%', background: '#1F2937', borderRadius: '50%' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: 'white', borderRadius: '50%' }} />
          </div>
        </>
      ),
      heart: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '29%', fontSize: avatarSize * 0.15 + 'px' }}>❤️</div>
          <div className="absolute" style={{ top: eyeTop, right: '29%', fontSize: avatarSize * 0.15 + 'px' }}>❤️</div>
        </>
      ),
      star: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '29%', fontSize: avatarSize * 0.15 + 'px' }}>⭐</div>
          <div className="absolute" style={{ top: eyeTop, right: '29%', fontSize: avatarSize * 0.15 + 'px' }}>⭐</div>
        </>
      ),
      laser: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', width: '16%', height: '18%', background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 10px #EF4444' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: '#FEE2E2', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', width: '16%', height: '18%', background: '#EF4444', borderRadius: '50%', boxShadow: '0 0 10px #EF4444' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: '#FEE2E2', borderRadius: '50%' }} />
          </div>
        </>
      ),
      cyber: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '27%', width: '16%', height: '18%', background: '#06B6D4', borderRadius: '50%', boxShadow: '0 0 15px #06B6D4' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: '#E0F2FE', borderRadius: '50%' }} />
          </div>
          <div className="absolute" style={{ top: eyeTop, right: '27%', width: '16%', height: '18%', background: '#06B6D4', borderRadius: '50%', boxShadow: '0 0 15px #06B6D4' }}>
            <div style={{ position: 'absolute', top: '30%', left: '30%', width: '35%', height: '35%', background: '#E0F2FE', borderRadius: '50%' }} />
          </div>
        </>
      ),
      diamond: (
        <>
          <div className="absolute" style={{ top: eyeTop, left: '29%', fontSize: avatarSize * 0.15 + 'px' }}>💎</div>
          <div className="absolute" style={{ top: eyeTop, right: '29%', fontSize: avatarSize * 0.15 + 'px' }}>💎</div>
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

      {/* Main Avatar Body - NO FLOATING ANIMATION */}
      <div
        className="relative"
        style={{ 
          width: avatarSize * 0.85, 
          height: avatarSize * 0.85,
          transform: `scale(${stageScale})`
        }}
      >
        {/* Body with unique variation */}
        <div 
          className="absolute inset-0 rounded-full shadow-2xl"
          style={{ 
            background: bodyBackgroundStyle,
            border: '4px solid rgba(255, 255, 255, 0.3)',
            transform: `scaleX(${1 + variation.bodyVariant / 100})`
          }}
        />

        {/* Cheeks */}
        <div className="absolute" style={{ top: '48%', left: '12%', width: '18%', height: '12%', background: '#FCA5A5', borderRadius: '50%', opacity: 0.6 }} />
        <div className="absolute" style={{ top: '48%', right: '12%', width: '18%', height: '12%', background: '#FCA5A5', borderRadius: '50%', opacity: 0.6 }} />

        {/* Eyes with variation */}
        {renderEyes()}

        {/* Mouth with variation */}
        {renderMouth()}

        {/* Ears with size variation */}
        <div className="absolute" style={{ 
          top: '15%', 
          left: '-8%', 
          width: `${22 * variation.earSize}%`, 
          height: `${30 * variation.earSize}%`, 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)'
        }} />
        <div className="absolute" style={{ 
          top: '15%', 
          right: '-8%', 
          width: `${22 * variation.earSize}%`, 
          height: `${30 * variation.earSize}%`, 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)'
        }} />

        {/* Inner Ears */}
        <div className="absolute" style={{ 
          top: '22%', 
          left: '-3%', 
          width: '12%', 
          height: '18%', 
          background: '#FCA5A5',
          borderRadius: '50%',
          opacity: 0.7
        }} />
        <div className="absolute" style={{ 
          top: '22%', 
          right: '-3%', 
          width: '12%', 
          height: '18%', 
          background: '#FCA5A5',
          borderRadius: '50%',
          opacity: 0.7
        }} />

        {/* Arms/Hands - More visible */}
        <div className="absolute" style={{ 
          top: '55%', 
          left: '-15%', 
          width: '22%', 
          height: '18%', 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          transform: 'rotate(-20deg)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }} />
        <div className="absolute" style={{ 
          top: '55%', 
          right: '-15%', 
          width: '22%', 
          height: '18%', 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          transform: 'rotate(20deg)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }} />

        {/* Feet */}
        <div className="absolute" style={{ 
          bottom: '-8%', 
          left: '20%', 
          width: '22%', 
          height: '18%', 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)'
        }} />
        <div className="absolute" style={{ 
          bottom: '-8%', 
          right: '20%', 
          width: '22%', 
          height: '18%', 
          background: bodyColor,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.3)'
        }} />

        {/* Hat */}
        {hat && (
          <div className="absolute" style={{ 
            top: '-15%', 
            left: '50%', 
            transform: 'translateX(-50%)',
            fontSize: avatarSize * 0.25 + 'px'
          }}>
            {hat}
          </div>
        )}

        {/* Accessory */}
        {accessory && (
          <div className="absolute" style={{ 
            bottom: '5%', 
            right: '-15%',
            fontSize: avatarSize * 0.22 + 'px'
          }}>
            {accessory}
          </div>
        )}
      </div>
    </div>
  );
}