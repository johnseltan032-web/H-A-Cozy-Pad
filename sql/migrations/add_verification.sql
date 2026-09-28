create table IF NOT EXISTS email_verification_tokens(
    token_id int auto_increment primary key,
    user_id int not null,
    token_hash char(64) not null,
    expires_at datetime not null,
    used_at datetime null,
    created_at timestamp default current_timestamp,
    constraint fk_evt_user
        foreign key (user_id)
        references users(user_id)
        on delete cascade,
    unique key uq_token_hash (token_hash)
);

alter table users
    add column email_verified boolean not null default false,
    add column email_verified_at timestamp null,
    add column email_notifications boolean not null default true;