ALTER TABLE units
    ADD COLUMN tower VARCHAR(50) NULL AFTER unit_name,
    ADD COLUMN unit_number VARCHAR(50) NULL AFTER tower;
