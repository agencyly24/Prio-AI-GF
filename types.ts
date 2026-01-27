
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'free' | 'active';

export interface Package {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  voiceEnabled: boolean;
  creditsIncluded: number;
  modelLimit: number;
  description: string;
  features: string[];
  color: string;
}

export type SubscriptionTier = 'Free' | 'Plus' | 'Pro' | 'VIP';

export interface UserProfile {
  uid: string;
  id?: string;
  email: string;
  name: string;
  photoURL: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isAdmin?: boolean;
  packageId: string | null;
  packageStart: Timestamp | null;
  packageEnd: Timestamp | null;
  isPremium?: boolean;
  subscriptionExpiry?: string | Date;
  tier?: SubscriptionTier;
  credits: number;
  unlockedModels: string[];
  unlockedContent: string[];
  unlockedContentIds?: string[];
  referralCode: string;
  referredBy: string | null;
  referralEarnings: number;
  referralsCount?: number;
  joinedDate: Timestamp;
}

export interface ProfileGalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  isExclusive?: boolean;
  creditCost?: number;
  title?: string;
  tease?: string;
  keywords?: string[]; // Added for smart filtering
}

export type ModelMode = 'Friend' | 'Girlfriend' | 'Wife' | 'Sexy';

export interface GirlfriendProfile {
  id: string;
  name: string;
  age: number;
  intro: string;
  image: string;
  mode: ModelMode;
  personality: string;
  systemPrompt: string;
  voiceName: string;
  appearance: {
    ethnicity: string;
    eyeColor: string;
    bodyType: string;
    measurements?: string;
    height?: string;
    breastSize: string;
    hairStyle: string;
    hairColor: string;
    outfit: string;
  };
  character: {
    relationship: string;
    occupation: string;
    kinks: string[];
  };
  gallery: ProfileGalleryItem[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'model';
  text: string;
  timestamp: Date | string;
  attachment?: {
    type: 'image';
    url: string;
  };
}

export type ViewState = 
  | 'landing' 
  | 'auth' 
  | 'dashboard' 
  | 'model-view' 
  | 'admin' 
  | 'profile' 
  | 'packages'
  | 'chat'
  | 'subscription'
  | 'profile-selection'
  | 'account'
  | 'admin-panel';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  name: string;
  badge?: string;
}

export interface PaymentRequest {
  id: string;
  userId?: string;
  uid?: string;
  userName?: string;
  type: 'package' | 'credits' | 'subscription';
  tier?: string;
  creditPackageId?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bkashNumber: string;
  trxId: string;
  timestamp: string;
  referralCodeUsed?: string;
  discountApplied?: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: 'Bkash' | 'Nagad';
  number: string;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: string;
}

export interface Influencer {
  id?: string;
  name: string;
  code: string;
  commissionRate: number;
  discountAmount: number;
  paymentMethod: string;
  paymentNumber: string;
  earnings: number;
  totalSales: number;
  totalPaid?: number;
  isActive: boolean;
}

export interface InfluencerPayout {
  id: string;
  influencerId: string;
  influencerName: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  paymentNumber: string;
}

export interface Purchase {
  id: string;
  uid: string;
  userName: string;
  type: 'package' | 'credits' | 'subscription';
  itemId?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentMethod: string;
  transactionId: string;
  bkashNumber: string;
  createdAt: string;
  tier?: string;
  creditPackageId?: string;
  referralCodeUsed?: string;
}
