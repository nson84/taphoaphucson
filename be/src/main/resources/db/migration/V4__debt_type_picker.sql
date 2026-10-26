ALTER TABLE debts
    ADD COLUMN debt_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' AFTER customer_id,
    ADD COLUMN picker_name VARCHAR(80) NULL AFTER customer_note;
