import CryptoKit
import Foundation

/// Código de coacción: escrito en la pantalla de acceso en lugar de la contraseña, abre la app en modo señuelo
/// y manda la alerta. Solo se guarda su hash; el mismo cálculo se hace en Postgres al configurarlo:
/// encode(digest('savium-coaccion:' || user_id || ':' || código, 'sha256'), 'hex').
public enum CodigoEmergencia {
    public static func hash(_ codigo: String, userId: String) -> String {
        let texto = "savium-coaccion:\(userId.lowercased()):\(codigo.trimmingCharacters(in: .whitespaces))"
        return SHA256.hash(data: Data(texto.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    public static func coincide(_ codigo: String, hash esperado: String, userId: String) -> Bool {
        !codigo.trimmingCharacters(in: .whitespaces).isEmpty && hash(codigo, userId: userId) == esperado.lowercased()
    }
}

/// Datos ficticios y modestos que muestra la app cuando se entra con el código de coacción.
/// Fijos en importes; las fechas se mueven con el día para que parezcan recientes.
/// Mes anterior: ingresos 26,000 y gastos 24,310. Patrimonio neto: 8,700 MXN.
public enum Senuelo {
    public struct Datos: Sendable {
        public let cuentas: [Cuenta]
        public let filasPatrimonio: [FilaPatrimonio]
        public let categorias: [Categoria]
        public var movimientos: [Transaccion]
        public let suscripciones: [Suscripcion]
    }

    static let banco = "s-banco", efectivo = "s-efectivo", tarjeta = "s-tarjeta"

    public static func datos(now: Date, calendario cal: Calendar) -> Datos {
        let cuentas = [
            Cuenta(id: banco, nombre: "Banco", tipo: "Banco", divisa: "MXN", vendida: false, saldoInicial: 0, saldoActual: 12_640),
            Cuenta(id: efectivo, nombre: "Efectivo", tipo: "Efectivo", divisa: "MXN", vendida: false, saldoInicial: 0, saldoActual: 950),
            Cuenta(id: tarjeta, nombre: "Tarjeta de crédito", tipo: "Tarjeta de Crédito", divisa: "MXN", vendida: false, saldoInicial: 0, saldoActual: -4_890),
        ]
        let filas = [
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: Rubro.efectivoBancos.rawValue, importe: 13_590),
            FilaPatrimonio(divisa: "MXN", clase: "pasivo", rubro: Rubro.tarjetasCredito.rawValue, importe: 4_890),
        ]
        let cats: [(String, String, String, String)] = [
            ("s-nomina", "Ingresos", "Nómina", "Ingreso"),
            ("s-renta", "Hogar", "Renta", "Gastos"), ("s-luz", "Hogar", "Luz", "Gastos"), ("s-agua", "Hogar", "Agua", "Gastos"),
            ("s-internet", "Servicios", "Internet", "Gastos"), ("s-celular", "Servicios", "Celular", "Gastos"),
            ("s-super", "Alimentación", "Supermercado", "Gastos"), ("s-rest", "Alimentación", "Restaurantes", "Gastos"),
            ("s-tienda", "Alimentación", "Tiendas de conveniencia", "Gastos"), ("s-mercado", "Alimentación", "Mercado", "Gastos"),
            ("s-gas", "Transporte", "Gasolina", "Gastos"), ("s-taxi", "Transporte", "Taxi y Uber", "Gastos"),
            ("s-stream", "Ocio", "Suscripciones", "Gastos"), ("s-cine", "Ocio", "Cine", "Gastos"),
            ("s-salud", "Salud", "Farmacia", "Gastos"), ("s-gym", "Salud", "Gimnasio", "Gastos"),
            ("s-ropa", "Personal", "Ropa", "Gastos"), ("s-pelu", "Personal", "Peluquería", "Gastos"), ("s-regalo", "Personal", "Regalos", "Gastos"),
        ]
        let categorias = cats.map { Categoria(id: $0.0, categoria: $0.1, subcategoria: $0.2, tipo: $0.3) }

        let hoy = cal.startOfDay(for: now)
        let inicioMes = cal.date(from: cal.dateComponents([.year, .month], from: now))!
        let mesAnterior = cal.date(byAdding: .month, value: -1, to: inicioMes)!
        let diasMesAnterior = cal.range(of: .day, in: .month, for: mesAnterior)!.count

        // (día del mes, comentario, ingreso, gasto, cuenta, subcategoría)
        typealias M = (Int, String, Double, Double, String, String)
        let anterior: [M] = [
            (2, "Renta", 0, 9_500, banco, "s-renta"), (3, "Gimnasio", 0, 650, banco, "s-gym"),
            (4, "Walmart", 0, 2_180, tarjeta, "s-super"), (6, "Gasolina", 0, 950, tarjeta, "s-gas"),
            (7, "Oxxo", 0, 87, efectivo, "s-tienda"), (8, "Telcel", 0, 349, banco, "s-celular"),
            (9, "CFE", 0, 640, banco, "s-luz"), (10, "Telmex", 0, 599, banco, "s-internet"),
            (11, "Netflix", 0, 299, tarjeta, "s-stream"), (11, "Spotify", 0, 129, tarjeta, "s-stream"),
            (12, "Agua", 0, 310, banco, "s-agua"), (13, "Uber", 0, 185, tarjeta, "s-taxi"),
            (14, "Nómina", 13_000, 0, banco, "s-nomina"), (16, "Restaurante", 0, 1_250, tarjeta, "s-rest"),
            (17, "Peluquería", 0, 250, efectivo, "s-pelu"), (18, "Soriana", 0, 1_940, tarjeta, "s-super"),
            (19, "Farmacia", 0, 420, tarjeta, "s-salud"), (20, "Gasolina", 0, 900, tarjeta, "s-gas"),
            (21, "Liverpool", 0, 1_890, tarjeta, "s-ropa"), (22, "Oxxo", 0, 64, efectivo, "s-tienda"),
            (24, "Tacos", 0, 230, efectivo, "s-rest"), (25, "Cine", 0, 360, tarjeta, "s-cine"),
            (26, "Mercado", 0, 540, efectivo, "s-mercado"), (27, "Regalo cumpleaños", 0, 588, tarjeta, "s-regalo"),
            (28, "Nómina", 13_000, 0, banco, "s-nomina"),
        ]
        let actual: [M] = [
            (2, "Renta", 0, 9_500, banco, "s-renta"), (3, "Walmart", 0, 1_760, tarjeta, "s-super"),
            (5, "Gasolina", 0, 900, tarjeta, "s-gas"), (7, "Oxxo", 0, 72, efectivo, "s-tienda"),
            (9, "Tacos", 0, 210, efectivo, "s-rest"), (11, "Netflix", 0, 299, tarjeta, "s-stream"),
            (11, "Spotify", 0, 129, tarjeta, "s-stream"), (14, "Nómina", 13_000, 0, banco, "s-nomina"),
            (16, "Soriana", 0, 1_850, tarjeta, "s-super"), (20, "Gasolina", 0, 900, tarjeta, "s-gas"),
            (28, "Nómina", 13_000, 0, banco, "s-nomina"),
        ]
        func movimiento(_ m: M, mes: Date, n: Int) -> Transaccion {
            let dia = cal.date(byAdding: .day, value: m.0 - 1, to: mes)!
            return Transaccion(id: "s-\(n)", fecha: Fechas.isoLocal(dia, calendario: cal), comentario: m.1,
                               ingreso: m.2, gasto: m.3, divisa: "MXN", cuentaId: m.4, subcategoriaId: m.5)
        }
        var movimientos = anterior.filter { $0.0 <= diasMesAnterior }.enumerated().map { movimiento($1, mes: mesAnterior, n: $0) }
        movimientos += actual.enumerated().compactMap { i, m in
            let d = movimiento(m, mes: inicioMes, n: 100 + i)
            return d.dia(en: cal) <= hoy ? d : nil
        }
        movimientos.sort { $0.fecha > $1.fecha }

        let proximoNetflix = cal.date(byAdding: .month, value: 1, to: cal.date(byAdding: .day, value: 10, to: inicioMes)!)!
        let suscripciones = [
            Suscripcion(id: "s-netflix", serviceName: "Netflix", active: true, frecuencia: "Mensual",
                        proximoPago: Fechas.isoLocal(proximoNetflix, calendario: cal), ultimoPagoMonto: 299),
            Suscripcion(id: "s-spotify", serviceName: "Spotify", active: true, frecuencia: "Mensual",
                        proximoPago: Fechas.isoLocal(proximoNetflix, calendario: cal), ultimoPagoMonto: 129),
        ]
        return Datos(cuentas: cuentas, filasPatrimonio: filas, categorias: categorias, movimientos: movimientos, suscripciones: suscripciones)
    }
}
