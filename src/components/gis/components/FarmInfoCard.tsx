import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Calendar, Trash2, Edit2, Check, X, Sprout, Tag } from 'lucide-react';
import { FarmMarker } from '../types';

interface FarmInfoCardProps {
  marker: FarmMarker;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FarmMarker>) => void;
  onClose: () => void;
}

export function FarmInfoCard({ marker, onDelete, onUpdate, onClose }: FarmInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(marker.name);
  const [editedNotes, setEditedNotes] = useState(marker.notes || '');

  // Reset local state if active marker shifts
  useEffect(() => {
    setEditedName(marker.name);
    setEditedNotes(marker.notes || '');
    setIsEditing(false);
  }, [marker]);

  const handleSave = () => {
    onUpdate(marker.id, {
      name: editedName.trim() || 'Unnamed Location',
      notes: editedNotes.trim(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(marker.name);
    setEditedNotes(marker.notes || '');
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="bg-white/95 dark:bg-[#1A2E1A]/95 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-xl p-5 w-full max-w-sm"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-950 dark:text-emerald-50 text-sm">
              Farm Location Info
            </h3>
            <p className="text-[10px] text-emerald-800/40 dark:text-emerald-300/30 font-semibold uppercase tracking-wider">
              {marker.isCurrentLocation ? 'GPS PIN' : 'MANUAL PIN'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/50 uppercase tracking-wider mb-1">
              Location Name
            </label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-950 dark:text-emerald-50 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-emerald-800/60 dark:text-emerald-300/50 uppercase tracking-wider mb-1">
              Notes (Crop Type, Soil)
            </label>
            <textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="e.g. Rice cultivation, Black loam soil..."
              rows={2}
              className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-3 py-2 text-sm font-medium text-emerald-950 dark:text-emerald-50 outline-none focus:border-emerald-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg cursor-pointer hover:bg-emerald-100 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-50">
                {marker.name}
              </h4>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md cursor-pointer"
                title="Edit location notes"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {marker.notes ? (
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 italic mt-1 font-medium">
                "{marker.notes}"
              </p>
            ) : (
              <p className="text-xs text-emerald-800/40 dark:text-emerald-300/30 italic mt-1">
                No custom notes added.
              </p>
            )}
          </div>

          <div className="h-[1px] bg-emerald-500/10" />

          {/* Location details */}
          <div className="space-y-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-emerald-950 dark:text-emerald-100 text-xs">
                  Address Details:
                </span>
                <span className="text-emerald-800/80 dark:text-emerald-300/80 font-medium">
                  {marker.address || 'Checking address details...'}
                </span>
              </div>
            </div>

            {/* Geographical details */}
            {(marker.district || marker.state) && (
              <div className="flex items-start gap-1.5 mt-1 pl-5 text-[11px] text-emerald-800/70 dark:text-emerald-300/70">
                <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-medium">
                  {[marker.district, marker.state, marker.postalCode].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-2 pl-5 text-[11px] text-emerald-800/60 dark:text-emerald-300/50 font-mono">
              <span>LAT: {marker.lat.toFixed(6)}</span>
              <span className="text-emerald-500/30">|</span>
              <span>LNG: {marker.lng.toFixed(6)}</span>
            </div>

            <div className="flex items-center gap-1.5 pl-5 text-[10px] text-emerald-800/40 dark:text-emerald-300/30 font-semibold mt-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pinned: {marker.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-emerald-500/10">
        <button
          onClick={() => onDelete(marker.id)}
          className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Marker
        </button>
      </div>
    </motion.div>
  );
}
