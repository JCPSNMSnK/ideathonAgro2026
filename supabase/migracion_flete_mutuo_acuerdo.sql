-- Agrega la modalidad de flete a MUTUO_ACUERDO (equivale a la migración Django 0002).
-- Correr una sola vez en el SQL Editor de Supabase antes de desplegar este cambio.
ALTER TABLE mercado_lotesubproducto
    ADD COLUMN IF NOT EXISTS porcentaje_flete_vendedor NUMERIC(5,2) NULL;

INSERT INTO django_migrations (app, name, applied)
SELECT 'mercado', '0002_flete_mutuo_acuerdo', NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'django_migrations')
  AND NOT EXISTS (
    SELECT 1 FROM django_migrations WHERE app = 'mercado' AND name = '0002_flete_mutuo_acuerdo'
  );
