
-- Create fake auth users for seed data (judges, tabulator, witness)
-- Using raw_user_meta_data to store display names
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('a1a1a1a1-0001-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amara.okafor@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Dr. Amara Okafor"}', now(), now()),
  ('a1a1a1a1-0002-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'james.liu@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Professor James Liu"}', now(), now()),
  ('a1a1a1a1-0003-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'natasha.petrov@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Natasha Petrov"}', now(), now()),
  ('a1a1a1a1-0004-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carlos.mendez@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Carlos Mendez"}', now(), now()),
  ('a1a1a1a1-0005-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.sharma@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Priya Sharma"}', now(), now()),
  ('a1a1a1a1-0006-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.osei@example.com', crypt('SeedPassword123!', gen_salt('bf')), now(), '{"full_name":"Rev. David Osei"}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user trigger should auto-create profiles, but insert explicitly in case
INSERT INTO public.profiles (user_id, full_name, email) VALUES
  ('a1a1a1a1-0001-4000-8000-000000000001', 'Dr. Amara Okafor', 'amara.okafor@example.com'),
  ('a1a1a1a1-0002-4000-8000-000000000002', 'Professor James Liu', 'james.liu@example.com'),
  ('a1a1a1a1-0003-4000-8000-000000000003', 'Natasha Petrov', 'natasha.petrov@example.com'),
  ('a1a1a1a1-0004-4000-8000-000000000004', 'Carlos Mendez', 'carlos.mendez@example.com'),
  ('a1a1a1a1-0005-4000-8000-000000000005', 'Priya Sharma', 'priya.sharma@example.com'),
  ('a1a1a1a1-0006-4000-8000-000000000006', 'Rev. David Osei', 'david.osei@example.com')
ON CONFLICT (user_id) DO NOTHING;

-- Assign roles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('a1a1a1a1-0001-4000-8000-000000000001', 'judge'),
  ('a1a1a1a1-0002-4000-8000-000000000002', 'judge'),
  ('a1a1a1a1-0003-4000-8000-000000000003', 'judge'),
  ('a1a1a1a1-0004-4000-8000-000000000004', 'judge'),
  ('a1a1a1a1-0005-4000-8000-000000000005', 'tabulator'),
  ('a1a1a1a1-0006-4000-8000-000000000006', 'witness')
ON CONFLICT DO NOTHING;

-- Sub-event assignments
-- Chief judge: bc66de4f-4881-4af3-8497-11cf50e159e0
-- Prelim Heat A: c1000000-0000-0000-0000-000000000001
-- Prelim Heat B: c1000000-0000-0000-0000-000000000002
-- Semi-Final:    c1000000-0000-0000-0000-000000000003
-- Grand Final:   c1000000-0000-0000-0000-000000000004

INSERT INTO public.sub_event_assignments (sub_event_id, user_id, role) VALUES
  -- Prelim Heat A: judges 1,2 + chief + tab + witness
  ('c1000000-0000-0000-0000-000000000001', 'a1a1a1a1-0001-4000-8000-000000000001', 'judge'),
  ('c1000000-0000-0000-0000-000000000001', 'a1a1a1a1-0002-4000-8000-000000000002', 'judge'),
  ('c1000000-0000-0000-0000-000000000001', 'bc66de4f-4881-4af3-8497-11cf50e159e0', 'chief_judge'),
  ('c1000000-0000-0000-0000-000000000001', 'a1a1a1a1-0005-4000-8000-000000000005', 'tabulator'),
  ('c1000000-0000-0000-0000-000000000001', 'a1a1a1a1-0006-4000-8000-000000000006', 'witness'),
  -- Prelim Heat B: judges 3,4 + chief + tab + witness
  ('c1000000-0000-0000-0000-000000000002', 'a1a1a1a1-0003-4000-8000-000000000003', 'judge'),
  ('c1000000-0000-0000-0000-000000000002', 'a1a1a1a1-0004-4000-8000-000000000004', 'judge'),
  ('c1000000-0000-0000-0000-000000000002', 'bc66de4f-4881-4af3-8497-11cf50e159e0', 'chief_judge'),
  ('c1000000-0000-0000-0000-000000000002', 'a1a1a1a1-0005-4000-8000-000000000005', 'tabulator'),
  ('c1000000-0000-0000-0000-000000000002', 'a1a1a1a1-0006-4000-8000-000000000006', 'witness'),
  -- Semi-Final: judges 1,2,3 + chief + tab + witness
  ('c1000000-0000-0000-0000-000000000003', 'a1a1a1a1-0001-4000-8000-000000000001', 'judge'),
  ('c1000000-0000-0000-0000-000000000003', 'a1a1a1a1-0002-4000-8000-000000000002', 'judge'),
  ('c1000000-0000-0000-0000-000000000003', 'a1a1a1a1-0003-4000-8000-000000000003', 'judge'),
  ('c1000000-0000-0000-0000-000000000003', 'bc66de4f-4881-4af3-8497-11cf50e159e0', 'chief_judge'),
  ('c1000000-0000-0000-0000-000000000003', 'a1a1a1a1-0005-4000-8000-000000000005', 'tabulator'),
  ('c1000000-0000-0000-0000-000000000003', 'a1a1a1a1-0006-4000-8000-000000000006', 'witness'),
  -- Grand Final: all 4 judges + chief + tab + witness
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0001-4000-8000-000000000001', 'judge'),
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0002-4000-8000-000000000002', 'judge'),
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0003-4000-8000-000000000003', 'judge'),
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0004-4000-8000-000000000004', 'judge'),
  ('c1000000-0000-0000-0000-000000000004', 'bc66de4f-4881-4af3-8497-11cf50e159e0', 'chief_judge'),
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0005-4000-8000-000000000005', 'tabulator'),
  ('c1000000-0000-0000-0000-000000000004', 'a1a1a1a1-0006-4000-8000-000000000006', 'witness');
