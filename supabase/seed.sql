-- OmniQ Supabase - development seed data.
-- Author: OmniQ Team
insert into public.delivery_zones (name, centre_lat, centre_lng, radius_km, pin_codes)
values ('Bengaluru', 12.97160000, 77.59460000, 15.00, array['560001','560002','560034','560040','560076','560100'])
on conflict do nothing;
