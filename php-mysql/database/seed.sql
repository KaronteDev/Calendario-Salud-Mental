-- WellFlow demo seed for MySQL
-- Import after schema.sql

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM password_reset_tokens;
DELETE FROM social_accounts;
DELETE FROM daily_entries;
DELETE FROM invitations;
DELETE FROM users;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, email, name, password_hash, role, preferred_locale, theme_mode, created_at, updated_at) VALUES
('9d2f4d7a-6e3b-4a85-9e27-000000000001', 'admin@wellflow.local', 'Admin WellFlow', '$2y$10$SxwevbP5IGLJXxoir1RyjufpGANUv/c1Zc3QuB8XOe/iya1KqUrCC', 'admin', 'es', 'dark', '2026-03-01 09:00:00', '2026-04-08 09:00:00'),
('9d2f4d7a-6e3b-4a85-9e27-000000000002', 'ana@wellflow.local', 'Ana Demo', '$2y$10$UmWyHfqetw6HvdasZTWFMO2k7o2qE4HG5uvu6viRbiXAmHRRpcYZW', 'user', 'es', 'dark', '2026-03-10 10:15:00', '2026-04-08 08:40:00'),
('9d2f4d7a-6e3b-4a85-9e27-000000000003', 'invitado@wellflow.local', 'Lucas Invitado', '$2y$10$sdof0rjoRQAr38XCgP5HF.DsOsMYO2FqzbqZ6Om9ej4/RJqYCfVzO', 'user', 'en', 'light', '2026-03-18 18:30:00', '2026-04-06 07:55:00');

INSERT INTO invitations (id, email, role, token, invited_by_id, accepted_at, sent_at, last_delivery_error, created_at) VALUES
('7b7e92b1-0e3a-4380-9f48-000000000001', 'invitado@wellflow.local', 'user', 'invite-lucas-accepted-2026', '9d2f4d7a-6e3b-4a85-9e27-000000000001', '2026-03-18 18:30:00', '2026-03-18 18:00:00', NULL, '2026-03-18 17:55:00'),
('7b7e92b1-0e3a-4380-9f48-000000000002', 'nueva@wellflow.local', 'user', 'invite-nueva-pending-2026', '9d2f4d7a-6e3b-4a85-9e27-000000000001', NULL, '2026-04-08 10:00:00', NULL, '2026-04-08 09:58:00'),
('7b7e92b1-0e3a-4380-9f48-000000000003', 'manager@wellflow.local', 'admin', 'invite-manager-pending-2026', '9d2f4d7a-6e3b-4a85-9e27-000000000001', NULL, '2026-04-08 10:02:00', NULL, '2026-04-08 10:01:00');

INSERT INTO social_accounts (id, user_id, provider, provider_account_id, created_at, updated_at) VALUES
('64a9d9de-8ea5-4ec2-9af4-000000000001', '9d2f4d7a-6e3b-4a85-9e27-000000000002', 'google', 'google-ana-demo-001', '2026-03-10 10:20:00', '2026-03-10 10:20:00'),
('64a9d9de-8ea5-4ec2-9af4-000000000002', '9d2f4d7a-6e3b-4a85-9e27-000000000003', 'linkedin', 'linkedin-lucas-demo-001', '2026-03-18 18:32:00', '2026-03-18 18:32:00');

INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at) VALUES
('2c40a247-cc69-4d99-8730-000000000001', '9d2f4d7a-6e3b-4a85-9e27-000000000002', 'reset-demo-token-2026', '2026-12-31 23:59:59', '2026-04-08 09:30:00');

INSERT INTO daily_entries (id, user_id, date_key, mood, mental_state, physical_state, sleep_quality, sleep_hours, nutrition_done, exercise_done, exercise_type, exercise_minutes, leisure_done, leisure_activity, notes, created_at, updated_at) VALUES
('d9b4fb8d-8dc9-4c54-9c8b-000000000001', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-01', 3, 3, 3, 3, 7.0, 1, 0, NULL, NULL, 1, 'Lectura', 'Dia estable, con algo de cansancio al final de la tarde.', '2026-04-01 22:00:00', '2026-04-01 22:00:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000002', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-02', 4, 4, 3, 4, 7.5, 1, 1, 'Paseo rapido', 30, 1, 'Serie', 'Mejor energia por la manana y rutina bastante ordenada.', '2026-04-02 21:48:00', '2026-04-02 21:48:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000003', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-03', 5, 4, 4, 4, 8.0, 1, 1, 'Yoga', 40, 1, 'Musica', 'Dia muy bueno, con sensacion de avance y calma mental.', '2026-04-03 22:05:00', '2026-04-03 22:05:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000004', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-04', 2, 2, 2, 2, 5.5, 0, 0, NULL, NULL, 1, 'Descanso', 'Poco sueno y mucha saturacion, reduje carga durante el dia.', '2026-04-04 23:00:00', '2026-04-04 23:00:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000005', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-05', 3, 3, 3, 3, 6.5, 1, 0, NULL, NULL, 1, 'Pelicula', 'Recuperando ritmo, aun con algo de fatiga acumulada.', '2026-04-05 21:30:00', '2026-04-05 21:30:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000006', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-06', 4, 4, 4, 4, 7.8, 1, 1, 'Bicicleta', 45, 1, 'Paseo al aire libre', 'Muy buen equilibrio general y mejor descanso.', '2026-04-06 21:42:00', '2026-04-06 21:42:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000007', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-07', 4, 5, 4, 4, 7.2, 1, 1, 'Fuerza', 35, 0, NULL, 'Dia productivo y con buena concentracion.', '2026-04-07 22:10:00', '2026-04-07 22:10:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000008', '9d2f4d7a-6e3b-4a85-9e27-000000000002', '2026-04-08', 5, 4, 4, 5, 8.1, 1, 1, 'Caminar', 50, 1, 'Cena tranquila', 'Buen cierre de jornada, sensacion de control.', '2026-04-08 21:55:00', '2026-04-08 21:55:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000009', '9d2f4d7a-6e3b-4a85-9e27-000000000001', '2026-04-02', 4, 4, 3, 4, 7.4, 1, 0, NULL, NULL, 1, 'Lectura', 'Seguimiento admin correcto y sin incidencias.', '2026-04-02 22:15:00', '2026-04-02 22:15:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000010', '9d2f4d7a-6e3b-4a85-9e27-000000000001', '2026-04-05', 3, 4, 3, 3, 6.8, 1, 1, 'Cinta', 25, 0, NULL, 'Algo de carga de trabajo, pero bien gestionada.', '2026-04-05 21:10:00', '2026-04-05 21:10:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000011', '9d2f4d7a-6e3b-4a85-9e27-000000000003', '2026-04-03', 4, 3, 4, 4, 7.1, 1, 1, 'Natacion', 40, 1, 'Podcast', 'Adaptacion positiva al uso de la app.', '2026-04-03 20:50:00', '2026-04-03 20:50:00'),
('d9b4fb8d-8dc9-4c54-9c8b-000000000012', '9d2f4d7a-6e3b-4a85-9e27-000000000003', '2026-04-06', 3, 3, 4, 3, 6.9, 0, 1, 'Caminar', 20, 1, 'Videojuego', 'Dia correcto, aunque con menos energia por la tarde.', '2026-04-06 22:05:00', '2026-04-06 22:05:00');