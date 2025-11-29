-- =====================================================
-- Hisaab Kitaab - Accounting System Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COMPANY INFORMATION TABLE
-- =====================================================
CREATE TABLE company_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_name_urdu VARCHAR(255),
    address TEXT,
    address_urdu TEXT,
    phone_numbers VARCHAR(100),
    fax_number VARCHAR(50),
    email VARCHAR(255),
    title_short VARCHAR(20),
    fiscal_year_start DATE NOT NULL DEFAULT '2024-01-01',
    fiscal_year_end DATE NOT NULL DEFAULT '2024-12-31',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- 2. VOUCHER TYPES TABLE
-- =====================================================
CREATE TABLE voucher_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code INTEGER NOT NULL,
    title VARCHAR(100) NOT NULL,
    title_urdu VARCHAR(100),
    voucher_category VARCHAR(20) NOT NULL CHECK (voucher_category IN ('opening', 'receipt', 'payment', 'journal', 'purchase', 'sale', 'stock')),
    affects_cash BOOLEAN DEFAULT FALSE,
    affects_inventory BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, code)
);

-- =====================================================
-- 3. CHART OF ACCOUNTS TABLE (Hierarchical)
-- =====================================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_name_urdu VARCHAR(255),
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    account_level INTEGER NOT NULL DEFAULT 1,
    is_header BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    opening_balance DECIMAL(18, 2) DEFAULT 0,
    balance_type VARCHAR(10) CHECK (balance_type IN ('debit', 'credit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_code)
);

-- Create index for faster hierarchical queries
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- =====================================================
-- 4. TRANSACTIONS TABLE (Main Voucher Header)
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_number SERIAL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_type_id UUID REFERENCES voucher_types(id) NOT NULL,
    voucher_number VARCHAR(50),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    narration TEXT,
    narration_urdu TEXT,
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    is_posted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_voucher_type ON transactions(voucher_type_id);

-- =====================================================
-- 5. TRANSACTION DETAILS TABLE (Voucher Lines)
-- =====================================================
CREATE TABLE transaction_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES accounts(id) NOT NULL,
    description TEXT,
    debit_amount DECIMAL(18, 2) DEFAULT 0,
    credit_amount DECIMAL(18, 2) DEFAULT 0,
    line_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_details_transaction ON transaction_details(transaction_id);
CREATE INDEX idx_transaction_details_account ON transaction_details(account_id);

-- =====================================================
-- 6. DICTIONARY TABLE (English to Urdu translations)
-- =====================================================
CREATE TABLE dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    english_word VARCHAR(255) NOT NULL,
    urdu_word VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, english_word)
);

-- =====================================================
-- 7. PRICE LISTS TABLE
-- =====================================================
CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    aq DECIMAL(10, 2),
    ar DECIMAL(10, 2),
    mq DECIMAL(10, 2),
    mr DECIMAL(10, 2),
    bq DECIMAL(10, 2),
    br DECIMAL(10, 2),
    sq DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_lists_user ON price_lists(user_id);
CREATE INDEX idx_price_lists_date ON price_lists(effective_date);

-- =====================================================
-- 8. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'ur')),
    theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Company Info Policies
CREATE POLICY "Users can view own company info" ON company_info
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company info" ON company_info
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company info" ON company_info
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own company info" ON company_info
    FOR DELETE USING (auth.uid() = user_id);

-- Voucher Types Policies
CREATE POLICY "Users can view own voucher types" ON voucher_types
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voucher types" ON voucher_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voucher types" ON voucher_types
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voucher types" ON voucher_types
    FOR DELETE USING (auth.uid() = user_id);

-- Accounts Policies
CREATE POLICY "Users can view own accounts" ON accounts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Transaction Details Policies (inherit from parent transaction)
CREATE POLICY "Users can view own transaction details" ON transaction_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = transaction_details.transaction_id 
            AND t.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert own transaction details" ON transaction_details
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = transaction_details.transaction_id 
            AND t.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update own transaction details" ON transaction_details
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = transaction_details.transaction_id 
            AND t.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete own transaction details" ON transaction_details
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.id = transaction_details.transaction_id 
            AND t.user_id = auth.uid()
        )
    );

