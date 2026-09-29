CREATE TABLE IF NOT EXISTS unit_blocked_dates (
    blocked_date_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    blocked_from DATE NOT NULL,
    blocked_until DATE NOT NULL,
    reason ENUM('owner_stay', 'maintenance', 'renovation', 'deep_cleaning', 'other') NOT NULL DEFAULT 'other',
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_blocked_dates_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_blocked_dates_admin
        FOREIGN KEY (created_by)
        REFERENCES admin_profiles(admin_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_blocked_dates
        CHECK (blocked_until >= blocked_from)
);

CREATE INDEX idx_unit_blocked_dates_unit_range
    ON unit_blocked_dates(unit_id, blocked_from, blocked_until);
