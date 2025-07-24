-- Add admin policies for all tables to allow manoloto@hotmail.com to view all data

-- Admin policy for transacciones table
CREATE POLICY "Admin can view all transactions" 
ON public.transacciones 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'manoloto@hotmail.com'::text);

-- Admin policy for categorias table
CREATE POLICY "Admin can view all categories" 
ON public.categorias 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'manoloto@hotmail.com'::text);

-- Admin policy for cuentas table
CREATE POLICY "Admin can view all accounts" 
ON public.cuentas 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'manoloto@hotmail.com'::text);

-- Admin policy for inversiones table
CREATE POLICY "Admin can view all investments" 
ON public.inversiones 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'manoloto@hotmail.com'::text);

-- Admin policy for criptomonedas table
CREATE POLICY "Admin can view all cryptos" 
ON public.criptomonedas 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'manoloto@hotmail.com'::text);