-- Dictionary Policies (users can view all, modify own)
CREATE POLICY "Users can view all dictionary entries" ON dictionary
    FOR SELECT USING (true);
CREATE POLICY "Users can insert own dictionary entries" ON dictionary
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dictionary entries" ON dictionary
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dictionary entries" ON dictionary
    FOR DELETE USING (auth.uid() = user_id);

-- Price Lists Policies
CREATE POLICY "Users can view own price lists" ON price_lists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own price lists" ON price_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own price lists" ON price_lists
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own price lists" ON price_lists
    FOR DELETE USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_company_info_updated_at
    BEFORE UPDATE ON company_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate account balance
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL(18, 2);
    v_opening DECIMAL(18, 2);
BEGIN
    SELECT COALESCE(opening_balance, 0) INTO v_opening
    FROM accounts WHERE id = p_account_id;
    
    SELECT v_opening + COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
    INTO v_balance
    FROM transaction_details td
    JOIN transactions t ON t.id = td.transaction_id
    WHERE td.account_id = p_account_id AND t.is_posted = TRUE;
    
    RETURN COALESCE(v_balance, v_opening);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default voucher types for new user
CREATE OR REPLACE FUNCTION create_default_voucher_types()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO voucher_types (user_id, code, title, title_urdu, voucher_category, affects_cash, affects_inventory) VALUES
    (NEW.id, 100, 'Opening Balance', 'اوپننگ بیلنس', 'opening', FALSE, FALSE),
    (NEW.id, 101, 'Cash Receipt', 'نقد وصولی', 'receipt', TRUE, FALSE),
    (NEW.id, 102, 'Cash Payment', 'نقد ادائیگی', 'payment', TRUE, FALSE),
    (NEW.id, 103, 'Bank Receipt', 'بینک وصولی', 'receipt', FALSE, FALSE),
    (NEW.id, 104, 'Bank Payment', 'بینک ادائیگی', 'payment', FALSE, FALSE),
    (NEW.id, 201, 'Journal Voucher', 'جنرل ووچر', 'journal', FALSE, FALSE),
    (NEW.id, 301, 'Cash Purchase', 'نقد خرید', 'purchase', TRUE, TRUE),
    (NEW.id, 302, 'Credit Purchase', 'ادھار خرید', 'purchase', FALSE, TRUE),
    (NEW.id, 401, 'Cash Sale', 'نقد فروخت', 'sale', TRUE, TRUE),
    (NEW.id, 402, 'Credit Sale', 'ادھار فروخت', 'sale', FALSE, TRUE);
    
    -- Create default user settings
    INSERT INTO user_settings (user_id, language, theme) VALUES (NEW.id, 'en', 'light');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create defaults for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_voucher_types();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Trial Balance View
CREATE OR REPLACE VIEW trial_balance AS
SELECT 
    a.id,
    a.user_id,
    a.account_code,
    a.account_name,
    a.account_name_urdu,
    a.account_type,
    COALESCE(a.opening_balance, 0) as opening_balance,
    COALESCE(SUM(td.debit_amount), 0) as total_debit,
    COALESCE(SUM(td.credit_amount), 0) as total_credit,
    COALESCE(a.opening_balance, 0) + COALESCE(SUM(td.debit_amount), 0) - COALESCE(SUM(td.credit_amount), 0) as closing_balance
FROM accounts a
LEFT JOIN transaction_details td ON td.account_id = a.id
LEFT JOIN transactions t ON t.id = td.transaction_id AND t.is_posted = TRUE
WHERE a.is_header = FALSE
GROUP BY a.id, a.user_id, a.account_code, a.account_name, a.account_name_urdu, a.account_type, a.opening_balance;

-- =====================================================
-- SEED DATA - Default Chart of Accounts Structure
-- =====================================================
-- This will be inserted via the migration script for each user
