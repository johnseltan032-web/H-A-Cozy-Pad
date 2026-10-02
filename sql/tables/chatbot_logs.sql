CREATE TABLE IF NOT EXISTS chatbot_logs (
    chatbot_log_id int auto_increment primary key,
    user_id int null,
    question text not null,
    response text not null,
    created_at timestamp default current_timestamp,
    constraint fk_chatbot_user
        foreign key (user_id)
        references users(user_id)
        on delete set null
);