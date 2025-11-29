-- =====================================================
-- Hisaab Kitaab - Simple Schema (No Supabase Auth)
-- Run this in your Supabase SQL Editor
-- First, drop existing tables if they exist
-- =====================================================

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS transaction_details CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS price_lists CASCADE;
DROP TABLE IF EXISTS dictionary CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS voucher_types CASCADE;
DROP TABLE IF EXISTS company_info CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE (Simple custom auth)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. COMPANY INFORMATION TABLE
-- =====================================================
CREATE TABLE company_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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
-- 3. VOUCHER TYPES TABLE
-- =====================================================
CREATE TABLE voucher_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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
-- 4. CHART OF ACCOUNTS TABLE
-- =====================================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    legacy_code INTEGER,
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

CREATE INDEX idx_accounts_legacy ON accounts(legacy_code);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);

-- =====================================================
-- 5. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    legacy_tr_no INTEGER UNIQUE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_type_code INTEGER NOT NULL DEFAULT 101,
    voucher_number VARCHAR(50),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    invoice_number VARCHAR(50),
    invoice_date DATE,
    narration TEXT,
    narration_urdu TEXT,
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    is_posted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_legacy ON transactions(legacy_tr_no);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- =====================================================
-- 6. TRANSACTION DETAILS TABLE
-- =====================================================
CREATE TABLE transaction_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    legacy_account_code INTEGER,
    account_id UUID REFERENCES accounts(id),
    description TEXT,
    description_urdu TEXT,
    debit_amount DECIMAL(18, 2) DEFAULT 0,
    credit_amount DECIMAL(18, 2) DEFAULT 0,
    quantity DECIMAL(18, 4),
    rate DECIMAL(18, 4),
    weight DECIMAL(18, 4),
    line_order INTEGER DEFAULT 0,
    control_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_details_transaction ON transaction_details(transaction_id);
CREATE INDEX idx_transaction_details_account ON transaction_details(account_id);
CREATE INDEX idx_transaction_details_legacy ON transaction_details(legacy_account_code);

-- =====================================================
-- 7. DICTIONARY TABLE
-- =====================================================
CREATE TABLE dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    english_word VARCHAR(255) NOT NULL,
    urdu_word VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, english_word)
);

-- =====================================================
-- 8. PRICE LISTS TABLE
-- =====================================================
CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

-- =====================================================
-- 9. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    currency_symbol VARCHAR(10) DEFAULT 'Rs.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DISABLE ROW LEVEL SECURITY (Simple approach)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (we'll handle auth in the app)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON company_info FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON voucher_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transaction_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON dictionary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON price_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- CREATE MAIN USER (Sajjad - Owner of all data)
-- =====================================================
INSERT INTO users (id, email, password_hash, name) 
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'sajjad90999@gmail.com',
    '12E2d786@2',
    'Sajjad'
);

-- Create company info for Sajjad
INSERT INTO company_info (user_id, company_name, company_name_urdu)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Home Sweet Home',
    'ہوم سویٹ ہوم'
);

-- Create user settings
INSERT INTO user_settings (user_id, language, theme)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'en',
    'light'
);

SELECT 'Schema created successfully! Now run: node scripts/complete-migration.js' as message;
