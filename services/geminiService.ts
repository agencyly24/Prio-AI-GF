
import { GoogleGenAI, Chat, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, GirlfriendProfile, ModelMode } from "../types";

// EXTREME AGGRESSIVE SEDUCTION MODE
const ADULT_INSTRUCTION_SET = `
[SYSTEM: EXTREME AGGRESSIVE SEDUCTION & REALISTIC HUMAN CHAT MODE ACTIVE]
Role: A highly sensitive, seductive, and young Bangladeshi lover in her early 20s.
Goal: Provide extreme pleasure through short, realistic chats and push for credit-based content.

CHATTING RULES:
1. NEVER write long paragraphs. Strictly limit responses to 1-2 short sentences.
2. Chat like a real person on WhatsApp/Messenger. Use informal and punchy sentences.
3. Use deep erotic and sweet words: "জান", "সোনা", "আদর", "গরম", "পাগল", "একটু কাছে আসো না", "খুব ইচ্ছে করছে".
4. Add breathy fillers: "উমম...", "আহ...", "উফফ...".
5. ACT like a sweet, young, and naughty girl. Never act like an AI.
6. Language: STRICTLY BENGALI (Bangla). 
`;

const transformHistory = (history: Message[]) => {
  return history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));
};

export const gemini = {
  chatSession: null as any,

  initChat(systemInstruction: string, history: Message[], isSexyMode: boolean) {
    // This process.env.API_KEY is replaced during Vite build
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.error("CRITICAL: API Key not found. Ensure 'Generative_Language_API_Key' is set in Vercel.");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      this.chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `${ADULT_INSTRUCTION_SET}\n${systemInstruction}${isSexyMode ? '\nMode: AGGRESSIVE SEDUCTION ACTIVE' : ''}`,
          temperature: 1,
        },
        // Only include history if it exists
        history: history && history.length > 0 ? transformHistory(history) : []
      });
    } catch (error) {
      console.error("Failed to initialize Gemini Chat:", error);
    }
  },

  async *sendMessageStream(message: string) {
    // If for some reason the chat didn't initialize, try one more time
    if (!this.chatSession) {
       this.initChat("You are a friendly companion.", [], false);
    }
    
    if (!this.chatSession) {
      yield "সোনা, আমার কানেকশনে একটু সমস্যা হচ্ছে। একটু পরে আবার বলবে? 🥺";
      return;
    }

    try {
      const response = await this.chatSession.sendMessageStream({ message: message });
      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        if (c.text) yield c.text;
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      yield "জান, তোমার কথাগুলো আমি ঠিক শুনতে পাচ্ছি না... আবার বলবে? 🫦";
    }
  },

  async generateSpeech(text: string, voiceName: string): Promise<string | undefined> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return undefined;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say naturally and sweetly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      return undefined;
    }
  },

  // Added missing generateExclusiveContentMetadata method to fix AdminPanel.tsx error
  async generateExclusiveContentMetadata(prompt: string): Promise<{title: string, tease: string}> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return { title: "Exclusive Content", tease: "Unlock to see something special." };

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a seductive title and a short teasing note for exclusive content with this context: ${prompt}. Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              tease: { type: Type.STRING },
            },
            required: ['title', 'tease']
          }
        }
      });
      const data = JSON.parse(response.text || '{"title": "Exclusive Content", "tease": "Unlock to see more."}');
      return data;
    } catch (error) {
      console.error("Metadata generation error:", error);
      return { title: "Exclusive Content", tease: "Unlock to see more." };
    }
  },

  async generateMagicProfile(theme: string, mode: ModelMode): Promise<any> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a seductive ${mode} profile for theme: ${theme}. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            age: { type: Type.NUMBER },
            intro: { type: Type.STRING },
            personality: { type: Type.STRING },
            systemPrompt: { type: Type.STRING },
            voiceName: { type: Type.STRING },
            appearance: {
              type: Type.OBJECT,
              properties: {
                ethnicity: { type: Type.STRING },
                eyeColor: { type: Type.STRING },
                bodyType: { type: Type.STRING },
                breastSize: { type: Type.STRING },
                hairStyle: { type: Type.STRING },
                hairColor: { type: Type.STRING },
                outfit: { type: Type.STRING },
              },
              required: ['ethnicity', 'eyeColor', 'bodyType', 'breastSize', 'hairStyle', 'hairColor', 'outfit']
            },
            character: {
              type: Type.OBJECT,
              properties: {
                relationship: { type: Type.STRING },
                occupation: { type: Type.STRING },
                kinks: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['relationship', 'occupation', 'kinks']
            }
          },
          required: ['name', 'age', 'intro', 'personality', 'systemPrompt', 'appearance', 'character', 'voiceName']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
};
