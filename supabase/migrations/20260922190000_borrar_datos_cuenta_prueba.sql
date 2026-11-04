-- Borra los datos de la cuenta de prueba carlosmelladoaguilar@gmail.com
-- (1350629a-80b4-42a4-95fd-c7e7722e531c), confirmada por el usuario como prueba
-- sin continuidad el 2026-09-22.
--
-- El editor SQL de Supabase corre como administrador y NO aplica RLS: cada
-- sentencia lleva el user_id explícito para no tocar las otras dos cuentas.
-- Las tablas van de hijas a padres; todo dentro de una transacción, así que un
-- error de clave ajena aborta el conjunto sin dejar nada a medias.
--
-- La cuenta de acceso en sí NO se borra aquí: eso se hace desde el panel
-- (Authentication → Users), después de aplicar esto.

BEGIN;

DELETE FROM transaction_pendings  WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM alert_dismissals      WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM payment_skips         WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM investment_payouts    WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM investment_valuations WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM inversiones           WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM investment_types      WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM criptomonedas         WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM transacciones         WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM classification_rules  WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM subscription_services WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM cuentas               WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM categorias            WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';
DELETE FROM profiles              WHERE user_id = '1350629a-80b4-42a4-95fd-c7e7722e531c';

COMMIT;
