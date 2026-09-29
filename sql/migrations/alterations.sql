ALTER TABLE payments
    MODIFY verified_at DATETIME NULL;

ALTER TABLE bookings
    ADD COLUMN cancellation_reason TEXT NULL,
    ADD COLUMN cancelled_at DATETIME NULL;

ALTER TABLE booking_requests
    ADD COLUMN payment_amount DECIMAL(10,2) NULL AFTER requested_special_requests,
    ADD COLUMN refund_amount DECIMAL(10,2) NULL AFTER payment_amount,
    ADD COLUMN proof_of_payment VARCHAR(255) NULL AFTER refund_amount,
    ADD COLUMN payment_status ENUM('not_required','pending','verified','rejected') NOT NULL DEFAULT 'not_required' AFTER proof_of_payment;

ALTER TABLE users
    MODIFY role ENUM('super_admin', 'admin', 'customer') NOT NULL DEFAULT 'customer';

UPDATE users
SET role = CASE
    WHEN role = 'admin' THEN 'super_admin'
    WHEN role = 'assistant' THEN 'admin'
    ELSE role
END
WHERE role IN ('admin', 'assistant');

ALTER TABLE admin_profiles
    MODIFY position ENUM('super_admin', 'admin') NOT NULL;

UPDATE admin_profiles ap
JOIN users u ON u.user_id = ap.user_id
SET ap.position = CASE
    WHEN u.role = 'super_admin' THEN 'super_admin'
    ELSE 'admin'
END
WHERE ap.position IN ('admin', 'assistant');