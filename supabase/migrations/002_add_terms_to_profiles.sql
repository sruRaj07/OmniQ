-- Add terms and privacy policy auditing columns to profiles table

ALTER TABLE public.profiles
ADD COLUMN accepted_terms boolean DEFAULT false,
ADD COLUMN terms_accepted_at timestamp with time zone,
ADD COLUMN terms_version text,
ADD COLUMN privacy_policy_accepted_at timestamp with time zone,
ADD COLUMN privacy_policy_version text;
