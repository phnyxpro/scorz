-- Advance Primary Schools contestants from Semifinal Round to Grand Finale
-- Copies registrations and remaps level + category hierarchy in custom_field_values

DO $$
DECLARE
  rec RECORD;
  new_cfv JSONB;
  new_sub_event UUID;
  top_cat UUID;
  mid_cat UUID;
  age_cat UUID;
  next_sort INT;
  -- Constants
  GRAND_FINALE_LEVEL CONSTANT UUID := '1125e1fa-dc73-4695-9dae-d1de0b4212e1';
  -- Source registration IDs to advance
  ids UUID[] := ARRAY[
    -- From CSV (Semifinal results)
    'e181e540-1b92-496d-94ef-57e846139d93'::UUID, -- Adriana Khan / J'naiyah - Solo F 5-8
    'e506b809-031c-4c11-978b-02979c1332bd'::UUID, -- Shanyce / Aunsri Goyal - Solo F 5-8
    'dafc3dae-4f1f-4359-a295-306b0e9aba7c'::UUID, -- Shanyce / Elena Ali - Solo F 5-8
    '3a32051b-3f00-4e6d-89a4-b78e745e5904'::UUID, -- Shanyce / Mikayla & Leanna Khan - Duet 9+
    '14c7a455-1779-4241-a92b-807b74c980d4'::UUID, -- Shanyce / Maya Pope - Solo F 9+
    '5b62b33c-95b8-4319-b4a0-b16e9a982aa5'::UUID, -- Athenian / Soraiya Goodman - Solo F 9+
    'eb922457-e15e-4a6c-83ca-5bf22620b9e7'::UUID, -- Shanyce / Sreya Goyal - Solo F 9+
    'bcea18ad-308b-4c53-bab0-04704896ec1a'::UUID, -- Athenian / Daniella Daniel - Solo F 9+
    '82ec96fd-f1e4-4e2f-8882-ada9d09f22f5'::UUID, -- Santa Flora / Reneece Phillip - Solo F 9+
    '4f2a6d02-446e-4f6c-b565-203e401fcaf1'::UUID, -- Athenian Group Folk caribbean
    '87940c6d-e8d8-4df7-95a6-853d18b37648'::UUID, -- Cassandra / Catalina Henry+ Group Folk european
    '5b5aae29-7cb6-4af2-8114-b1bd9c37c615'::UUID, -- Kerry Ann / Janae Rodgers+ Group Folk
    '4d8af557-c8d5-4ce1-a1b2-5eada1642198'::UUID, -- Enterprise Group Folk
    '8fe5953e-a5cd-47e1-8fe5-76a94633d11e'::UUID, -- Adriana Khan / Guaico Group Folk east_indian
    '4fd0ef49-339e-4cb3-b0ab-882d5b4ddca4'::UUID, -- Kerry Ann / Zariah Wright+ Group Creative
    '4f58bce6-be24-4e7b-9270-b294561dd892'::UUID, -- Enterprise Group Creative
    -- Cedar Grove additions
    '91caf77b-0146-4dad-aa6d-c32788522204'::UUID, -- Cedar Grove - Kenson - Group Creative
    '0f3cde1e-5a51-4ed8-a5bc-1244deddc004'::UUID, -- Cedar Grove - Kenson - Group General (ballet)
    '3a62bb8a-eb20-4f9d-9412-bf38c093f9a1'::UUID, -- Cedar Grove - Kenson - Group General (modern)
    '5a0564eb-96da-41bb-9ec0-446c2dbc2e54'::UUID, -- Cedar Grove - Kenson - Solo F 5-8 (Mia Achat-Ali)
    '845d9a8d-8644-4d16-a19e-a93ba67c8a62'::UUID, -- Cedar Grove - Kenson - Solo F 5-8 (Maya Rubz)
    '0a65675a-893c-4851-92f1-f2df20cc5ff2'::UUID  -- Cedar Grove - Kenson - Solo F 9+ (Ashleiya Sookdeo)
  ];
