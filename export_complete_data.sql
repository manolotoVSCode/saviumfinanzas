-- ===========================================
-- EXPORTACIÓN COMPLETA DE DATOS - SAVIUM FINANZAS
-- Incluye esquema + datos actuales del localStorage
-- Generado: 2025-07-16
-- ===========================================

-- Configuración inicial
SET TIMEZONE = 'America/Mexico_City';

-- ===========================================
-- 1. TIPOS ENUMERADOS
-- ===========================================

CREATE TYPE transaction_type AS ENUM ('Ingreso', 'Gastos', 'Aportación', 'Retiro');
CREATE TYPE account_type AS ENUM ('Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia');
CREATE TYPE currency_type AS ENUM ('MXN', 'USD', 'EUR');

-- ===========================================
-- 2. TABLA DE CATEGORÍAS
-- ===========================================

CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    subcategoria VARCHAR(255) NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    tipo transaction_type NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 3. TABLA DE CUENTAS
-- ===========================================

CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo account_type NOT NULL,
    saldo_inicial DECIMAL(15,2) NOT NULL DEFAULT 0,
    divisa currency_type NOT NULL DEFAULT 'MXN',
    valor_mercado DECIMAL(15,2), -- Solo para inversiones
    rendimiento_mensual DECIMAL(8,4), -- Porcentaje rendimiento mensual
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 4. TABLA DE TRANSACCIONES
-- ===========================================

CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY,
    cuenta_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    comentario TEXT,
    ingreso DECIMAL(15,2) NOT NULL DEFAULT 0,
    gasto DECIMAL(15,2) NOT NULL DEFAULT 0,
    subcategoria_id VARCHAR(50) NOT NULL REFERENCES categories(id),
    divisa currency_type NOT NULL DEFAULT 'MXN',
    csv_id VARCHAR(100), -- ID original del CSV si fue importado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_monto_valido CHECK (
        (ingreso > 0 AND gasto = 0) OR 
        (gasto > 0 AND ingreso = 0) OR 
        (ingreso = 0 AND gasto = 0)
    )
);

-- ===========================================
-- 5. ÍNDICES PARA OPTIMIZACIÓN
-- ===========================================

-- Índices para transacciones (consultas más frecuentes)
CREATE INDEX idx_transactions_fecha ON transactions(fecha);
CREATE INDEX idx_transactions_cuenta_id ON transactions(cuenta_id);
CREATE INDEX idx_transactions_subcategoria_id ON transactions(subcategoria_id);
CREATE INDEX idx_transactions_divisa ON transactions(divisa);
CREATE INDEX idx_transactions_fecha_cuenta ON transactions(fecha, cuenta_id);

-- Índices para categorías
CREATE INDEX idx_categories_tipo ON categories(tipo);
CREATE INDEX idx_categories_categoria ON categories(categoria);

-- Índices para cuentas
CREATE INDEX idx_accounts_tipo ON accounts(tipo);
CREATE INDEX idx_accounts_divisa ON accounts(divisa);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- ===========================================
-- 6. DATOS REALES - CATEGORÍAS
-- ===========================================

-- Limpiar datos existentes
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE accounts CASCADE;

-- Insertar categorías actuales
INSERT INTO categories (id, subcategoria, categoria, tipo) VALUES
('1', 'Salario', 'Ingresos', 'Ingreso'),
('2', 'Comida', 'Alimentación', 'Gastos'),
('3', 'Transporte', 'Movilidad', 'Gastos'),
('4', 'Entretenimiento', 'Ocio', 'Gastos'),
('5', 'Bonos / Comisiones', 'Ingresos', 'Ingreso'),
('6', 'Aportaciones', 'Inversiones', 'Aportación'),
('7', 'Capital', 'Hipoteca', 'Gastos');

-- ===========================================
-- 7. DATOS REALES - CUENTAS
-- ===========================================

-- Insertar cuentas actuales (basado en datos del localStorage)
INSERT INTO accounts (id, nombre, tipo, saldo_inicial, divisa, valor_mercado) VALUES
('1', 'Efectivo', 'Efectivo', 0, 'MXN', NULL),
('2', 'Cuenta de Cheques', 'Banco', 0, 'MXN', NULL),
('3', 'Tarjeta de Crédito', 'Tarjeta de Crédito', 0, 'MXN', NULL),
('4', 'Ahorros', 'Ahorros', 0, 'MXN', NULL),
('5', 'QUANT', 'Inversiones', 48000, 'MXN', 48000),
('6', 'AMEX', 'Tarjeta de Crédito', 0, 'MXN', NULL),
('7', 'Mastercard', 'Tarjeta de Crédito', 0, 'MXN', NULL),
('8', 'Hipoteca Casa', 'Hipoteca', 0, 'MXN', NULL);

-- ===========================================
-- 8. DATOS REALES - TRANSACCIONES
-- ===========================================

