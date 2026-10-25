ALTER TABLE users
    ADD COLUMN pin_hash VARCHAR(255) NULL AFTER password_hash;
