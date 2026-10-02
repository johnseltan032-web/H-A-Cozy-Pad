CREATE TABLE IF NOT EXISTS payments (
    payment_id int auto_increment primary key,
    booking_id int not null,
    amount decimal(10, 2) not null,
    payment_method enum('e-wallet', 'bank_transfer', 'cash', 'card') not null,
    proof_of_payment varchar(255) not null,
    payment_status enum('pending', 'verified', 'rejected', 'refunded') not null default 'pending',
    verified_by int null,
    verified_at datetime null,
    created_at timestamp default current_timestamp,
    constraint fk_payment_booking
        foreign key (booking_id)
        references bookings(booking_id)
        on delete cascade,
    constraint fk_payment_verified_by
        foreign key (verified_by)
        references admin_profiles(admin_id)
        on delete set null
);