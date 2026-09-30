ALTER TABLE users
    MODIFY role ENUM('super_admin', 'admin', 'customer') NOT NULL DEFAULT 'customer';

ALTER TABLE admin_profiles
    MODIFY position ENUM('super_admin', 'admin') NOT NULL;