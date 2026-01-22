
import React, { useState, useEffect } from 'react';
import { View, GirlfriendProfile, UserProfile, PaymentRequest, Message, ReferralProfile, ReferralTransaction } from './types';
import { PROFILES as INITIAL_PROFILES, APP_CONFIG, SUBSCRIPTION_PLANS } from './constants';
import { ProfileCard } from './components/ProfileCard';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { AuthScreen } from './components/AuthScreen';
import { ProfileDetail } from './components/ProfileDetail';
import { AgeVerificationScreen } from './components/AgeVerificationScreen';
import { UserAccount } from './components/UserAccount';
import { SubscriptionPlans } from './components/SubscriptionPlans';
import { CreditPurchaseModal } from './components/CreditPurchaseModal';
import { AdminPanel } from './components/AdminPanel';
import { cloudStore } from './services/cloudStore';
import { supabase } from './services/supabase'; // Import supabase

const DEFAULT_USER: UserProfile = {
  id: 'guest',
  name: '',
  email: '', // Ensure email is initialized as an empty string
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  bio: 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
  level: 1, xp: 0, joinedDate: new Date().toLocaleDateString(),
  tier: 'Free', isPremium: false, isVIP: false, isAdmin: false,
  credits: 5, unlockedContentIds: [],
  stats: { messagesSent: 0, hoursChatted: 0, companionsMet: 0 }
};

