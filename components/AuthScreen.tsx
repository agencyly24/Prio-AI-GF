import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthScreenProps {
  onLoginSuccess: (user: { name: string; email?: string; avatar?: string; uid?: string }) => void;
  onBack: () => void;
  onAdminClick: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onBack, onAdminClick }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        if (!name) throw new Error("দয়া করে আপনার নাম লিখুন।");
        
        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          // 2. Save user data to 'profiles' table as requested
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id, 
                email: email, 
                name: name,
                created_at: new Date().toISOString()
              }
            ]);

          if (profileError) {
             console.error("Profile creation error:", profileError);
             // Continue anyway as auth was successful
          }

          localStorage.setItem('priyo_is_logged_in', 'true');
          localStorage.setItem('priyo_user_name', name);
          
          onLoginSuccess({
              name: name,
              email: authData.user.email || '',
              avatar: '',
              uid: authData.user.id
          });
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        if (data.user) {
          // Fetch user name from profiles table
          let userName = '';
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', data.user.id)
            .single();
            
          if (profileData && profileData.name) {
             userName = profileData.name;
          }

          localStorage.setItem('priyo_is_logged_in', 'true');
          if (userName) localStorage.setItem('priyo_user_name', userName);
          
          onLoginSuccess({
              name: userName,
              email: data.user.email || '',
              avatar: '',
              uid: data.user.id
          });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "লগিন ব্যর্থ হয়েছে।";
      if (err.message === 'Invalid login credentials') msg = "ইমেইল বা পাসওয়ার্ড ভুল।";
      else if (err.message.includes('already registered')) msg = "এই ইমেইলটি ইতিমধ্যেই ব্যবহার করা হয়েছে।";
      else if (err.message.includes('weak password')) msg = "পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।";
      else msg = err.message || "সমস্যা হচ্ছে, আবার চেষ্টা করুন।";
      
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-gradient-to-tr from-rose-950 via-slate-950 to-purple-950 overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-pink-600/20 blur-[150px] rounded-full animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[150px] rounded-full animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md glass p-10 rounded-[3.5rem] shadow-2xl relative z-10 border border-white/10 animate-in fade-in zoom-in duration-500 backdrop-blur-3xl bg-black/20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">স্বাগতম!</h2>
          <p className="text-gray-300 text-sm font-medium">
             {isRegistering ? 'নতুন একাউন্ট তৈরি করুন' : 'আড্ডা শুরু করতে লগিন করুন'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Email/Password Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1">
                <input 
                  type="text" 
                  placeholder="আপনার নাম"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500/50"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <input 
                type="email" 
                placeholder="ইমেইল এড্রেস"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500/50"
                required
              />
            </div>
            <div className="space-y-1">
              <input 
                type="password" 
                placeholder="পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500/50"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-2xl font-black text-white text-base shadow-xl transition-all active:scale-95"
            >
              {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : (isRegistering ? 'সাইন আপ করুন' : 'লগিন করুন')}
            </button>
          </form>
          
          {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
          
          <div className="text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-gray-400 hover:text-white text-xs font-bold transition-colors"
            >
              {isRegistering ? 'একাউন্ট আছে? লগিন করুন' : 'নতুন একাউন্ট খুলুন'}
            </button>
          </div>
        </div>

        <button 
          onClick={onBack}
          className="w-full mt-8 text-gray-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.3em]"
        >
          ফিরে যান
        </button>

        {/* Admin Login Trigger */}
        <div className="mt-6 border-t border-white/5 pt-6 text-center">
            <button 
              onClick={onAdminClick} 
              className="text-[10px] text-gray-700 font-bold uppercase tracking-widest hover:text-pink-500 transition-colors"
            >
              Admin Panel Login
            </button>
        </div>
      </div>
    </div>
  );
};
