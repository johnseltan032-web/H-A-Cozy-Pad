CREATE TABLE IF NOT EXISTS faqs (
    faq_id int auto_increment primary key,
    category_id int not null,
    question text not null,
    answer text not null,
    created_at timestamp default current_timestamp,
    constraint fk_faq_category
        foreign key (category_id)
        references faqs_categories(category_id)
        on delete cascade
);