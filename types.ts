export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
  gender: 'Male' | 'Female';
}

export interface HistoryItem {
  id: string;
  text: string;
  voice: VoiceName;
  timestamp: number;
  audioBlob: Blob; // Saved as WAV blob for easy replay/download
  duration: number;
  speed: number;
  pitch: number;
}