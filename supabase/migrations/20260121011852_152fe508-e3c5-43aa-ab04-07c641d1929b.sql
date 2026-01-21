-- Add max_uses and current_uses columns to activation_codes
ALTER TABLE public.activation_codes 
ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1,
ADD COLUMN current_uses INTEGER NOT NULL DEFAULT 0;

-- Update existing used codes
UPDATE public.activation_codes 
SET current_uses = 1 
WHERE used_by IS NOT NULL;

-- Drop the used_by and used_at columns since we now track usage count
-- We'll keep them for backward compatibility but they become optional
-- The code is available if current_uses < max_uses

-- Create a table to track which users used which codes
CREATE TABLE public.code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.activation_codes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.code_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for code_usages
CREATE POLICY "Users can view their own code usage"
ON public.code_usages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all code usages"
ON public.code_usages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update the handle_new_user_with_code function
CREATE OR REPLACE FUNCTION public.handle_new_user_with_code()
RETURNS TRIGGER AS $$
DECLARE
  activation_code_record RECORD;
  code_value TEXT;
BEGIN
  -- Get the activation code from user metadata
  code_value := NEW.raw_user_meta_data->>'activation_code';
  
  -- Find and validate the activation code (check max_uses)
  SELECT * INTO activation_code_record
  FROM public.activation_codes
  WHERE code = code_value
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Create the profile with credits from the code
  INSERT INTO public.profiles (user_id, email, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(activation_code_record.credits, 0)
  );
  
  -- Update the code usage count and track usage
  IF activation_code_record.id IS NOT NULL THEN
    UPDATE public.activation_codes
    SET current_uses = current_uses + 1,
        used_by = NEW.id,
        used_at = now()
    WHERE id = activation_code_record.id;
    
    -- Track the usage
    INSERT INTO public.code_usages (code_id, user_id)
    VALUES (activation_code_record.id, NEW.id);
  END IF;
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;