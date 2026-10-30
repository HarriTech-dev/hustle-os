export interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string;
  business_logo?: string;
  country: string;
  currency: "NGN" | "GHS" | "KES" | "ZAR" | "UGX" | "TZS" | "USD" | "EUR";
  phone?: string;
  address?: string;
  tax_id?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: "starter" | "growth" | "pro";
  status: "active" | "cancelled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_provider: "paystack" | "flutterwave";
  payment_provider_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "owner" | "admin" | "manager" | "staff";
  created_at: string;
  updated_at: string;
}

export interface OnboardingState {
  user_id: string;
  completed: boolean;
  step: number;
  business_name: string;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}
