-- OmniQ: User Requests table for data export & account deletion
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('data_export', 'account_deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user and by status
CREATE INDEX idx_user_requests_user_id ON user_requests(user_id);
CREATE INDEX idx_user_requests_status ON user_requests(status);

-- Enable RLS
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own requests
CREATE POLICY "Users can read own requests"
  ON user_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests  
CREATE POLICY "Users can create own requests"
  ON user_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for admin operations via backend)
CREATE POLICY "Service role full access"
  ON user_requests FOR ALL
  USING (auth.role() = 'service_role');
