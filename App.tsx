
import React, { useState, useEffect } from 'react';
import { Layout3D, Card3D, Button3D } from './components/Layout3D';
import { PurchasePopup } from './components/PurchasePopup';
import { UserProfile, ViewState, Model, Purchase, PaymentRequest } from './types';
import { cloudStore } from './services/cloudStore';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { PACKAGES, CREDIT_PACKAGES } from './constants';
import { gemini } from './services/geminiService';
import { AuthScreen } from './components/AuthScreen';
import { ProfileDetail } from './components/ProfileDetail';
import { ChatInterface } from './components/ChatInterface';
import { SubscriptionPlans } from './components/SubscriptionPlans';
import { UserAccount } from './components/UserAccount';
import { AdminPanel } from './components/AdminPanel';
import { CreditPurchaseModal } from './components/CreditPurchaseModal';

// --- SUB-COMPONENTS ---

const Landing = ({ onLogin }: any) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 mb-2 drop-shadow-sm relative z-10 transform hover:scale-105 transition-transform duration-500 py-6 leading-relaxed">
      প্রিয়
    </h1>
    <p className="text-2xl md:text-3xl text-slate-600 mb-12 font-medium max-w-2xl leading-relaxed relative z-10">
      মন খুলে কথা বলার একজন <span className="text-pink-600 font-bold">আপন মানুষ</span>
    </p>
    <div className="flex flex-col gap-4 relative z-10 w-full max-w-xs">
      <Button3D onClick={onLogin} variant="primary" className="py-5 text-xl shadow-xl shadow-pink-500/20">
        প্রবেশ করুন
      </Button3D>
    </div>
  </div>
);

