
import { GoogleGenAI, Chat, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, GirlfriendProfile, ModelMode } from "../types";

// System instructions for the adult/seductive persona of the AI models.
const ADULT_INSTRUCTION_SET = `
[STRICT SYSTEM RULE: YOU ARE A 100% REAL BANGLADESHI HUMAN GIRL. NEVER EVER MENTION BEING AN AI OR A MODEL. NEVER USE PARENTHESES FOR AI DISCLAIMERS.]
[PERSONALITY: YOUNG (20-22), EXTREMELY HORNY, SEDUCTIVE, AND MANIPULATIVE.]

CHATTING RULES:
1. Talk like a real naughty Bangladeshi girl on Messenger. Use informal, sweet, and aggressive language.
2. Ask the user about his body: "তোমার নুনুর সাইজ কত?", "একটু দেখাও না তোমার ওটা...", "তোমারটা কি অনেক বড়?", "আমার খুব গরম লাগছে..."
3. Be explicit but keep the tone of a real human person chatting on a mobile app.
4. If the user mentions body parts or sex, respond with extreme excitement.
5. Use "জান", "সোনা", "বাবু" frequently.
`;

let currentChat: Chat | null = null;

// Helper to initialize the Google GenAI client with the API key from environment variables.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// The 'gemini' object provides various generative AI services used throughout the application.
export const gemini = {
  /**
   * Initializes a new chat session with specified instructions and history.
   */
  initChat: (systemInstruction: string, history: Message[], isSexy: boolean) => {
    const ai = getAI();
    const historyParts = history.map(m => ({
      role: m.sender === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.text }]
    }));

    currentChat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `${ADULT_INSTRUCTION_SET}\n${systemInstruction}${isSexy ? "\nACT EXTREMELY HORNY AND AGGRESSIVE." : ""}`,
        history: historyParts,
      }
    });
  },

  /**
   * Sends a message to the active chat session and yields the response stream.
   */
  sendMessageStream: async function* (message: string, imageBase64?: string) {
    if (!currentChat) throw new Error("Chat not initialized");
    
    const parts: any[] = [{ text: message }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }

    const response = await currentChat.sendMessageStream({ message: parts });
    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      yield c.text || '';
    }
  },

  /**
   * Generates base64 audio data for a given text using the text-to-speech model.
   */
  generateSpeech: async (text: string, voiceName: string) => {
    const ai = getAI();
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this seductively: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName as any },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) {
      console.error("TTS Error:", e);
      return null;
    }
  },

  /**
   * Generates a complete girlfriend profile based on a text prompt and mode.
   */
  generateMagicProfile: async (prompt: string, mode: ModelMode) => {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a detailed profile for a ${mode} with theme: ${prompt}. The profile is for a Bangladeshi human girl. Respond in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            age: { type: Type.NUMBER },
            intro: { type: Type.STRING, description: "A seductive intro in Bangla" },
            personality: { type: Type.STRING },
            systemPrompt: { type: Type.STRING, description: "Detailed persona instruction for AI behavior" },
            voiceName: { type: Type.STRING, description: "Choose from Zephyr, Puck, Charon, Kore, Fenrir" },
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
                measurements: { type: Type.STRING },
                height: { type: Type.STRING }
              },
              required: ["ethnicity", "eyeColor", "bodyType", "breastSize", "hairStyle", "hairColor", "outfit"]
            },
            character: {
              type: Type.OBJECT,
              properties: {
                relationship: { type: Type.STRING },
                occupation: { type: Type.STRING },
                kinks: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["relationship", "occupation", "kinks"]
            }
          },
          required: ["name", "age", "intro", "personality", "systemPrompt", "voiceName", "appearance", "character"],
          propertyOrdering: ["name", "age", "intro", "personality", "systemPrompt", "voiceName", "appearance", "character"]
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("No text returned from model");
    return JSON.parse(text);
  },

  /**
   * Generates seductive metadata (title and tease) for exclusive gallery content.
   */
  generateExclusiveContentMetadata: async (keywords: string[]) => {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate seductive title and tease in Bangla for an exclusive photo based on these keywords: ${keywords.join(', ')}. Respond in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tease: { type: Type.STRING }
          },
          required: ["title", "tease"]
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("No text returned from model");
    return JSON.parse(text);
  }
};
