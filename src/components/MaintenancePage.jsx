import React from "react";
import { motion } from "framer-motion";

export default function MaintenancePage({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="text-8xl mb-6"
        >
          🔧
        </motion.div>
        <h1 className="text-4xl font-black text-white mb-4">
          מצב תחזוקה
        </h1>
        <p className="text-xl text-white/80 mb-8">
          {message || "האפליקציה במצב תחזוקה. נחזור בקרוב!"}
        </p>
        <div className="flex gap-2 justify-center">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-3 h-3 bg-white rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="w-3 h-3 bg-white rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            className="w-3 h-3 bg-white rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}