-- NOTA: Para obtener las transacciones exactas del localStorage,
-- ejecuta el siguiente JavaScript en la consola del navegador:
/*
console.log('=== EXPORT TRANSACCIONES ===');
const transacciones = JSON.parse(localStorage.getItem('financeTransactions') || '[]');
transacciones.forEach((t, index) => {
  const fecha = new Date(t.fecha).toISOString().split('T')[0];
  const comentario = t.comentario ? `'${t.comentario.replace(/'/g, "''")}'` : 'NULL';
  console.log(`INSERT INTO transactions (id, cuenta_id, fecha, comentario, ingreso, gasto, subcategoria_id, divisa) VALUES ('${t.id}', '${t.cuentaId}', '${fecha}', ${comentario}, ${t.ingreso}, ${t.gasto}, '${t.subcategoriaId}', '${t.divisa}');`);
});

console.log('\n=== EXPORT CUENTAS CON SALDOS ACTUALES ===');
const cuentas = JSON.parse(localStorage.getItem('financeAccounts') || '[]');
cuentas.forEach(cuenta => {
  console.log(`-- Cuenta: ${cuenta.nombre} (ID: ${cuenta.id})`);
  console.log(`-- Saldo Inicial: ${cuenta.saldoInicial} ${cuenta.divisa}`);
  console.log(`-- Saldo Actual: ${cuenta.saldoActual} ${cuenta.divisa}`);
  console.log(`UPDATE accounts SET saldo_inicial = ${cuenta.saldoInicial} WHERE id = '${cuenta.id}';`);
});

console.log('\n=== EXPORT CATEGORÍAS ===');
const categorias = JSON.parse(localStorage.getItem('financeCategories') || '[]');
categorias.forEach(cat => {
  console.log(`INSERT INTO categories (id, subcategoria, categoria, tipo) VALUES ('${cat.id}', '${cat.subcategoria}', '${cat.categoria}', '${cat.tipo}') ON CONFLICT (id) DO NOTHING;`);
});
*/

-- Las transacciones exactas deben ser insertadas ejecutando el JavaScript arriba
-- Aquí van las transacciones exportadas del localStorage:

-- [PLACEHOLDER - Ejecutar JavaScript en consola para obtener transacciones exactas]

-- ===========================================
-- 9. VISTAS CALCULADAS
-- ===========================================

-- Vista de saldos actuales por cuenta
CREATE VIEW v_account_balances AS
SELECT 
    a.id,
    a.nombre,
    a.tipo,
    a.divisa,
    a.saldo_inicial,
    COALESCE(SUM(t.ingreso - t.gasto), 0) as movimientos_total,
    a.saldo_inicial + COALESCE(SUM(t.ingreso - t.gasto), 0) as saldo_actual,
    a.valor_mercado,
    a.rendimiento_mensual,
    a.is_active
FROM accounts a
LEFT JOIN transactions t ON a.id = t.cuenta_id
WHERE a.is_active = true
GROUP BY a.id, a.nombre, a.tipo, a.divisa, a.saldo_inicial, a.valor_mercado, a.rendimiento_mensual, a.is_active;

-- Vista de transacciones enriquecidas
CREATE VIEW v_transactions_enriched AS
SELECT 
    t.id,
    t.cuenta_id,
    t.fecha,
    t.comentario,
    t.ingreso,
    t.gasto,
    t.ingreso - t.gasto as monto,
    t.subcategoria_id,
    t.divisa,
    t.csv_id,
    c.subcategoria,
    c.categoria,
    c.tipo,
    a.nombre as cuenta_nombre,
    a.tipo as cuenta_tipo,
    t.created_at,
    t.updated_at
FROM transactions t
JOIN categories c ON t.subcategoria_id = c.id
JOIN accounts a ON t.cuenta_id = a.id;

-- ===========================================
-- 10. FUNCIONES Y TRIGGERS
-- ===========================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para auto-actualizar updated_at
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 11. CONSULTAS ÚTILES PARA REPORTES
-- ===========================================

-- Consulta para balance general por moneda
/*
SELECT 
    a.divisa,
    a.tipo,
    COUNT(*) as num_cuentas,
    SUM(ab.saldo_actual) as total_saldo
FROM accounts a
JOIN v_account_balances ab ON a.id = ab.id
GROUP BY a.divisa, a.tipo
ORDER BY a.divisa, a.tipo;
*/

-- Consulta para resumen mensual por tipo de transacción
/*
SELECT 
    DATE_TRUNC('month', fecha) as mes,
    tipo,
    COUNT(*) as num_transacciones,
    SUM(CASE WHEN tipo = 'Ingreso' THEN ingreso ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN tipo = 'Gastos' THEN gasto ELSE 0 END) as total_gastos
FROM v_transactions_enriched 
WHERE fecha >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', fecha), tipo
ORDER BY mes DESC, tipo;
*/

-- Consulta para análisis de categorías por período
/*
SELECT 
    categoria,
    subcategoria,
    tipo,
    COUNT(*) as num_transacciones,
    SUM(CASE WHEN tipo = 'Ingreso' THEN ingreso ELSE gasto END) as total_monto,
    AVG(CASE WHEN tipo = 'Ingreso' THEN ingreso ELSE gasto END) as promedio_monto
FROM v_transactions_enriched 
WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY categoria, subcategoria, tipo
ORDER BY total_monto DESC;
*/

-- ===========================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ===========================================

COMMENT ON TABLE categories IS 'Categorías y subcategorías para clasificar transacciones financieras';
COMMENT ON TABLE accounts IS 'Cuentas financieras: bancos, efectivo, inversiones, créditos, etc.';
COMMENT ON TABLE transactions IS 'Registro detallado de todas las transacciones financieras';
COMMENT ON VIEW v_account_balances IS 'Vista con saldos actuales calculados de todas las cuentas activas';
COMMENT ON VIEW v_transactions_enriched IS 'Vista de transacciones con información completa de categorías y cuentas';

-- ===========================================
-- INSTRUCCIONES DE USO
-- ===========================================

/*
PASOS PARA COMPLETAR LA EXPORTACIÓN:

1. Abrir la aplicación web en el navegador
2. Abrir DevTools (F12) > Console
3. Ejecutar el JavaScript comentado en la sección 8
4. Copiar los INSERT statements generados
5. Reemplazar el [PLACEHOLDER] con las transacciones reales

ALTERNATIVA AUTOMÁTICA:
- Usar el script de migración que lee localStorage y genera SQL automáticamente
*/

-- ===========================================
-- FIN DEL ARCHIVO DE EXPORTACIÓN
-- ===========================================