
-- Step 1: Delete the 18 duplicate rows that were incorrectly inserted
DELETE FROM contestant_registrations WHERE id IN (
  'fffb3173-091b-46e2-aebb-1d2a83799d02',
  '22e71d59-7a0e-4b06-8a39-a7e1f8661967',
  'ea439706-acdb-4ec7-81fe-c5d37853e20a',
  '4ebd8d09-72ab-4b39-b617-9feea7461ae5',
  'e1fb77a7-c022-4fdd-a34d-a5661960ba92',
  'f8173d5a-80e2-48aa-8da9-102163149f96',
  '98edae63-28dd-4e4e-8202-7aa2e6a0c66e',
  '1f3e18d7-d43f-40d9-bb8b-34cbaa4cd3cb',
  '4d444f84-b728-470a-99fd-8d98fd00da7b',
  '36ef5516-54ec-485f-9605-40213a583948',
  '3f0ba1e4-2633-4769-a17c-b2306f1f2f7d',
  '46d9092c-6c89-48f0-b3ac-b6c4c02a3613',
  '5869a8fd-4fc1-4f8f-91ac-6f9262cf5ae0',
  'b3052f6e-9adf-42ab-881c-665e12628047',
  '4343c48b-eb59-4ec8-89d5-b9af259e3871',
  'c2ead88f-9b2b-4552-a19c-308364ce111b',
  '4851e622-3be8-45ef-8b20-64342b06fb88',
  '9b710417-9ff2-4e98-949c-3dd38b2de27b'
);

-- Step 2: Update the 12 existing blank rows with CSV data (name, email, phone, sub_event)
-- Row 1: Shanyce Bethel - Solo > Female > 5-8
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'exchangepres.pri@fac.edu.tt', phone = '18686364010', sub_event_id = 'a9075730-7eac-4ba2-8610-a43c90ca67df' WHERE id = 'dafc3dae-4f1f-4359-a295-306b0e9aba7c';

-- Row 2: Shanyce Bethel - Duet > Mixed > 9+
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'exchangepres.pri@fac.edu.tt', phone = '18686364010', sub_event_id = 'defa8e27-5fc9-447c-adba-61fac11391b5' WHERE id = '3a32051b-3f00-4e6d-89a4-b78e745e5904';

-- Row 3: Cassandra Pran Foncette - Group > Folk
UPDATE contestant_registrations SET full_name = 'Cassandra Pran Foncette', email = 'cassypran@gmail.com', sub_event_id = 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4' WHERE id = '87940c6d-e8d8-4df7-95a6-853d18b37648';

-- Row 4: Cassandra Pran Foncette - Group > Folk
UPDATE contestant_registrations SET full_name = 'Cassandra Pran Foncette', email = 'cassypran@gmail.com', sub_event_id = 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4' WHERE id = 'd1e35dde-bf54-482c-88ba-0f3c4f2ed81d';

-- Row 5: Kerry Ann Rodgers - Group > Creative
UPDATE contestant_registrations SET full_name = 'Kerry Ann Rodgers', email = 'krodgers10@yahoo.com', sub_event_id = '5e06acf1-a6e4-4d19-8f6a-74a9a355fad5' WHERE id = '4fd0ef49-339e-4cb3-b0ab-882d5b4ddca4';

-- Row 6: Kerry Ann Rodgers - Group > Folk
UPDATE contestant_registrations SET full_name = 'Kerry Ann Rodgers', email = 'krodgers10@yahoo.com', sub_event_id = 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4' WHERE id = '5b5aae29-7cb6-4af2-8114-b1bd9c37c615';

-- Row 7: Santa Flora Government Primary School - Solo > Female > 9+
UPDATE contestant_registrations SET full_name = 'Santa Flora Government Primary School', email = 'noemail_6@placeholder.local', sub_event_id = '6f82dc63-b66a-4ffe-a98e-6f50312faa8c' WHERE id = '82ec96fd-f1e4-4e2f-8882-ada9d09f22f5';

-- Row 8: Adriana Khan - Solo > Female > 5-8
UPDATE contestant_registrations SET full_name = 'Adriana Khan', email = 'adrikhan64@gmail.com', sub_event_id = 'a9075730-7eac-4ba2-8610-a43c90ca67df' WHERE id = 'e181e540-1b92-496d-94ef-57e846139d93';

-- Row 9: Shanyce Bethel - Solo > Female > 9+
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'danstarsda@gmail.com', sub_event_id = '6f82dc63-b66a-4ffe-a98e-6f50312faa8c' WHERE id = '14c7a455-1779-4241-a92b-807b74c980d4';

-- Row 10: Shanyce Bethel - Solo > Female > 9+
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'danstarsda@gmail.com', sub_event_id = '6f82dc63-b66a-4ffe-a98e-6f50312faa8c' WHERE id = 'eb922457-e15e-4a6c-83ca-5bf22620b9e7';

-- Row 11: Shanyce Bethel - Solo > Female > 5-8
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'danstarsda@gmail.com', sub_event_id = 'a9075730-7eac-4ba2-8610-a43c90ca67df' WHERE id = 'e506b809-031c-4c11-978b-02979c1332bd';

-- Row 12: Shanyce Bethel - Solo > Female > 9+
UPDATE contestant_registrations SET full_name = 'Shanyce Bethel', email = 'danstarsda@gmail.com', sub_event_id = '6f82dc63-b66a-4ffe-a98e-6f50312faa8c' WHERE id = '9b59edd1-8ed2-4300-b3d6-9173f8631900';

-- Step 3: Insert 6 new rows for CSV rows 13-18
INSERT INTO contestant_registrations (competition_id, user_id, full_name, email, sub_event_id, status, sort_order, age_category)
VALUES
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Athenian Presecondary school', 'athenian.priv@fac.edu.tt', '6f82dc63-b66a-4ffe-a98e-6f50312faa8c', 'approved', 13, '9+'),
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Enterprise Government primary school', 'mdos1986@gmail.com', '5e06acf1-a6e4-4d19-8f6a-74a9a355fad5', 'approved', 14, 'adult'),
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Athenian Presecondary school', 'athenian.priv@fac.edu.tt', '6f82dc63-b66a-4ffe-a98e-6f50312faa8c', 'approved', 15, '9+'),
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Athenian Presecondary school', 'athenian.priv@fac.edu.tt', 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4', 'approved', 16, 'adult'),
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Enterprise Government primary school', 'mdos1986@gmail.com', 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4', 'approved', 17, 'adult'),
  ('969015b6-ec4d-4665-8059-98dbe3096579', 'b0b252c9-1dfe-473a-b1f4-b0906f36bc8d', 'Adriana Khan', 'danceradri5@gmail.com', 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4', 'approved', 18, 'adult');
