-- PROJ-58: Passwort neu vergeben — alle Sitzungen einer Person beenden.
-- Die Supabase-Admin-Schnittstelle kann fremde Sitzungen nicht abmelden;
-- diese Funktion löscht Sitzungen und Refresh-Tokens der Person. Danach muss
-- sie sich auf jedem Gerät neu anmelden (mit dem vergebenen Passwort).
-- Ausführen darf sie nur die Service-Rolle (Server-Route mit Admin-Prüfung).

create or replace function public.admin_revoke_user_sessions(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.refresh_tokens where user_id = target_user_id::text;
  delete from auth.sessions where user_id = target_user_id;
end;
$$;

revoke all on function public.admin_revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_user_sessions(uuid) to service_role;
