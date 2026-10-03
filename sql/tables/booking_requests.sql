CREATE TABLE IF NOT EXISTS booking_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    request_type ENUM('cancellation', 'modification') NOT NULL,
    request_reason TEXT NOT NULL,
    request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    requested_check_in DATE NULL,
    requested_check_out DATE NULL,
    requested_guests BIGINT UNSIGNED NULL,
    requested_special_requests TEXT NULL,
    payment_amount DECIMAL(10,2) NULL,
    refund_amount DECIMAL(10,2) NULL,
    proof_of_payment VARCHAR(255) NULL,
    payment_status ENUM('not_required', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_required',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_request_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
);
