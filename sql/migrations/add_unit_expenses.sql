CREATE TABLE IF NOT EXISTS unit_expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_id INT NOT NULL,
    expense_date DATE NOT NULL,
    category ENUM(
        'cleaning',
        'maintenance',
        'supplies',
        'rent',
        'electricity',
        'water',
        'internet',
        'repairs',
        'amenities',
        'laundry',
        'toiletries',
        'other'
    ) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unit_expense_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(unit_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_unit_expense_creator
        FOREIGN KEY (created_by)
        REFERENCES admin_profiles(admin_id)
        ON DELETE SET NULL,
    CONSTRAINT chk_unit_expense_amount
        CHECK (amount >= 0)
);

CREATE INDEX idx_unit_expenses_unit_date
    ON unit_expenses(unit_id, expense_date);

CREATE INDEX idx_unit_expenses_category
    ON unit_expenses(category, expense_date);
