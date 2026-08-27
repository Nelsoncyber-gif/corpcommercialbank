-- Database Schema for Banking App

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    date_of_birth DATE,
    occupation VARCHAR(100),
    tax_id VARCHAR(50),
    next_of_kin_name VARCHAR(200),
    next_of_kin_phone VARCHAR(20),
    next_of_kin_relationship VARCHAR(50),
    profile_picture VARCHAR(500),
    pin_hash VARCHAR(255),
    transaction_pin VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair existing users and enforce valid roles.
UPDATE users
SET role = 'user'
WHERE role IS NULL;

UPDATE users
SET role = 'admin'
WHERE LOWER(email) = 'admin@corpcommercialbank.com';

ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'user',
    ALTER COLUMN role SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check,
    ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'customer'));

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table with backdated_by column
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    sender_account VARCHAR(50),
    receiver_account VARCHAR(50),
    receiver_name VARCHAR(100),
    receiver_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    description TEXT,
    original_date TIMESTAMP,
    transfer_type VARCHAR(20) DEFAULT 'domestic',
    swift_code VARCHAR(50),
    beneficiary_address TEXT,
    reason_for_transaction TEXT,
    destination_country VARCHAR(100),
    backdated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create account_approvals table
CREATE TABLE IF NOT EXISTS account_approvals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT
);

-- Create card_requests table
CREATE TABLE IF NOT EXISTS card_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_type VARCHAR(50) DEFAULT 'Visa',
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_number VARCHAR(255) NOT NULL,
    card_holder_name VARCHAR(200) NOT NULL,
    expiry_date VARCHAR(10) NOT NULL,
    cvv VARCHAR(255) NOT NULL,
    card_type VARCHAR(50) DEFAULT 'Visa',
    status VARCHAR(20) DEFAULT 'pending',
    balance DECIMAL(15, 2) DEFAULT 0.00,
    daily_limit DECIMAL(15, 2) DEFAULT 1000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_card_requests_user_id ON card_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_approvals_user_id ON account_approvals(user_id);
