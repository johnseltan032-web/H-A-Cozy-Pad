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