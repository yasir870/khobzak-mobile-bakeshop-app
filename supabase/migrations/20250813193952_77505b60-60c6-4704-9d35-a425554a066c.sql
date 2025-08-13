-- Create table for driver location tracking
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  order_id UUID,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  accuracy DECIMAL(8, 2),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX idx_driver_locations_updated_at ON public.driver_locations(updated_at);

-- Create policies
CREATE POLICY "Anyone can view driver locations" 
ON public.driver_locations 
FOR SELECT 
USING (true);

CREATE POLICY "Drivers can update their own location" 
ON public.driver_locations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Drivers can update their own location records" 
ON public.driver_locations 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_driver_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_driver_locations_updated_at
  BEFORE UPDATE ON public.driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_driver_location_timestamp();

-- Add driver_locations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Set replica identity for realtime updates
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;