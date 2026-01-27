
import { db } from "./firebase";
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, serverTimestamp, increment, Timestamp, orderBy, limit 
} from "firebase/firestore";
import { UserProfile, Purchase, Package, PaymentRequest, GirlfriendProfile, Influencer, WithdrawalRequest, InfluencerPayout } from "../types";
import { PACKAGES } from "../constants";

const COLLECTIONS = {
  USERS: 'users',
  MODELS: 'models',
  PACKAGES: 'packages',
  PURCHASES: 'purchases',
  INFLUENCERS: 'influencers',
  INFLUENCER_PAYOUTS: 'influencer_payouts',
  WITHDRAWALS: 'withdrawals' 
};

export const cloudStore = {
  // --- USER MANAGEMENT ---
  async initializeUser(uid: string, email: string, name: string, photoURL: string): Promise<UserProfile> {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);

    let userData: UserProfile;

    if (snap.exists()) {
      userData = snap.data() as UserProfile;
      if (userData.status === 'active' && userData.packageEnd) {
        if (new Date() > userData.packageEnd.toDate()) {
          await updateDoc(userRef, {
            status: 'free',
            packageId: null,
            packageStart: null,
            packageEnd: null,
            unlockedModels: []
          });
          userData.status = 'free';
          userData.packageId = null;
          userData.unlockedModels = [];
        }
      }
    } else {
      const cleanName = (name || 'User').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const referralCode = `${cleanName}${randomDigits}`;

      let referredBy = null;
      const storedRef = localStorage.getItem('priyo_ref_code');
      if (storedRef) {
        const q = query(collection(db, COLLECTIONS.USERS), where('referralCode', '==', storedRef));
        const refSnap = await getDocs(q);
        if (!refSnap.empty) referredBy = refSnap.docs[0].id;
      }

      userData = {
        uid, email, name, photoURL,
        role: email === 'admin@priyo.com' ? 'admin' : 'user',
        status: 'free',
        packageId: null, packageStart: null, packageEnd: null,
        credits: 0,
        unlockedModels: [], unlockedContent: [],
        referralCode,
        referredBy,
        referralEarnings: 0,
        referralsCount: 0,
        joinedDate: Timestamp.now()
      };
      await setDoc(userRef, userData);
    }
    
    return {
      ...userData,
      id: uid,
      avatar: userData.photoURL || photoURL,
      isPremium: userData.status === 'active',
      tier: userData.packageId === 'package3' ? 'VIP' : (userData.status === 'active' ? 'Plus' : 'Free'),
      isAdmin: userData.role === 'admin'
    };
  },

  async getUserByReferralCode(code: string): Promise<UserProfile | null> {
    const q = query(collection(db, COLLECTIONS.USERS), where('referralCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as UserProfile;
  },

  // --- INFLUENCERS ---
  async getAllInfluencers(): Promise<Influencer[]> {
      const snap = await getDocs(collection(db, COLLECTIONS.INFLUENCERS));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Influencer));
  },

  async getInfluencerByCode(code: string): Promise<Influencer | null> {
      const q = query(collection(db, COLLECTIONS.INFLUENCERS), where('code', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { ...snap.docs[0].data(), id: snap.docs[0].id } as Influencer;
  },

  // --- WITHDRAWALS ---
  async createWithdrawalRequest(req: WithdrawalRequest) {
      await setDoc(doc(db, COLLECTIONS.WITHDRAWALS, req.id), req);
  },

  async getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
      const q = query(collection(db, COLLECTIONS.WITHDRAWALS), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as WithdrawalRequest).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async approveWithdrawal(req: WithdrawalRequest) {
      await updateDoc(doc(db, COLLECTIONS.WITHDRAWALS, req.id), { status: 'paid', paidAt: new Date().toISOString() });
      const userRef = doc(db, COLLECTIONS.USERS, req.userId);
      await updateDoc(userRef, { referralEarnings: increment(-req.amount) });
  },

  // --- ADMIN TOOLS ---
  async getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
  },

  async saveModel(model: GirlfriendProfile) {
    await setDoc(doc(db, COLLECTIONS.MODELS, model.id), model);
  },

  async loadModels(): Promise<GirlfriendProfile[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.MODELS));
    return snap.docs.map(d => d.data() as GirlfriendProfile);
  },

  async getModels(): Promise<GirlfriendProfile[]> {
    return this.loadModels();
  },

  // --- PURCHASES & FINANCE ---
  async createPurchase(purchase: Purchase) {
    await setDoc(doc(db, COLLECTIONS.PURCHASES, purchase.id), purchase);
  },

  async loadPendingPayments(): Promise<PaymentRequest[]> {
    const q = query(collection(db, COLLECTIONS.PURCHASES), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const p = d.data() as Purchase;
        return {
            id: p.id, userId: p.uid, userName: p.userName, type: p.type, amount: p.amount,
            status: p.status, bkashNumber: p.bkashNumber, trxId: p.transactionId,
            timestamp: p.createdAt, tier: p.tier, referralCodeUsed: p.referralCodeUsed
        } as PaymentRequest;
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async approvePayment(req: PaymentRequest) {
    const pRef = doc(db, COLLECTIONS.PURCHASES, req.id);
    const pSnap = await getDoc(pRef);
    if (!pSnap.exists()) return;
    const purchase = pSnap.data() as Purchase;

    await updateDoc(pRef, { status: 'approved', approvedAt: new Date().toISOString() });
    const userRef = doc(db, COLLECTIONS.USERS, purchase.uid);

    if (purchase.type === 'package') {
      const pkg = PACKAGES.find(p => p.id === purchase.itemId);
      if (pkg) {
        const end = new Date(); end.setDate(end.getDate() + pkg.durationDays);
        await updateDoc(userRef, {
          status: 'active', packageId: pkg.id,
          packageStart: serverTimestamp(),
          packageEnd: Timestamp.fromDate(end),
          credits: increment(pkg.creditsIncluded)
        });
      }
    } else if (purchase.type === 'credits') {
      await updateDoc(userRef, { credits: increment(purchase.amount) });
    }

    // Commission
    if (purchase.referralCodeUsed) {
        const influencer = await this.getInfluencerByCode(purchase.referralCodeUsed);
        if (influencer) {
            const commission = Math.floor(purchase.amount * (influencer.commissionRate / 100));
            await updateDoc(doc(db, COLLECTIONS.INFLUENCERS, influencer.id!), { earnings: increment(commission), totalSales: increment(1) });
        } else {
            const refUser = await this.getUserByReferralCode(purchase.referralCodeUsed);
            if (refUser) {
                 const commission = Math.floor(purchase.amount * 0.10); 
                 await updateDoc(doc(db, COLLECTIONS.USERS, refUser.id!), { referralEarnings: increment(commission), referralsCount: increment(1) });
            }
        }
    }
  },

  async rejectPayment(id: string) {
    await updateDoc(doc(db, COLLECTIONS.PURCHASES, id), { status: 'rejected' });
  },

  async unlockModelSlot(uid: string, modelId: string) {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { success: false };
    const userData = snap.data() as UserProfile;
    if (userData.packageId === 'package3') return { success: true };
    const pkg = PACKAGES.find(p => p.id === userData.packageId);
    if (!pkg || (pkg.modelLimit !== -1 && (userData.unlockedModels?.length || 0) >= pkg.modelLimit)) return { success: false };
    await updateDoc(userRef, { unlockedModels: [...(userData.unlockedModels || []), modelId] });
    return { success: true };
  },

  async unlockContent(uid: string, contentId: string, cost: number) {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { credits: increment(-cost), unlockedContent: increment(1) as any }); // Simplified for logic
  },

  async getAdminStats() {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    const purchasesSnap = await getDocs(collection(db, COLLECTIONS.PURCHASES));
    const influencersSnap = await getDocs(collection(db, COLLECTIONS.INFLUENCERS));
    const withdrawalsSnap = await getDocs(collection(db, COLLECTIONS.WITHDRAWALS));
    const modelsSnap = await getDocs(collection(db, COLLECTIONS.MODELS));
    
    const revenue = purchasesSnap.docs.map(d => d.data() as Purchase).filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
    const infCommission = influencersSnap.docs.map(d => d.data() as Influencer).reduce((sum, i) => sum + (Number(i.earnings) || 0) + (Number(i.totalPaid) || 0), 0);
    const userWalletCommission = usersSnap.docs.map(d => d.data() as UserProfile).reduce((sum, u) => sum + (Number(u.referralEarnings) || 0), 0);
    const userPaidCommission = withdrawalsSnap.docs.map(d => d.data() as WithdrawalRequest).filter(w => w.status === 'paid').reduce((sum, w) => sum + Number(w.amount), 0);
    const totalCommission = infCommission + userWalletCommission + userPaidCommission;

    return { 
      totalUsers: usersSnap.size, 
      revenue, 
      totalCommission, 
      netIncome: revenue - totalCommission,
      activeModels: modelsSnap.size
    };
  }
};
