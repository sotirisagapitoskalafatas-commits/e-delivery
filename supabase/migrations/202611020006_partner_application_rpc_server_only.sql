-- Lock down public partner submission RPC execution.
-- The application endpoint is the only public intake path and verifies Turnstile
-- before using the server-side Supabase secret to invoke this function.
begin;

revoke all on function public.submit_partner_application(
  text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text
) from public, anon, authenticated;

grant execute on function public.submit_partner_application(
  text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text
) to service_role;

do $$
declare
  v_signature regprocedure := to_regprocedure(
    'public.submit_partner_application(text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text)'
  );
begin
  if v_signature is null then
    raise exception 'submit_partner_application function is missing; apply the partner applications migration first';
  end if;
  if has_function_privilege('anon', v_signature, 'EXECUTE') then
    raise exception 'anon must not be able to execute submit_partner_application';
  end if;
  if has_function_privilege('authenticated', v_signature, 'EXECUTE') then
    raise exception 'authenticated must not be able to execute submit_partner_application directly';
  end if;
  if not has_function_privilege('service_role', v_signature, 'EXECUTE') then
    raise exception 'service_role must be able to execute submit_partner_application';
  end if;
end;
$$;

commit;
