-- Crear política que permita al admin ver todos los perfiles
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'manoloto@hotmail.com' OR
  auth.uid() = user_id
);