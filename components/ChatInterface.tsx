
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
  const hotWords = ['ভালোবাসি', 'জানু', 'গরম', 'আদর', 'নিচে', 'ভেজা', 'পাগল', 'সেক্সি', 'জান', 'body', 'wet', 'naked', 'budha', 'দুধ', 'বুক', 'খুলবো', 'চরম', 'তৃপ্তি', 'নগ্ন', 'কামনা', 'শরীরের ভাঁজ'];
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
  const [isSexyMode, setIsSexyMode] = useState(true);
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<ProfileGalleryItem | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    gemini.initChat(`${profile.systemPrompt}\nUser Name: ${userName}. Provide aggressive seductive pleasure.`, history, isSexyMode);
    if (history.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{ id: 'welcome', sender: 'ai', text: profile.intro, timestamp: new Date() }]);
        setIsTyping(false);
      }, 1500);
    } else setMessages(history);
  }, [profile, userName]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping, suggestedContent]);

  const showSeductiveRestrictionNote = () => {
    alert("জান, আমার মিষ্টি রোমান্টিক কণ্ঠ শুনতে আর আমাকে একদম কাছে পেতে হলে তোমাকে 'বিছানায় আমি' (PREMIUM) প্যাকেজটি নিতে হবে। আমি তোমার জন্য খুব স্পেশাল কিছু সারপ্রাইজ তৈরি করে রেখেছি... আসো না সোনা! 🫦");
    onUpgrade();
  };

  const handleVoiceToggle = () => {
    if (userTier !== 'VIP') {
      showSeductiveRestrictionNote();
      return;
    }
    setIsVoiceReplyEnabled(!isVoiceReplyEnabled);
  };

  const handleVoiceCallClick = () => {
    if (userTier !== 'VIP') {
      showSeductiveRestrictionNote();
      return;
    }
    setShowVoiceCall(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: inputText, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setIsTyping(true);
    setSuggestedContent(null);

    try {
      let aiText = '';
      const aiMsgId = (Date.now() + 1).toString();
      setMessages([...updated, { id: aiMsgId, sender: 'ai', text: '', timestamp: new Date() }]);

      const stream = gemini.sendMessageStream(userMsg.text);
      for await (const chunk of stream) {
        aiText += chunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
      }

      const hotTriggers = ['ছবি', 'গোপন', 'photo', 'দেখাও', 'naked', 'শরীর', 'খোলো'];
      if (hotTriggers.some(t => aiText.toLowerCase().includes(t) || userMsg.text.toLowerCase().includes(t))) {
        const exclusive = profile.gallery.find(g => g.isExclusive);
        if (exclusive) setSuggestedContent(exclusive);
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

  const handleUnlockSuggestion = async (item: ProfileGalleryItem) => {
    if (userCredits < (item.creditCost || 0)) {
        onPurchaseCredits();
        return;
    }
    setUnlockingId(item.id);
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
    setUnlockingId(null);
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden font-['Hind_Siliguri'] bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] via-[#0f0518] to-black"></div>
      
      {/* Lightbox / Full Screen Image Overlay */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
             <button className="absolute top-4 right-4 z-50 p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <img 
               src={fullScreenImage} 
               className="max-h-full max-w-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] object-contain border border-white/5 animate-in zoom-in duration-500" 
               alt="Full view"
               onClick={(e) => e.stopPropagation()} 
             />
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-2">
                   <h2 className="font-black text-white text-xl">{profile.name}</h2>
                   {userTier === 'VIP' && <span className="bg-yellow-500 text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase">VIP</span>}
                </div>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest">{isTyping ? 'মডেল টাইপ করছে...' : 'অ্যাক্টিভ 🔥'}</p>
             </div>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={handleVoiceToggle} className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${isVoiceReplyEnabled ? 'bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'bg-white/5 text-gray-400'}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
           </button>
           <button onClick={handleVoiceCallClick} className="h-12 w-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse-slow"><svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg></button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-10 z-10 scroll-smooth pb-32">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-8`}>
              {!isUser && <img onClick={() => setFullScreenImage(profile.image)} src={profile.image} className="w-10 h-10 rounded-full object-cover mr-2 self-end mb-2 border border-pink-500/30 shadow-md cursor-pointer" />}
              <div className="max-w-[85%] relative">
                <div className={`px-6 py-4 relative text-2xl font-bold leading-tight shadow-2xl ${isUser ? 'bg-violet-600 text-white rounded-[2rem] rounded-br-none' : 'bg-slate-900 text-pink-50 rounded-[2rem] rounded-bl-none border border-white/5'}`}>
                    {isUser ? m.text : formatSeductiveText(m.text)}
                    {m.attachment && (
                      <div 
                        onClick={() => setFullScreenImage(m.attachment!.url)}
                        className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
                      >
                        <img src={m.attachment.url} className="w-full h-auto max-h-80 object-cover" />
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
           <div className="flex w-full justify-start animate-in fade-in">
              <img src={profile.image} className="w-10 h-10 rounded-full object-cover mr-2 self-end mb-2 border border-pink-500/30 shadow-md" />
              <div className="bg-slate-900 px-6 py-4 rounded-[2rem] rounded-bl-none border border-white/5 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
           </div>
        )}

        {suggestedContent && !isTyping && (
            <div className="flex justify-start animate-in zoom-in max-w-[80%]">
                <div className="ml-12 p-1 rounded-[2.5rem] bg-gradient-to-br from-yellow-500 to-amber-700 shadow-2xl">
                    <div className="bg-slate-900 rounded-[2.3rem] overflow-hidden p-1 relative aspect-[3/4]">
                        <img src={suggestedContent.url} className="w-full h-full object-cover blur-3xl opacity-50 grayscale" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60">
                            <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-4 animate-bounce"><svg className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></div>
                            <h4 className="text-xl font-black text-white uppercase italic leading-tight mb-2">"{suggestedContent.tease || 'জান, আমার শরীর দেখবে?'}"</h4>
                            <button onClick={() => handleUnlockSuggestion(suggestedContent)} className="px-6 py-3 bg-yellow-500 text-black font-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">আনলক ({suggestedContent.creditCost} C)</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 z-20 absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
        <form onSubmit={handleSend} className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-2 flex items-center shadow-2xl focus-within:border-pink-500/50 transition-all">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={isSexyMode ? "আমাকে গরম করে দাও সোনা..." : "মনের কথা বলো..."} className="flex-1 bg-transparent border-none text-white px-6 py-4 placeholder:text-gray-500 outline-none text-xl font-bold" />
          <button type="submit" disabled={!inputText.trim() || isTyping} className="h-14 w-14 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all active:scale-90"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
        </form>
      </div>

      {showVoiceCall && <VoiceCallModal profile={profile} onClose={() => setShowVoiceCall(false)} userCredits={userCredits} onPurchaseCredits={onPurchaseCredits} onUnlockContent={onUnlockContent} />}
    </div>
  );
};
