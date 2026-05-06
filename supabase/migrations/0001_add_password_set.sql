-- Adds a flag tracking whether each user has set a password yet.
-- Magic-link users start with password_set=false and get prompted to
-- set a password on first login so they can re-enter without waiting
-- for another email next time.
alter table profiles
  add column if not exists password_set boolean not null default false;
