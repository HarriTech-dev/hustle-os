-- ============================================
-- HustleOS AI - Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User Profiles Policies
-- ============================================
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- Business Settings Policies
-- ============================================
CREATE POLICY "Users can view own business settings"
    ON business_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own business settings"
    ON business_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business settings"
    ON business_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business settings"
    ON business_settings FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Onboarding Policies
-- ============================================
CREATE POLICY "Users can view own onboarding"
    ON onboarding FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own onboarding"
    ON onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
    ON onboarding FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- Subscriptions Policies
-- ============================================
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscription"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- Invoices Policies
-- ============================================
CREATE POLICY "Users can view own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
    ON invoices FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Inventory Policies
-- ============================================
CREATE POLICY "Users can view own inventory"
    ON inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inventory"
    ON inventory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
    ON inventory FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
    ON inventory FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Customers Policies
-- ============================================
CREATE POLICY "Users can view own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Transactions Policies
-- ============================================
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- AI Conversations Policies
-- ============================================
CREATE POLICY "Users can view own conversations"
    ON ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
    ON ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON ai_conversations FOR DELETE
    USING (auth.uid() = user_id);
