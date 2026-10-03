CREATE TABLE IF NOT EXISTS admin_activity_log (
    log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    actor_name VARCHAR(150) NOT NULL,
    action VARCHAR(60) NOT NULL,
    description VARCHAR(500) NOT NULL,
    target_type VARCHAR(60) NULL,
    target_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_activity_created (created_at, log_id),
    INDEX idx_admin_activity_actor (actor_user_id, created_at),
    CONSTRAINT fk_admin_activity_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
