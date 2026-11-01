-- E-DELIVERY merchant photography and product image delivery.
-- Apply only to the dedicated E-DELIVERY Supabase project.
begin;

alter table public.stores
  add column logo_image_path text,
  add column cover_image_path text,
  add constraint stores_logo_image_path_length
    check (logo_image_path is null or char_length(logo_image_path) between 1 and 500),
  add constraint stores_cover_image_path_length
    check (cover_image_path is null or char_length(cover_image_path) between 1 and 500);

create policy stores_media_update_managed on public.stores
for update to authenticated
using (private.is_ops_admin() or private.is_merchant_member(id, array['owner', 'manager']))
with check (private.is_ops_admin() or private.is_merchant_member(id, array['owner', 'manager']));

grant update (logo_image_path, cover_image_path) on public.stores to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('e-delivery-merchant-media', 'e-delivery-merchant-media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: {store_uuid}/logo/{uuid}.jpg, {store_uuid}/cover/{uuid}.webp,
--        {store_uuid}/products/{product_uuid}/{uuid}.jpg
-- Public download is intentional; writes and object management are membership-scoped.
create policy e_delivery_media_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'e-delivery-merchant-media'
  and (private.is_ops_admin() or exists (
    select 1 from public.stores s
    where s.id::text = (storage.foldername(name))[1]
      and private.is_merchant_member(s.id, array['owner', 'manager'])
  ))
);

create policy e_delivery_media_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'e-delivery-merchant-media'
  and (storage.foldername(name))[2] in ('logo', 'cover', 'products')
  and (private.is_ops_admin() or exists (
    select 1 from public.stores s
    where s.id::text = (storage.foldername(name))[1]
      and private.is_merchant_member(s.id, array['owner', 'manager'])
  ))
);

create policy e_delivery_media_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'e-delivery-merchant-media'
  and (private.is_ops_admin() or exists (
    select 1 from public.stores s
    where s.id::text = (storage.foldername(name))[1]
      and private.is_merchant_member(s.id, array['owner', 'manager'])
  ))
)
with check (
  bucket_id = 'e-delivery-merchant-media'
  and (storage.foldername(name))[2] in ('logo', 'cover', 'products')
  and (private.is_ops_admin() or exists (
    select 1 from public.stores s
    where s.id::text = (storage.foldername(name))[1]
      and private.is_merchant_member(s.id, array['owner', 'manager'])
  ))
);

create policy e_delivery_media_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'e-delivery-merchant-media'
  and (private.is_ops_admin() or exists (
    select 1 from public.stores s
    where s.id::text = (storage.foldername(name))[1]
      and private.is_merchant_member(s.id, array['owner', 'manager'])
  ))
);

commit;
