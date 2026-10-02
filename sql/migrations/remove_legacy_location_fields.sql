ALTER TABLE buildings
    MODIFY COLUMN google_maps_url VARCHAR(500) NULL,
    DROP COLUMN location,
    DROP COLUMN location_search,
    DROP COLUMN country,
    DROP COLUMN state,
    DROP COLUMN city,
    DROP COLUMN street,
    DROP COLUMN unit_location,
    DROP COLUMN zip,
    DROP COLUMN latitude,
    DROP COLUMN longitude;
