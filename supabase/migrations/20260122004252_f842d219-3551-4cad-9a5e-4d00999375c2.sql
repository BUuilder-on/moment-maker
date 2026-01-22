-- Drop existing policies for messages
DROP POLICY IF EXISTS "Anyone can view unlocked messages by link" ON public.messages;
DROP POLICY IF EXISTS "Users can view their sent messages" ON public.messages;

-- Create new policy to allow ANYONE (even unauthenticated) to view messages by ID
-- This allows the countdown to be displayed for locked messages
CREATE POLICY "Anyone can view messages by direct link" 
ON public.messages 
FOR SELECT 
USING (true);

-- Keep other policies for insert/update/delete unchanged