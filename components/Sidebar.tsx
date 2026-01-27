
import React, { useState } from 'react';
// Fixed: View is not exported from types, using ViewState instead
import { ViewState, UserProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Fixed: View replaced with ViewState
  currentView: ViewState;
  setView: (view: ViewState) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentView,
  setView,
  userProfile,
  setUserProfile,
  voiceEnabled,
  setVoiceEnabled,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'nav' | 'settings' | 'safety'>('nav');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-80 max-w-[85vw] h-full glass border-r border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 p-0.5">
              <img src={userProfile.avatar} className="h-full w-full rounded-full bg-slate-900" alt="User" />
            </div>
            <h2 className="text-2xl font-black text-gradient">Priyo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-white/10 text-xs uppercase tracking-widest font-black">
          {['nav', 'settings', 'safety'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-4 transition-all ${activeTab === tab ? 'text-pink-500 border-b-2 border-pink-500 bg-pink-500/5' : 'text-gray-500'}`}
            >
              {tab === 'nav' ? 'মেনু' : tab === 'settings' ? 'সেটিংস' : 'নিরাপত্তা'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'nav' && (
            <div className="space-y-3">
              <button onClick={() => { setView('landing'); onClose(); }} className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all ${currentView === 'landing' ? 'bg-pink-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="font-bold">হোম</span>
              </button>
              <button onClick={() => { setView('subscription'); onClose(); }} className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all ${currentView === 'subscription' ? 'bg-yellow-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                <span className="font-bold">Upgrade Membership</span>
              </button>
              <button onClick={() => { setView('profile-selection'); onClose(); }} className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all ${currentView === 'profile-selection' ? 'bg-pink-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="font-bold">সঙ্গী নির্বাচন</span>
              </button>
              <button onClick={() => { setView('account'); onClose(); }} className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all ${currentView === 'account' ? 'bg-pink-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="font-bold">আমার প্রোফাইল</span>
              </button>
              
              {userProfile.isAdmin && (
                <div className="pt-6 border-t border-white/5">
                  <p className="px-5 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-600">Administrative</p>
                  <button onClick={() => { setView('admin-panel'); onClose(); }} className={`w-full text-left p-5 rounded-2xl flex items-center gap-4 transition-all ${currentView === 'admin-panel' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-blue-500'}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <span className="font-black">Admin Panel</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">আপনার ডাকনাম</label>
                <input type="text" value={userProfile.name} onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white" />
              </div>

              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">ভয়েস কল</p>
                  <p className="text-[10px] text-gray-500">কথা বলার অনুমতি</p>
                </div>
                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${voiceEnabled ? 'bg-pink-600' : 'bg-gray-800'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <button onClick={() => { onLogout(); onClose(); }} className="w-full p-5 rounded-2xl border border-red-500/20 text-red-500 font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-3">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                লগ-আউট করুন
              </button>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-5">
              <div className="p-6 bg-pink-600/10 border border-pink-500/20 rounded-3xl">
                <h4 className="text-pink-400 font-black mb-3 text-sm uppercase tracking-widest">গোপনীয়তা</h4>
                <p className="text-xs text-gray-400">আপনার প্রতিটি আড্ডা এনক্রিপ্টেড।</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-8 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-600 font-black tracking-widest uppercase">Priyo v2.0 Premium</p>
        </div>
      </div>
    </div>
  );
};
