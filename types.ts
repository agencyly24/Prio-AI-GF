
export type SubscriptionTier = 'Free' | 'Priya' | 'MonChoya' | 'VIP';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  discountPrice: number;
  features: string[];
  profileLimit: number;
  color: string;
}

export interface ReferralProfile {
  id: string;
  name: string;
  couponCode: string;
  commissionRate: number; // Percentage (e.g. 20%)
  discountAmount: number; // Fixed Amount (e.g. 100 Tk)
  status: 'active' | 'inactive';
  paymentInfo?: string; // Bkash/Nagad number
  totalEarnings?: number; // Calculated field
  paidEarnings?: number; // Calculated field
}

export interface ReferralTransaction {
  id: string;
  referralId: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  timestamp: string;
  note?: string;
}

export enum PersonalityType {
  Sweet = 'Sweet & Caring',
  Romantic = 'Romantic & Flirty',
  Playful = 'Playful & Funny',
  Listener = 'Emotional Listener',
  Intellectual = 'Intellectual',
  Girlfriend = 'Girlfriend Mode',
  Wife = 'Caring Wife',
  Flirty = 'Flirty Girl',
  Sexy = 'Sexy Girl',
  Horny = 'Horny Mode',
  Friend = 'Just Friend'
}

export interface ProfileGalleryItem {
  id?: string; // Unique ID for unlocking
  type: 'image' | 'video';
  url: string;
  isExclusive?: boolean; // New: Is it premium content?
  creditCost?: number;   // New: Cost to unlock
  title?: string;        // New: Seductive Title
  tease?: string;        // New: Tease Note
}

export interface GirlfriendProfile {
  id: string;
  name: string;
  age: number;
  personality: PersonalityType;
  image: string;
  voiceName: string;
  intro: string;
  systemPrompt: string;
  knowledge?: string[]; // New: Topics the AI knows about (Context/Lore)
  appearance: {
    ethnicity: string;
    eyeColor: string;
    bodyType: string;
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

export interface UserProfile {
  id: string;
  uid: string; // Ensuring UID is always present
  name: string;
  email: string;
  avatar: string;
  bio: string;
  level: number;
  xp: number;
  joinedDate: string;
  tier: SubscriptionTier;
  isPremium: boolean;
  isVIP: boolean;
  isAdmin: boolean;
  role: 'user' | 'admin';

  subscriptionExpiry?: string; // ISO Date string for expiration tracking
  
  // Wallet Fields
  credits: number; 
  unlockedContentIds: string[];
  stats: {
    messagesSent: number;
    hoursChatted: number;
    companionsMet: number;
  };
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  tier?: SubscriptionTier; // Optional for credit purchase
  creditPackageId?: string; // New for credits
  amount: number;
  discountApplied: number;
  bkashNumber: string;
  trxId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string; // ISO string
  couponUsed?: string;
  referralId?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  badge?: string;
}

export type View = 'landing' | 'auth' | 'age-verification' | 'profile-selection' | 'profile-detail' | 'chat' | 'account' | 'subscription' | 'admin-panel';
