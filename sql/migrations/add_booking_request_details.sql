ALTER TABLE booking_requests
    ADD COLUMN requested_check_in DATE NULL AFTER request_status,
    ADD COLUMN requested_check_out DATE NULL AFTER requested_check_in,
    ADD COLUMN requested_guests INT NULL AFTER requested_check_out,
    ADD COLUMN requested_special_requests TEXT NULL AFTER requested_guests;