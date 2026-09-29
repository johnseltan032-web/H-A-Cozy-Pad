<?php
    $DB_HOST = getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: 'localhost';
    $DB_NAME = getenv('MYSQLDATABASE') ?: getenv('MYSQL_DATABASE') ?: getenv('DB_NAME') ?: 'ha_cozy_pad_db';
    $DB_USER = getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root';
    $DB_PASS = getenv('MYSQLPASSWORD') ?: getenv('MYSQL_ROOT_PASSWORD') ?: getenv('DB_PASSWORD') ?: '';
    $DB_PORT = (int) (getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: 3306);
    $FRONTEND_ORIGIN = getenv('FRONTEND_ORIGIN') ?: 'http://localhost:5173';
    $SMTP_USERNAME = getenv('SMTP_USERNAME') ?: getenv('GMAIL_USER') ?: '';
    $SMTP_PASSWORD = getenv('SMTP_PASSWORD') ?: getenv('GMAIL_APP_PASSWORD') ?: '';
    $SMTP_HOST = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
    $SMTP_PORT = (int) (getenv('SMTP_PORT') ?: 465);
    $SMTP_SECURE = strtolower(getenv('SMTP_SECURE') ?: 'ssl');
    $EMAIL_FROM = getenv('EMAIL_FROM') ?: getenv('GMAIL_USER') ?: '';
    $EMAIL_FROM_NAME = getenv('EMAIL_FROM_NAME') ?: 'H&A Cozy Pad';
?>