// Helper to prevent crash on bad JSON - MOVED OUTSIDE COMPONENT
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
    // Attempt to load view from localStorage, fallback to 'landing'
    return (localStorage.getItem('priyo_current_view') as View) || 'landing';
  });
  
  const [profiles, setProfiles] = useState<GirlfriendProfile[]>(() => {
    // Attempt to load profiles from localStorage, fallback to INITIAL_PROFILES
    return safeJsonParse('priyo_dynamic_profiles', INITIAL_PROFILES);
  });

  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(() => {
    return safeJsonParse('priyo_chat_histories', {});
  });

  const [selectedProfile, setSelectedProfile] = useState<GirlfriendProfile | null>(() => {
    const savedId = localStorage.getItem('priyo_selected_profile_id');
    const savedProfiles = safeJsonParse('priyo_dynamic_profiles', INITIAL_PROFILES);
    return savedProfiles.find((p: GirlfriendProfile) => p.id === savedId) || null;
  });

  const [activeCategory, setActiveCategory] = useState('All'); // Added activeCategory state
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('priyo_is_logged_in') === 'true');
  const [hasConfirmedAge, setHasConfirmedAge] = useState(() => localStorage.getItem('priyo_age_confirmed') === 'true');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false); 
  const [showNameModal, setShowNameModal] = useState(false); 
  const [tempNameInput, setTempNameInput] = useState(''); 

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    // Load initial user profile from localStorage or use default
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

  // Supabase Auth Listener & Cloud Data Loading
  useEffect(() => {
    if (!supabase) {
      console.error("Supabase client not initialized.");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoadingCloud(true);
      if (session?.user) {
        const isAdminUser = session.user.email === 'admin@priyo.com';

        // 1. Fetch Latest Profile Data from Supabase 'profiles' table
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          let currentUser: UserProfile;

          if (profileData && !error) {
             currentUser = { 
               id: session.user.id, 
               name: profileData.name || session.user.user_metadata?.name || '',
               email: session.user.email || '',
               avatar: profileData.avatar || session.user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (profileData.name || 'User'),
               bio: profileData.bio || 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
               level: profileData.level || 1, 
               xp: profileData.xp || 0, 
               joinedDate: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
               tier: profileData.tier || 'Free',
               isPremium: profileData.is_premium || false,
               isVIP: profileData.is_vip || false,
               isAdmin: profileData.is_admin || isAdminUser,
               credits: profileData.credits || 0,
               unlockedContentIds: profileData.unlocked_content_ids || [],
               subscriptionExpiry: profileData.subscription_expiry,
               stats: {
                 messagesSent: profileData.messages_sent || 0,
                 hoursChatted: profileData.hours_chatted || 0,
                 companionsMet: profileData.companions_met || 0
               }
             };
             if (profileData.name) localStorage.setItem('priyo_user_name', profileData.name);
          } else if (error && error.code === 'PGRST116') { // No rows found
            console.log("No profile found for this user, creating default.");
            // Create a default profile if not exists (should be handled on signup, but as fallback)
            currentUser = {
              id: session.user.id,
              name: session.user.user_metadata?.name || '',
              email: session.user.email || '',
              avatar: session.user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (session.user.user_metadata?.name || 'User'),
              bio: 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
              level: 1, xp: 0, joinedDate: new Date().toLocaleDateString(),
              tier: 'Free', isPremium: false, isVIP: false, isAdmin: isAdminUser,
              credits: 5, unlockedContentIds: [],
              stats: { messagesSent: 0, hoursChatted: 0, companionsMet: 0 }
            };
            const { error: insertError } = await supabase.from('profiles').insert([currentUser]);
            if (insertError) console.error("Fallback profile insert error:", insertError);
          } else if (error) {
            console.error("Error fetching user profile:", error);
            currentUser = DEFAULT_USER; // Fallback to default user
          } else {
            currentUser = DEFAULT_USER; // Fallback in case of unexpected path
          }
          
          setUserProfile(currentUser);
          setIsLoggedIn(true);

          // Determine navigation after user profile is fully loaded
          if (currentUser.isAdmin) {
            setView('profile-selection'); // Admin goes directly to selection view
          } else if (!currentUser.name) {
             setShowNameModal(true);
             setView('profile-selection'); // Show name modal over profile selection
          } else if (!hasConfirmedAge) {
             setView('age-verification');
          } else {
             setView('profile-selection');
          }

        } catch(e) {
          console.error("Unexpected error during profile fetch or navigation:", e);
          setIsLoggedIn(false);
          setUserProfile(DEFAULT_USER);
          setView('landing');
        }

        // 2. Load Cloud Data (Profiles & Payment Requests from Supabase app_data)
        const cloudProfiles = await cloudStore.loadProfiles();
        if (cloudProfiles && cloudProfiles.length > 0) {
          setProfiles(cloudProfiles);
        }

        const cloudRequests = await cloudStore.loadPaymentRequests();
        if (cloudRequests) {
           setPaymentRequests(cloudRequests);
        }

        // 3. Load Referral Data
        const cloudReferrals = await cloudStore.loadReferrals();
        if (cloudReferrals) {
          setReferrals(cloudReferrals);
        }

        const cloudReferralTransactions = await cloudStore.loadReferralTransactions();
        if (cloudReferralTransactions) {
          setReferralTransactions(cloudReferralTransactions);
        }

      } else { // No user session
        setIsLoggedIn(false);
        setUserProfile(DEFAULT_USER);
        setView('landing'); // Always redirect to landing on logout
      }
      setIsLoadingCloud(false);
    });

    // Dependency array: `hasConfirmedAge` is valid because it affects navigation logic.
    // `view` is removed to prevent unnecessary re-subscriptions and potential navigation loops.
    return () => subscription.unsubscribe();
  }, [hasConfirmedAge]); 

  // Local Storage Sync Effects
  useEffect(() => localStorage.setItem('priyo_user_profile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('priyo_dynamic_profiles', JSON.stringify(profiles)), [profiles]); // Keep syncing local copy
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


  // Poll for User Updates (for general app syncing when admin panel is used by another admin, or data changes elsewhere)
  useEffect(() => {
    if (!isLoggedIn || !userProfile.id) return;
    const interval = setInterval(async () => {
        if (!supabase) return;
        
        const { data: freshProfileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userProfile.id)
            .single();

        if (freshProfileData && !error) {
            // Check if essential profile data has changed
            const isDifferent = 
                freshProfileData.credits !== userProfile.credits || 
                freshProfileData.tier !== userProfile.tier ||
                freshProfileData.is_premium !== userProfile.isPremium ||
                freshProfileData.is_vip !== userProfile.isVIP ||
                freshProfileData.subscription_expiry !== userProfile.subscriptionExpiry ||
                freshProfileData.name !== userProfile.name; // Also check name
            
            if (isDifferent) {
                const updatedUser: UserProfile = {
                    id: freshProfileData.id,
                    name: freshProfileData.name,
                    email: freshProfileData.email || '',
                    avatar: freshProfileData.avatar,
                    bio: freshProfileData.bio,
                    level: freshProfileData.level,
                    xp: freshProfileData.xp,
                    joinedDate: freshProfileData.created_at ? new Date(freshProfileData.created_at).toLocaleDateString() : userProfile.joinedDate,
                    tier: freshProfileData.tier,
                    isPremium: freshProfileData.is_premium,
                    isVIP: freshProfileData.is_vip,
                    isAdmin: freshProfileData.is_admin,
                    credits: freshProfileData.credits,
                    unlockedContentIds: freshProfileData.unlocked_content_ids,
                    subscriptionExpiry: freshProfileData.subscription_expiry,
                    stats: {
                        messagesSent: freshProfileData.messages_sent,
                        hoursChatted: freshProfileData.hours_chatted,
                        companionsMet: freshProfileData.companions_met
                    }
                };
                setUserProfile(updatedUser);
            }
        } else if (error) {
            console.error("Polling user data error:", error);
        }

        // Also Refresh Admin Data if Admin (Payment Requests, Referrals, Referral Transactions)
        if (userProfile.isAdmin) {
            const reqs = await cloudStore.loadPaymentRequests();
            if (reqs) setPaymentRequests(reqs);

            const refs = await cloudStore.loadReferrals();
            if (refs) setReferrals(refs);

            const refTxs = await cloudStore.loadReferralTransactions();
            if (refTxs) setReferralTransactions(refTxs);
        }
    }, 2000); // Check every 2s
    return () => clearInterval(interval);
}, [isLoggedIn, userProfile.id, userProfile.credits, userProfile.tier, userProfile.isPremium, userProfile.isVIP, userProfile.subscriptionExpiry, userProfile.name, userProfile.isAdmin]);


  const handleStartClick = () => {
    if (!isLoggedIn) {
      setView('auth');
    } else {
      // Logic handled by onAuthStateChange listener after login
      // If already logged in, the listener should have set the view correctly
      // We can just ensure we're not on 'landing'
      if (view === 'landing') {
        if (!userProfile.name) {
          setShowNameModal(true);
          setView('profile-selection');
        } else if (!hasConfirmedAge) {
          setView('age-verification');
        } else {
          setView('profile-selection');
        }
      }
    }
  };

  // Removed handleLoginSuccess as AuthScreen no longer uses it
  // and onAuthStateChange is the source of truth for user state and navigation.

  const handleNameSubmit = async () => {
    if (!supabase) return;

    const finalName = tempNameInput.trim();
    if (!finalName) {
      alert("নাম খালি রাখা যাবে না।");
      return;
    }

    const updatedUser = { ...userProfile, name: finalName };
    setUserProfile(updatedUser);
    localStorage.setItem('priyo_user_name', finalName);
    
    // Update name in Supabase profiles
    const { error } = await supabase
      .from('profiles')
      .update({ name: finalName })
      .eq('id', userProfile.id);

    if (error) console.error("Error updating user name:", error);

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

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Clearing localStorage on logout to ensure a fresh state for next login
    localStorage.clear(); 
    setIsLoggedIn(false);
    setHasConfirmedAge(false);
    setUserProfile(DEFAULT_USER);
    setSelectedProfile(null);
    setProfiles(INITIAL_PROFILES); // Reset profiles to initial or fetch from cloud again if needed
    setChatHistories({});
    setView('landing'); // Go to landing page
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
    // Update local state, which triggers localStorage save (and cloudStore if needed)
    const updatedRequests = [newRequest, ...paymentRequests];
    setPaymentRequests(updatedRequests);
    cloudStore.savePaymentRequests(updatedRequests); // Save to Supabase app_data
  };

  const updateChatHistory = (profileId: string, messages: Message[]) => {
    setChatHistories(prev => ({ ...prev, [profileId]: messages }));
    setUserProfile(prev => ({
      ...prev,
      stats: { ...prev.stats, messagesSent: prev.stats.messagesSent + 1 }
    }));
  };

  const handleUnlockContent = async (contentId: string, cost: number): Promise<boolean> => {
    if (!supabase) return false;

    if (userProfile.credits >= cost) {
      const newCredits = userProfile.credits - cost;
      const newUnlocked = [...userProfile.unlockedContentIds, contentId];
      
      // Update credits in DB immediately
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits, unlocked_content_ids: newUnlocked })
        .eq('id', userProfile.id);

      if (error) {
        console.error("Error updating user credits/unlocked content:", error);
        alert("কন্টেন্ট আনলক করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        return false;
      }
      
      const updatedUser = { ...userProfile, credits: newCredits, unlockedContentIds: newUnlocked };
      setUserProfile(updatedUser);
      return true;
    }
    return false;
  };

  const filteredProfiles = profiles.filter(profile => {
    if (activeCategory === 'All') return true;
    // Assuming PersonalityType strings match category names for filtering
    return profile.personality.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 font-['Hind_Siliguri'] overflow-x-hidden relative text-white">
      
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
            // onLoginSuccess is removed as per new auth flow
            onBack={() => setView('landing')} // On back from auth, go to landing
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

            <div className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide">
              {['All', 'Sweet', 'Romantic', 'Flirty', 'Sexy', 'Horny', 'Wife'].map(category => ( // Hardcoded categories for now
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
            setUserProfile={(u) => { setUserProfile(u); /* No direct cloudStore update here, App.tsx's useEffect will handle sync if userProfile.id exists */ }}
            onBack={() => setView('profile-selection')}
            chatHistories={chatHistories}
            profiles={profiles}
            onSelectProfile={handleProfileSelect}
            onPurchaseCredits={() => setShowCreditModal(true)}
            onLogout={handleLogout}
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