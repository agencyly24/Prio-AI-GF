
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  PaymentRequest, UserProfile, GirlfriendProfile,
  PersonalityType, ProfileGalleryItem, ReferralProfile, ReferralTransaction
} from '../types';
import { gemini } from '../services/geminiService';
import { cloudStore } from '../services/cloudStore';
import { supabase } from '../services/supabase'; // Import supabase

interface AdminPanelProps {
  paymentRequests: PaymentRequest[];
  setPaymentRequests: React.Dispatch<React.SetStateAction<PaymentRequest[]>>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  profiles: GirlfriendProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<GirlfriendProfile[]>>;
  referrals: ReferralProfile[];
  setReferrals: React.Dispatch<React.SetStateAction<ReferralProfile[]>>;
  referralTransactions: ReferralTransaction[];
  setReferralTransactions: React.SetStateAction<ReferralTransaction[]>;
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  paymentRequests, setPaymentRequests, 
  userProfile, setUserProfile, 
  profiles, setProfiles,
  referrals, setReferrals,
  referralTransactions, setReferralTransactions,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'influencers' | 'models'>('dashboard');
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // --- States for Smart Model Creator ---
  const [isAddingCompanion, setIsAddingCompanion] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isGeneratingExclusive, setIsGeneratingExclusive] = useState(false);
  const [aiTheme, setAiTheme] = useState('');
  const [editingCompanionId, setEditingCompanionId] = useState<string | null>(null);
  const [knowledgeInput, setKnowledgeInput] = useState(''); 
  
  const [mainImageUrlInput, setMainImageUrlInput] = useState('');
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [galleryUrlType, setGalleryUrlType] = useState<'image' | 'video'>('image');
  
  const [exclusiveForm, setExclusiveForm] = useState({ title: '', tease: '', creditCost: '50', isExclusive: false });
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [refForm, setRefForm] = useState({ name: '', couponCode: '', commissionRate: '20', discountAmount: '100', paymentInfo: '' });

  const [compForm, setCompForm] = useState<Partial<GirlfriendProfile>>({
    name: '', age: 21, personality: PersonalityType.Girlfriend, voiceName: 'Kore',
    intro: '', image: '', systemPrompt: '', knowledge: [],
    appearance: { 
      ethnicity: 'বাঙালি', eyeColor: 'কালো', bodyType: 'স্মার্ট', breastSize: 'পারফেক্ট', 
      hairStyle: 'খোলা চুল', hairColor: 'ডার্ক ব্রাউন', outfit: 'টপস ও জিন্স',
    },
    character: { relationship: 'Girlfriend', occupation: 'ছাত্রী', kinks: [] },
    gallery: []
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified passcode for local admin. In real app, this would be supabase auth too.
    if (passcode === 'Mishela') setIsAuthenticated(true); 
    else setPasscode('');
  };

  const stats = useMemo(() => {
    const totalRevenue = paymentRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = paymentRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const totalCommissions = referralTransactions.reduce((sum, t) => sum + t.amount, 0);
    const paidCommissions = referralTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const pendingCommissions = referralTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    return { totalRevenue, pendingRevenue, totalCommissions, paidCommissions, pendingCommissions };
  }, [paymentRequests, referralTransactions]);

  // --- Payment Approval Logic (FIXED & CONNECTED to Supabase) ---
  const handleApprovePayment = async (req: PaymentRequest) => {
    try {
        if (!supabase) throw new Error("Supabase client is not initialized.");
        console.log("Approving payment for user:", req.userId);
        
        // 1. Prepare Update Data for Supabase 'profiles' table
        let updateData: any = {};
        
        // Fetch current profile to get credits
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', req.userId)
          .single();
          
        if (fetchError) console.error("Could not fetch current credits, assuming 0", fetchError);
        
        const currentCredits = currentProfile?.credits || 0;
        let newCredits = currentCredits;

        // Logic for Credits
        if (req.creditPackageId && req.amount) {
           const creditsToAdd = req.amount >= 450 ? 500 : req.amount >= 280 ? 300 : 100;
           newCredits += creditsToAdd;
           updateData.credits = newCredits;
        }

        // Logic for Subscription Tier
        if (req.tier) {
           const expiryDate = new Date();
           expiryDate.setDate(expiryDate.getDate() + 30); // 30 Days validity
           
           updateData.tier = req.tier;
           updateData.is_premium = true;
           updateData.is_vip = req.tier === 'VIP'; // Set is_vip based on tier
           updateData.subscription_expiry = expiryDate.toISOString();
        }

        // 2. Update Supabase Database 'profiles' table
        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', req.userId);

        if (updateError) throw updateError;

        // 3. Update Request Status (Local & CloudStore - which saves to Supabase app_data)
        const updatedRequests = paymentRequests.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
        setPaymentRequests(updatedRequests);
        await cloudStore.savePaymentRequests(updatedRequests);

        // 4. Optionally update the *currently logged-in user's profile state* if they are the one being approved
        if (userProfile.id === req.userId) {
            const { data: updatedUserData, error: userFetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', req.userId)
                .single();
            if (updatedUserData && !userFetchError) {
                // Construct UserProfile from updatedUserData (similar to AuthScreen login success)
                const updatedUserProfile: UserProfile = {
                    id: updatedUserData.id,
                    name: updatedUserData.name || userProfile.name,
                    email: updatedUserData.email || userProfile.email,
                    avatar: updatedUserData.avatar || userProfile.avatar,
                    bio: updatedUserData.bio || userProfile.bio,
                    level: updatedUserData.level || userProfile.level,
                    xp: updatedUserData.xp || userProfile.xp,
                    joinedDate: updatedUserData.created_at ? new Date(updatedUserData.created_at).toLocaleDateString() : userProfile.joinedDate,
                    tier: updatedUserData.tier || userProfile.tier,
                    isPremium: updatedUserData.is_premium || userProfile.isPremium,
                    isVIP: updatedUserData.is_vip || userProfile.isVIP,
                    isAdmin: updatedUserData.is_admin || userProfile.isAdmin,
                    credits: updatedUserData.credits || userProfile.credits,
                    unlockedContentIds: updatedUserData.unlocked_content_ids || userProfile.unlockedContentIds,
                    subscriptionExpiry: updatedUserData.subscription_expiry,
                    stats: {
                        messagesSent: updatedUserData.messages_sent || userProfile.stats.messagesSent,
                        hoursChatted: updatedUserData.hours_chatted || userProfile.stats.hoursChatted,
                        companionsMet: updatedUserData.companions_met || userProfile.stats.companionsMet
                    }
                };
                setUserProfile(updatedUserProfile);
            } else {
                console.error("Failed to re-fetch updated user data for current user:", userFetchError);
            }
        }

        // 5. Handle Referral Commission (If any) - (Remains Local State only for now)
        if (req.referralId) {
          const referral = referrals.find(r => r.id === req.referralId);
          if (referral) {
            const commissionAmount = Math.floor(req.amount * (referral.commissionRate / 100));
            const newTx: ReferralTransaction = {
              id: 'tx_' + Math.random().toString(36).substr(2, 9),
              referralId: req.referralId,
              amount: commissionAmount,
              status: 'pending',
              timestamp: new Date().toLocaleString(),
              note: `Comm. from ${req.userName} (${req.amount}Tk)`
            };
            const updatedTxs = [newTx, ...referralTransactions];
            setReferralTransactions(updatedTxs);
            await cloudStore.saveReferralTransactions(updatedTxs); // Save to cloud
          }
        }

        alert(`✅ Payment Approved successfully!\nUser: ${req.userName}\nPlan: ${req.tier || 'Credits'}`);

    } catch (error: any) {
        console.error("Payment Approval Failed:", error);
        alert(`❌ Error activating package: ${error.message}\nCheck console for details.`);
    }
  };

  const handleRejectPayment = async (id: string) => {
    const updatedRequests = paymentRequests.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r);
    setPaymentRequests(updatedRequests);
    await cloudStore.savePaymentRequests(updatedRequests);
  };

  // --- Model Saving Logic (FIXED PERSISTENCE via cloudStore to Supabase app_data) ---
  const handleSaveCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name || !compForm.image) return alert('Name & Image required');
    
    const newProfile = { 
        ...compForm as GirlfriendProfile, 
        id: editingCompanionId || 'comp_' + Math.random().toString(36).substr(2, 9) 
    };

    let updatedProfiles: GirlfriendProfile[];
    if (editingCompanionId) {
        updatedProfiles = profiles.map(p => p.id === editingCompanionId ? newProfile : p);
    } else {
        updatedProfiles = [...profiles, newProfile];
    }
    
    // Update State
    setProfiles(updatedProfiles);
    
    // Save to Cloud Store (which uses Supabase app_data) immediately
    try {
        await cloudStore.saveProfiles(updatedProfiles);
        alert('✅ Model Profile Saved to Cloud Successfully!');
        
        // Reset form
        setIsAddingCompanion(false);
        setEditingCompanionId(null);
    } catch (err: any) {
        alert('❌ Failed to save to cloud: ' + err.message);
    }
  };

  const handleMagicGenerate = async () => {
    if (!aiTheme.trim()) return alert("Enter a theme first!");
    setIsAiGenerating(true);
    try {
      const generated = await gemini.generateMagicProfile(aiTheme);
      setCompForm(prev => ({ ...prev, ...generated, appearance: { ...prev.appearance, ...generated.appearance }, character: { ...prev.character, ...generated.character }, gallery: prev.gallery || [] }));
    } catch (e) { alert("AI Error"); } finally { setIsAiGenerating(false); }
  };

  const handleGenerateExclusiveMetadata = async () => {
    setIsGeneratingExclusive(true);
    try {
      const context = compForm.name ? `${compForm.name} - ${compForm.personality}` : aiTheme || "Sexy Bangladeshi Girlfriend";
      const result = await gemini.generateExclusiveContentMetadata(context);
      setExclusiveForm(prev => ({ ...prev, title: result.title, tease: result.tease }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingExclusive(false);
    }
  };

  const handleAddKnowledge = () => {
    if (knowledgeInput.trim()) {
      setCompForm(prev => ({ ...prev, knowledge: [...(prev.knowledge || []), knowledgeInput.trim()] }));
      setKnowledgeInput('');
    }
  };

  const handleAddMainImageLink = () => {
    if(!mainImageUrlInput.trim()) return;
    setCompForm(prev => ({ ...prev, image: mainImageUrlInput.trim() }));
    setMainImageUrlInput('');
  };

  const handleAddGalleryLink = () => {
    if (!galleryUrlInput.trim()) return;
    const newItem: ProfileGalleryItem = { 
        id: 'media_' + Math.random().toString(36).substr(2, 9),
        type: galleryUrlType, 
        url: galleryUrlInput.trim(),
        isExclusive: exclusiveForm.isExclusive,
        creditCost: exclusiveForm.isExclusive ? parseInt(exclusiveForm.creditCost) : undefined,
        title: exclusiveForm.isExclusive ? exclusiveForm.title : undefined,
        tease: exclusiveForm.isExclusive ? exclusiveForm.tease : undefined
    };
    setCompForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), newItem] }));
    setGalleryUrlInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'gallery') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (target === 'main') {
      const reader = new FileReader();
      reader.onload = (ev) => setCompForm(prev => ({ ...prev, image: ev.target?.result as string }));
      reader.readAsDataURL(files[0] as Blob);
    } else {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
           const newItem: ProfileGalleryItem = { 
             id: 'media_' + Math.random().toString(36).substr(2, 9),
             type: 'image', 
             url: ev.target?.result as string,
             isExclusive: exclusiveForm.isExclusive,
             creditCost: exclusiveForm.isExclusive ? parseInt(exclusiveForm.creditCost) : undefined,
             title: exclusiveForm.isExclusive ? exclusiveForm.title : undefined,
             tease: exclusiveForm.isExclusive ? exclusiveForm.tease : undefined
           };
           setCompForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), newItem] }));
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refForm.name || !refForm.couponCode) return alert('Name & Coupon Code required');
    const newReferral: ReferralProfile = {
      id: 'ref_' + Math.random().toString(36).substr(2, 9),
      name: refForm.name,
      couponCode: refForm.couponCode.toUpperCase().trim(),
      commissionRate: Number(refForm.commissionRate),
      discountAmount: Number(refForm.discountAmount),
      status: 'active',
      paymentInfo: refForm.paymentInfo
    };
    const updatedReferrals = [...referrals, newReferral];
    setReferrals(updatedReferrals);
    await cloudStore.saveReferrals(updatedReferrals); // Save to cloud
    setRefForm({ name: '', couponCode: '', commissionRate: '20', discountAmount: '100', paymentInfo: '' });
    alert('✅ Referral Profile Created!');
  };

  const handlePayoutCommission = async (txId: string) => {
    if(confirm("Confirm payout sent to influencer?")) {
      const updatedTxs = referralTransactions.map(t => t.id === txId ? { ...t, status: 'paid' } : t);
      setReferralTransactions(updatedTxs);
      await cloudStore.saveReferralTransactions(updatedTxs); // Save to cloud
      alert('✅ Commission marked as paid!');
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0f0518] flex items-center justify-center p-6">
        <div className="max-w-md w-full glass p-12 rounded-[3.5rem] border-white/10 text-center bg-black/40">
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Admin Portal</h2>
          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Passcode" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-black focus:outline-none focus:border-blue-500 transition-colors" />
            <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-white transition-all shadow-lg shadow-blue-600/30">Authorize</button>
          </form>
          <button onClick={onBack} className="mt-8 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Return to App</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0518] text-white flex flex-col md:flex-row animate-in fade-in duration-500">
        <aside className="w-full md:w-64 bg-slate-900/50 border-r border-white/5 flex flex-col p-6 backdrop-blur-md">
           <div className="mb-10 flex items-center gap-3 px-2">
              <span className="font-black text-lg tracking-tight">Priyo Admin</span>
           </div>
           <nav className="space-y-2 flex-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z' },
                { id: 'finance', label: 'Finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1' },
                { id: 'influencers', label: 'Influencers', icon: 'M17 20h2a2 2 0 002-2V7.429a2 2 0 00-.634-1.464L18.428 3.536A2 2 0 0017 3H7a2 2 0 00-1.464.634L3.536 5.999A2 2 0 003 7.429V18a2 2 0 002 2h2m0 0V9a2 2 0 012-2h4a2 2 0 012 2v11m-8-7a2 2 0 11-4 0 2 2 0 014 0z' },
                { id: 'models', label: 'Models', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {item.label}
                </button>
              ))}
           </nav>
           <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest px-4 py-4">Back to App</button>
        </aside>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
           {activeTab === 'dashboard' && (
             <div className="space-y-8 animate-in fade-in">
                <h1 className="text-3xl font-black">Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Total Revenue</p>
                      <h3 className="text-3xl font-black text-green-400">৳{stats.totalRevenue}</h3>
                   </div>
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Pending</p>
                      <h3 className="text-3xl font-black text-yellow-500">৳{stats.pendingRevenue}</h3>
                   </div>
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Models</p>
                      <h3 className="text-3xl font-black text-blue-500">{profiles.length}</h3>
                   </div>
                </div>
                {/* Additional dashboard stats for influencers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Total Commissions</p>
                      <h3 className="text-3xl font-black text-blue-400">৳{stats.totalCommissions}</h3>
                   </div>
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Paid Commissions</p>
                      <h3 className="text-3xl font-black text-green-500">৳{stats.paidCommissions}</h3>
                   </div>
                   <div className="glass p-6 rounded-[2rem] border-white/5 bg-black/20">
                      <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Pending Commissions</p>
                      <h3 className="text-3xl font-black text-orange-500">৳{stats.pendingCommissions}</h3>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'finance' && (
             <div className="space-y-6">
                <h2 className="text-2xl font-black mb-6">Payment Requests</h2>
                {paymentRequests.map(req => (
                  <div key={req.id} className="glass p-6 rounded-3xl flex justify-between items-center border border-white/5 bg-black/20">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-lg">{req.userName}</h4>
                           <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded text-gray-400">{req.tier || 'Credits'}</span>
                        </div>
                        <p className="text-sm text-gray-400 font-mono">TrxID: {req.trxId} • Bkash: {req.bkashNumber}</p>
                        <p className="text-2xl font-black mt-2 text-white">৳{req.amount} <span className="text-xs font-normal text-gray-500">requested</span></p>
                     </div>
                     <div className="flex gap-3">
                        {req.status === 'pending' ? (
                           <>
                             <button onClick={() => handleApprovePayment(req)} className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl text-black font-bold shadow-lg">Approve</button>
                             <button onClick={() => handleRejectPayment(req.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-3 rounded-xl font-bold border border-red-500/20">Reject</button>
                           </>
                        ) : (
                           <span className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-widest ${req.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>{req.status}</span>
                        )}
                     </div>
                  </div>
                ))}
             </div>
           )}

           {activeTab === 'influencers' && (
             <div className="space-y-8 animate-in fade-in">
                <h2 className="text-3xl font-black mb-6">Influencer Management</h2>

                {/* Create New Referral Profile */}
                <div className="glass p-8 rounded-[3rem] border border-white/10 bg-black/40">
                    <h3 className="text-2xl font-black mb-6">Create New Referral</h3>
                    <form onSubmit={handleCreateReferral} className="space-y-6">
                        <input 
                            type="text" 
                            placeholder="Influencer Name" 
                            value={refForm.name} 
                            onChange={e => setRefForm({...refForm, name: e.target.value})} 
                            className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" 
                            required 
                        />
                        <input 
                            type="text" 
                            placeholder="Coupon Code (e.g., RIYA99)" 
                            value={refForm.couponCode} 
                            onChange={e => setRefForm({...refForm, couponCode: e.target.value})} 
                            className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none uppercase" 
                            required 
                        />
                        <div className="grid grid-cols-2 gap-6">
                           <input 
                                type="number" 
                                placeholder="Commission Rate (%)" 
                                value={refForm.commissionRate} 
                                onChange={e => setRefForm({...refForm, commissionRate: e.target.value})} 
                                className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" 
                                required 
                            />
                            <input 
                                type="number" 
                                placeholder="Discount Amount (Tk)" 
                                value={refForm.discountAmount} 
                                onChange={e => setRefForm({...refForm, discountAmount: e.target.value})} 
                                className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" 
                                required 
                            />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Payment Info (e.g., Bkash 01XXXXXXXXX)" 
                            value={refForm.paymentInfo} 
                            onChange={e => setRefForm({...refForm, paymentInfo: e.target.value})} 
                            className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" 
                        />
                        <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/30 transition-all">Create Referral</button>
                    </form>
                </div>

                {/* Existing Referral Profiles */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black mb-4">Existing Referrals ({referrals.length})</h3>
                    {referrals.length === 0 ? (
                        <div className="glass p-6 rounded-3xl text-center text-gray-500 border border-white/5 bg-black/20">No referral profiles found.</div>
                    ) : (
                        referrals.map(ref => (
                            <div key={ref.id} className="glass p-6 rounded-3xl border border-white/5 bg-black/20 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-lg">{ref.name} <span className="text-blue-400 font-mono text-sm">({ref.couponCode})</span></h4>
                                    <p className="text-sm text-gray-400">Comm: {ref.commissionRate}% | Discount: ৳{ref.discountAmount}</p>
                                    <p className="text-xs text-gray-500">Payment: {ref.paymentInfo || 'N/A'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${ref.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{ref.status}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Referral Transactions */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black mb-4">Referral Transactions ({referralTransactions.length})</h3>
                    {referralTransactions.length === 0 ? (
                        <div className="glass p-6 rounded-3xl text-center text-gray-500 border border-white/5 bg-black/20">No referral transactions yet.</div>
                    ) : (
                        referralTransactions.map(tx => (
                            <div key={tx.id} className="glass p-6 rounded-3xl border border-white/5 bg-black/20 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-lg">৳{tx.amount} <span className="text-gray-400 font-normal">for {referrals.find(r => r.id === tx.referralId)?.name || 'Unknown'}</span></h4>
                                    <p className="text-sm text-gray-400">{tx.note}</p>
                                    <p className="text-xs text-gray-500 mt-1">{tx.timestamp}</p>
                                </div>
                                <div className="flex gap-3 items-center">
                                {tx.status === 'pending' ? (
                                    <button onClick={() => handlePayoutCommission(tx.id)} className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-xl text-black font-bold shadow-lg">Payout</button>
                                ) : (
                                    <span className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-widest ${tx.status === 'paid' ? 'text-green-500' : 'text-red-500'}`}>{tx.status}</span>
                                )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
           )}

           {activeTab === 'models' && !isAddingCompanion && (
             <div>
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-2xl font-black">AI Companions</h2>
                   <button onClick={() => { setIsAddingCompanion(true); setEditingCompanionId(null); }} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-blue-600/30 transition-all">+ Add New Model</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {profiles.map(p => (
                      <div key={p.id} className="glass p-5 rounded-[2.5rem] border border-white/5 group relative bg-black/20">
                         <img src={p.image} className="w-full aspect-square object-cover rounded-[2rem] mb-4" />
                         <h3 className="text-xl font-black">{p.name}</h3>
                         <button onClick={() => { setEditingCompanionId(p.id); setCompForm(p); setIsAddingCompanion(true); }} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest">Edit Profile</button>
                      </div>
                   ))}
                </div>
             </div>
           )}

           {isAddingCompanion && (
             <div className="max-w-4xl mx-auto glass p-10 rounded-[3rem] border border-white/10 bg-black/40">
                {/* Form implementation remains the same but saves via handleSaveCompanion which uses cloudStore */}
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-3xl font-black">{editingCompanionId ? 'Edit Model' : 'Create Smart Model'}</h2>
                   <button onClick={() => setIsAddingCompanion(false)} className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/20">✕</button>
                </div>
                {!editingCompanionId && (
                   <div className="bg-blue-600/10 border border-blue-600/20 p-6 rounded-3xl mb-8 flex gap-4 items-center">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">✨</div>
                      <input type="text" value={aiTheme} onChange={e => setAiTheme(e.target.value)} placeholder="Auto-generate with AI..." className="flex-1 bg-transparent border-none focus:outline-none text-white font-medium" />
                      <button onClick={handleMagicGenerate} disabled={isAiGenerating} className="bg-blue-600 px-6 py-3 rounded-xl font-bold text-sm">{isAiGenerating ? 'Thinking...' : 'Auto-Generate'}</button>
                   </div>
                )}
                <form onSubmit={handleSaveCompanion} className="space-y-10">
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <input type="text" placeholder="Name" value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" />
                            <input type="number" placeholder="Age" value={compForm.age} onChange={e => setCompForm({...compForm, age: parseInt(e.target.value)})} className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 focus:border-blue-500/50 outline-none" />
                         </div>
                         <div className="border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-4">
                            {compForm.image ? <img src={compForm.image} className="h-32 w-32 object-cover rounded-full mb-2" /> : <div className="h-20 w-20 bg-white/5 rounded-full mb-2"></div>}
                            <input ref={fileInputRef} type="file" hidden onChange={e => handleImageUpload(e, 'main')} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-500 hover:underline mb-2">Upload File</button>
                            <div className="flex gap-2 w-full mt-2">
                               <input type="text" value={mainImageUrlInput} onChange={e => setMainImageUrlInput(e.target.value)} placeholder="Or paste link..." className="flex-1 bg-black/20 p-2 rounded-xl border border-white/5 text-[10px]" />
                               <button type="button" onClick={handleAddMainImageLink} className="bg-white/10 px-3 rounded-xl text-[10px] font-bold">Add</button>
                            </div>
                         </div>
                      </div>
                      <textarea placeholder="Intro Message" value={compForm.intro} onChange={e => setCompForm({...compForm, intro: e.target.value})} className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 h-24" />
                      <textarea placeholder="System Prompt" value={compForm.systemPrompt} onChange={e => setCompForm({...compForm, systemPrompt: e.target.value})} className="w-full bg-black/20 p-4 rounded-2xl border border-white/5 h-24" />
                   </div>
                   <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/30 transition-all">Save & Publish Profile</button>
                </form>
             </div>
           )}
        </main>
    </div>
  );
};