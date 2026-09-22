-- Filas huérfanas: user_id que ya no existe en auth.users.
--
-- Al borrar una cuenta en el panel solo se van en cascada subscription_services
-- y alert_dismissals; el resto de tablas guarda user_id suelto, así que los datos
-- de las cuentas borradas (las dos de prueba del 2026-09-22 y otras anteriores,
-- probablemente de la poda multiusuario del 2026-09-14) se quedaron en la base.
--
-- Inventario del 2026-09-22 antes de aplicar: 73 categorías, 27 reglas,
-- 7 cuentas, 7 tipos de inversión, 1 inversión. Cero transacciones.
--
-- Este filtro no puede alcanzar las filas del usuario: su cuenta existe.

BEGIN;

DELETE FROM transaction_pendings  WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM payment_skips         WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM investment_payouts    WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM investment_valuations WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM inversiones           WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM investment_types      WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM criptomonedas         WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM transacciones         WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM classification_rules  WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM subscription_services WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM cuentas               WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM categorias            WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM profiles              WHERE user_id NOT IN (SELECT id FROM auth.users);

COMMIT;
