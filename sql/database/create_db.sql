create database IF NOT EXISTS ha_cozy_pad_db;
use ha_cozy_pad_db;

create table IF NOT EXISTS users(
    user_id int auto_increment primary key,
    full_name varchar(50) not null,
    email varchar(50) not null, 
    password varchar(250) not null,
    role enum('admin', 'assistant', 'customer') not null default 'customer',
    contact_num varchar(11) not null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

create table IF NOT EXISTS admin_profiles(
    admin_id int auto_increment primary key,
    user_id int not null unique,
    position enum('admin', 'assistant') not null,
    created_at timestamp default current_timestamp,
    foreign key (user_id)
        references users(user_id)
        on delete cascade
);

create table IF NOT EXISTS customer_profiles(
    customer_id int auto_increment primary key,
    user_id int not null unique,
    created_at timestamp default current_timestamp,
    constraint fk_customer_user
        foreign key (user_id)
        references users(user_id)
        on delete cascade
);

create table IF NOT EXISTS buildings(
    building_id int auto_increment primary key,
    building_name varchar(100) not null,
    property_category varchar(100) NOT NULL DEFAULT 'Home-type property',
    location varchar(150) not null,
    location_search varchar(255) null,
    country varchar(100) null,
    state varchar(100) null,
    city varchar(100) null,
    street varchar(150) null,
    unit_location varchar(50) null,
    zip varchar(20) null,
    latitude decimal(10, 7) null,
    longitude decimal(10, 7) null,
    created_at timestamp default current_timestamp
);

create table IF NOT EXISTS units(
    unit_id int auto_increment primary key,
    building_id int not null,
    unit_name varchar(100) not null,
    description text null,
    property_size varchar(100) null,
    max_guests int not null default 1,
    bathrooms int not null default 0,
    bedroom_details json null,
    rate_per_night decimal(10, 2) not null,
    base_price decimal(10, 2) null,
    discounts json null,
    status enum('available', 'occupied', 'maintenance', 'unavailable') not null default 'available',
    available_from date null,
    available_until date null,
    created_at timestamp default current_timestamp,
    constraint fk_unit_building
        foreign key (building_id)
        references buildings(building_id)
        on delete cascade
);

create table IF NOT EXISTS bookings(
    booking_id int auto_increment primary key,
    customer_id int not null,
    unit_id int not null,
    check_in_date date not null,
    check_out_date date not null,
    num_of_guests int not null default 1,
    cancellation_reason text null,
    cancelled_at datetime null,
    status enum('pending', 'awaiting_payment', 'payment_review', 'confirmed', 'checked_in', 'checked_out', 
                'cancelled', 'rejected') not null default 'pending',
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    constraint fk_booking_customer
        foreign key (customer_id)
        references customer_profiles(customer_id),
    constraint fk_booking_unit
        foreign key (unit_id)
        references units(unit_id),
    constraint chk_booking_dates
        check(check_out_date > check_in_date)
);

create table IF NOT EXISTS booking_details(
    booking_detail_id int auto_increment primary key,
    booking_id int not null unique,
    guest_name varchar(50) not null,
    guest_contact_num varchar(11) not null,
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

create table NOT EXISTS chatbot_logs(
    chatbot_log_id int auto_increment primary key,
    user_id int null,
    question text not null,
    response text not null,
    created_at timestamp default current_timestamp,
    constraint fk_chatbot_user
        foreign key (user_id)
        references users(user_id)
        on delete set null
);

create table NOT EXISTS faqs_categories(
    category_id int auto_increment primary key,
    category_name varchar(50) not null unique,
    created_at timestamp default current_timestamp
);

create table NOT EXISTS faqs(
    faq_id int auto_increment primary key,
    category_id int not null,
    question text not null,
    answer text not null,
    created_at timestamp default current_timestamp,
    constraint fk_faq_category
        foreign key (category_id)
        references faqs_categories(category_id)
        on delete cascade
);

create table NOT EXISTS notifications(
    notification_id int auto_increment primary key,
    user_id int not null,
    booking_id int null,
    type enum('booking', 'payment', 'reminder', 'cancellation', 'system') not null,
    message text not null,
    is_read boolean not null default false,
    sent_at datetime not null,
    created_at timestamp default current_timestamp,
    constraint fk_notification_user
        foreign key (user_id)
        references users(user_id)
        on delete cascade,
    constraint fk_notification_booking
        foreign key (booking_id)
        references bookings(booking_id)
        on delete set null
);

create table NOT EXISTS payments(
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

create table NOT EXISTS unit_amenities(
    amenity_id int auto_increment primary key,
    amenity_name varchar(100) not null unique
);

create table NOT EXISTS unit_amenity(
    unit_id int not null,
    amenity_id int not null,
    primary key(unit_id, amenity_id),
    constraint fk_unit_amenity_unit
        foreign key (unit_id)
        references units(unit_id)
        on delete cascade,
    constraint fk_unit_amenity_amenity
        foreign key (amenity_id)
        references unit_amenities(amenity_id)
        on delete cascade
);

CREATE TABLE IF NOT EXISTS booking_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    request_type ENUM('cancellation', 'modification') NOT NULL,
    request_reason TEXT NOT NULL,
    request_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    requested_check_in DATE NULL,
    requested_check_out DATE NULL,
    requested_guests INT NULL,
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

CREATE TABLE unit_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_unit_images_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE
);