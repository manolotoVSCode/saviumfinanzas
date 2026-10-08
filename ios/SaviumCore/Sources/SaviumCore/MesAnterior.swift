import Foundation

public struct MovimientoResumen: Sendable {
    /// Medianoche local del día del movimiento.
    public let fecha: Date
    public let ingreso: Double
    public let gasto: Double
    public let divisa: String
    public let tipo: String?
    public let categoria: String?
    public init(fecha: Date, ingreso: Double, gasto: Double, divisa: String, tipo: String?, categoria: String?) {
        self.fecha = fecha; self.ingreso = ingreso; self.gasto = gasto; self.divisa = divisa; self.tipo = tipo; self.categoria = categoria
    }
}

/// Ingresos, gastos y balance del mes anterior: mismas reglas que computeDashboardMetrics.
public enum MesAnterior {
    static let excluida = "Compra Venta Inmuebles"

    public struct Totales: Sendable, Equatable {
        public let ingresos: Double
        public let gastos: Double
        public var balance: Double { ingresos - gastos }
    }

    /// Del día 1 a las 00:00 al último día a las 00:00 (new Date(y, m, 0) en la web).
    static func limites(now: Date, calendario: Calendar) -> (inicio: Date, fin: Date) {
        let inicioMesActual = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        let inicio = calendario.date(byAdding: .month, value: -1, to: inicioMesActual)!
        let fin = calendario.date(byAdding: .day, value: -1, to: inicioMesActual)!
        return (inicio, fin)
    }

    /// Días (YYYY-MM-DD) a pedir a la BD para el mes anterior.
    public static func rango(now: Date, calendario: Calendar) -> (desde: String, hasta: String) {
        let (inicio, fin) = limites(now: now, calendario: calendario)
        return (Fechas.isoLocal(inicio, calendario: calendario), Fechas.isoLocal(fin, calendario: calendario))
    }

    public static func totales(_ movs: [MovimientoResumen], tasas: Tasas, moneda: Divisa, now: Date, calendario: Calendar) -> Totales {
        let (inicio, fin) = limites(now: now, calendario: calendario)
        let delMes = movs.filter { $0.fecha >= inicio && $0.fecha <= fin }
        func conv(_ x: Double, _ d: String) -> Double {
            Conversion.convertir(x, de: Divisa(codigo: d, fallback: moneda), a: moneda, tasas: tasas)
        }
        // Reembolso: ingreso en una categoría de gasto; resta del gasto, no suma al ingreso.
        let reembolsos = delMes.filter { $0.ingreso > 0 && $0.tipo == "Gastos" }.reduce(0.0) { $0 + conv($1.ingreso, $1.divisa) }
        let ingresos = delMes.filter { $0.ingreso > 0 && $0.tipo == "Ingreso" && $0.categoria != excluida }.reduce(0.0) { $0 + conv($1.ingreso, $1.divisa) }
        let gastos = delMes.filter { $0.tipo == "Gastos" && $0.categoria != excluida }.reduce(0.0) { $0 + conv($1.gasto, $1.divisa) } - reembolsos
        return Totales(ingresos: ingresos, gastos: gastos)
    }
}
