CREATE TABLE IF NOT EXISTS faqs_categories (
    category_id int auto_increment primary key,
    category_name varchar(50) not null unique,
    created_at timestamp default current_timestamp
);