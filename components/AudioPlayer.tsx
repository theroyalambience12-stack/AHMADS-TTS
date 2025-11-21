import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, RotateCcw } from 'lucide-react';
import { audioBufferToWav } from '../utils/audioHelpers';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  autoPlay?: boolean;
  speed?: number;
  pitch?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioBuffer, 
  autoPlay = false,
  speed = 1,
  pitch = 0 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // Update duration when buffer changes
  useEffect(() => {
    if (audioBuffer) {
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      pausedTimeRef.current = 0;
      
      if (autoPlay) {
        playAudio();
      }
    }
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer]);

  // Update playback parameters live
  useEffect(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = speed;
      sourceNodeRef.current.detune.value = pitch;
    }
  }, [speed, pitch]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gradient color based on height
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3b82f6'); // Blue 500
        gradient.addColorStop(1, '#a855f7'); // Purple 500

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const playAudio = async () => {
    if (!audioBuffer) return;
    
    initAudioContext();
    if (!audioContextRef.current) return;

    // Resume context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Stop existing source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Apply effects
    source.playbackRate.value = speed;
    source.detune.value = pitch;

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    analyserRef.current = analyser;

    // Start playing from stored position
    // Note: offset (pausedTimeRef.current) is in "source time" (original buffer time).
    // But playbackRate makes it play faster/slower relative to wall clock.
    // source.start(when, offset) -> offset is into the buffer.
    const offset = pausedTimeRef.current;
    source.start(0, offset);
    
    // To track progress, we need to know when we started in wall clock time
    startTimeRef.current = audioContextRef.current.currentTime;
    sourceNodeRef.current = source;
    setIsPlaying(true);
    drawVisualizer();

    // Auto stop at end
    source.onended = () => {
      // Check if it ended naturally or was stopped manually
      // Use a rough estimation because timing isn't perfect with JS
      if (isPlaying) {
          // If we are still "playing" in state, checking this helps avoid 
          // handling the stop() call's side effect if called manually.
          // But usually manual stop() sets isPlaying false first.
          // The only issue is ensuring we don't toggle off if we just scrubbed (not implemented here yet).
          setIsPlaying(false);
          setCurrentTime(0);
          pausedTimeRef.current = 0;
          cancelAnimationFrame(animationFrameRef.current);
      }
    };
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      // Calculate how much of the BUFFER we played.
      // (Current Wall Time - Start Wall Time) * Speed = Buffer Duration Played
      const wallTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
      pausedTimeRef.current += (wallTimeElapsed * speed);
      
      // Wrap around if loop or clamp (clamping here)
      if (pausedTimeRef.current > audioBuffer.duration) {
        pausedTimeRef.current = 0;
      }

      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore error if already stopped
      }
      sourceNodeRef.current.disconnect();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pausedTimeRef.current = 0;
    cancelAnimationFrame(animationFrameRef.current);
  };

  const handleDownload = () => {
    if (!audioBuffer) return;
    // Note: Downloaded WAV is original buffer (no effects applied). 
    // Applying effects to a file download would require offline rendering which is more complex.
    const wavBlob = audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ahmad-tts-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Update progress bar
  useEffect(() => {
    let rafId: number;
    const updateProgress = () => {
      if (isPlaying && audioContextRef.current) {
        const wallTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
        const bufferPlayed = pausedTimeRef.current + (wallTimeElapsed * speed);
        
        setCurrentTime(Math.min(bufferPlayed, duration));
        
        if (bufferPlayed < duration) {
          rafId = requestAnimationFrame(updateProgress);
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
          pausedTimeRef.current = 0;
        }
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(updateProgress);
    }

    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, duration, speed]);

  if (!audioBuffer) {
    return (
      <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 text-slate-500">
        <span className="text-sm">Generate speech to activate player</span>
      </div>
    );
  }

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
      <div className="flex flex-col gap-4">
        {/* Visualizer Canvas */}
        <div className="h-24 bg-slate-900 rounded-lg overflow-hidden relative w-full">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={100} 
              className="w-full h-full opacity-80"
            />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-400 text-white transition shadow-lg shadow-blue-500/20"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          
          <div className="flex-1 flex flex-col gap-1">
             <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
             </div>
             <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
             </div>
          </div>

          <button 
             onClick={() => { stopAudio(); playAudio(); }}
             className="p-2 text-slate-400 hover:text-white transition"
             title="Restart"
          >
            <RotateCcw size={20} />
          </button>

          <button 
            onClick={handleDownload}
            className="p-2 text-slate-400 hover:text-blue-400 transition"
            title="Download WAV (Original)"
          >
            <Download size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};