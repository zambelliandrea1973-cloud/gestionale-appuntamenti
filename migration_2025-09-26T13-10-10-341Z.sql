
INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  1,
  3,
  'Mario',
  'Rossi',
  '3201234567',
  'mario.rossi@esempio.it',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  3,
  NULL,
  'PROF_003_0003_CLIENT_1_0001'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  2,
  3,
  'Zambelli',
  'Andrea',
  '3472550110',
  'zambelli.andrea.1973@gmail.com',
  'Via Cavallotti',
  '2025-04-24',
  'fruy',
  false,
  NULL,
  NULL,
  false,
  3,
  NULL,
  'PROF_003_0003_CLIENT_2_0002'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  25,
  9,
  'Cliente',
  'Trial',
  '+39 123456789',
  'zambelli.andrea.1973A@gmail.com',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  9,
  NULL,
  'PROF_009_9D95_CLIENT_25_5EAF'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  28,
  12,
  'Cliente',
  'Business',
  '+39 123456789',
  'zambelli.andrea.1973D@gmail.com',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  12,
  NULL,
  'PROF_012_1936_CLIENT_28_CE96'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  256,
  16,
  'pippo',
  'quattro',
  '+393472550110',
  'zambelli.andrea@libero.it',
  'Via Cavallotti',
  '2025-05-29',
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_256_5BAC'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  257,
  16,
  'Valentina',
  'Cotrino',
  '+393801808350',
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_257_CFDB'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  258,
  16,
  'Cinzia',
  'Munaretto',
  '+393333637578',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_258_E536'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  259,
  16,
  'Eleonora',
  'Tentori',
  '+393420241919',
  NULL,
  NULL,
  '1999-10-06',
  NULL,
  true,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_259_9CE6'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  261,
  16,
  'Cristina',
  'Valetti',
  '+393337124083',
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_261_99B7'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  263,
  16,
  'Matteo',
  'Somaschini',
  '+393920820219',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_263_C51C'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  264,
  12,
  'Business',
  'Account',
  '1234567890',
  'zambelli.andrea.1973D@gmail.com',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  12,
  NULL,
  'PROF_012_B830_CLIENT_264_85C1'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  265,
  16,
  'Zambelli',
  'Andrea',
  '+393472550110',
  'zambelli.andrea@libero.it',
  'Via Cavallotti, 6',
  '2022-03-26',
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_265_95C4'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  266,
  3,
  'giovanni',
  'rizzo',
  '+392550110',
  'zambelli.andrea.1973@gmail.com',
  'Via Cavallotti 9',
  '2000-07-13',
  NULL,
  false,
  NULL,
  NULL,
  false,
  3,
  NULL,
  'PROF_003_0003_CLIENT_266_0266'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  267,
  3,
  'giovanni',
  'ribbio',
  '+392550110',
  'zambelli.andrea.1973@gmail.com',
  'Via Cavallotti 9',
  '2006-10-11',
  NULL,
  false,
  NULL,
  NULL,
  false,
  3,
  NULL,
  'PROF_003_0003_CLIENT_267_0267'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  268,
  16,
  'Leila',
  'Baldovin',
  '+393312936414',
  'leila.baldovin22@gmail.com',
  NULL,
  '1999-07-10',
  'Allergia mandorle + graminacee',
  true,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_268_9B35'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  269,
  16,
  'Rosa',
  'Nappi',
  '+393479687939',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_269_2010'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  270,
  16,
  'Giovanna',
  'Spano',
  '+393666249288',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_270_B842'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  271,
  16,
  'Alan',
  'Marconi',
  '+393337960111',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_271_5A39'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  272,
  16,
  'Dino',
  'Nappi',
  '+393385893919',
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_272_FC04'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  273,
  16,
  'Matteo',
  'Libera',
  '+393494195547',
  NULL,
  NULL,
  '2004-11-13',
  NULL,
  true,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_273_5EBF'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  316,
  9,
  'Trial',
  'Account',
  '1234567890',
  'zambelli.andrea.1973A@gmail.com',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  NULL,
  false,
  9,
  NULL,
  'PROF_009_9D95_CLIENT_316_8EFE'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  513,
  16,
  'provaci ancora',
  'due',
  '+393472550110',
  'zambelli.andrea@libero.it',
  'Via Cavallotti',
  '2013-07-19',
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_513_7E52'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  514,
  16,
  'maaa',
  'vaaa',
  '+393472550110',
  'zambelli.andrea@libero.it',
  'Via Cavallotti',
  '2014-11-30',
  NULL,
  false,
  NULL,
  NULL,
  false,
  16,
  NULL,
  'PROF_016_B17E_CLIENT_514_44A1'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  9001,
  9,
  'Andrea',
  'Zambelli',
  '+393472550110',
  'zambelli.andrea@libero.it',
  'Via Cavallotti',
  '2025-06-11',
  NULL,
  false,
  NULL,
  NULL,
  false,
  9,
  NULL,
  'PROF_009_9D95_CLIENT_9001_011A'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3001,
  3,
  'Silvia',
  'Bus',
  '+393472550110',
  'busnari.silvia@libero.it',
  'Via Cavallotti, 6',
  '2025-06-07',
  NULL,
  false,
  NULL,
  NULL,
  false,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3001_7314'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3002,
  3,
  'Mario',
  'Rossi',
  '3331234567',
  'mario.rossi@email.com',
  'Via Roma 123',
  '1980-05-15',
  'Cliente importato da account staff',
  false,
  NULL,
  NULL,
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3002_7315'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3003,
  3,
  'Giulia',
  'Verdi',
  '3337654321',
  'giulia.verdi@email.com',
  'Via Milano 45',
  '1975-09-22',
  'Cliente importato da account customer',
  true,
  'Pressione alta',
  'Penicillina',
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3003_7316'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3004,
  3,
  'Franco',
  'Bianchi',
  '3339876543',
  'franco.bianchi@email.com',
  'Via Napoli 67',
  '1990-12-03',
  'Cliente importato da account basic',
  false,
  NULL,
  'Lattosio',
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3004_7317'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3005,
  3,
  'Anna',
  'Neri',
  '3334567890',
  'anna.neri@email.com',
  'Via Torino 89',
  '1985-03-18',
  'Cliente proprio dell''admin',
  true,
  'Diabete tipo 2',
  NULL,
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3005_7318'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3006,
  3,
  'Mario',
  'Rossi',
  '3331234567',
  'mario.rossi@test.com',
  'Via Roma 123',
  '1980-05-15',
  'Cliente importato da staff',
  false,
  NULL,
  NULL,
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3006_7319'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3007,
  3,
  'Giulia',
  'Verdi',
  '3337654321',
  'giulia.verdi@test.com',
  'Via Milano 45',
  '1975-09-22',
  'Cliente importata da customer',
  true,
  'Pressione alta',
  'Penicillina',
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3007_7320'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  3008,
  3,
  'Franco',
  'Bianchi',
  '3339876543',
  'franco.bianchi@test.com',
  'Via Napoli 67',
  '1990-12-03',
  'Cliente importato da basic',
  false,
  NULL,
  'Lattosio',
  true,
  3,
  NULL,
  'PROF_003_0003_CLIENT_3008_7321'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  14001,
  14,
  'Cliente',
  'Trial',
  '+39 123 456 7890',
  'cliente.trial.14@example.com',
  NULL,
  NULL,
  'Cliente di prova generato automaticamente',
  false,
  NULL,
  NULL,
  false,
  14,
  NULL,
  'PROF_014_9C1F_CLIENT_14001_A665'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  14002,
  14,
  'andrea',
  'zambelli',
  '+39 3472550110',
  'zambelli.andrea.1973@gmail.com',
  'Via Cavallotti',
  '1973-03-01',
  'Account di test generato automaticamente',
  false,
  NULL,
  NULL,
  false,
  14,
  NULL,
  'PROF_014_9C1F_CLIENT_14002_09A9'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  14004,
  14,
  'Bruna ',
  'Pizzolato',
  '+393270881677',
  'brunapizzolato77@gmail.com',
  'Via Monte Rosa 4b , 22070 Appiano Gentile ',
  '1987-07-20',
  NULL,
  false,
  NULL,
  NULL,
  false,
  14,
  NULL,
  'PROF_014_9C1F_CLIENT_14004_340F'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";


INSERT INTO clients (
  id, user_id, "firstName", "lastName", phone, email, 
  address, birthday, notes, "isFrequent", "medicalNotes", 
  allergies, "hasConsent", "ownerId", "assignmentCode", "uniqueCode"
) VALUES (
  14003,
  14,
  'Marco',
  'Berto',
  '+41794374849',
  'marco_berto@msn.com',
  'Via Monte Rosa 4b , 22070 Appiano Gentile ',
  '1978-07-20',
  NULL,
  false,
  NULL,
  NULL,
  true,
  14,
  NULL,
  'PROF_014_9C1F_CLIENT_14003_816C'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";