---
name: Módulo de Inversiones
description: Catálogo editable de tipos de inversión, tabla inversiones independiente, valuaciones y cobros
type: feature
---
El módulo de Inversiones es independiente de Cuentas.

- `investment_types`: catálogo editable por usuario. Campos clave: `comportamiento` (`valuacion_manual`, `interes_fijo`, `reparto_variable`), `permite_reinversion`, `requiere_vencimiento`.
- `inversiones`: tabla principal, enlazada opcionalmente a una cuenta vía `cuenta_id`. Sin restricciones fijas de tipo/modalidad.
- `investment_valuations`: valor mes a mes (con aportación/retiro). El crecimiento se calcula como `valor - valor_anterior - (aportacion - retiro)`.
- `investment_payouts`: intereses/rendimientos cobrados; actualiza `ultimo_pago`.

Tipos por defecto sembrados por `create_default_investment_types`: valuación manual, interés fijo reinversión, interés fijo cobro mensual, participación/fideicomiso a plazo, bien raíz, criptomoneda.

Datos migrados desde cuentas tipo 'Inversiones' (QUANT, Tortracs, RL365, ING Ahorro, Rakennus).
