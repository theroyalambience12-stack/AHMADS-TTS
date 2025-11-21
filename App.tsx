import React, { useState } from 'react';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, decodeAudioData, audioBufferToWav } from './utils/audioHelpers';
import { VoiceName, HistoryItem } from './types';
import { VoiceSelector } from './components/VoiceSelector';
import { AudioPlayer } from './components/AudioPlayer';
import { AudioWaveform, Sparkles, AlertCircle, History, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentAudioBuffer(null);

    try {
      // 1. Call API
      const base64Audio = await generateSpeech(text, selectedVoice);

      // 2. Decode Base64 to Array
      const audioBytes = decodeBase64(base64Audio);

      // 3. Decode PCM to AudioBuffer for playback
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000}); 
      
      const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
      setCurrentAudioBuffer(audioBuffer);

      // 4. Save to history (as WAV blob)
      const wavBlob = audioBufferToWav(audioBuffer);
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        text: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
        voice: selectedVoice,
        timestamp: Date.now(),
        audioBlob: wavBlob,
        duration: audioBuffer.duration,
        speed: speed,
        pitch: pitch
      };

      setHistory(prev => [newItem, ...prev]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = async (item: HistoryItem) => {
    try {
      const arrayBuffer = await item.audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer); // Use native decode for WAV blob
      setCurrentAudioBuffer(buffer);
      
      // Restore settings
      setText(item.text);
      setSelectedVoice(item.voice);
      setSpeed(item.speed || 1.0);
      setPitch(item.pitch || 0);
      
    } catch (e) {
      console.error("Failed to load history item", e);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <AudioWaveform className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                AHMADS TTS
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide">AI VOICE STUDIO</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-800/50 font-mono">
                AHMADS TTS Model
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Controls */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Text Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 ml-1">Script</label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to synthesize..."
                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-shadow shadow-inner text-lg leading-relaxed"
                maxLength={5000}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500 font-mono">
                {text.length}/5000
              </div>
            </div>
          </div>

          {/* Voice Selection & Controls */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300 ml-1">Voice Actor & Settings</label>
            <VoiceSelector 
              selectedVoice={selectedVoice} 
              onSelect={setSelectedVoice} 
              speed={speed}
              onSpeedChange={setSpeed}
              pitch={pitch}
              onPitchChange={setPitch}
              disabled={isLoading}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !text.trim()}
            className={`
              w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]
              ${isLoading || !text.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/25'}
            `}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Generate Speech</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-200">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Output & History */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Player */}
          <div className="space-y-3">
             <label className="text-sm font-medium text-slate-300 ml-1">Preview & Download</label>
             <AudioPlayer 
                audioBuffer={currentAudioBuffer} 
                autoPlay={true} 
                speed={speed}
                pitch={pitch}
             />
          </div>

          {/* History */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/80">
              <History size={16} className="text-slate-400" />
              <h3 className="font-medium text-slate-300 text-sm">Generation History</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 opacity-50">
                  <AudioWaveform size={32} />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => loadFromHistory(item)}
                    className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-750 transition cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        {item.voice}
                        {(item.speed !== 1 || item.pitch !== 0) && (
                          <span className="text-[10px] text-slate-500 font-normal lowercase bg-slate-700/50 px-1 rounded">modified</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-2">{item.text}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                         <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            {Math.round(item.duration)}s
                         </span>
                         <button 
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition"
                         >
                            <Trash2 size={14} />
                         </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default App;