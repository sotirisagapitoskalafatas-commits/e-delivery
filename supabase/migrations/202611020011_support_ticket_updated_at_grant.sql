-- Allow support staff to refresh the ticket activity timestamp when changing ticket metadata.
-- RLS still restricts updates to support staff and ops admins.
begin;

grant update (updated_at) on public.support_tickets to authenticated;

commit;
