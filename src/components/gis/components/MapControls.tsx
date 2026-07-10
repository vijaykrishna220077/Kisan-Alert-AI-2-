import React from 'react';
import { motion } from 'motion/react';
import { Plus, Minus, Compass, HelpCircle, AlertTriangle, Info } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetBearing: () => void;
}

export function MapControls({ onZoomIn, onZoomOut, onResetBearing }: MapControlsProps) {
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <div className="flex flex-col gap-2 z-10 shrink-0">
      <div className="bg-white/90 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-lg p-1.5 flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors border-t border-emerald-500/5"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onResetBearing}
          className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors border-t border-emerald-500/5"
          title="Reset North"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowHelp(prev => !prev)}
          className="p-3 bg-white/90 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-full border border-emerald-100 dark:border-emerald-900/30 shadow-lg hover:shadow-xl text-emerald-600 dark:text-emerald-400 cursor-pointer transition-all flex items-center justify-center"
          title="Show Map Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {showHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute bottom-12 right-0 bg-white/95 dark:bg-[#1A2E1A]/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-2xl w-64 z-50 text-xs text-emerald-800 dark:text-emerald-300 font-medium space-y-2.5"
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-50 text-sm border-b border-emerald-500/10 pb-1.5">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Map Guide & Gestures</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-emerald-900 dark:text-emerald-50">Place Markers:</strong> Click anywhere on the map to drop a customizable pin and get address coordinates.
              </li>
              <li>
                <strong className="text-emerald-900 dark:text-emerald-50">Drag Markers:</strong> Drag any marker to dynamically update its geographic coordinates and address.
              </li>
              <li>
                <strong className="text-emerald-900 dark:text-emerald-50">Draw Boundaries:</strong> Activate "Draw Mode" in the panel, then click on the map to trace your crop fields and auto-calculate acreage.
              </li>
              <li>
                <strong className="text-emerald-900 dark:text-emerald-50">Search Autocomplete:</strong> Search for specific villages, talukas, or landmarks using the search bar.
              </li>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}
