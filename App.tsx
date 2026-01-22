
import React, { useState, useEffect } from 'react';
import { View, GirlfriendProfile, UserProfile, PaymentRequest, Message, ReferralProfile, ReferralTransaction, PersonalityType } from './types';
import { PROFILES as INITIAL_PROFILES, APP_CONFIG, SUBSCRIPTION_PLANS } from './constants';
import { ProfileCard } from './components/ProfileCard';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { ProfileDetail } from './components/ProfileDetail';
import { AgeVerificationScreen } from './components/AgeVerificationScreen';
import { UserAccount } from './components/UserAccount';
import { SubscriptionPlans } from './components/SubscriptionPlans';
import { CreditPurchaseModal } from './components/CreditPurchaseModal'; // New Import
import { AdminPanel } from './components/AdminPanel';
import { cloudStore } from './services/cloudStore';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_USER: UserProfile = {
  id: 'user_' + Math.random().toString(36).substr(2, 9),
  name: '',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  bio: 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
  level: 1,
  xp: 0,
  joinedDate: new Date().toLocaleDateString(),
  tier: 'Free',
  isPremium: false,
  isVIP: false,
  isAdmin: false, 
  // Initial Wallet State
  credits: 5, // Bonus starter credits
  unlockedContentIds: [],
  subscriptionExpiry: undefined,
  stats: {
    messagesSent: 0,
    hoursChatted: 0,
    companionsMet: 0
  }
};

const PROFILE_CATEGORIES = ['All', 'Sweet', 'Romantic', 'Flirty', 'Sexy', 'Horny', 'Wife'];

