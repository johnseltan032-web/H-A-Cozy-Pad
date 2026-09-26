<?php
    $DB_HOST = getenv('DB_HOST') ?: getenv('MYSQLHOST') ?: 'localhost';
    $DB_NAME = getenv('DB_NAME') ?: getenv('MYSQLDATABASE') ?: 'ha_cozy_pad_db';
    $DB_USER = getenv('DB_USER') ?: getenv('MYSQLUSER') ?: 'root';
    $DB_PASS = getenv('DB_PASSWORD') ?: getenv('MYSQLPASSWORD') ?: '';
    $DB_PORT = (int) (getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: 3306);
    $FRONTEND_ORIGIN = getenv('FRONTEND_ORIGIN') ?: 'http://localhost:5173';
?>