
import React, { useState, useEffect } from 'react';
import { PaymentRequest, UserProfile, GirlfriendProfile, Influencer, ProfileGalleryItem, ModelMode, WithdrawalRequest } from '../types';
import { cloudStore } from '../services/cloudStore';
import { gemini } from '../services/geminiService';
import { Card3D, Button3D } from './Layout3D';

interface AdminPanelProps {
  paymentRequests: PaymentRequest[];
  setPaymentRequests: React.Dispatch<React.SetStateAction<PaymentRequest[]>>;
  userProfile?: UserProfile | null;
  setUserProfile?: any;
  profiles: GirlfriendProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<GirlfriendProfile[]>>;
  onBack: () => void;
  isPreAuthorized?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  paymentRequests, setPaymentRequests, profiles, setProfiles, onBack, isPreAuthorized = false
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'models' | 'users' | 'referrals'>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(isPreAuthorized);
  const [passcode, setPasscode] = useState('');
  
  // Data States
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState({ 
    totalUsers: 0, revenue: 0, totalCommission: 0, netIncome: 0, activeModels: 0, pendingReq: 0 
  });

  // Model Editor States
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [modelForm, setModelForm] = useState<Partial<GirlfriendProfile>>({ 
    gallery: [], 
    appearance: {} as any, 
    character: { kinks: [] } as any 
  });
  const [modelTab, setModelTab] = useState<'basic' | 'appearance' | 'gallery'>('basic');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Gallery Editor States
  const [newGalleryItem, setNewGalleryItem] = useState<Partial<ProfileGalleryItem>>({ type: 'image', isExclusive: false, creditCost: 100 });
  const [keywordInput, setKeywordInput] = useState('');
  const [isGeneratingTease, setIsGeneratingTease] = useState(false);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, activeTab]);

  const loadData = async () => {
    try {
      const s = await cloudStore.getAdminStats();
      setStats({ ...s, pendingReq: paymentRequests.length });

      if (activeTab === 'finance') {
        const reqs = await cloudStore.loadPendingPayments();
        setPaymentRequests(reqs);
      }
      if (activeTab === 'models') {
        const mods = await cloudStore.loadModels();
        setProfiles(mods);
      }
      if (activeTab === 'users') {
        const users = await cloudStore.getAllUsers();
        setAllUsers(users);
      }
      if (activeTab === 'referrals') {
        const infs = await cloudStore.getAllInfluencers();
        setInfluencers(infs);
        const wds = await cloudStore.getPendingWithdrawals();
        setPendingWithdrawals(wds);
      }
    } catch (e) {
      console.error("Load Error:", e);
    }
  };

  // --- Actions ---
  const handleApprovePayment = async (req: PaymentRequest) => {
    if (!confirm("Approve this payment?")) return;
    await cloudStore.approvePayment(req);
    loadData();
  };

  const handleRejectPayment = async (req: PaymentRequest) => {
    if (!confirm("Reject this payment?")) return;
    await cloudStore.rejectPayment(req.id);
    loadData();
  };

  const handleGenerateModel = async () => {
    if (!aiPrompt) return alert("Enter theme (e.g. Village girl)");
    setIsGenerating(true);
    try {
      const generated = await gemini.generateMagicProfile(aiPrompt, modelForm.mode || 'Girlfriend');
      setModelForm(prev => ({ 
        ...prev, 
        ...generated, 
        appearance: { ...prev.appearance, ...generated.appearance } 
      }));
    } catch (e) { alert("Gen Error"); }
    finally { setIsGenerating(false); }
  };

  const handleAutoTease = async () => {
    const keywords = keywordInput.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) return alert("Enter keywords (e.g. wet, shower, bed, seductive)");
    setIsGeneratingTease(true);
    try {
      const meta = await gemini.generateExclusiveContentMetadata(keywords);
      setNewGalleryItem(prev => ({ ...prev, title: meta.title, tease: meta.tease, keywords, isExclusive: true }));
    } catch (e) { console.error(e); alert("AI Note Generation Failed"); }
    finally { setIsGeneratingTease(false); }
  };

  const handleAddGalleryItem = () => {
    if (!newGalleryItem.url) return alert("URL Required");
    const newItem: ProfileGalleryItem = {
      id: `gal_${Date.now()}`,
      type: (newGalleryItem.type as 'image' | 'video') || 'image',
      url: newGalleryItem.url,
      isExclusive: newGalleryItem.isExclusive || false,
      creditCost: newGalleryItem.creditCost || 100,
      title: newGalleryItem.title || '',
      tease: newGalleryItem.tease || '',
      keywords: newGalleryItem.keywords || []
    };
    setModelForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), newItem] }));
    // Reset form
    setNewGalleryItem({ type: 'image', isExclusive: false, creditCost: 100, url: '', title: '', tease: '', keywords: [] });
    setKeywordInput('');
  };

  if (!isAuthenticated) return (
    <div className="flex items-center justify-center h-screen bg-black fixed inset-0 z-[200]">
      <form onSubmit={(e) => { e.preventDefault(); if(passcode === 'Mishela') setIsAuthenticated(true); }} className="glass p-10 rounded-[3rem] text-center max-w-sm w-full border border-white/10">
        <h2 className="text-3xl font-black text-white mb-6">Admin Panel</h2>
        <input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} className="p-4 rounded-xl bg-black/50 text-white mb-6 block w-full text-center font-bold" placeholder="••••••" />
        <Button3D variant="primary" className="w-full">Login</Button3D>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 absolute inset-0 z-[100] overflow-hidden flex font-['Hind_Siliguri']">
       {/* Sidebar Navigation */}
       <div className="w-72 bg-[#0d0d0d] rounded-[2.5rem] p-8 flex flex-col justify-between mr-6 border border-white/5 h-full relative overflow-hidden shrink-0 shadow-2xl">
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-12">
                  <h1 className="text-2xl font-black text-gradient tracking-tighter">PRIYO</h1>
                  <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded font-black text-gray-400 uppercase">Admin</span>
              </div>
              <nav className="space-y-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'finance', label: 'Finance' },
                    { id: 'models', label: 'Models' },
                    { id: 'referrals', label: 'Referrals' },
                    { id: 'users', label: 'Users' }
                  ].map(tab => (
                      <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as any); setIsEditingModel(false); }} 
                        className={`w-full text-left px-6 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all relative overflow-hidden group ${activeTab === tab.id ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        {activeTab === tab.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-full"></div>}
                        {tab.label}
                      </button>
                  ))}
              </nav>
          </div>
          <button onClick={onBack} className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest px-6 py-4 border border-white/5 rounded-2xl transition-all hover:bg-red-500/10 hover:border-red-500/20">Log Out</button>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
              <div className="animate-in fade-in space-y-10 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <StatBlock label="Total Revenue" value={`৳${stats.revenue}`} sub="Gross Sales" color="text-green-500" bgColor="bg-green-500/5" border="border-green-500/10" />
                      <StatBlock label="Net Income" value={`৳${stats.netIncome}`} sub="Profit after commissions" color="text-blue-400" bgColor="bg-blue-400/5" border="border-blue-400/10" />
                      <StatBlock label="Commissions" value={`৳${stats.totalCommission}`} sub="Paid + Pending" color="text-orange-500" bgColor="bg-orange-500/5" border="border-orange-500/10" />
                      
                      <StatBlock label="Total Users" value={stats.totalUsers} sub="" color="text-white" bgColor="bg-white/5" border="border-white/10" />
                      <StatBlock label="Active Models" value={stats.activeModels} sub="" color="text-white" bgColor="bg-white/5" border="border-white/10" />
                      <StatBlock label="Pending Req" value={stats.pendingReq} sub="" color="text-yellow-500" bgColor="bg-yellow-500/5" border="border-yellow-500/10" />
                  </div>
              </div>
          )}

          {/* MODELS TAB */}
          {activeTab === 'models' && (
              <div className="animate-in fade-in space-y-8 pt-4">
                  <header className="flex justify-between items-center mb-10">
                      <h2 className="text-3xl font-black text-white tracking-tight">Model Management</h2>
                      {!isEditingModel && <Button3D onClick={() => { setModelForm({ id: `mod_${Date.now()}`, gallery: [], appearance: {} as any, character: { kinks: [] } as any }); setIsEditingModel(true); }} variant="secondary">+ New Model</Button3D>}
                  </header>

                  {isEditingModel ? (
                      <div className="animate-in slide-in-from-bottom-6">
                        <div className="bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                          {/* Editor Header */}
                          <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-black">Model Editor</h3>
                            <div className="flex gap-2">
                               {['basic', 'appearance', 'gallery'].map(t => (
                                 <button key={t} onClick={() => setModelTab(t as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${modelTab === t ? 'bg-pink-600 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>{t}</button>
                               ))}
                               <button onClick={() => setIsEditingModel(false)} className="ml-4 p-2 text-gray-600 hover:text-white transition-colors">✕</button>
                            </div>
                          </div>

                          <div className="p-10">
                            {/* Persistent Magic Fill Section */}
                            <div className="mb-12 p-8 bg-[#1a1a1a] rounded-[2rem] border border-blue-500/20 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30"></div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <span className="animate-pulse">✨</span> Auto Fill Generator
                                </p>
                                <div className="flex gap-4">
                                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Theme (e.g. Village girl, Teacher)" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" />
                                    <div className="flex items-center gap-4">
                                       <div className="flex flex-col gap-1">
                                          <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">Mode</label>
                                          <select value={modelForm.mode || 'Girlfriend'} onChange={e=>setModelForm({...modelForm, mode: e.target.value as any})} className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none">
                                              <option value="Friend">Friend</option><option value="Girlfriend">Girlfriend</option><option value="Sexy">Sexy</option>
                                          </select>
                                       </div>
                                       <Button3D onClick={handleGenerateModel} disabled={isGenerating} variant="secondary" className="px-10 h-14 mt-3">{isGenerating ? 'Wait...' : 'Auto Fill'}</Button3D>
                                    </div>
                                </div>
                            </div>

                            {modelTab === 'basic' && (
                              <div className="space-y-8 animate-in fade-in">
                                  <div className="grid grid-cols-2 gap-6">
                                      <EditorInput label="Name" value={modelForm.name} onChange={v=>setModelForm({...modelForm, name: v})} />
                                      <EditorInput label="Age" type="number" value={modelForm.age} onChange={v=>setModelForm({...modelForm, age: Number(v)})} />
                                      <div className="col-span-2">
                                          <EditorInput label="Mode (Behavior)" value={modelForm.mode === 'Sexy' ? 'Sexy (Aggressive, Naughty)' : 'Girlfriend (Romantic, Sweet)'} readonly />
                                      </div>
                                      <div className="col-span-2">
                                          <EditorInput label="Avatar URL" value={modelForm.image} onChange={v=>setModelForm({...modelForm, image: v})} mono />
                                      </div>
                                      <div className="col-span-2">
                                          <EditorLabel label="Intro (Bangla)" />
                                          <textarea value={modelForm.intro || ''} onChange={e=>setModelForm({...modelForm, intro: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold h-24 outline-none focus:border-pink-500/50" />
                                      </div>
                                      <div className="col-span-2">
                                          <EditorLabel label="System Prompt (Persona)" />
                                          <textarea value={modelForm.systemPrompt || ''} onChange={e=>setModelForm({...modelForm, systemPrompt: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-mono text-xs h-40 outline-none focus:border-pink-500/50" />
                                      </div>
                                  </div>
                              </div>
                            )}

                            {modelTab === 'appearance' && (
                              <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                                  <EditorInput label="Ethnicity" value={modelForm.appearance?.ethnicity} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), ethnicity: v}})} />
                                  <EditorInput label="Body Type" value={modelForm.appearance?.bodyType} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), bodyType: v}})} />
                                  <EditorInput label="Measurements" value={modelForm.appearance?.measurements} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), measurements: v}})} />
                                  <EditorInput label="Height" value={modelForm.appearance?.height} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), height: v}})} />
                                  <EditorInput label="Breast Size" value={modelForm.appearance?.breastSize} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), breastSize: v}})} />
                                  <EditorInput label="Outfit" value={modelForm.appearance?.outfit} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), outfit: v}})} />
                                  <EditorInput label="Hair Style" value={modelForm.appearance?.hairStyle} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), hairStyle: v}})} />
                                  <EditorInput label="Hair Color" value={modelForm.appearance?.hairColor} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), hairColor: v}})} />
                                  <EditorInput label="Eye Color" value={modelForm.appearance?.eyeColor} onChange={v=>setModelForm({...modelForm, appearance: {...(modelForm.appearance as any), eyeColor: v}})} />
                              </div>
                            )}

                            {modelTab === 'gallery' && (
                              <div className="space-y-12 animate-in fade-in">
                                  <div className="p-8 bg-pink-600/5 rounded-[2.5rem] border border-pink-500/10">
                                      <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-6">Add New Content</p>
                                      <div className="grid grid-cols-12 gap-6 items-start">
                                          <div className="col-span-7">
                                              <EditorInput label="Image/Video URL" value={newGalleryItem.url} onChange={v=>setNewGalleryItem({...newGalleryItem, url: v})} mono />
                                          </div>
                                          <div className="col-span-2">
                                              <EditorLabel label="Type" />
                                              <select value={newGalleryItem.type} onChange={e=>setNewGalleryItem({...newGalleryItem, type: e.target.value as any})} className="w-full h-14 bg-black border border-white/10 rounded-xl px-4 text-white font-bold outline-none">
                                                  <option value="image">Image</option><option value="video">Video</option>
                                              </select>
                                          </div>
                                          <div className="col-span-3 flex items-center justify-center h-14 pt-6">
                                              <label className="flex items-center gap-3 cursor-pointer group">
                                                  <input type="checkbox" checked={newGalleryItem.isExclusive} onChange={e=>setNewGalleryItem({...newGalleryItem, isExclusive: e.target.checked})} className="h-6 w-6 rounded border-white/10 bg-black accent-yellow-500 transition-all" />
                                                  <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-yellow-500 transition-colors tracking-widest">Exclusive?</span>
                                              </label>
                                          </div>

                                          {/* Magic Note Generator UI */}
                                          {newGalleryItem.isExclusive && (
                                              <div className="col-span-12 p-8 bg-yellow-500/5 rounded-3xl border border-yellow-500/20 space-y-6 animate-in slide-in-from-top-4">
                                                  <div className="flex gap-4 items-end">
                                                      <div className="flex-1">
                                                          <EditorLabel label="Keywords for Magic Note" />
                                                          <input 
                                                              value={keywordInput} 
                                                              onChange={e => setKeywordInput(e.target.value)} 
                                                              placeholder="e.g. wet, shower, bed, seductive" 
                                                              className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-yellow-500/50 transition-all" 
                                                          />
                                                      </div>
                                                      <Button3D onClick={handleAutoTease} disabled={isGeneratingTease} variant="gold" className="h-14 px-8 mb-0.5">
                                                          {isGeneratingTease ? 'Wait...' : '✨ Magic Gen'}
                                                      </Button3D>
                                                  </div>

                                                  {newGalleryItem.tease && (
                                                      <div className="p-6 bg-yellow-500/10 rounded-2xl border border-yellow-500/30 animate-in zoom-in">
                                                          <p className="text-[8px] font-black text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                              <span className="animate-pulse">🔥</span> AI Generated Seductive Note
                                                          </p>
                                                          <p className="text-white font-bold italic text-lg leading-relaxed">"{newGalleryItem.tease}"</p>
                                                      </div>
                                                  )}

                                                  <div className="w-1/3">
                                                      <EditorInput 
                                                          label="Credit Cost" 
                                                          type="number" 
                                                          value={newGalleryItem.creditCost} 
                                                          onChange={v => setNewGalleryItem({...newGalleryItem, creditCost: Number(v)})} 
                                                      />
                                                  </div>
                                              </div>
                                          )}

                                          <div className="col-span-12 pt-4">
                                              <Button3D onClick={handleAddGalleryItem} variant="primary" className="w-full h-16 shadow-pink-600/20">Add to Gallery List</Button3D>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-4 md:grid-cols-6 gap-6">
                                      {(modelForm.gallery || []).map((item, idx) => (
                                          <div key={idx} className="aspect-square rounded-[2rem] overflow-hidden relative group border border-white/5 bg-white/5 shadow-lg">
                                              <img src={item.url} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${item.isExclusive ? 'brightness-75' : ''}`} />
                                              {item.isExclusive && (
                                                <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                                   <svg className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                                   {item.creditCost} C
                                                </div>
                                              )}
                                              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all p-4 text-center">
                                                  {item.tease && <p className="text-[8px] text-gray-400 italic mb-3 line-clamp-2">"{item.tease}"</p>}
                                                  <button onClick={() => setModelForm({...modelForm, gallery: modelForm.gallery?.filter(i => i.id !== item.id)})} className="text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Remove</button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                            )}

                            <div className="mt-20 pt-10 border-t border-white/5">
                                <Button3D 
                                  onClick={async () => { 
                                      if(!modelForm.name || !modelForm.image) return alert("Missing Info (Name or Image)");
                                      await cloudStore.saveModel(modelForm as any); 
                                      setIsEditingModel(false); 
                                      loadData(); 
                                  }} 
                                  variant="primary" 
                                  className="w-full h-20 text-xl shadow-[0_20px_40px_rgba(236,72,153,0.3)]"
                                >
                                  Save Model Changes
                                </Button3D>
                            </div>
                          </div>
                        </div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {profiles.map(p => (
                              <Card3D key={p.id} onClick={() => { setModelForm(p); setIsEditingModel(true); }} className="aspect-[3/4] overflow-hidden group cursor-pointer border-white/5 shadow-2xl bg-black rounded-[2rem]">
                                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                  <div className="absolute bottom-5 left-6 right-6">
                                      <h3 className="text-2xl font-black text-white">{p.name}</h3>
                                      <div className="flex gap-2 mt-2">
                                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${p.mode === 'Sexy' ? 'bg-pink-600 text-white' : 'bg-green-600 text-white'}`}>{p.mode || 'Girlfriend'}</span>
                                          <span className="text-[9px] text-gray-400 font-bold uppercase py-0.5">{p.age || 'Unknown'}</span>
                                      </div>
                                  </div>
                              </Card3D>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
              <div className="animate-in fade-in space-y-8 pt-4">
                  <header className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-black">User Database</h2>
                      <input placeholder="Search users..." className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold w-64 outline-none focus:border-pink-500 transition-all" />
                  </header>
                  <div className="bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-white/5">
                              <tr>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">User</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Email</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Status</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Credits</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {allUsers.map(user => (
                                  <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                                      <td className="p-6">
                                          <div className="flex items-center gap-4">
                                              <img src={user.photoURL} className="h-10 w-10 rounded-full border border-white/10" alt="" />
                                              <span className="font-bold text-white">{user.name}</span>
                                          </div>
                                      </td>
                                      <td className="p-6 text-sm text-gray-500">{user.email}</td>
                                      <td className="p-6">
                                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-green-600/10 text-green-500 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-white/5'}`}>{user.status}</span>
                                      </td>
                                      <td className="p-6 font-black text-yellow-500">{user.credits}</td>
                                      <td className="p-6 text-right">
                                          <button className="text-gray-600 hover:text-red-500 transition-colors">
                                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* REFERRALS TAB */}
          {activeTab === 'referrals' && (
              <div className="animate-in fade-in space-y-8 pt-4">
                   <div className="bg-[#111] border border-white/5 rounded-[2.5rem] overflow-hidden">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-white/5">
                              <tr>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Name</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Code</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Config</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Wallet</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest">Total Paid</th>
                                  <th className="p-6 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                              {influencers.map(inf => (
                                  <tr key={inf.id} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="p-6 font-bold text-white">{inf.name}</td>
                                      <td className="p-6"><span className="bg-blue-600/10 text-blue-400 px-2 py-1 rounded font-mono text-xs border border-blue-500/20">{inf.code}</span></td>
                                      <td className="p-6 text-xs text-gray-500 font-bold">Comm: {inf.commissionRate}%</td>
                                      <td className="p-6 font-black text-green-500">৳{inf.earnings}</td>
                                      <td className="p-6 font-black text-gray-500">৳{inf.totalPaid || 0}</td>
                                      <td className="p-6 text-right">
                                          <div className="flex gap-2 justify-end">
                                             <button className="bg-white/5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-white/10 transition-all border border-white/5">Edit</button>
                                             <button className="bg-green-600/10 text-green-500 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-green-600 hover:text-white transition-all border border-green-500/20">Pay</button>
                                             <button className="bg-red-600/10 text-red-500 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-500/20">Del</button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* FINANCE TAB */}
          {activeTab === 'finance' && (
              <div className="animate-in fade-in pt-4">
                  {paymentRequests.length === 0 ? (
                      <div className="py-40 text-center glass rounded-[3rem] border-white/5">
                          <p className="text-gray-500 font-black uppercase tracking-[0.2em]">No pending payments</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {paymentRequests.map(req => (
                              <Card3D key={req.id} className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-pink-500/30 bg-[#0d0d0d] border border-white/5 rounded-[2rem]">
                                  <div className="flex items-center gap-6 flex-1">
                                      <div className="h-16 w-16 rounded-2xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-3xl">📱</div>
                                      <div>
                                          <div className="flex items-center gap-3">
                                              <p className="text-xl font-black text-white">{req.userName}</p>
                                              <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded font-black text-gray-500 uppercase tracking-widest">{req.type}</span>
                                          </div>
                                          <p className="text-sm font-mono text-gray-500 mt-1">{req.trxId} • <span className="text-pink-500/70">{req.bkashNumber}</span></p>
                                      </div>
                                  </div>
                                  <div className="text-right flex items-center gap-12">
                                      <div className="text-center">
                                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Total</p>
                                          <p className="text-3xl font-black text-white">৳{req.amount}</p>
                                      </div>
                                      <div className="flex gap-3">
                                          <button onClick={() => handleApprovePayment(req)} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-600/20">Approve</button>
                                          <button onClick={() => handleRejectPayment(req)} className="bg-red-600/20 text-red-500 border border-red-500/10 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95">Reject</button>
                                      </div>
                                  </div>
                              </Card3D>
                          ))}
                      </div>
                  )}
              </div>
          )}
       </div>
    </div>
  );
};

// --- Helper Components ---

const StatBlock = ({ label, value, sub, color, bgColor, border }: any) => (
  <div className={`p-8 rounded-[2.5rem] border ${border} ${bgColor} shadow-2xl relative overflow-hidden group`}>
      <div className="relative z-10">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70 ${color}`}>{label}</p>
          <h4 className={`text-5xl font-black tracking-tighter mb-1 ${color}`}>{value}</h4>
          {sub && <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{sub}</p>}
      </div>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-20 transition-all group-hover:scale-150 ${color.replace('text-', 'bg-')}`}></div>
  </div>
);

const EditorLabel = ({ label }: { label: string }) => (
  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">{label}</label>
);

const EditorInput = ({ label, value, onChange, type = "text", mono = false, readonly = false }: any) => (
  <div className="space-y-2">
      <EditorLabel label={label} />
      <input 
        type={type} 
        value={value || ''} 
        readOnly={readonly}
        onChange={e=>onChange && onChange(e.target.value)} 
        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all ${readonly ? 'opacity-50 grayscale' : 'focus:border-pink-500/50'} ${mono ? 'font-mono text-xs' : ''}`} 
      />
  </div>
);
