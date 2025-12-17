-- Create table for tracking promotion campaigns
CREATE TABLE public.promotion_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking individual promotion sends
CREATE TABLE public.promotion_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.promotion_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_sends ENABLE ROW LEVEL SECURITY;

-- Create policies for promotion_campaigns
CREATE POLICY "Owners can manage campaigns"
ON public.promotion_campaigns
FOR ALL
USING (is_restaurant_owner(auth.uid(), restaurant_id))
WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id));

-- Create policies for promotion_sends
CREATE POLICY "Owners can view sends"
ON public.promotion_sends
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM promotion_campaigns pc 
  WHERE pc.id = promotion_sends.campaign_id 
  AND is_restaurant_owner(auth.uid(), pc.restaurant_id)
));