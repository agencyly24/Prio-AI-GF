import { supabase } from "./supabase";
import { GirlfriendProfile } from "../types";

// We use a generic 'app_data' table to simulate the previous Firestore logic
// Table schema assumption: id (text, PK), data (jsonb), updated_at (timestamptz)

export const cloudStore = {
  // Save all profiles to Supabase
  async saveProfiles(profiles: GirlfriendProfile[]) {
    if (!supabase) return;
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("⚠️ Cloud Sync Skipped: User is not authenticated.");
      return;
    }

    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ 
          id: 'profiles', 
          data: profiles, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      console.log("✅ Profiles synced to Supabase");
    } catch (e: any) {
      console.error("❌ Failed to save to Cloud:", e.message);
    }
  },

  // Load profiles from Supabase
  async loadProfiles(): Promise<GirlfriendProfile[] | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('id', 'profiles')
        .single();

      if (error) throw error;
      
      if (data && data.data) {
        console.log("📥 Loaded profiles from Supabase");
        return data.data as GirlfriendProfile[];
      }
    } catch (e: any) {
      if (e.code === 'PGRST116') {
         // No rows found, which is fine for first load
         console.log("ℹ️ No cloud profiles found. Using local defaults.");
      } else {
         console.error("❌ Failed to load from Cloud:", e.message);
      }
    }
    return null;
  }
};
