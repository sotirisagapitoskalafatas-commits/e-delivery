-- Add marketplace categories and the independent courier network.
-- Kept in its own migration so the new enum value is committed before RPCs use it.
alter type public.fulfillment_method add value if not exists 'independent';
alter type public.store_type add value if not exists 'flower_shop';
alter type public.store_type add value if not exists 'pet_shop';
alter type public.store_type add value if not exists 'parcel_point';
alter type public.store_type add value if not exists 'service_provider';
