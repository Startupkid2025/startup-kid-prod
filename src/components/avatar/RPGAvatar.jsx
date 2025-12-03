import React from "react";
import { motion } from "framer-motion";

/**
 * RPGAvatar – SVG-based, pixel-perfect equipment overlay
 * ------------------------------------------------------
 * • True RPG look: base body drawn in SVG (head/torso/shoulders) with subtle shading.
 * • Precise slot anchors on a fixed internal grid (viewBox 100×160) so items always sit right.
 * • Emoji icons are rendered inside the SVG at exact coordinates (no div drift).
 * • Supports size: "small" | "medium" | "large"; background, head, face, body, accessory slots.
 * • Smooth animations via framer-motion.
 */

export const ITEMS_LIBRARY = {
  // Head items
  cap_basic: { name: "כובע בייסבול", icon: "🧢", category: "head", color: "#3B82F6" },
  cap_startup: { name: "כובע סטארטאפ", icon: "🎓", category: "head", color: "#8B5CF6" },
  crown: { name: "כתר זהב", icon: "👑", category: "head", color: "#FBBF24" },

  // Face items
  glasses_basic: { name: "משקפיים", icon: "👓", category: "face", color: "#6B7280" },
  glasses_cool: { name: "משקפי שמש", icon: "🕶️", category: "face", color: "#1F2937" },
  vr_headset: { name: "משקפי VR", icon: "🥽", category: "face", color: "#EC4899" },

  // Body items
  tshirt: { name: "חולצת טי", icon: "👕", category: "body", color: "#60A5FA" },
  suit: { name: "חליפה", icon: "🤵", category: "body", color: "#1F2937" },
  hoodie: { name: "הודי", icon: "🧥", category: "body", color: "#8B5CF6" },

  // Accessories
  laptop: { name: "מחשב נייד", icon: "💻", category: "accessory", color: "#6B7280" },
  phone: { name: "סמארטפון", icon: "📱", category: "accessory", color: "#3B82F6" },
  briefcase: { name: "תיק עסקים", icon: "💼", category: "accessory", color: "#7C3AED" },
  rocket: { name: "רקטה", icon: "🚀", category: "accessory", color: "#EF4444" },

  // Backgrounds
  bg_office: { name: "משרד", icon: "🏢", category: "background", color: "#94A3B8" },
  bg_cafe: { name: "בית קפה", icon: "☕", category: "background", color: "#A78BFA" },
  bg_space: { name: "חלל", icon: "🌌", category: "background", color: "#312E81" }
};

// Slot anchors on the 100×160 grid (x,y in % of viewBox; fs = font size in viewBox units)
const SLOT_MAP = {
  head:      { x: 50, y: 24,  fs: 16 }, // sits just above the scalp line
  face:      { x: 50, y: 40,  fs: 13 }, // centered on eyes
  body:      { x: 50, y: 92,  fs: 18 }, // chest area
  accessory: { x: 85, y: 78,  fs: 16 }  // to the right of torso
};

const SIZES = {
  small: 96,
  medium: 128,
  large: 192
};

export default function RPGAvatar({ equippedItems = {}, size = "large", showAccessories = true }) {
  const px = SIZES[size] ?? SIZES.large;

  const background = equippedItems.background ? ITEMS_LIBRARY[equippedItems.background] : null;
  const body = equippedItems.body ? ITEMS_LIBRARY[equippedItems.body] : null;
  const head = equippedItems.head ? ITEMS_LIBRARY[equippedItems.head] : null;
  const face = equippedItems.face ? ITEMS_LIBRARY[equippedItems.face] : null;
  const accessory = equippedItems.accessory ? ITEMS_LIBRARY[equippedItems.accessory] : null;

  return (
    <div className="inline-block" style={{ width: px, height: px * (160/100) }}>
      <motion.svg
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        viewBox="0 0 100 160"
        className="w-full h-full rounded-2xl shadow-lg ring-1 ring-black/5 bg-white/40 backdrop-blur"
      >
        {/* Background layer */}
        {background ? (
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={hexWithAlpha(background.color, 0.35)} />
              <stop offset="100%" stopColor={hexWithAlpha(background.color, 0.15)} />
            </linearGradient>
            <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
            </filter>
          </defs>
        ) : null}

        {background ? (
          <rect x="0" y="0" width="100" height="160" fill="url(#bgGrad)" rx="10" ry="10" />
        ) : (
          <rect x="0" y="0" width="100" height="160" fill="#F8FAFC" rx="10" ry="10" />
        )}

        {/* Optional background icon watermark */}
        {background && (
          <g opacity="0.15" filter="url(#soft)">
            <text x="50" y="120" textAnchor="middle" fontSize="42">{background.icon}</text>
          </g>
        )}

        {/* === Base RPG Body === */}
        <g id="avatar" transform="translate(0,0)">
          {/* Shadow */}
          <ellipse cx="50" cy="148" rx="24" ry="6" fill="#000" opacity="0.1" />

          {/* Cloak (behind shoulders) – subtle */}
          <path d="M28,65 C22,100 24,124 50,134 C76,124 78,100 72,65" fill="#334155" opacity="0.10" />

          {/* Torso */}
          <path d="M34,78 C34,66 42,60 50,60 C58,60 66,66 66,78 L66,112 C66,120 60,126 50,129 C40,126 34,120 34,112 Z" fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="1" />

          {/* Shoulders */}
          <path d="M26,84 C26,74 36,68 42,68 L58,68 C64,68 74,74 74,84 L74,92 C74,96 70,100 66,100 L34,100 C30,100 26,96 26,92 Z" fill="#e2e8f0" />

          {/* Head (skin) */}
          <circle cx="50" cy="40" r="18" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />

          {/* Eyes */}
          <circle cx="44" cy="38" r="1.6" fill="#111827" />
          <circle cx="56" cy="38" r="1.6" fill="#111827" />

          {/* Mouth */}
          <path d="M44,45 Q50,48 56,45" stroke="#111827" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* === Equipment Layers (order matters) === */}
        {/* BODY item (on top of torso but below head gear) */}
        {body && (
          <motion.g initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <SlotText slot="body">{body.icon}</SlotText>
          </motion.g>
        )}

        {/* FACE item */}
        {face && (
          <motion.g initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <SlotText slot="face">{face.icon}</SlotText>
          </motion.g>
        )}

        {/* HEAD item */}
        {head && (
          <motion.g initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 240 }}>
            <SlotText slot="head">{head.icon}</SlotText>
          </motion.g>
        )}

        {/* ACCESSORY item (optional) */}
        {showAccessories && accessory && (
          <motion.g initial={{ x: 6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15, type: "spring" }}>
            <SlotText slot="accessory">{accessory.icon}</SlotText>
          </motion.g>
        )}
      </motion.svg>
    </div>
  );
}

// === Helpers ===
function SlotText({ slot, children }) {
  const { x, y, fs } = SLOT_MAP[slot];
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fs}
      style={{ filter: "drop-shadow(0 0.6px 0.6px rgba(0,0,0,0.25))" }}
    >
      {children}
    </text>
  );
}

function hexWithAlpha(hex, alpha = 1) {
  // Accepts #RRGGBB – returns rgba(r,g,b,alpha)
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
