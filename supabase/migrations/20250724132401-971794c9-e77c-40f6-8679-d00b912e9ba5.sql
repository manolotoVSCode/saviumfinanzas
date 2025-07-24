-- Drop the problematic admin policies that are allowing cross-user data access
DROP POLICY "Admin can view all accounts" ON public.cuentas;
DROP POLICY "Admin can view all investments" ON public.inversiones;
DROP POLICY "Admin can view all transactions" ON public.transacciones;
DROP POLICY "Admin can view all categories" ON public.categorias;
DROP POLICY "Admin can view all cryptos" ON public.criptomonedas;