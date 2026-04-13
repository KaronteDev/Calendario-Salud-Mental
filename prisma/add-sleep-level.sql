-- ============================================================
-- Añade la columna sleepLevel a la tabla DailyEntry
-- ============================================================

ALTER TABLE DailyEntry
ADD COLUMN sleepLevel INTEGER NOT NULL DEFAULT 3;

-- ============================================================
-- Actualiza los registros demo con valores de sleepLevel
-- correlacionados con sleepQuality y sleepHours
-- ============================================================

UPDATE DailyEntry SET sleepLevel = 3 WHERE dateKey = '2026-04-01';
UPDATE DailyEntry SET sleepLevel = 4 WHERE dateKey = '2026-04-02';
UPDATE DailyEntry SET sleepLevel = 2 WHERE dateKey = '2026-04-03';
UPDATE DailyEntry SET sleepLevel = 4 WHERE dateKey = '2026-04-04';
UPDATE DailyEntry SET sleepLevel = 5 WHERE dateKey = '2026-04-05';
UPDATE DailyEntry SET sleepLevel = 3 WHERE dateKey = '2026-04-06';
UPDATE DailyEntry SET sleepLevel = 4 WHERE dateKey = '2026-04-07';
UPDATE DailyEntry SET sleepLevel = 4 WHERE dateKey = '2026-04-08';
UPDATE DailyEntry SET sleepLevel = 3 WHERE dateKey = '2026-04-09';
UPDATE DailyEntry SET sleepLevel = 2 WHERE dateKey = '2026-04-10';
UPDATE DailyEntry SET sleepLevel = 4 WHERE dateKey = '2026-04-11';
UPDATE DailyEntry SET sleepLevel = 5 WHERE dateKey = '2026-04-12';
