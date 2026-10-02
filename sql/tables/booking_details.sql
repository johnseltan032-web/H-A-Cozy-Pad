CREATE TABLE IF NOT EXISTS booking_details (
    booking_detail_id int auto_increment primary key,
    booking_id int not null unique,
    guest_name varchar(50) not null,
    guest_contact_num varchar(11) not null,
    guest_email varchar(254) null,
    valid_id_path varchar(255) not null,
    vehicle_plate_num varchar(7) null,
    vehicle_type varchar(50) null,
    special_requests text null,
    created_at timestamp default current_timestamp,
    constraint fk_booking_details_booking
        foreign key (booking_id)
        references bookings(booking_id)
        on delete cascade
);