create table users(
    user_id int auto_increment primary key,
    full_name varchar(50) not null,
    email varchar(50) not null, 
    password varchar(255) not null,
    role enum('super_admin', 'admin', 'customer') not null default 'customer',
    contact_num varchar(11) not null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);