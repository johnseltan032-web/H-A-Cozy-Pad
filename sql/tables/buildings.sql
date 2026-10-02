CREATE TABLE IF NOT EXISTS buildings (
    building_id int auto_increment primary key,
    building_name varchar(100) not null,
    property_name varchar(100) not null,
    google_maps_url varchar(500) not null,
    created_at timestamp default current_timestamp
);