CREATE DATABASE IF NOT EXISTS ha_cozy_pad_db;
USE ha_cozy_pad_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(250) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    role ENUM('admin', 'assistant', 'customer') NOT NULL DEFAULT 'customer',
    contact_num VARCHAR(11) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_profiles (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    position ENUM('admin', 'assistant') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_profiles (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buildings (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL,
    property_category VARCHAR(100) NOT NULL DEFAULT 'Home-type property',
    location VARCHAR(150) NOT NULL,
    location_search VARCHAR(255) NULL,
    country VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    street VARCHAR(150) NULL,
    unit_location VARCHAR(50) NULL,
    zip VARCHAR(20) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    unit_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    property_size VARCHAR(100) NULL,
    max_guests INT NOT NULL DEFAULT 1,
    bathrooms INT NOT NULL DEFAULT 0,
    bedroom_details JSON NULL,
    rate_per_night DECIMAL(10, 2) NOT NULL,
    base_price DECIMAL(10, 2) NULL,
    customer_id INT NULL,
    status ENUM('available', 'occupied', 'maintenance', 'unavailable') NOT NULL DEFAULT 'available',
    available_from DATE NULL,
    available_until DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(customer_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_unit_building
        FOREIGN KEY (building_id)
        REFERENCES buildings(building_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    unit_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_of_guests INT NOT NULL DEFAULT 1,
    cancellation_reason TEXT NULL,
    cancelled_at DATETIME NULL,
    status ENUM('pending', 'awaiting_payment', 'payment_review', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_customer
        FOREIGN KEY (customer_id)
        REFERENCES customer_profiles(customer_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_booking_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id),
    CONSTRAINT chk_booking_dates
        CHECK (check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS booking_details (
    booking_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    guest_name VARCHAR(50) NOT NULL,
    guest_contact_num VARCHAR(11) NOT NULL,
    guest_email VARCHAR(254) NULL,
    valid_id_path VARCHAR(255) NOT NULL,
    vehicle_plate_num VARCHAR(7) NULL,
    vehicle_type VARCHAR(50) NULL,
    special_requests TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_details_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chatbot_logs (
    chatbot_log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chatbot_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faqs_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
    faq_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_faq_category
        FOREIGN KEY (category_id)
        REFERENCES faqs_categories(category_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    booking_id INT NULL,
    type ENUM('booking', 'payment', 'reminder', 'cancellation', 'system') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('e-wallet', 'bank_transfer', 'cash', 'card') NOT NULL,
    proof_of_payment VARCHAR(255) NOT NULL,
    payment_status ENUM('pending', 'verified', 'rejected', 'refunded') NOT NULL DEFAULT 'pending',
    verified_by INT NULL,
    verified_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payment_verified_by
        FOREIGN KEY (verified_by)
        REFERENCES admin_profiles(admin_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS unit_amenities (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    amenity_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS unit_amenity (
    unit_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (unit_id, amenity_id),
    CONSTRAINT fk_unit_amenity_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_unit_amenity_amenity
        FOREIGN KEY (amenity_id)
        REFERENCES unit_amenities(amenity_id)
        ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS unit_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_images_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evt_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    UNIQUE KEY uq_token_hash (token_hash)
);

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