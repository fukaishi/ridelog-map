-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rides table
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_path TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  distance_m NUMERIC,
  elevation_gain_m NUMERIC,
  max_speed_m_s NUMERIC,
  avg_speed_m_s NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ride_points table
CREATE TABLE ride_points (
  id BIGSERIAL PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  t TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  ele DOUBLE PRECISION,
  speed_m_s DOUBLE PRECISION,
  cum_dist_m DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_rides_user_id ON rides(user_id);
CREATE INDEX idx_rides_started_at ON rides(started_at);
CREATE INDEX idx_ride_points_ride_id ON ride_points(ride_id);
CREATE INDEX idx_ride_points_t ON ride_points(t);

-- Enable Row Level Security
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_points ENABLE ROW LEVEL SECURITY;

-- Create policies for rides table
CREATE POLICY "Users can view their own rides"
  ON rides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rides"
  ON rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rides"
  ON rides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rides"
  ON rides FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for ride_points table
CREATE POLICY "Users can view points of their own rides"
  ON ride_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_points.ride_id
      AND rides.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert points for their own rides"
  ON ride_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_points.ride_id
      AND rides.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete points of their own rides"
  ON ride_points FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_points.ride_id
      AND rides.user_id = auth.uid()
    )
  );

-- Create storage bucket for ride files
INSERT INTO storage.buckets (id, name, public)
VALUES ('ride-logs', 'ride-logs', false);

-- Create storage policies
CREATE POLICY "Users can upload their own ride files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ride-logs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own ride files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ride-logs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own ride files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ride-logs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
