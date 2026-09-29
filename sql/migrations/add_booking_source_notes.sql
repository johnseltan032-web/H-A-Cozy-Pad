ALTER TABLE bookings
    ADD COLUMN booking_source VARCHAR(50) NOT NULL DEFAULT 'direct' AFTER status,
    ADD COLUMN notes TEXT NULL AFTER booking_source;
