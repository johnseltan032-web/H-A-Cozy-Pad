CREATE TABLE IF NOT EXISTS customer_profiles (
    customer_id int auto_increment primary key,
    user_id int not null unique,
    created_at timestamp default current_timestamp,
    constraint fk_customer_profile_user
        foreign key (user_id)
        references users(user_id)
        on delete cascade
);