-- Welcome-bonus points granted to a customer on their FIRST registration
-- (type 'signup_bonus' in points_transactions). 0 = feature off.
-- Controlled from the admin Settings screen (points section).

alter table settings
  add column if not exists points_signup_bonus integer not null default 0;