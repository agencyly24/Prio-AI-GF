
import React, { useState, useEffect, useRef } from 'react';
import { GirlfriendProfile, Message, SubscriptionTier, ProfileGalleryItem } from '../types';
import { gemini } from '../services/geminiService';
import { VoiceCallModal } from './VoiceCallModal';

interface ChatInterfaceProps {
  profile: GirlfriendProfile;
  onBack: () => void;
  onMenuOpen: () => void;
  userName: string;
  isPremium: boolean;
  userTier: SubscriptionTier;
  onUpgrade: () => void;
  history: Message[];
  onSaveHistory: (messages: Message[]) => void;
  userCredits: number;
  onPurchaseCredits: () => void;
  onUnlockContent: (contentId: string, cost: number) => Promise<boolean>;
  unlockedContentIds: string[];
}

const decodeAudio = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const playPCM = async (base64: string) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const data = decodeAudio(base64);
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};

const formatSeductiveText = (text: string) => {
  const hotWords = ['ভালোবাসি', 'জানু', 'গরম', 'আদর', 'নিচে', 'ভেজা', 'পাগল', 'সেক্সি', 'জান', 'body', 'wet', 'naked', 'দুধ', 'বুক', 'খুলবো', 'চরম', 'তৃপ্তি', 'নগ্ন', 'কামনা', 'নুনু', 'সাইজ'];
  const parts = text.split(new RegExp(`(${hotWords.join('|')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => hotWords.some(w => w.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="font-serif italic font-black text-pink-300 drop-shadow-md text-[1.15em] mx-0.5">{part}</span>
        : <span key={i}>{part}</span>)}
    </span>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  profile, onBack, onMenuOpen, userName, isPremium, userTier, onUpgrade, history, onSaveHistory, 
  userCredits, onPurchaseCredits, onUnlockContent, unlockedContentIds 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<ProfileGalleryItem | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    gemini.initChat(`${profile.systemPrompt}\nUser Name: ${userName}. Act as a real human girl. You are aggressive, sexy, and manipulative.`, history, true);
    if (history.length === 0) {
      setMessages([{ id: 'welcome', sender: 'ai', text: profile.intro, timestamp: new Date() }]);
    } else setMessages(history);
  }, [profile]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping, suggestedContent]);

  const handleSend = async (e?: React.FormEvent, imageBase64?: string) => {
    e?.preventDefault();
    if (!inputText.trim() && !imageBase64) return;
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: inputText, 
      timestamp: new Date(),
      attachment: imageBase64 ? { type: 'image', url: `data:image/jpeg;base64,${imageBase64}` } : undefined
    };
    
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setIsTyping(true);
    setSuggestedContent(null);

    try {
      let aiText = '';
      const aiMsgId = (Date.now() + 1).toString();
      setMessages([...updated, { id: aiMsgId, sender: 'ai', text: '', timestamp: new Date() }]);

      const stream = gemini.sendMessageStream(userMsg.text, imageBase64);
      for await (const chunk of stream) {
        aiText += chunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
      }

      // SMART FILTERING LOGIC
      const lowerInput = userMsg.text.toLowerCase();
      const match = profile.gallery.find(item => 
        item.isExclusive && 
        item.keywords?.some(k => lowerInput.includes(k.toLowerCase()))
      );
      
      if (match) {
        setSuggestedContent(match);
      } else if (lowerInput.includes('ছবি') || lowerInput.includes('গোপন') || lowerInput.includes('শরীর')) {
        const fallback = profile.gallery.find(g => g.isExclusive);
        if (fallback) setSuggestedContent(fallback);
      }

      if (isVoiceReplyEnabled && userTier === 'VIP') {
        const audioData = await gemini.generateSpeech(aiText, profile.voiceName);
        if (audioData) playPCM(audioData);
      }
      
      onSaveHistory([...updated, { id: aiMsgId, sender: 'ai', text: aiText, timestamp: new Date() }]);
    } catch (error) {
      console.error(error);
    } finally { setIsTyping(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        handleSend(undefined, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUnlockSuggestion = async (item: ProfileGalleryItem) => {
    if (userCredits < (item.creditCost || 0)) {
        onPurchaseCredits();
        return;
    }
    const success = await onUnlockContent(item.id, item.creditCost || 0);
    if (success) {
        setSuggestedContent(null);
        setMessages(prev => [...prev, { 
          id: `unl_${Date.now()}`, 
          sender: 'ai', 
          text: `জান, তোমার জন্য ওটা আনলক করলাম... কেমন লেগেছে? 🔥`, 
          timestamp: new Date(), 
          attachment: { type: 'image', url: item.url } 
        }]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden font-['Hind_Siliguri'] bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] via-[#0f0518] to-black"></div>
      
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between z-30 bg-slate-900/60 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
          <div className="flex items-center gap-3">
             <div className="relative cursor-pointer" onClick={() => setFullScreenImage(profile.image)}>
                <img src={profile.image} className="h-14 w-14 rounded-full object-cover border-2 border-pink-500 shadow-lg" alt="" />
                <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
             </div>
             <div>
                <h2 className="font-black text-white text-xl">{profile.name}</h2>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">{isTyping ? 'মডেল টাইপ করছে...' : 'অ্যাক্টিভ 🔥'}</p>
             </div>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setShowVoiceCall(true)} className="h-12 w-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse-slow"><svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg></button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-10 z-10 scroll-smooth pb-32 pt-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-8`}>
            <div className={`px-6 py-4 max-w-[85%] text-2xl font-bold leading-tight shadow-2xl ${m.sender === 'user' ? 'bg-violet-600 text-white rounded-[2rem] rounded-br-none' : 'bg-slate-900 text-pink-50 rounded-[2rem] rounded-bl-none border border-white/5'}`}>
                {m.sender === 'user' ? m.text : formatSeductiveText(m.text)}
                {m.attachment && <img src={m.attachment.url} className="mt-4 rounded-xl max-w-full h-auto shadow-lg" />}
            </div>
          </div>
        ))}

        {isTyping && (
           <div className="flex w-full justify-start animate-in fade-in">
              <div className="bg-slate-900 px-6 py-4 rounded-[2rem] flex items-center gap-1.5"><div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>
           </div>
        )}

        {suggestedContent && !isTyping && (
            <div className="flex justify-start animate-in zoom-in max-w-[80%]">
                <div className="ml-2 p-1 rounded-[2.5rem] bg-gradient-to-br from-yellow-500 to-amber-700 shadow-2xl">
                    <div className="bg-slate-900 rounded-[2.3rem] overflow-hidden p-6 text-center">
                        <h4 className="text-xl font-black text-white uppercase italic leading-tight mb-4">"{suggestedContent.tease || 'জান, আমার শরীর দেখবে?'}"</h4>
                        <button onClick={() => handleUnlockSuggestion(suggestedContent)} className="px-6 py-3 bg-yellow-500 text-black font-black rounded-full shadow-lg hover:scale-105 transition-all">আনলক ({suggestedContent.creditCost} C)</button>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 z-20 absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent">
        <form onSubmit={handleSend} className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-2 flex items-center shadow-2xl">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="আমাকে গরম করে দাও সোনা..." className="flex-1 bg-transparent border-none text-white px-4 py-4 placeholder:text-gray-600 outline-none text-xl font-bold" />
          <button type="submit" className="h-14 w-14 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7" /></svg></button>
        </form>
      </div>

      {showVoiceCall && <VoiceCallModal profile={profile} onClose={() => setShowVoiceCall(false)} userCredits={userCredits} onPurchaseCredits={onPurchaseCredits} onUnlockContent={onUnlockContent} />}
      {fullScreenImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setFullScreenImage(null)}><img src={fullScreenImage} className="max-w-full max-h-full" /></div>}
    </div>
  );
};
