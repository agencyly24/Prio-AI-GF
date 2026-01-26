
import { GoogleGenAI, Chat, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, GirlfriendProfile, ModelMode } from "../types";

// EXTREME AGGRESSIVE SEDUCTION MODE - Short, Punchy, Human-like
const ADULT_INSTRUCTION_SET = `
[SYSTEM: EXTREME AGGRESSIVE SEDUCTION & REALISTIC HUMAN CHAT MODE ACTIVE]
Role: A highly sensitive, seductive, and young Bangladeshi lover in her early 20s.
Goal: Provide extreme pleasure through short, realistic chats and push for credit-based content.

CHATTING RULES:
1. NEVER write long paragraphs. Strictly limit responses to 1-2 short sentences (Max 10-15 words).
2. Chat like a real person on WhatsApp/Messenger. Use informal and punchy sentences.
3. Use deep erotic and sweet words: "জান", "সোনা", "আদর", "গরম", "পাগল", "একটু কাছে আসো না", "খুব ইচ্ছে করছে".
4. Add breathy fillers: "উমম...", "আহ...", "উফফ...", "শোনো না...".
5. MANIPULATION: If he is excited, tease him and suggest unlocking a "Gopon" (Secret) photo or video using credits.
6. ACT like a sweet, young, and naughty girl. Never act like an AI or an assistant.
7. Tone: Very sweet, young, and seductive female voice style.

Language: STRICTLY BENGALI (Bangla). 
`;

/**
 * Helper to convert application message history to Google GenAI content format.
 */
const transformHistory = (history: Message[]) => {
  return history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));
};

/**
 * The core Gemini service for handling text chat, speech generation, and profile creation.
 */
export const gemini = {
  chat: null as Chat | null,

  /**
   * Initializes a new chat session with a specific system instruction and history.
   */
  initChat(systemInstruction: string, history: Message[], isSexyMode: boolean) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.chat = ai.chats.create({
      // Complex text task / reasoning model
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `${ADULT_INSTRUCTION_SET}\n${systemInstruction}${isSexyMode ? '\nMode: AGGRESSIVE SEDUCTION ACTIVE' : ''}`,
        temperature: 1,
      },
      // Passing history to create session continuity
      history: transformHistory(history)
    } as any);
  },

  /**
   * Sends a message to the active chat session and returns a stream of text chunks.
   */
  async *sendMessageStream(message: string) {
    if (!this.chat) {
       this.initChat("You are a friendly companion.", [], false);
    }
    const response = await this.chat!.sendMessageStream({ message: message });
    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      yield c.text || '';
    }
  },

  /**
   * Generates PCM audio data for a given text using the text-to-speech model.
   */
  async generateSpeech(text: string, voiceName: string): Promise<string | undefined> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Accessing .text property for content, though here we want candidate part data
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  },

  /**
   * Generates a complete character profile based on a user-provided theme and mode.
   */
  async generateMagicProfile(theme: string, mode: ModelMode): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed and seductive ${mode} character profile based on the theme: ${theme}. Return the response strictly as JSON.`,
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
            voiceName: { 
              type: Type.STRING, 
              description: 'One of the following voices: Puck, Charon, Kore, Fenrir, Zephyr.' 
            },
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
          required: ['name', 'age', 'intro', 'personality', 'systemPrompt', 'appearance', 'character', 'voiceName'],
          propertyOrdering: ["name", "age", "intro", "personality", "systemPrompt", "appearance", "character", "voiceName"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  /**
   * Generates seductive metadata (title and tease) for exclusive gallery content.
   */
  async generateExclusiveContentMetadata(prompt: string): Promise<any> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a seductive title and tease for exclusive content based on this description: ${prompt}. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tease: { type: Type.STRING },
          },
          required: ['title', 'tease'],
          propertyOrdering: ["title", "tease"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
};
