ALTER TABLE bookings
    MODIFY customer_id INT NULL;

ALTER TABLE bookings
    DROP FOREIGN KEY fk_booking_customer,
    ADD CONSTRAINT fk_booking_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(customer_id)
        ON DELETE SET NULL;

ALTER TABLE booking_details
    ADD COLUMN guest_email VARCHAR(254) NULL AFTER guest_contact_num;