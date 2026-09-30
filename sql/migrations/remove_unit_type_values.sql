UPDATE units
SET unit_name = CASE
    WHEN NULLIF(TRIM(tower), '') IS NOT NULL
        AND NULLIF(TRIM(unit_number), '') IS NOT NULL
        THEN CONCAT(TRIM(tower), ' ', TRIM(unit_number))
    WHEN NULLIF(TRIM(tower), '') IS NOT NULL
        THEN TRIM(tower)
    WHEN NULLIF(TRIM(unit_number), '') IS NOT NULL
        THEN CONCAT('Unit ', TRIM(unit_number))
    ELSE CONCAT('Unit ', unit_id)
END
WHERE unit_name IN ('Entire place', 'Room', 'Hostel shared-room');