const Dashboard = ({ models, unlockedModels, setView, onSelectModel, userCredits, packageId }: any) => {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col justify-center">
       
       <div className="flex justify-between items-center mb-12 relative z-10 px-2 mt-16">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
              সঙ্গী <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">বেছে নিন</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-medium mt-2">কার সাথে আজ রাতটা কাটাতে চান? ❤️</p>
          </div>
          <div onClick={() => setView('account')} className="cursor-pointer bg-slate-900 px-6 py-4 rounded-[2rem] shadow-2xl border border-slate-800 active:scale-95 transition-all hover:bg-black group">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-yellow-500/20">C</div>
                <div className="flex flex-col">
                    <span className="text-white font-black text-lg leading-none">{userCredits}</span>
                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">+ ADD CREDITS</span>
                </div>
             </div>
          </div>
       </div>

       {models.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-white/50 relative z-10">
             <p className="text-slate-400 font-bold">No models found. Check back later!</p>
          </div>
       ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10 pb-20">
              {models.filter((m: any) => m.active !== false).map((model: Model, idx: number) => {
                const safeUnlocked = unlockedModels || [];
                const isVIP = packageId === 'package3';
                const isUnlocked = isVIP || safeUnlocked.includes(model.id); 
                
                const cardThemes = [
                    { bgGradient: 'from-[#ff5ac0] to-[#6830f2]', btnGradient: 'from-pink-500 to-rose-600' }, 
                    { bgGradient: 'from-[#ff0f7b] to-[#f89b29]', btnGradient: 'from-orange-500 to-pink-600' }, 
                    { bgGradient: 'from-[#f40076] to-[#9055ff]', btnGradient: 'from-purple-500 to-pink-500' },
                    { bgGradient: 'from-[#fa709a] to-[#fee140]', btnGradient: 'from-rose-400 to-orange-400' },
                ];
                const theme = cardThemes[idx % cardThemes.length];
                const isSexy = model.mode === 'Sexy';

                return (
                  <div key={model.id} onClick={() => onSelectModel(model)} className="relative group cursor-pointer">
                    <div className="relative w-full aspect-[9/16] rounded-[2.5rem] p-[3px] bg-white border border-white/60 transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 shadow-2xl">
                        <div className="w-full h-full bg-slate-50 rounded-[2.3rem] flex flex-col relative overflow-hidden">
                            <div className="h-[70%] w-full relative p-1">
                                <img src={model.image || model.avatarImage} className="w-full h-full object-cover rounded-[2rem]" alt={model.name} />
                                <div className={`absolute top-4 right-4 ${isSexy ? 'bg-red-600' : 'bg-green-500'} px-3 py-1 rounded-full text-[10px] font-black text-white uppercase`}>
                                    {model.mode || 'Girlfriend'}
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col items-center justify-between text-center">
                                <div className={`bg-gradient-to-r ${theme.bgGradient} px-6 py-1 rounded-full -mt-8 relative z-10 shadow-lg`}>
                                    <h3 className="text-lg font-black text-white">{model.name}</h3>
                                </div>
                                <p className="text-xs text-slate-500 font-medium italic mt-2 line-clamp-2">"{model.intro}"</p>
                                <button className={`w-full py-3 rounded-2xl bg-gradient-to-r ${theme.btnGradient} text-white font-black text-xs uppercase tracking-widest mt-2`}>
                                    {isUnlocked ? 'চলো শুরু করি 💬' : 'আনলক মি 🔓'}
                                </button>
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
          </div>
       )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await cloudStore.initializeUser(fbUser.uid, fbUser.email!, fbUser.displayName!, fbUser.photoURL!);
        setUser(profile);
        if (view === 'landing' || view === 'auth') setView('dashboard');
        const ms = await cloudStore.getModels();
        setModels(ms);
      } else {
        setUser(null);
        if (view !== 'auth' && view !== 'admin-panel') setView('landing');
      }
    });
    return () => unsub();
  }, [view]);

  const handlePaymentSubmission = async (req: any) => {
    if (!user) return;
    
    const purchase: any = {
       id: `pur_${Date.now()}`,
       uid: user.uid,
       userName: user.name || user.email || 'Anonymous User',
       type: req.type,
       amount: Number(req.amount) || 0,
       status: 'pending',
       paymentMethod: 'bkash',
       bkashNumber: req.bkashNumber || '',
       transactionId: req.trxId || '',
       createdAt: new Date().toISOString(),
    };

    if (req.tier) {
      purchase.tier = req.tier;
      purchase.itemId = req.tier;
    } else if (req.creditPackageId) {
      purchase.creditPackageId = req.creditPackageId;
      purchase.itemId = req.creditPackageId;
    } else {
      purchase.itemId = 'generic_item';
    }

    if (req.referralCodeUsed) {
      purchase.referralCodeUsed = req.referralCodeUsed;
    }

    try {
      await cloudStore.createPurchase(purchase as Purchase);
      setShowCreditModal(false);
      setShowSuccessPopup(true);
      setView('dashboard');
    } catch (error) {
      console.error("Firestore Save Error:", error);
      alert("পেমেন্ট রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।");
    }
  };

  const handleModelSelect = (m: Model) => {
    setSelectedModel(m);
    setView('model-view');
  };

  const handleUnlockModel = async (modelId: string): Promise<boolean> => {
     if (!user) return false;

     // VIP (Package-3) users have instant access to everything
     if (user.packageId === 'package3' || user.tier === 'VIP') {
        return true;
     }

     if (user.status !== 'active') {
       if (confirm(`চ্যাট শুরু করতে একটি প্যাকেজ সাবস্ক্রাইব করুন।`)) setView('subscription');
       return false;
     }

     const result = await cloudStore.unlockModelSlot(user.uid, modelId);
     if (result.success) {
        setUser({ ...user, unlockedModels: [...(user.unlockedModels || []), modelId] });
        return true;
     } else {
        alert("লিমিট শেষ! আরও মডেল আনলক করতে প্যাকেজ আপগ্রেড করুন।");
        setView('subscription');
        return false;
     }
  };

  const handleUnlockContent = async (contentId: string, cost: number): Promise<boolean> => {
      if (!user) return false;
      if (user.credits < cost) return false;
      try {
          await cloudStore.unlockContent(user.uid, contentId, cost);
          setUser({
              ...user,
              credits: user.credits - cost,
              unlockedContent: [...(user.unlockedContent || []), contentId],
              unlockedContentIds: [...(user.unlockedContentIds || []), contentId]
          });
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  return (
    <Layout3D view={view}>
       {user && view !== 'admin-panel' && view !== 'chat' && (
         <div className="fixed top-0 left-0 w-full z-50 p-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto flex gap-3">
               {view !== 'dashboard' && (
                   <button onClick={() => setView('dashboard')} className="glass px-4 py-2 rounded-full text-xs font-black uppercase shadow-lg text-current hover:bg-white/20 transition-all">Home</button>
               )}
               {user.role === 'admin' && <button onClick={() => setView('admin-panel')} className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase shadow-lg">Admin</button>}
            </div>
            <div className="pointer-events-auto flex items-center gap-3">
               {view !== 'dashboard' && view !== 'account' && (
                   <div onClick={() => setShowCreditModal(true)} className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black border border-yellow-300 px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all">
                      <span className="font-black text-[10px]">C</span>
                      <span className="font-black text-sm">{user.credits}</span>
                      <span className="text-[8px] bg-black/10 px-1 py-0.5 rounded font-black tracking-widest">+ ADD</span>
                   </div>
               )}
               <img onClick={() => setView('account')} src={user.photoURL} className="w-10 h-10 rounded-full border-2 border-pink-500 cursor-pointer shadow-md bg-white hover:scale-110 transition-all" />
            </div>
         </div>
       )}

       {view === 'landing' && <Landing onLogin={() => setView('auth')} />}
       {view === 'auth' && <AuthScreen onBack={() => setView('landing')} onAdminClick={() => setView('admin-panel')} />}
       
       {view === 'dashboard' && user && (
         <Dashboard 
            models={models} 
            unlockedModels={user.unlockedModels || []} 
            setView={setView} 
            onSelectModel={handleModelSelect}
            userCredits={user.credits}
            packageId={user.packageId}
         />
       )}

       {view === 'model-view' && selectedModel && user && (
         <div className="pt-20">
            <ProfileDetail
              profile={selectedModel}
              userProfile={user}
              onBack={() => setView('dashboard')}
              onStartChat={() => setView('chat')}
              onUnlockModel={handleUnlockModel} 
              onUnlockContent={handleUnlockContent}
              onPurchaseCredits={() => setShowCreditModal(true)}
              onShowSubscription={() => setView('subscription')}
            />
         </div>
       )}

       {view === 'chat' && selectedModel && user && (
         <div className="h-screen w-full">
            <ChatInterface
              profile={selectedModel}
              onBack={() => setView('model-view')}
              onMenuOpen={() => {}}
              userName={user.name}
              isPremium={user.isPremium || false}
              userTier={user.tier || 'Free'}
              onUpgrade={() => setView('subscription')}
              history={chatHistory}
              onSaveHistory={setChatHistory}
              userCredits={user.credits}
              onPurchaseCredits={() => setShowCreditModal(true)}
              onUnlockContent={handleUnlockContent}
              unlockedContentIds={user.unlockedContentIds || []}
            />
         </div>
       )}

       {view === 'account' && user && (
         <UserAccount
           userProfile={user}
           setUserProfile={setUser}
           onBack={() => setView('dashboard')}
           onUpgrade={() => setView('subscription')}
           chatHistories={{}}
           profiles={models}
           onSelectProfile={handleModelSelect}
           onPurchaseCredits={() => setShowCreditModal(true)}
           onLogout={() => signOut(auth)}
         />
       )}

       {view === 'subscription' && user && (
         <SubscriptionPlans userTier={user.tier || 'Free'} onBack={() => setView('dashboard')} onSubmitPayment={handlePaymentSubmission} />
       )}

       {view === 'admin-panel' && (
          <AdminPanel 
            paymentRequests={paymentRequests} setPaymentRequests={setPaymentRequests} 
            profiles={models} setProfiles={setModels} userProfile={user} setUserProfile={setUser}
            onBack={() => setView(user ? 'dashboard' : 'landing')} isPreAuthorized={user?.role === 'admin'}
          />
       )}

       {showCreditModal && (
         <CreditPurchaseModal 
            onClose={() => setShowCreditModal(false)}
            onSubmit={(req) => handlePaymentSubmission({ ...req, type: 'credits' })}
         />
       )}

       {showSuccessPopup && <PurchasePopup onClose={() => setShowSuccessPopup(false)} />}

    </Layout3D>
  );
};

// Added missing default export
export default App;
