
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
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_USER: UserProfile = {
  id: 'guest',
  uid: 'guest',
  name: '',
  email: '',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  bio: 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
  level: 1, xp: 0, joinedDate: new Date().toLocaleDateString(),
  tier: 'Free', isPremium: false, isVIP: false, isAdmin: false,
  role: 'user',
  credits: 0, unlockedContentIds: [],
  stats: { messagesSent: 0, hoursChatted: 0, companionsMet: 0 }
};

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
  
  // Profiles now loaded exclusively from Firestore or seeded from Constants
  const [profiles, setProfiles] = useState<GirlfriendProfile[]>([]);

  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(() => {
    return safeJsonParse('priyo_chat_histories', {});
  });

  const [selectedProfile, setSelectedProfile] = useState<GirlfriendProfile | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [hasConfirmedAge, setHasConfirmedAge] = useState(() => localStorage.getItem('priyo_age_confirmed') === 'true');
  
  const [showCreditModal, setShowCreditModal] = useState(false); 
  const [showNameModal, setShowNameModal] = useState(false); 
  const [tempNameInput, setTempNameInput] = useState(''); 

  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralProfile[]>([]);
  const [referralTransactions, setReferralTransactions] = useState<ReferralTransaction[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('priyo_voice_enabled') !== 'false');

  // --- INITIAL DATA LOAD (Models) ---
  useEffect(() => {
    const loadData = async () => {
      // 1. Load Models from Firestore
      const fetchedProfiles = await cloudStore.loadProfiles();
      if (fetchedProfiles && fetchedProfiles.length > 0) {
        setProfiles(fetchedProfiles);
      } else {
        // Seed initial profiles if Firestore is empty
        console.log("Seeding initial profiles to Firestore...");
        setProfiles(INITIAL_PROFILES);
        for (const p of INITIAL_PROFILES) {
          await cloudStore.saveModel(p);
        }
      }
    };
    loadData();
  }, []);

  // --- AUTHENTICATION LISTENER ---
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      if (user) {
        const isAdminUser = user.email === 'admin@priyo.com';

        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);

          let currentUser: UserProfile;

          if (docSnap.exists()) {
             const profileData = docSnap.data();
             const joinedDate = profileData.createdAt?.toDate ? profileData.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();

             currentUser = { 
               id: user.uid, 
               uid: user.uid,
               name: profileData.displayName || profileData.name || user.displayName || '',
               email: profileData.email || user.email || '',
               avatar: profileData.photoURL || profileData.avatar || user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid,
               bio: profileData.bio || 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
               level: profileData.level || 1, 
               xp: profileData.xp || 0, 
               joinedDate: joinedDate,
               tier: profileData.tier || 'Free',
               isPremium: profileData.is_premium || false,
               isVIP: profileData.is_vip || false,
               isAdmin: profileData.role === 'admin' || isAdminUser,
               role: profileData.role || (isAdminUser ? 'admin' : 'user'),
               credits: profileData.credits || 0,
               unlockedContentIds: profileData.unlocked_content_ids || [],
               subscriptionExpiry: profileData.subscription_expiry,
               stats: {
                 messagesSent: profileData.messages_sent || 0,
                 hoursChatted: profileData.hours_chatted || 0,
                 companionsMet: profileData.companions_met || 0
               }
             };
          } else {
            console.log("Creating new user in Firestore...");
            const now = new Date();
            
            currentUser = {
              id: user.uid,
              uid: user.uid,
              name: user.displayName || '',
              email: user.email || '',
              avatar: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid,
              bio: 'প্রিয়র সাথে আড্ডা দিতে ভালোবাসি।',
              level: 1, xp: 0, joinedDate: now.toLocaleDateString(),
              tier: 'Free', isPremium: false, isVIP: false, 
              isAdmin: isAdminUser,
              role: isAdminUser ? 'admin' : 'user',
              credits: 0, unlockedContentIds: [],
              stats: { messagesSent: 0, hoursChatted: 0, companionsMet: 0 }
            };

            const firestoreData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || currentUser.avatar,
                role: currentUser.role,
                createdAt: serverTimestamp(),
                // App specific fields
                bio: currentUser.bio,
                level: currentUser.level,
                xp: currentUser.xp,
                tier: currentUser.tier,
                is_premium: currentUser.isPremium,
                is_vip: currentUser.isVIP,
                credits: currentUser.credits,
                unlocked_content_ids: currentUser.unlockedContentIds,
                messages_sent: currentUser.stats.messagesSent,
                hours_chatted: currentUser.stats.hoursChatted,
                companions_met: currentUser.stats.companionsMet
            };

            await setDoc(docRef, firestoreData);
          }
          
          setUserProfile(currentUser);
          setIsLoggedIn(true);

          // Handle Redirects based on state
          if (view === 'landing' || view === 'auth') {
             if (currentUser.isAdmin) {
                setView('profile-selection'); // Or admin-panel
             } else if (!currentUser.name) {
                setShowNameModal(true);
                setView('profile-selection');
             } else if (!hasConfirmedAge) {
                setView('age-verification');
             } else {
                setView('profile-selection');
             }
          }

          // Load Admin Data if needed
          if (currentUser.isAdmin) {
             const reqs = await cloudStore.loadPaymentRequests();
             setPaymentRequests(reqs);
          }

        } catch(e) {
          console.error("Auth Error:", e);
          setIsLoggedIn(false);
        } finally {
          setIsAuthLoading(false);
        }

      } else {
        setIsLoggedIn(false);
        setUserProfile(DEFAULT_USER);
        if (view !== 'landing' && view !== 'auth') {
            setView('landing');
        }
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [hasConfirmedAge]); 

  // --- PERSISTENCE HELPERS ---
  useEffect(() => localStorage.setItem('priyo_chat_histories', JSON.stringify(chatHistories)), [chatHistories]);
  useEffect(() => localStorage.setItem('priyo_voice_enabled', String(voiceEnabled)), [voiceEnabled]);
  useEffect(() => localStorage.setItem('priyo_age_confirmed', String(hasConfirmedAge)), [hasConfirmedAge]);
  useEffect(() => localStorage.setItem('priyo_current_view', view), [view]);

  // --- USER DATA POLLING (Live Updates) ---
  useEffect(() => {
    if (!isLoggedIn || !userProfile.uid || !db) return;
    
    // Simple polling to keep credits/tier in sync without complex listeners for now
    const interval = setInterval(async () => {
        try {
            const docRef = doc(db, 'users', userProfile.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Check if critical data changed
                if (data.credits !== userProfile.credits || data.tier !== userProfile.tier || data.is_premium !== userProfile.isPremium) {
                   setUserProfile(prev => ({
                       ...prev,
                       credits: data.credits || 0,
                       tier: data.tier || 'Free',
                       isPremium: data.is_premium || false,
                       isVIP: data.is_vip || false,
                       unlockedContentIds: data.unlocked_content_ids || []
                   }));
                }
            }
        } catch(e) { console.error("Sync error", e); }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, userProfile.uid]);


  // --- HANDLERS ---

  const handleStartClick = () => {
    if (!isLoggedIn) {
      setView('auth');
    } else {
      if (!userProfile.name) setShowNameModal(true);
      else if (!hasConfirmedAge) setView('age-verification');
      else setView('profile-selection');
    }
  };

  const handleNameSubmit = async () => {
    if (!db) return;
    const finalName = tempNameInput.trim();
    if (!finalName) return alert("নাম খালি রাখা যাবে না।");

    const updatedUser = { ...userProfile, name: finalName };
    setUserProfile(updatedUser);
    
    try {
       await updateDoc(doc(db, 'users', userProfile.uid), { displayName: finalName, name: finalName });
    } catch(error) { console.error(error); }

    setShowNameModal(false);
    setView(hasConfirmedAge ? 'profile-selection' : 'age-verification');
  };

  const handleAgeConfirm = () => {
    setHasConfirmedAge(true);
    setView('profile-selection');
  };

  const handleProfileSelect = (profile: GirlfriendProfile) => {
    const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === userProfile.tier);
    const limit = currentPlan?.profileLimit || 0;
    // Just a basic check, can be expanded
    setSelectedProfile(profile);
    setView('profile-detail');
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    localStorage.removeItem('priyo_chat_histories');
    setIsLoggedIn(false);
    setHasConfirmedAge(false);
    setUserProfile(DEFAULT_USER);
    setSelectedProfile(null);
    setView('landing');
  };

  const handlePaymentSubmit = async (request: Omit<PaymentRequest, 'id' | 'status' | 'timestamp' | 'userId' | 'userName'>) => {
    const newRequest: PaymentRequest = {
      ...request,
      id: 'REQ_' + Math.random().toString(36).substr(2, 9),
      userId: userProfile.uid,
      userName: userProfile.name,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Optimistic UI update
    setPaymentRequests(prev => [newRequest, ...prev]);
    
    // Save to Firestore
    await cloudStore.createPaymentRequest(newRequest);
  };

  const updateChatHistory = (profileId: string, messages: Message[]) => {
    setChatHistories(prev => ({ ...prev, [profileId]: messages }));
    // In a real app, you'd save this to Firestore too
  };

  const handleUnlockContent = async (contentId: string, cost: number): Promise<boolean> => {
    if (!db) return false;

    if (userProfile.credits >= cost) {
      const newCredits = userProfile.credits - cost;
      const newUnlocked = [...userProfile.unlockedContentIds, contentId];
      
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), { 
           credits: newCredits, 
           unlocked_content_ids: newUnlocked 
        });

        setUserProfile(prev => ({ ...prev, credits: newCredits, unlockedContentIds: newUnlocked }));
        return true;
      } catch (error) {
        console.error("Unlock error:", error);
        return false;
      }
    }
    return false;
  };

  const filteredProfiles = profiles.filter(profile => {
    if (activeCategory === 'All') return true;
    return profile.personality.toLowerCase().includes(activeCategory.toLowerCase());
  });

  if (isAuthLoading) {
     return (
        <div className="min-h-screen bg-[#0f0518] flex items-center justify-center">
           <div className="animate-spin h-10 w-10 border-4 border-pink-500 border-t-transparent rounded-full"></div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 font-['Hind_Siliguri'] overflow-x-hidden relative text-white">
      
      {/* Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
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
                  <p className="text-pink-200/60">কাকে আপনার মন ভালো করার দায়িত্ব দিবেন?</p>
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
                  <span className="font-black text-sm uppercase tracking-widest">{userProfile.tier === 'Free' ? 'Upgrade' : userProfile.tier}</span>
                </button>
              </div>
            </header>
            
            <div className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide">
              {['All', 'Sweet', 'Romantic', 'Flirty', 'Sexy', 'Horny', 'Wife'].map(category => ( 
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
                  <p className="text-gray-500 font-black text-xl">লোডিং বা কোনো প্রোফাইল নেই...</p>
                </div>
              )}
            </div>
          </main>
        )}

        {showNameModal && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
             <div className="max-w-md w-full glass p-10 rounded-[3rem] border-white/10 bg-black/40 text-center relative">
                <h2 className="text-3xl font-black text-white mb-2">তোমায় কি নামে ডাকবো?</h2>
                <input 
                  type="text" 
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  placeholder="নাম লিখুন..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 text-center text-xl font-black text-white focus:outline-none focus:border-pink-500/50 mb-8 mt-4"
                  autoFocus
                />
                <button 
                  onClick={handleNameSubmit}
                  className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-[2rem] font-black text-white text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  ঠিক আছে
                </button>
             </div>
          </div>
        )}

        {showCreditModal && <CreditPurchaseModal onClose={() => setShowCreditModal(false)} onSubmit={handlePaymentSubmit} />}

        {view === 'subscription' && <SubscriptionPlans userTier={userProfile.tier} referrals={referrals} onBack={() => setView(selectedProfile ? 'profile-detail' : 'profile-selection')} onSubmitPayment={handlePaymentSubmit} pendingRequest={paymentRequests.find(r => r.userId === userProfile.uid && r.status === 'pending')} />}
        
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
            setUserProfile={(u) => setUserProfile(u)}
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
