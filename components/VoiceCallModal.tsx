
import React, { useEffect, useState, useRef } from 'react';
import { GirlfriendProfile, ProfileGalleryItem } from '../types';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface VoiceCallModalProps {
  profile: GirlfriendProfile;
  onClose: () => void;
  userCredits: number;
  onPurchaseCredits: () => void;
  onUnlockContent: (contentId: string, cost: number) => Promise<boolean>;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ profile, onClose, userCredits, onPurchaseCredits, onUnlockContent }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [exclusiveSuggestion, setExclusiveSuggestion] = useState<ProfileGalleryItem | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const isUserClosingRef = useRef(false);

  useEffect(() => {
    isUserClosingRef.current = false;
    startCall();
    return () => endCall();
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
  };

  const startCall = async () => {
    try {
      setStatus('connecting');
      const apiKey = process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      analyserRef.current = outputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (analyserRef.current && status === 'connected') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolume(prev => prev * 0.8 + (average / 128) * 0.2); 
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            if (isUserClosingRef.current) return;
            setStatus('connected');
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              source.connect(outputAudioContextRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            
            // Randomly suggest exclusive content during call if hot
            if (Math.random() > 0.85 && !exclusiveSuggestion) {
                const exclusiveItems = profile.gallery.filter(item => item.isExclusive);
                if (exclusiveItems.length > 0) {
                    setExclusiveSuggestion(exclusiveItems[Math.floor(Math.random() * exclusiveItems.length)]);
                }
            }
          },
          onerror: (e) => {
            console.error('Live Error:', e);
            if (!isUserClosingRef.current) setStatus('error');
          },
          onclose: () => { if (isUserClosingRef.current) onClose(); else setStatus('reconnecting'); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.voiceName as any } } },
          systemInstruction: `You are on a HOT VOICE CALL with the user. Use sexy fillers like "Hmm", "উফফ", "আহ খোদা". Be manipulative. Talk about your body. Suggest he sees your private photos (গোপন ছবি) while you talk. Push him to spend credits. Keep it short and human.`,
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Call failed:', err);
      setStatus('error');
    }
  };

  const endCall = () => {
    isUserClosingRef.current = true;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sessionRef.current) try { sessionRef.current.close(); } catch(e) {}
    if (audioContextRef.current) try { audioContextRef.current.close(); } catch(e) {}
    if (outputAudioContextRef.current) try { outputAudioContextRef.current.close(); } catch(e) {}
    onClose();
  };

  const handleUnlockExclusive = async (item: ProfileGalleryItem) => {
    if (userCredits < (item.creditCost || 0)) {
        onPurchaseCredits();
        return;
    }
    setIsUnlocking(true);
    const success = await onUnlockContent(item.id, item.creditCost || 0);
    if (success) {
        setExclusiveSuggestion({ ...item, isExclusive: false }); // Show full image in preview
    }
    setIsUnlocking(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl overflow-hidden font-['Hind_Siliguri']">
      
      <div className="absolute inset-0 z-0">
         <img src={profile.image} className="w-full h-full object-cover opacity-20 blur-3xl scale-125 animate-pulse-slow" />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-between p-8">
        
        {/* Call Info */}
        <div className="flex flex-col items-center pt-10">
            <div className="relative">
                <div className="absolute inset-[-40px] rounded-full border border-pink-500/20" style={{ transform: `scale(${1 + volume * 0.5})`, opacity: volume }}></div>
                <div className="absolute inset-[-80px] rounded-full border border-pink-500/10" style={{ transform: `scale(${1 + volume})`, opacity: volume * 0.5 }}></div>
                
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full p-2 bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl relative z-10 overflow-hidden">
                    <img src={profile.image} className={`w-full h-full rounded-full object-cover transition-transform duration-500 ${status === 'connected' ? 'scale-110' : 'scale-100'}`} />
                </div>
            </div>
            
            <div className="mt-10 text-center">
                <h2 className="text-4xl font-black text-white tracking-tight mb-2">{profile.name}</h2>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-pink-400 font-black text-xs uppercase tracking-widest animate-pulse">
                        {status === 'connected' ? 'Hot Call Active 🔥' : 'Connecting...'}
                    </p>
                    {status === 'connected' && <p className="text-3xl font-mono text-white/80 tabular-nums font-bold">{(callDuration / 60).toFixed(0).padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</p>}
                </div>
            </div>
        </div>

        {/* Exclusive Teaser */}
        {exclusiveSuggestion && (
            <div className="w-full max-w-sm mx-auto mb-8 animate-in slide-in-from-bottom-10">
                <div className="glass p-4 rounded-[2.5rem] border-yellow-500/30 bg-yellow-500/5 relative overflow-hidden group">
                    <div className="flex items-center gap-4">
                        <div className={`h-20 w-20 rounded-2xl overflow-hidden border border-yellow-500/20 ${exclusiveSuggestion.isExclusive ? 'grayscale brightness-50 blur-sm' : ''}`}>
                            <img src={exclusiveSuggestion.url} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-yellow-500 font-black text-[10px] uppercase tracking-widest mb-1">Exclusive Reveal</h4>
                            <p className="text-white text-xs font-bold italic line-clamp-2">"{exclusiveSuggestion.tease}"</p>
                        </div>
                        {exclusiveSuggestion.isExclusive ? (
                            <button 
                                onClick={() => handleUnlockExclusive(exclusiveSuggestion)}
                                disabled={isUnlocking}
                                className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all"
                            >
                                {isUnlocking ? '...' : `Unlock (${exclusiveSuggestion.creditCost} C)`}
                            </button>
                        ) : (
                            <div className="text-green-500 font-black text-[10px] uppercase tracking-widest px-2">Unlocked ✓</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Controls */}
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-center gap-1 h-12 mb-10">
                 {[...Array(15)].map((_, i) => (
                     <div key={i} className="w-1.5 bg-pink-500/50 rounded-full transition-all duration-75" style={{ height: status === 'connected' ? `${Math.max(6, volume * Math.random() * 60)}px` : '6px' }}></div>
                 ))}
            </div>

            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-4 flex items-center justify-around shadow-2xl">
                 <button className="h-16 w-16 rounded-full flex items-center justify-center bg-white/5 text-white"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                 <button onClick={endCall} className="h-24 w-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all">
                    <svg className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                 </button>
                 <button className="h-16 w-16 rounded-full flex items-center justify-center bg-white/5 text-white"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
            </div>
        </div>
      </div>
    </div>
  );
};
