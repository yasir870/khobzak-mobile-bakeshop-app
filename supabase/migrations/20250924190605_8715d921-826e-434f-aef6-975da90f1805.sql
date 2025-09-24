-- Insert test drivers directly into auth.users table using the auth admin API
-- This will be handled by the Edge Function, but let's ensure the test_credentials are ready

-- Clear existing test credentials first
DELETE FROM test_credentials WHERE user_type = 'driver';

-- Insert fresh test credentials
INSERT INTO test_credentials (email, password, phone, name, user_type) VALUES
('driver1@test.com', 'password123', '07801234567', 'سائق تجريبي 1', 'driver'),
('driver2@test.com', 'password123', '07801234568', 'سائق تجريبي 2', 'driver'),
('driver3@test.com', 'password123', '07801234569', 'سائق تجريبي 3', 'driver');

-- Clear existing drivers first
DELETE FROM drivers WHERE email LIKE 'driver%@test.com';

-- Insert test drivers into drivers table (we'll link them after auth users are created)
INSERT INTO drivers (name, phone, email, approved) VALUES
('سائق تجريبي 1', '07801234567', 'driver1@test.com', true),
('سائق تجريبي 2', '07801234568', 'driver2@test.com', true),
('سائق تجريبي 3', '07801234569', 'driver3@test.com', true);