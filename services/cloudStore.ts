
import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  addDoc
} from "firebase/firestore";
import { GirlfriendProfile, PaymentRequest, ReferralProfile, ReferralTransaction } from "../types";

// Firestore Collection Names
const COLLECTIONS = {
  MODELS: 'models',
  PAYMENT_REQUESTS: 'payment_requests',
  REFERRALS: 'referrals',
  REFERRAL_TXS: 'referral_transactions'
};

export const cloudStore = {
  // --- MODELS ---
  
  // Save or Update a single model
  async saveModel(profile: GirlfriendProfile) {
    if (!db) return;
    try {
      const modelRef = doc(db, COLLECTIONS.MODELS, profile.id);
      await setDoc(modelRef, profile, { merge: true });
      console.log(`✅ Model ${profile.name} saved to Firestore`);
    } catch (e: any) {
      console.error("❌ Failed to save model:", e.message);
      throw e; 
    }
  },

  // Delete a model
  async deleteModel(modelId: string) {
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.MODELS, modelId));
      console.log(`🗑️ Model ${modelId} deleted`);
    } catch (e: any) {
      console.error("❌ Failed to delete model:", e.message);
      throw e;
    }
  },

  // Load all profiles from Firestore Collection
  async loadProfiles(): Promise<GirlfriendProfile[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTIONS.MODELS));
      const snapshot = await getDocs(q);
      const profiles: GirlfriendProfile[] = [];
      snapshot.forEach(doc => {
        profiles.push(doc.data() as GirlfriendProfile);
      });
      console.log(`📥 Loaded ${profiles.length} profiles from Firestore`);
      return profiles;
    } catch (e: any) {
      console.error("❌ Failed to load profiles:", e.message);
      return [];
    }
  },

  // --- PAYMENT REQUESTS ---

  // Create a new payment request
  async createPaymentRequest(request: PaymentRequest) {
    if (!db) return;
    try {
      // Use setDoc with the specific ID we generated
      await setDoc(doc(db, COLLECTIONS.PAYMENT_REQUESTS, request.id), request);
      console.log("✅ Payment request created in Firestore");
    } catch (e: any) {
      console.error("❌ Failed to create payment request:", e.message);
      throw e;
    }
  },

  // Load all payment requests
  async loadPaymentRequests(): Promise<PaymentRequest[]> {
    if (!db) return [];
    try {
      // Order by timestamp desc
      const q = query(collection(db, COLLECTIONS.PAYMENT_REQUESTS), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const requests: PaymentRequest[] = [];
      snapshot.forEach(doc => {
        requests.push(doc.data() as PaymentRequest);
      });
      return requests;
    } catch (e: any) {
      console.error("❌ Failed to load payment requests:", e.message);
      return [];
    }
  },

  // Update payment request status
  async updatePaymentStatus(requestId: string, status: 'approved' | 'rejected') {
    if (!db) return;
    try {
      const ref = doc(db, COLLECTIONS.PAYMENT_REQUESTS, requestId);
      await updateDoc(ref, { status });
      console.log(`✅ Payment ${requestId} updated to ${status}`);
    } catch (e: any) {
      console.error("❌ Failed to update payment status:", e.message);
      throw e;
    }
  },

  // --- REFERRALS (Keeping legacy support or moving to collections if needed) ---
  // For now, implementing as collections for consistency

  async saveReferral(referral: ReferralProfile) {
    if (!db) return;
    try {
      await setDoc(doc(db, COLLECTIONS.REFERRALS, referral.id), referral);
    } catch (e) { console.error(e); }
  },

  async loadReferrals(): Promise<ReferralProfile[]> {
    if (!db) return [];
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.REFERRALS));
      return snapshot.docs.map(doc => doc.data() as ReferralProfile);
    } catch (e) { return []; }
  },

  async saveReferralTransaction(tx: ReferralTransaction) {
    if (!db) return;
    try {
      await setDoc(doc(db, COLLECTIONS.REFERRAL_TXS, tx.id), tx);
    } catch (e) { console.error(e); }
  }
};
