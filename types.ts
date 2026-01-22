export interface Category {
  id: string;
  name: string;
  isSystem?: boolean; // For "Inbox"
}

export interface LinkItem {
  id: string;
  url: string; // The "Truth" - Original URL
  title: string; // The "Alias" - Display Name
  description?: string;
  tags: string[];
  categoryId: string;
  createdAt: number;
  isFavorite: boolean;
  tapCount: number; // For future analytics / sorting by popularity
  isCustomTitle?: boolean; // New: Tracks if the name was manually set (Premium feature)
}

export type SortOption = 'newest' | 'oldest' | 'az';

// The protocol for sharing data via URL
export interface SharedCategoryPayload {
  name: string;
  links: Omit<LinkItem, 'id' | 'categoryId' | 'createdAt' | 'isFavorite' | 'tapCount' | 'isCustomTitle'>[];
  sharedBy?: string; 
  timestamp: number;
}

// --- SUBSCRIPTION & INFRASTRUCTURE ---

export type SubscriptionStatus = 'FREE' | 'PREMIUM_ACTIVE';

export interface PremiumPlan {
  id: string;
  displayName: string;
  price: string;
  interval: 'month' | 'year';
  storeKitId: string;
}

export type AnalyticsEventType = 
  | 'premium_feature_blocked' 
  | 'premium_hint_shown' 
  | 'premium_cta_clicked' 
  | 'purchase_attempt' 
  | 'purchase_success' 
  | 'purchase_failed';

export interface FeatureFlags {
  isPremiumEnabled: boolean; // Master switch for logic
  isPaywallEnabled: boolean; // Master switch for UI availability
}