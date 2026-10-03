CREATE TABLE IF NOT EXISTS bookings (
    booking_id int auto_increment primary key,
    customer_id int null,
    unit_id int not null,
    check_in_date date not null,
    check_out_date date not null,
    check_in_time time null,
    check_out_time time null,
    num_of_guests bigint unsigned not null default 0,
    cancellation_reason text null,
    cancelled_at datetime null,
    status enum('pending', 'awaiting_payment', 'payment_review', 'confirmed', 'checked_in', 'checked_out', 
                'cancelled', 'rejected') not null default 'pending',
    booking_source varchar(50) not null default 'direct',
    notes text null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    constraint fk_booking_customer
        foreign key (customer_id)
        references customer_profiles(customer_id)
        on delete set null,
    constraint fk_booking_unit
        foreign key (unit_id)
        references units(unit_id),
    constraint chk_booking_dates
        check(check_out_date > check_in_date)
);