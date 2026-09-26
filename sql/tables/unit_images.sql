CREATE TABLE unit_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_unit_images_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE
);