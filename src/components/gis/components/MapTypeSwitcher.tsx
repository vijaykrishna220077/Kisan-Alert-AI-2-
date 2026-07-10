import React from 'react';
import { motion } from 'motion/react';
import { Map, Globe, Layers, Mountain } from 'lucide-react';

interface MapTypeSwitcherProps {
  currentType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  onChangeType: (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => void;
}

export function MapTypeSwitcher({ currentType, onChangeType }: MapTypeSwitcherProps) {
  const options = [
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'satellite', label: 'Satellite', icon: Globe },
    { id: 'hybrid', label: 'Hybrid', icon: Layers },
    { id: 'terrain', label: 'Terrain', icon: Mountain },
  ] as const;

  return (
    <div className="bg-white/90 dark:bg-[#1A2E1A]/95 backdrop-blur-md p-1 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-lg flex gap-1 z-10 max-w-full overflow-x-auto scrollbar-none">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentType === opt.id;
        return (
          <button
            key={opt.id}
            id={`map-type-btn-${opt.id}`}
            onClick={() => onChangeType(opt.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'text-white'
                : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeMapType"
                className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
