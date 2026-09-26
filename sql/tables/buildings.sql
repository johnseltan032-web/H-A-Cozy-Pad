create table buildings(
    building_id int auto_increment primary key,
    building_name varchar(100) not null,
    location varchar(150) not null,
    latitude decimal(10, 7) null,
    longitude decimal(10, 7) null,
    created_at timestamp default current_timestamp
);