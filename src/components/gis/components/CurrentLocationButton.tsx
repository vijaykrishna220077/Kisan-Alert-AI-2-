import React from 'react';
import { motion } from 'motion/react';
import { Compass, Loader2 } from 'lucide-react';

interface CurrentLocationButtonProps {
  loading: boolean;
  onClick: () => void;
}

export function CurrentLocationButton({ loading, onClick }: CurrentLocationButtonProps) {
  return (
    <motion.button
      id="current-location-btn"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading}
      className="bg-white/90 dark:bg-[#1A2E1A]/95 backdrop-blur-md p-3 rounded-full border border-emerald-100 dark:border-emerald-900/30 shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
      title="Find My Location"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      )}
    </motion.button>
  );
}
