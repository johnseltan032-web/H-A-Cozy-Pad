ALTER TABLE buildings
    ADD COLUMN google_maps_url VARCHAR(500) NULL AFTER location_search;
