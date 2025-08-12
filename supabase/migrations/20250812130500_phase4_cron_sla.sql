-- Activer pg_cron si nécessaire (sur Supabase, via Dashboard ou déjà activé)
-- Planification d'une tâche toutes les 10 min qui appelle une Edge Function (via http)

-- Exemple SQL pour planifier via http() si extension pg_net/pg_cron disponible
-- (Sur Supabase gérée, utiliser de préférence le Dashboard Cron)

-- select cron.schedule(
--   'sla-reminder-10min',
--   '*/10 * * * *',
--   $$
--     select
--       net.http_post(
--         url := current_setting('app.settings.sla_function_url', true),
--         headers := '{"Content-Type":"application/json"}'::jsonb,
--         body := '{}'::jsonb
--       )
--   $$
-- );