BEGIN
  -- Determine starting sort_order for Grand Finale
  SELECT COALESCE(MAX(cr.sort_order), -1) + 1 INTO next_sort
  FROM contestant_registrations cr
  JOIN sub_events se ON se.id = cr.sub_event_id
  WHERE cr.competition_id = '969015b6-ec4d-4665-8059-98dbe3096579'
    AND se.level_id = GRAND_FINALE_LEVEL;

  FOR rec IN
    SELECT * FROM contestant_registrations
    WHERE id = ANY(ids)
    ORDER BY sub_event_id, full_name
  LOOP
    -- Map semifinal sub_event -> grand finale sub_event and category IDs
    CASE rec.sub_event_id
      WHEN 'a9075730-7eac-4ba2-8610-a43c90ca67df' THEN -- Solo F 5-8
        new_sub_event := 'd5643cec-b0bb-4159-bae7-1d8b2665cbfd';
        top_cat := '2c63cac0-7ffc-4fcd-be51-f1d7e1463f98';
        mid_cat := '28708ba4-d33d-4bf6-8055-917f207fba03';
        age_cat := '68955147-9d1c-462c-b479-b24fbdcf74cc';
      WHEN '6f82dc63-b66a-4ffe-a98e-6f50312faa8c' THEN -- Solo F 9+
        new_sub_event := '92af8372-03e0-40bf-8f7b-c8e395d0b7ec';
        top_cat := '2c63cac0-7ffc-4fcd-be51-f1d7e1463f98';
        mid_cat := '28708ba4-d33d-4bf6-8055-917f207fba03';
        age_cat := '21eecc85-1e45-47dc-bce5-0411d44544f0';
      WHEN 'defa8e27-5fc9-447c-adba-61fac11391b5' THEN -- Duet Mixed 9+
        new_sub_event := '8ff03604-b16e-4656-bf83-4fbf3e0c69dd';
        top_cat := 'a4cfa3c3-d31d-4fe7-ad79-cb3edebc146c';
        mid_cat := '8a6cc99b-57ea-4046-a3b1-87d8cd6cc0ad';
        age_cat := 'e44ed954-5425-4df9-bd4f-a5c36775ccac';
      WHEN 'b7a6b3c9-e7bd-4ac7-b8e4-8249552047f4' THEN -- Group Folk
        new_sub_event := 'e3eed091-cb70-4f52-bd73-c4d3e52f3ca2';
        top_cat := 'd39d21ca-9ab3-4c68-9e8e-a020c9023313';
        mid_cat := '8403722e-7fd1-4688-be68-65c0472c8166';
        age_cat := NULL;
      WHEN '5e06acf1-a6e4-4d19-8f6a-74a9a355fad5' THEN -- Group Creative
        new_sub_event := 'eec321ba-1538-4ca5-a980-4da6e85cc733';
        top_cat := 'd39d21ca-9ab3-4c68-9e8e-a020c9023313';
        mid_cat := '5e4b7e96-61d0-4a72-a2b9-1112b2f08838';
        age_cat := NULL;
      WHEN '72d7492c-39c5-4b85-8284-99ce8f15b4ff' THEN -- Group General
        new_sub_event := '312c2ee2-5b7b-4235-b00d-ee472249f693';
        top_cat := 'd39d21ca-9ab3-4c68-9e8e-a020c9023313';
        mid_cat := '31ba6541-1167-4930-b81c-b26b7874c575';
        age_cat := NULL;
      ELSE
        RAISE EXCEPTION 'Unmapped sub_event_id: %', rec.sub_event_id;
    END CASE;

    -- Build updated custom_field_values
    new_cfv := COALESCE(rec.custom_field_values, '{}'::jsonb)
      || jsonb_build_object(
        'cf_1774993358212', GRAND_FINALE_LEVEL::text,
        'cf_1774990289937', top_cat::text,
        'cf_1774990296537', mid_cat::text,
        'cf_1774990424221', COALESCE(age_cat::text, ''),
        'sort_order', next_sort
      );

    INSERT INTO contestant_registrations (
      id, competition_id, user_id, full_name, email, phone, location,
      bio, profile_photo_url, performance_video_url,
      sub_event_id, age_category, special_entry_type, status,
      custom_field_values, sort_order, social_handles,
      rules_acknowledged, rules_acknowledged_at,
      contestant_signature, contestant_signed_at,
      guardian_name, guardian_email, guardian_phone,
      guardian_signature, guardian_signed_at
    ) VALUES (
      gen_random_uuid(), rec.competition_id, rec.user_id, rec.full_name, rec.email, rec.phone, rec.location,
      rec.bio, rec.profile_photo_url, rec.performance_video_url,
      new_sub_event, rec.age_category, rec.special_entry_type, 'approved',
      new_cfv, next_sort, rec.social_handles,
      rec.rules_acknowledged, rec.rules_acknowledged_at,
      rec.contestant_signature, rec.contestant_signed_at,
      rec.guardian_name, rec.guardian_email, rec.guardian_phone,
      rec.guardian_signature, rec.guardian_signed_at
    );

    next_sort := next_sort + 1;
  END LOOP;
END $$;