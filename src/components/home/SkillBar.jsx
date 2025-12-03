import React from "react";
import { motion } from "framer-motion";

const MAX_LESSONS = 20;

export default function SkillBar({ icon, name, lessonsCount, color }) {
  // Cap lessons at MAX_LESSONS for display
  const displayLessons = Math.min(lessonsCount, MAX_LESSONS);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-lg sm:text-2xl shadow-lg`}>
            {icon}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-white text-sm sm:text-lg leading-tight">{name}</h3>
            <p className="text-white/70 text-[10px] sm:text-sm">
              {lessonsCount}/{MAX_LESSONS} שיעורים
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-full bg-gradient-to-br ${color} border-2 border-white/30`}>
            <p className="text-white font-black text-base sm:text-xl">{lessonsCount}</p>
          </div>
        </div>
      </div>

      {/* Simple Progress Bar - 20 segments */}
      <div className="flex gap-0.5 sm:gap-1">
        {Array.from({ length: MAX_LESSONS }).map((_, index) => (
          <motion.div
            key={index}
            className="flex-1 h-2 sm:h-3 rounded-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <div
              className={`h-full ${
                index < displayLessons
                  ? `bg-gradient-to-r ${color}`
                  : "bg-white/20"
              } transition-all duration-300`}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}