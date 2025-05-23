-- Modify Users Table
ALTER TABLE users
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN date_of_birth DROP NOT NULL,
ALTER COLUMN country_of_birth DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN password DROP NOT NULL;

-- Modify Deposits Table
ALTER TABLE deposits
ALTER COLUMN amount DROP NOT NULL;

-- Modify W ithdrawals Table
ALTER TABLE withdrawals
ALTER COLUMN amount DROP NOT NULL;

-- Modify Deposit Details Table
ALTER TABLE deposit_details
ALTER COLUMN binance_id DROP NOT NULL,
ALTER COLUMN binance_name DROP NOT NULL,
ALTER COLUMN wallet_name DROP NOT NULL;

-- Add application_id column to checklist_visibility table
ALTER TABLE checklist_visibility 
ADD COLUMN application_id INTEGER REFERENCES applications(application_id);

-- Update existing records to link with corresponding application_id
UPDATE checklist_visibility cv
SET application_id = (
    SELECT application_id 
    FROM users 
    WHERE users.id = cv.user_id
);

-- Make application_id NOT NULL after updating existing records
ALTER TABLE checklist_visibility 
ALTER COLUMN application_id SET NOT NULL;
