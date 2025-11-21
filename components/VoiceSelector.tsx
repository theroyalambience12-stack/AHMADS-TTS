import React from 'react';
import { VoiceName, VoiceOption } from '../types';
import { Mic, Check, Gauge, SlidersHorizontal } from 'lucide-react';

const VOICES: VoiceOption[] = [
  { id: VoiceName.Puck, name: 'Puck', description: 'Soft, lower pitch', gender: 'Male' },
  { id: VoiceName.Charon, name: 'Charon', description: 'Deep, resonant', gender: 'Male' },
  { id: VoiceName.Kore, name: 'Kore', description: 'Calm, soothing', gender: 'Female' },
  { id: VoiceName.Fenrir, name: 'Fenrir', description: 'Energetic, higher pitch', gender: 'Male' },
  { id: VoiceName.Zephyr, name: 'Zephyr', description: 'Warm, balanced', gender: 'Female' },
];

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ 
  selectedVoice, 
  onSelect, 
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  disabled 
}) => {
  return (
    <div className="space-y-6">
      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            disabled={disabled}
            className={`
              relative flex items-start p-4 rounded-xl border transition-all duration-200 text-left
              ${selectedVoice === voice.id 
                ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className={`p-2 rounded-full mr-3 ${selectedVoice === voice.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
              <Mic size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-slate-200">{voice.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{voice.description}</p>
            </div>
            {selectedVoice === voice.id && (
              <div className="absolute top-4 right-4 text-blue-400">
                <Check size={16} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Customization Controls */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 space-y-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Voice Customization</h3>
        
        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <Gauge size={16} className="text-blue-400" />
              <span className="font-medium">Speech Rate</span>
            </div>
            <span className="text-blue-400 font-mono bg-blue-400/10 px-2 py-0.5 rounded">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>Slow (0.5x)</span>
            <span>Normal (1.0x)</span>
            <span>Fast (2.0x)</span>
          </div>
        </div>

        {/* Pitch Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <SlidersHorizontal size={16} className="text-purple-400" />
              <span className="font-medium">Pitch Adjustment</span>
            </div>
            <span className="text-purple-400 font-mono bg-purple-400/10 px-2 py-0.5 rounded">
              {pitch > 0 ? '+' : ''}{pitch}
            </span>
          </div>
          <input
            type="range"
            min="-1200"
            max="1200"
            step="100" // 100 cents = 1 semitone
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
          />
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>Deep (-12)</span>
            <span>Normal (0)</span>
            <span>High (+12)</span>
          </div>
        </div>
      </div>
    </div>
  );
};