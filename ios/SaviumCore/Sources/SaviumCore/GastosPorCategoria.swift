import Foundation

/// En qué se fue el dinero el mes anterior: gasto neto (gasto menos reembolsos) por categoría y subcategoría,
/// con las reglas de la tarjeta «Mes anterior» (solo la divisa elegida, sin «Compra Venta Inmuebles»).
public enum GastosPorCategoria {
    public struct Sub: Sendable, Equatable {
        public let nombre: String
        public let total: Double
        public init(nombre: String, total: Double) { self.nombre = nombre; self.total = total }
    }

    public struct Fila: Sendable, Equatable, Identifiable {
        public var id: String { nombre }
        public let nombre: String
        public let total: Double
        public let subcategorias: [Sub]
    }

    /// Categorías con gasto neto positivo, de mayor a menor; subcategorías también de mayor a menor.
    public static func calcular(_ movs: [MovimientoResumen], moneda: Divisa, now: Date, calendario: Calendar) -> [Fila] {
        let (inicio, fin) = MesAnterior.limites(now: now, calendario: calendario)
        var porCategoria: [String: [String: Double]] = [:]
        for m in movs where m.fecha >= inicio && m.fecha <= fin && m.divisa == moneda.rawValue
            && m.tipo == "Gastos" && m.categoria != MesAnterior.excluida {
            let categoria = m.categoria ?? "SIN ASIGNAR"
            porCategoria[categoria, default: [:]][m.subcategoria ?? "SIN ASIGNAR", default: 0] += m.gasto - m.ingreso
        }
        return porCategoria.compactMap { nombre, subs -> Fila? in
            let total = subs.values.reduce(0, +)
            guard total > 0 else { return nil }
            let ordenadas = subs.map { Sub(nombre: $0.key, total: $0.value) }
                .sorted { $0.total != $1.total ? $0.total > $1.total : $0.nombre < $1.nombre }
            return Fila(nombre: nombre, total: total, subcategorias: ordenadas)
        }
        .sorted { $0.total != $1.total ? $0.total > $1.total : $0.nombre < $1.nombre }
    }
}
