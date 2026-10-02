CREATE TABLE IF NOT EXISTS unit_amenity (
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