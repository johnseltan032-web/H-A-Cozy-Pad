ALTER TABLE buildings
    ADD COLUMN property_name VARCHAR(100) NULL AFTER building_name;

UPDATE buildings
SET property_name = building_name
WHERE property_name IS NULL OR property_name = '';

ALTER TABLE buildings
    MODIFY property_name VARCHAR(100) NOT NULL;