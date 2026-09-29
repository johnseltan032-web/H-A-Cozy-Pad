create table buildings(
    building_id int auto_increment primary key,
    building_name varchar(100) not null,
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