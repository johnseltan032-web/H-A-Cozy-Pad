ALTER TABLE admin_profiles
    ADD COLUMN can_view_statistics BOOLEAN NOT NULL DEFAULT FALSE;
