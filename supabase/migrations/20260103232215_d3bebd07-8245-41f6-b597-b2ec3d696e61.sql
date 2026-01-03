-- Mover todas las transacciones de "ING Ahorro" a "ING (Banco)"
UPDATE transacciones 
SET cuenta_id = '3e255b5a-b880-43a4-98ac-75bedcc0c689' 
WHERE cuenta_id = 'b98be7cf-d9e7-41c6-a44c-7b39003fd0b9';