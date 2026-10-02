CREATE TABLE IF NOT EXISTS notifications (
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