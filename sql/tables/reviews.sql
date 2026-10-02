CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    unit_id INT NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(customer_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_review_rating
        CHECK (rating BETWEEN 1 AND 5)
);
