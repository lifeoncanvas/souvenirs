-- Login tokens carry this version; bumping it (password reset/change) signs the user out everywhere.
alter table users add column token_version integer not null default 0;

-- Optimistic lock so concurrent checkouts cannot exceed a coupon's usage limit.
alter table coupons add column version bigint not null default 0;

-- Payment method chosen at checkout, and when an unpaid order is released back to stock.
alter table orders add column payment_method varchar(30);
alter table orders add column expires_at timestamp(6) with time zone;
create index idx_orders_status_expires on orders (status, expires_at);

-- Gateway capture id (PayPal capture), used for webhooks and refunds.
alter table payments add column capture_reference varchar(200);
create index idx_payments_provider_reference on payments (provider_reference);
create index idx_payments_capture_reference on payments (capture_reference);

-- Reset and verification tokens are now stored as SHA-256 hashes, so links issued before this
-- release can no longer match. Clear them; customers can request a fresh link.
update users set reset_token = null, reset_token_expires_at = null, verification_token = null;
