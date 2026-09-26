<?php
    $DB_HOST = getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: 'localhost';
    $DB_NAME = getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'ha_cozy_pad_db';
    $DB_USER = getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root';
    $DB_PASS = getenv('MYSQLPASSWORD') ?: getenv('DB_PASSWORD') ?: '';
    $DB_PORT = (int) (getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: 3306);
    $FRONTEND_ORIGIN = getenv('FRONTEND_ORIGIN') ?: 'http://localhost:5173';
?>