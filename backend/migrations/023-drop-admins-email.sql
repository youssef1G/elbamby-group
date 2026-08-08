-- Admin accounts no longer carry an email: login is username + password
-- only (the email column was never used for auth or notifications).

alter table admins drop column if exists email;