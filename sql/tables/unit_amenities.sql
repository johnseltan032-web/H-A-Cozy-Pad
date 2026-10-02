CREATE TABLE IF NOT EXISTS unit_amenities (
    amenity_id int auto_increment primary key,
    amenity_name varchar(100) not null unique
);