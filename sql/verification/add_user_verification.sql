alter table users
    add column email_verified boolean not null default false,
    add column email_verified_at timestamp null;