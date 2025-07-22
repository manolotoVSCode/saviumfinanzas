-- Resetear valor_mercado a 0 para todas las cuentas de inversión
UPDATE cuentas 
SET valor_mercado = 0 
WHERE tipo = 'Inversiones';