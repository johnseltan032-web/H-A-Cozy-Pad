create table users(
    user_id int auto_increment primary key,
    full_name varchar(50) not null,
    email varchar(50) not null, 
    password varchar(250) not null,
    role enum('super_admin', 'admin', 'customer') not null default 'customer',
    contact_num varchar(11) not null,
    email_verified boolean not null default false,
    email_verified_at timestamp null default null,
    email_notifications boolean not null default true,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);