use ha_cozy_pad_db;
 
create table IF NOT EXISTS reviews(
    review_id int auto_increment primary key,
    booking_id int not null unique,
    customer_id int not null,
    unit_id int not null,
    rating tinyint unsigned not null,
    comment text null,
    created_at timestamp default current_timestamp,
    constraint fk_review_booking
        foreign key (booking_id)
        references bookings(booking_id)
        on delete cascade,
    constraint fk_review_customer
        foreign key (customer_id)
        references customer_profiles(customer_id)
        on delete cascade,
    constraint fk_review_unit
        foreign key (unit_id)
        references units(unit_id)
        on delete cascade,
    constraint chk_review_rating
        check (rating between 1 and 5)
);