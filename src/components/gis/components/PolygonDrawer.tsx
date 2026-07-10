import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ruler, Trash2, Sprout, Check, X, Pencil, Sparkles, Layers } from 'lucide-react';
import { FarmPolygon } from '../types';

interface PolygonDrawerProps {
  isDrawing: boolean;
  isEditing: boolean;
  pathLength: number;
  metrics: {
    areaSqM: number;
    perimeterM: number;
    acres: number;
    hectares: number;
  };
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onClear: () => void;
  onSave: (name: string, color: string, cropType: string) => void;
  savedPolygons: FarmPolygon[];
  selectedPolygonId: string | null;
  onSelectPolygon: (id: string | null) => void;
  onDeletePolygon: (id: string) => void;
}

export function PolygonDrawer({
  isDrawing,
  isEditing,
  pathLength,
  metrics,
  onStartDrawing,
  onStopDrawing,
  onClear,
  onSave,
  savedPolygons,
  selectedPolygonId,
  onSelectPolygon,
  onDeletePolygon,
}: PolygonDrawerProps) {
  const [polyName, setPolyName] = useState('');
  const [cropType, setCropType] = useState('Paddy (Rice)');
  const [polyColor, setPolyColor] = useState('#10B981'); // Emerald 500 default

  const colorPresets = [
    { value: '#10B981', label: 'Emerald' }, // Green (General / Paddy)
    { value: '#F59E0B', label: 'Amber' },   // Orange (Chilli / Wheat)
    { value: '#3B82F6', label: 'Blue' },    // Blue (Water/Wetlands)
    { value: '#8B5CF6', label: 'Purple' },  // Purple (Cash crops/Cotton)
    { value: '#EF4444', label: 'Red' },     // Red (Fallow/Dry)
  ];

  const handleSaveClick = () => {
    onSave(
      polyName.trim() || `Farm Plot ${savedPolygons.length + 1}`,
      polyColor,
      cropType
    );
    setPolyName('');
  };

  const selectedPoly = savedPolygons.find(p => p.id === selectedPolygonId);

  return (
    <div className="bg-white/95 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-xl p-5 w-full max-w-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/10">
        <Ruler className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="font-bold text-emerald-950 dark:text-emerald-50 text-sm">
            Farm Boundary Drawer (GIS)
          </h3>
          <p className="text-[10px] text-emerald-800/50 dark:text-emerald-300/40 font-semibold uppercase tracking-wider">
            SATELLITE FIELD PLOTTING
          </p>
        </div>
      </div>

      {/* Mode selectors */}
      {!isDrawing && !selectedPolygonId && (
        <div className="space-y-3">
          <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 leading-relaxed font-medium">
            Measure physical farm boundaries, acreage, and plot outlines directly on the high-definition satellite layer.
          </p>
          <button
            id="start-drawing-btn"
            onClick={onStartDrawing}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Draw New Plot Boundary
          </button>
        </div>
      )}

      {/* Active Drawing Panel */}
      {isDrawing && (
        <div className="space-y-4">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-900/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Drawing Status
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {pathLength} Points Plotted
              </span>
            </div>
            <p className="text-xs text-emerald-800/60 dark:text-emerald-300/50 leading-relaxed">
              {pathLength < 3 
                ? "Click at least 3 separate points on the map to trace and close your farm plot boundary." 
                : "Acreage calculations are ready! Add a name below to register this plot."}
            </p>
          </div>

          {pathLength >= 3 && (
            <div className="grid grid-cols-2 gap-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/10 text-xs font-semibold">
              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">PLOT AREA</span>
                <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{metrics.areaSqM.toLocaleString()} m²</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">ACRES</span>
                <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{metrics.acres} Ac</span>
              </div>
              <div className="space-y-0.5 mt-2">
                <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">HECTARS</span>
                <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{metrics.hectares} Ha</span>
              </div>
              <div className="space-y-0.5 mt-2">
                <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">PERIMETER</span>
                <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{metrics.perimeterM} m</span>
              </div>
            </div>
          )}

          {pathLength >= 3 && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/50 uppercase tracking-wider mb-1">
                  Plot Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Paddy Block, Chilli Field"
                  value={polyName}
                  onChange={(e) => setPolyName(e.target.value)}
                  className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-950 dark:text-emerald-50 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/50 uppercase tracking-wider mb-1">
                  Primary Sown Crop
                </label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-950 dark:text-emerald-50 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Paddy (Rice)">Paddy (Rice)</option>
                  <option value="Guntur Chilli">Guntur Chilli</option>
                  <option value="Cotton (Bt)">Cotton (Bt)</option>
                  <option value="Black Gram">Black Gram</option>
                  <option value="Maize">Maize</option>
                  <option value="Fallow Plot">Fallow Plot</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/50 uppercase tracking-wider mb-1.5">
                  Boundary Map Color
                </label>
                <div className="flex gap-2.5">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setPolyColor(preset.value)}
                      style={{ backgroundColor: preset.value }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform relative ${
                        polyColor === preset.value ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'
                      }`}
                      title={preset.label}
                    >
                      {polyColor === preset.value && (
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClear}
              className="w-1/2 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl cursor-pointer hover:bg-emerald-100 flex items-center justify-center gap-1"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={pathLength < 3}
              className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Save Plot
            </button>
          </div>
        </div>
      )}

      {/* Selected Saved Polygon Panel */}
      {selectedPolygonId && selectedPoly && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: selectedPoly.color }}
                className="w-3.5 h-3.5 rounded-full inline-block"
              />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-50 truncate max-w-[180px]">
                {selectedPoly.name}
              </h4>
            </div>
            <button
              onClick={() => onSelectPolygon(null)}
              className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-100/50 dark:border-emerald-900/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Sown Crop:</span>
              <span className="font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                {selectedPoly.cropType || 'Unspecified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Soil Moisture estimate:</span>
              <span className="font-extrabold text-emerald-950 dark:text-emerald-100">
                {selectedPoly.soilMoisture ? `${selectedPoly.soilMoisture}%` : '64% (Good)'}
              </span>
            </div>
          </div>

          {/* Polygon metrics */}
          <div className="grid grid-cols-2 gap-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/10 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">PLOT AREA</span>
              <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{selectedPoly.areaSqM.toLocaleString()} m²</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">ACRES</span>
              <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{selectedPoly.acres} Ac</span>
            </div>
            <div className="space-y-0.5 mt-2">
              <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">HECTARS</span>
              <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{selectedPoly.hectares} Ha</span>
            </div>
            <div className="space-y-0.5 mt-2">
              <span className="text-[10px] text-emerald-800/40 dark:text-emerald-300/40 block">PERIMETER</span>
              <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-50">{selectedPoly.perimeterM} m</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onDeletePolygon(selectedPoly.id)}
              className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Plot Boundary
            </button>
          </div>
        </div>
      )}

      {/* Saved plots list overlay */}
      {!isDrawing && !selectedPolygonId && savedPolygons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-emerald-500/10">
          <span className="text-[10px] font-bold text-emerald-800/50 dark:text-emerald-300/40 uppercase tracking-wider block">
            Saved Field Outlines ({savedPolygons.length})
          </span>
          <div className="max-h-28 overflow-y-auto divide-y divide-emerald-500/10 space-y-1 scrollbar-none">
            {savedPolygons.map((poly) => (
              <button
                key={poly.id}
                onClick={() => onSelectPolygon(poly.id)}
                className="w-full text-left py-1.5 px-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg flex items-center justify-between text-xs font-semibold text-emerald-950 dark:text-emerald-50 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{ backgroundColor: poly.color }}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                  />
                  <span className="truncate">{poly.name}</span>
                </div>
                <span className="text-[10px] text-emerald-800/50 dark:text-emerald-300/40 shrink-0 font-bold">
                  {poly.acres} Ac
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
