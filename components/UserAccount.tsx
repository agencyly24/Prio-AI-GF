
import React, { useState } from 'react';
import { UserProfile, Message, GirlfriendProfile, WithdrawalRequest } from '../types';
import { cloudStore } from '../services/cloudStore';

interface UserAccountProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  onBack: () => void;
  chatHistories: Record<string, Message[]>;
  profiles: GirlfriendProfile[];
  onSelectProfile: (profile: GirlfriendProfile) => void;
  onPurchaseCredits: () => void;
  onLogout: () => void;
  onUpgrade: () => void; // Added onUpgrade prop
}

export const UserAccount: React.FC<UserAccountProps> = ({ 
  userProfile, onBack, onPurchaseCredits, onLogout, profiles, onSelectProfile, onUpgrade
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'companions' | 'referrals'>('profile');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'Bkash' | 'Nagad'>('Bkash');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const copyRefCode = () => {
    navigator.clipboard.writeText(userProfile.referralCode);
    alert("Coupon Code Copied: " + userProfile.referralCode);
  };

  const unlockedModelsList = profiles.filter(m => userProfile.unlockedModels.includes(m.id));

  const handleWithdrawRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!withdrawNumber || userProfile.referralEarnings < 1000) return;
      setIsWithdrawing(true);
      try {
          const request: WithdrawalRequest = {
              id: `wd_${Date.now()}`,
              userId: userProfile.uid,
              userName: userProfile.name,
              amount: userProfile.referralEarnings,
              method: withdrawMethod,
              number: withdrawNumber,
              status: 'pending',
              createdAt: new Date().toISOString()
          };
          await cloudStore.createWithdrawalRequest(request);
          alert("Withdrawal Request Sent!");
          setShowWithdrawModal(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsWithdrawing(false);
      }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 text-white bg-[#0f0518]">
       <div className="max-w-4xl mx-auto">
         <header className="flex justify-between items-center mb-10">
            <button onClick={onBack} className="p-3 glass rounded-full hover:bg-white/10 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="text-3xl font-black tracking-tighter">My Account</h1>
            <button onClick={onLogout} className="text-red-500 font-black text-sm uppercase tracking-widest border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500/10">Logout</button>
         </header>

         <div className="flex gap-4 mb-10 overflow-x-auto pb-2 no-scrollbar">
            <button onClick={() => setActiveTab('profile')} className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-pink-600 shadow-lg shadow-pink-600/30' : 'bg-white/5 text-gray-500'}`}>Profile</button>
            <button onClick={() => setActiveTab('companions')} className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'companions' ? 'bg-purple-600 shadow-lg shadow-purple-600/30' : 'bg-white/5 text-gray-500'}`}>My Girls ({unlockedModelsList.length})</button>
            <button onClick={() => setActiveTab('referrals')} className={`px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'referrals' ? 'bg-green-600 shadow-lg shadow-green-600/30' : 'bg-white/5 text-gray-500'}`}>Referrals</button>
         </div>

         {activeTab === 'profile' && (
           <div className="space-y-8 animate-in fade-in">
              {/* Profile Card */}
              <div className="glass p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 border border-white/10 relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 blur-[80px] rounded-full group-hover:scale-150 transition-transform"></div>
                 <img src={userProfile.avatar} className="w-32 h-32 rounded-full bg-gray-800 object-cover border-4 border-pink-500/20 shadow-2xl" />
                 <div className="text-center md:text-left relative z-10">
                    <h2 className="text-4xl font-black mb-1">{userProfile.name}</h2>
                    <p className="text-gray-500 font-medium mb-4">{userProfile.email}</p>
                    <div className="flex gap-2 justify-center md:justify-start">
                       <span className="bg-yellow-500/20 text-yellow-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">{userProfile.tier} Rank</span>
                    </div>
                 </div>
              </div>

              {/* Wallet Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-[2.5rem] border border-yellow-500/20 shadow-2xl flex flex-col justify-between group">
                    <div>
                        <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Total Balance</p>
                        <div className="flex items-end gap-3 mb-6">
                            <p className="text-6xl font-black text-white leading-none">{userProfile.credits}</p>
                            <span className="text-gray-500 font-bold mb-1">Credits</span>
                        </div>
                    </div>
                    <button 
                        onClick={onPurchaseCredits} 
                        className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl text-black font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:scale-[1.02]"
                    >
                        + Add Credits Now
                    </button>
                 </div>

                 <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Membership</p>
                    <div className="mb-6">
                        <p className="text-3xl font-black text-white">{userProfile.isPremium ? 'Premium Active' : 'Free Mode'}</p>
                        {userProfile.subscriptionExpiry && <p className="text-xs text-gray-500 mt-2 font-medium">Valid until {new Date(userProfile.subscriptionExpiry).toLocaleDateString()}</p>}
                    </div>
                    <button 
                      onClick={onUpgrade} // Connected the onClick handler
                      className="text-pink-500 font-black text-xs uppercase tracking-widest border-b-2 border-pink-500/20 pb-1 self-start hover:border-pink-500 transition-all"
                    >
                      View My Plan Details
                    </button>
                 </div>
              </div>
           </div>
         )}
         
         {activeTab === 'companions' && (
           <div className="animate-in fade-in">
              {unlockedModelsList.length === 0 ? (
                 <div className="text-center py-24 glass rounded-[3rem] border-white/5">
                    <p className="text-gray-500 font-black uppercase tracking-widest mb-6">You haven't unlocked any girls yet</p>
                    <button onClick={onBack} className="bg-pink-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Unlock Now</button>
                 </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {unlockedModelsList.map(model => (
                      <div key={model.id} onClick={() => onSelectProfile(model)} className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden cursor-pointer group border border-white/10 hover:border-pink-500 transition-all shadow-xl">
                          <img src={model.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                          <div className="absolute bottom-5 left-5">
                              <p className="text-xl font-black text-white">{model.name}</p>
                              <span className="text-[9px] bg-green-500 text-black px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Active Partner</span>
                          </div>
                      </div>
                    ))}
                </div>
              )}
           </div>
         )}

         {activeTab === 'referrals' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/10 p-10 rounded-[3rem] border border-green-500/20 text-center relative overflow-hidden">
                 <h2 className="text-4xl font-black text-green-400 mb-4">Invite & Earn 10%</h2>
                 <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm font-medium leading-relaxed">
                    আপনার কুপন কোড ব্যবহার করে বন্ধুরা সাবস্ক্রাইব করলে আপনি পাবেন <span className="text-green-400 font-bold">১০% কমিশন</span> এবং তারা পাবে ডিসকাউন্ট!
                 </p>
                 <div onClick={copyRefCode} className="bg-black/50 hover:bg-black/70 p-6 rounded-3xl inline-flex flex-col items-center border border-green-500/20 mb-8 cursor-pointer transition-all active:scale-95 group">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Coupon Code (Click to Copy)</p>
                    <p className="text-4xl font-mono font-black text-white tracking-[0.2em]">{userProfile.referralCode}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                       <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Total Invites</p>
                       <p className="text-4xl font-black text-white">{userProfile.referralsCount || 0}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                       <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Total Earned</p>
                       <p className="text-4xl font-black text-green-400">৳{userProfile.referralEarnings}</p>
                    </div>
                 </div>
                 {userProfile.referralEarnings >= 1000 ? (
                    <button onClick={() => setShowWithdrawModal(true)} className="bg-green-600 hover:bg-green-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all">Withdraw Earnings</button>
                 ) : (
                    <div className="text-gray-600 font-bold text-xs uppercase tracking-widest">Withdrawal available at ৳1000</div>
                 )}
              </div>
           </div>
         )}
       </div>

       {showWithdrawModal && (
           <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
               <div className="bg-[#1a0515] w-full max-w-md p-10 rounded-[3rem] border border-white/10 relative shadow-2xl">
                   <button onClick={() => setShowWithdrawModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">✕</button>
                   <h3 className="text-3xl font-black text-white mb-6">Withdraw</h3>
                   <form onSubmit={handleWithdrawRequest} className="space-y-6">
                       <div>
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Method</label>
                           <div className="grid grid-cols-2 gap-4">
                               <div onClick={() => setWithdrawMethod('Bkash')} className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-center gap-2 transition-all ${withdrawMethod === 'Bkash' ? 'bg-pink-600/20 border-pink-500' : 'bg-white/5 border-white/5'}`}>
                                   <span className="font-black text-sm">Bkash</span>
                               </div>
                               <div onClick={() => setWithdrawMethod('Nagad')} className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-center gap-2 transition-all ${withdrawMethod === 'Nagad' ? 'bg-orange-600/20 border-orange-500' : 'bg-white/5 border-white/5'}`}>
                                   <span className="font-black text-sm">Nagad</span>
                               </div>
                           </div>
                       </div>
                       <div>
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Mobile Number</label>
                           <input required type="tel" value={withdrawNumber} onChange={e => setWithdrawNumber(e.target.value)} placeholder="01XXXXXXXXX" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-black outline-none focus:border-green-500" />
                       </div>
                       <button type="submit" disabled={isWithdrawing} className="w-full py-5 bg-green-600 rounded-2xl font-black text-white uppercase tracking-widest shadow-xl">{isWithdrawing ? 'Processing...' : 'Request Payout'}</button>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};
