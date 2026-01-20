
import React, { useState, useEffect } from 'react';
import { View, GirlfriendProfile } from './types';
import { PROFILES, APP_CONFIG } from './constants';
import { ProfileCard } from './components/ProfileCard';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [selectedProfile, setSelectedProfile] = useState<GirlfriendProfile | null>(null);
  const [hasConfirmedAge, setHasConfirmedAge] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Global Settings
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('priyo_user_name') || '');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('priyo_voice_enabled') !== 'false');

  useEffect(() => {
    localStorage.setItem('priyo_user_name', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('priyo_voice_enabled', String(voiceEnabled));
  }, [voiceEnabled]);

  const handleStartClick = () => {
    // Button always leads to auth first if not logged in
    if (!isLoggedIn) {
      setView('auth');
    } else {
      checkAgeAndProceed();
    }
  };

  const checkAgeAndProceed = () => {
    if (!hasConfirmedAge) {
      if (confirm("এই অ্যাপটি ১৮+ ইউজারদের জন্য। তুমি কি ১৮ বছরের বেশি বয়সী?")) {
        setHasConfirmedAge(true);
        setView('profile-selection');
      }
    } else {
      setView('profile-selection');
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    checkAgeAndProceed();
  };

  const handleProfileSelect = (profile: GirlfriendProfile) => {
    setSelectedProfile(profile);
    setView('chat');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] selection:bg-pink-500/30">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        currentView={view}
        setView={setView}
        userName={userName}
        setUserName={setUserName}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
      />

      {view === 'landing' && (
        <main className="relative flex flex-col items-center justify-center min-h-screen p-6 text-center overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>

          <div className="relative z-10 max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tight">
              <span className="text-gradient">প্রিয় (Priyo)</span>
            </h1>
            <p className="text-xl md:text-3xl text-gray-300 font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
              {APP_CONFIG.tagline}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleStartClick}
                className="bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl shadow-pink-500/30 transition-all hover:scale-105 active:scale-95"
              >
                কথা বলা শুরু করো
              </button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-gray-400 text-sm font-medium">
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                ১৮+ কনফার্মড
              </span>
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                সিকিউর চ্যাট
              </span>
            </div>
          </div>
        </main>
      )}

      {view === 'auth' && (
        <AuthScreen 
          onLoginSuccess={handleLoginSuccess} 
          onBack={() => setView('landing')} 
        />
      )}

      {view === 'profile-selection' && (
        <main className="p-6 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 glass rounded-xl text-white hover:bg-white/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">তোমার আপন মানুষটিকে বেছে নাও</h2>
                <p className="text-gray-400">প্রতিটি প্রোফাইলের আলাদা ব্যক্তিত্ব এবং কথা বলার ধরণ আছে।</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PROFILES.map(profile => (
              <ProfileCard 
                key={profile.id} 
                profile={profile} 
                onSelect={handleProfileSelect} 
              />
            ))}
          </div>
        </main>
      )}

      {view === 'chat' && selectedProfile && (
        <div className="animate-in slide-in-from-right duration-500">
          <ChatInterface 
            profile={selectedProfile} 
            onBack={() => setView('profile-selection')}
            onMenuOpen={() => setIsSidebarOpen(true)}
            userName={userName}
          />
        </div>
      )}

      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
    </div>
  );
};

export default App;
