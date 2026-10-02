ALTER TABLE bookings
    ADD COLUMN check_in_time TIME NULL AFTER check_out_date,
    ADD COLUMN check_out_time TIME NULL AFTER check_in_time;