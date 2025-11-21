import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from '../types';

const API_KEY = process.env.API_KEY || '';

// Singleton instance logic could be here, but we'll instantiate per request to ensure fresh key use if needed
// or keep it simple.

export const generateSpeech = async (
  text: string, 
  voiceName: VoiceName
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Use the specific TTS model
  const modelId = "gemini-2.5-flash-preview-tts";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    
    // Find the inline data part which contains the audio
    const audioPart = parts?.find(p => p.inlineData);

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("No audio data returned from the model.");
    }

    return audioPart.inlineData.data; // Base64 string
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};