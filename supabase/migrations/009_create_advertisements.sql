-- Create advertisements table
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS Policies
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisements are viewable by everyone" 
ON public.advertisements FOR SELECT 
USING (is_active = true);

-- Only admins can insert/update/delete advertisements
-- (Assuming we verify admin in backend, but we can also add a policy for service role)
CREATE POLICY "Admins can manage advertisements" 
ON public.advertisements FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Insert seed data for the Amazon-like banner
INSERT INTO public.advertisements (title, image_url, target_url, is_active)
VALUES (
  'Super Sale Banner',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&q=80',
  'omq-spices-01',
  true
);
