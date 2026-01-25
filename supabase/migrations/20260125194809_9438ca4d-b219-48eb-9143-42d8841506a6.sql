-- Table pour suivre les commandes de crédits
CREATE TABLE public.credit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  credits integer NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  payment_method text DEFAULT 'mobile_money',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  validated_at timestamp with time zone,
  validated_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.credit_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own orders"
ON public.credit_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.credit_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update orders (validate/reject)
CREATE POLICY "Admins can update orders"
ON public.credit_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));