// Helper to prevent crash on bad JSON
// Fixed: Added trailing comma to generic type T to support arrow function in TSX
const safeJsonParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Failed to parse ${key} from localStorage, using fallback.`, error);
    return fallback;
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>(() => {
    return (localStorage.getItem('priyo_current_view') as View) || 'landing';
  });
  
  const [profiles, setProfiles] = useState<GirlfriendProfile[]>(() => {
    return safeJsonParse('priyo_dynamic_profiles', INITIAL_PROFILES);
  });

  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(() => {
    return safeJsonParse('priyo_chat_histories', {});
  });

  const [selectedProfile, setSelectedProfile] = useState<GirlfriendProfile | null>(() => {
    const savedId = localStorage.getItem('priyo_selected_profile_id');
    // We need to access the current 'profiles' state here, but in initializer we use the logic directly
    const savedProfiles = safeJsonParse('priyo_dynamic_profiles', INITIAL_PROFILES);
    return savedProfiles.find((p: GirlfriendProfile) => p.id === savedId) || null;
  });

  const [activeCategory, setActiveCategory] = useState('All');

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('priyo_is_logged_in') === 'true');
  const [hasConfirmedAge, setHasConfirmedAge] = useState(() => localStorage.getItem('priyo_age_confirmed') === 'true');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false); 
  const [showNameModal, setShowNameModal] = useState(false); 
  const [tempNameInput, setTempNameInput] = useState(''); 

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeJsonParse('priyo_user_profile', DEFAULT_USER);
  });

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    return safeJsonParse('priyo_payment_requests', []);
  });

  const [referrals, setReferrals] = useState<ReferralProfile[]>(() => {
    return safeJsonParse('priyo_referrals', []);
  });

  const [referralTransactions, setReferralTransactions] = useState<ReferralTransaction[]>(() => {
    return safeJsonParse('priyo_referral_txs', []);
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('priyo_voice_enabled') !== 'false');

  // Firebase Auth State Listener & Cloud Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Auto-login logic for browser session
        if (!isLoggedIn) {
           const isAdminUser = user.email === 'admin@priyo.com';
           const savedName = localStorage.getItem('priyo_user_name') || user.displayName || '';
           
           setUserProfile(prev => ({ 
             ...prev, 
             id: user.uid, 
             name: savedName || prev.name, 
             avatar: user.photoURL || prev.avatar, 
             isAdmin: isAdminUser 
           }));
           
           setIsLoggedIn(true);
           // Don't show modal on auto-login if name exists
           if (!savedName) {
             setTempNameInput(user.displayName || '');
             setShowNameModal(true);
           }
        }

        setIsLoadingCloud(true);
        // Load cloud profiles only when user is authenticated
        const cloudProfiles = await cloudStore.loadProfiles();
        if (cloudProfiles && cloudProfiles.length > 0) {
          setProfiles(cloudProfiles);
          localStorage.setItem('priyo_dynamic_profiles', JSON.stringify(cloudProfiles));
        }
        setIsLoadingCloud(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cloud Sync Effect - Save on Change (ONLY IF ADMIN)
  useEffect(() => {
    localStorage.setItem('priyo_dynamic_profiles', JSON.stringify(profiles));
    // Only attempt to save to cloud if logged in AND user is admin
    if (profiles.length > 0 && isLoggedIn && userProfile.isAdmin) {
       cloudStore.saveProfiles(profiles);
    }
  }, [profiles, isLoggedIn, userProfile.isAdmin]);

  useEffect(() => localStorage.setItem('priyo_user_profile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('priyo_chat_histories', JSON.stringify(chatHistories)), [chatHistories]);
  useEffect(() => localStorage.setItem('priyo_payment_requests', JSON.stringify(paymentRequests)), [paymentRequests]);
  useEffect(() => localStorage.setItem('priyo_referrals', JSON.stringify(referrals)), [referrals]);
  useEffect(() => localStorage.setItem('priyo_referral_txs', JSON.stringify(referralTransactions)), [referralTransactions]);
  useEffect(() => localStorage.setItem('priyo_voice_enabled', String(voiceEnabled)), [voiceEnabled]);
  useEffect(() => localStorage.setItem('priyo_is_logged_in', String(isLoggedIn)), [isLoggedIn]);
  useEffect(() => localStorage.setItem('priyo_age_confirmed', String(hasConfirmedAge)), [hasConfirmedAge]);
  useEffect(() => localStorage.setItem('priyo_current_view', view), [view]);
  useEffect(() => {
    if (selectedProfile) localStorage.setItem('priyo_selected_profile_id', selectedProfile.id);
  }, [selectedProfile]);

  const handleStartClick = () => {
    if (!isLoggedIn) setView('auth');
    else if (!hasConfirmedAge) setView('age-verification');
    else setView('profile-selection');
  };

  const handleLoginSuccess = (user: { name: string; email?: string; avatar?: string; uid?: string }) => {
    const isAdminUser = user.name === 'Admin' || user.email === 'admin@priyo.com'; 
    
    // Update user profile immediately with Google data
    setUserProfile(prev => ({ 
      ...prev, 
      name: user.name || prev.name,
      avatar: user.avatar || prev.avatar,
      id: user.uid || prev.id,
      isAdmin: isAdminUser
    }));

    setIsLoggedIn(true);

    // If it's the admin, we skip the name popup
    if (isAdminUser) {
      setView(hasConfirmedAge ? 'profile-selection' : 'age-verification');
    } else {
      // For regular users, show the Name Input Popup to let them set their preferred nickname
      setTempNameInput(user.name || '');
      setShowNameModal(true);
    }
  };

  const handleNameSubmit = () => {
    const finalName = tempNameInput.trim() || userProfile.name || 'Friend';
    setUserProfile(prev => ({ ...prev, name: finalName }));
    localStorage.setItem('priyo_user_name', finalName);
    
    setShowNameModal(false);
    setView(hasConfirmedAge ? 'profile-selection' : 'age-verification');
  };

  const handleAgeConfirm = () => {
    setHasConfirmedAge(true);
    setView('profile-selection');
  };

  const handleProfileSelect = (profile: GirlfriendProfile) => {
    const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === userProfile.tier);
    const companionsChatted = Object.keys(chatHistories).length;
    const limit = currentPlan?.profileLimit || 0;

    if (userProfile.tier !== 'Free' && companionsChatted >= limit && !chatHistories[profile.id]) {
      alert(`আপনার বর্তমান প্যাকেজে আপনি সর্বোচ্চ ${limit}টি প্রোফাইলের সাথে চ্যাট করতে পারবেন। আরও প্রোফাইল আনলক করতে প্যাকেজ আপগ্রেড করুন।`);
      setView('subscription');
      return;
    }

    setSelectedProfile(profile);
    setView('profile-detail');
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setHasConfirmedAge(false);
    setUserProfile(DEFAULT_USER);
    setSelectedProfile(null);
    setProfiles(INITIAL_PROFILES);
    setChatHistories({});
    setView('landing');
    auth.signOut(); // Sign out from Firebase
  };

  const handlePaymentSubmit = (request: Omit<PaymentRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userName'>) => {
    const newRequest: PaymentRequest = {
      ...request,
      id: 'REQ_' + Math.random().toString(36).substr(2, 9),
      userId: userProfile.id,
      userName: userProfile.name,
      status: 'pending',
      timestamp: new Date().toLocaleString()
    };
    setPaymentRequests([newRequest, ...paymentRequests]);
  };

  const updateChatHistory = (profileId: string, messages: Message[]) => {
    setChatHistories(prev => ({ ...prev, [profileId]: messages }));
    setUserProfile(prev => ({
      ...prev,
      stats: { ...prev.stats, messagesSent: prev.stats.messagesSent + 1 }
    }));
  };

  // Exclusive Content Logic
  const handleUnlockContent = (contentId: string, cost: number): boolean => {
    if (userProfile.credits >= cost) {
      setUserProfile(prev => ({
        ...prev,
        credits: prev.credits - cost,
        unlockedContentIds: [...prev.unlockedContentIds, contentId]
      }));
      return true;
    }
    return false;
  };

  // Filter Logic
  const filteredProfiles = profiles.filter(profile => {
    if (activeCategory === 'All') return true;
    return profile.personality.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    // UPDATED BACKGROUND: Sexy, Deep Gradient (Indigo -> Purple -> Black)
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 font-['Hind_Siliguri'] overflow-x-hidden relative text-white">
      
      {/* Global Ambience: Floating Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        <Sidebar 
          isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}
          currentView={view} setView={setView} userProfile={userProfile}
          setUserProfile={setUserProfile} voiceEnabled={voiceEnabled}
          setVoiceEnabled={setVoiceEnabled} onLogout={handleLogout}
        />

        {view === 'landing' && (
          <main className="relative flex flex-col items-center justify-center min-h-screen p-6 text-center overflow-hidden">
            <div className="absolute top-0 -left-4 w-96 h-96 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            
            <div className="relative z-10 max-w-4xl">
              <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter drop-shadow-2xl">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-purple-500 animate-gradient">প্রিয় (Priyo)</span>
              </h1>
              <p className="text-xl md:text-2xl text-pink-100/80 font-medium mb-12 drop-shadow-md">{APP_CONFIG.tagline}</p>
              <button onClick={handleStartClick} className="bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 text-white px-16 py-7 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-pink-600/30 transition-all hover:scale-105 active:scale-95 border border-white/10 hover:border-white/30">প্রবেশ করুন</button>
            </div>
          </main>
        )}

        {view === 'auth' && (
          <AuthScreen 
            onLoginSuccess={handleLoginSuccess} 
            onBack={() => setView('landing')} 
            onAdminClick={() => setView('admin-panel')} 
          />
        )}
        
        {view === 'age-verification' && <AgeVerificationScreen onConfirm={handleAgeConfirm} onBack={() => setView('auth')} />}
        
        {view === 'profile-selection' && (
          <main className="p-6 md:p-12 max-w-7xl mx-auto min-h-screen">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <button onClick={() => setIsSidebarOpen(true)} className="p-4 glass rounded-2xl text-white border border-white/10 hover:bg-white/10"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 mb-2">আপনার সঙ্গী</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-pink-200/60">কাকে আপনার মন ভালো করার দায়িত্ব দিবেন?</p>
                    {isLoadingCloud && <span className="text-pink-500 text-xs font-black animate-pulse">[Syncing...]</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Credit Wallet Pill (Desktop/Tablet) */}
                <div 
                  onClick={() => setShowCreditModal(true)} 
                  className="hidden sm:flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-yellow-500/20 px-4 py-3 rounded-2xl cursor-pointer hover:border-yellow-500/50 transition-all shadow-lg"
                >
                  <div className="h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black shadow-lg">C</div>
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Credits</span>
                      <span className="text-lg font-black text-white">{userProfile.credits}</span>
                  </div>
                </div>
                
                <button onClick={() => setView('subscription')} className="glass px-6 py-3 rounded-2xl border-yellow-500/20 text-yellow-100/70 hover:text-white flex items-center gap-2 group hover:bg-white/5 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1z" /></svg>
                  <span className="font-black text-sm uppercase tracking-widest">{userProfile.tier === 'Free' ? 'Upgrade' : userProfile.tier}</span>
                </button>
                {userProfile.isVIP && (
                  <div className="bg-gradient-to-r from-yellow-600 to-amber-400 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg animate-pulse">VIP Member</div>
                )}
              </div>
            </header>

            {/* Filter Bar */}
            <div className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide">
              {PROFILE_CATEGORIES.map(category => (
                <button 
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                    activeCategory === category 
                      ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg border-transparent' 
                      : 'glass border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map(profile => (
                  <ProfileCard key={profile.id} profile={profile} onSelect={handleProfileSelect} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center glass rounded-[2.5rem] border-white/5 bg-black/20">
                  <p className="text-gray-500 font-black text-xl">এই ক্যাটাগরিতে কোনো প্রোফাইল পাওয়া যায়নি</p>
                  <button onClick={() => setActiveCategory('All')} className="mt-4 text-pink-500 uppercase font-black text-xs tracking-widest hover:underline">Reset Filters</button>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Modals & Sub-views */}
        
        {/* Name Input Modal (Triggered after Login) */}
        {showNameModal && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
             <div className="max-w-md w-full glass p-10 rounded-[3rem] border-white/10 bg-black/40 text-center relative">
                <div className="mb-8">
                   <div className="h-20 w-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)] mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h2 className="text-3xl font-black text-white mb-2">তোমায় কি নামে ডাকবো?</h2>
                   <p className="text-gray-400 text-sm">তোমার পছন্দের একটি নাম বা ডাকনাম দাও</p>
                </div>
                
                <input 
                  type="text" 
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  placeholder="নাম লিখুন..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 text-center text-xl font-black text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all placeholder:text-gray-600 mb-8"
                  autoFocus
                />
                
                <button 
                  onClick={handleNameSubmit}
                  className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-[2rem] font-black text-white text-lg shadow-2xl shadow-pink-600/30 hover:scale-105 active:scale-95 transition-all"
                >
                  ঠিক আছে
                </button>
             </div>
          </div>
        )}

        {showCreditModal && <CreditPurchaseModal onClose={() => setShowCreditModal(false)} onSubmit={handlePaymentSubmit} />}

        {view === 'subscription' && <SubscriptionPlans userTier={userProfile.tier} referrals={referrals} onBack={() => setView(selectedProfile ? 'profile-detail' : 'profile-selection')} onSubmitPayment={handlePaymentSubmit} pendingRequest={paymentRequests.find(r => r.userId === userProfile.id && r.status === 'pending')} />}
        
        {view === 'admin-panel' && (
          <AdminPanel 
            paymentRequests={paymentRequests} setPaymentRequests={setPaymentRequests} 
            userProfile={userProfile} setUserProfile={setUserProfile} 
            profiles={profiles} setProfiles={setProfiles} 
            referrals={referrals} setReferrals={setReferrals}
            referralTransactions={referralTransactions} setReferralTransactions={setReferralTransactions}
            onBack={() => setView('profile-selection')} 
          />
        )}
        
        {view === 'profile-detail' && selectedProfile && (
          <ProfileDetail 
            profile={selectedProfile} 
            userProfile={userProfile}
            onBack={() => setView('profile-selection')} 
            onStartChat={() => setView('chat')}
            onUnlockContent={handleUnlockContent}
            onPurchaseCredits={setShowCreditModal}
            onShowSubscription={() => setView('subscription')}
          />
        )}

        {view === 'account' && (
          <UserAccount 
            userProfile={userProfile} 
            setUserProfile={setUserProfile} 
            onBack={() => setView('profile-selection')}
            chatHistories={chatHistories}
            profiles={profiles}
            onSelectProfile={handleProfileSelect}
            onPurchaseCredits={() => setShowCreditModal(true)}
          />
        )}
        
        {view === 'chat' && selectedProfile && (
          <ChatInterface 
            profile={selectedProfile} onBack={() => setView('profile-detail')} onMenuOpen={() => setIsSidebarOpen(true)}
            userName={userProfile.name} isPremium={userProfile.isPremium} userTier={userProfile.tier} onUpgrade={() => setView('subscription')}
            history={chatHistories[selectedProfile.id] || []} onSaveHistory={(msgs) => updateChatHistory(selectedProfile.id, msgs)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
