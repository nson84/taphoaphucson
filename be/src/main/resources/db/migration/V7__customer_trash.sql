ALTER TABLE customers
    ADD COLUMN trashed_at DATETIME NULL;

CREATE INDEX idx_customers_trashed_at ON customers (trashed_at);

-- Khách đã hết nợ (không còn khoản unpaid, còn khoản đã trả) → đưa vào thùng rác
UPDATE customers c
SET trashed_at = (
    SELECT MAX(d.paid_at)
    FROM debts d
    WHERE d.customer_id = c.id
      AND d.paid = TRUE
)
WHERE NOT EXISTS (
    SELECT 1 FROM debts d WHERE d.customer_id = c.id AND d.paid = FALSE
)
AND EXISTS (
    SELECT 1 FROM debts d WHERE d.customer_id = c.id AND d.paid = TRUE
);
