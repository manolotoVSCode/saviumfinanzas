import Foundation

/// Port de src/lib/finance/pendingsSummary.ts.
public enum Pendientes {
    public static func estaActivo(_ p: Pendiente) -> Bool {
        p.estado == "pendiente" || p.estado == "cobrado_parcial"
    }

    /// Vencido: fecha esperada (día local) anterior a hoy. Lo que vence hoy aún no está vencido.
    public static func estaVencido(_ p: Pendiente, now: Date, calendario: Calendar) -> Bool {
        guard let iso = p.fechaEsperada, let d = Fechas.diaLocal(iso, calendario: calendario) else { return false }
        return d < calendario.startOfDay(for: now)
    }

    public struct Fila: Sendable, Identifiable {
        public let pendiente: Pendiente
        /// monto esperado − cobrado, en la divisa del pendiente.
        public let restante: Double
        public let vencido: Bool
        public var id: String { pendiente.id }
    }

    public struct Resumen: Sendable {
        /// Activos: vencidos primero, luego por fecha esperada; sin fecha al final.
        public let filas: [Fila]
        public let total: Double
        public let vencidos: Int
    }

    public static func resumen(_ pendientes: [Pendiente], tasas: Tasas, moneda: Divisa, now: Date, calendario: Calendar) -> Resumen {
        let filas = pendientes.filter(estaActivo).map {
            Fila(pendiente: $0, restante: $0.montoEsperado - ($0.montoCobrado ?? 0), vencido: estaVencido($0, now: now, calendario: calendario))
        }
        // Orden estable, como Array.prototype.sort.
        let ordenadas = filas.enumerated().sorted { a, b in
            let (x, y) = (a.element, b.element)
            if x.vencido != y.vencido { return x.vencido }
            switch (x.pendiente.fechaEsperada, y.pendiente.fechaEsperada) {
            case let (fa?, fb?) where fa != fb: return fa < fb
            case (nil, .some): return false
            case (.some, nil): return true
            default: return a.offset < b.offset
            }
        }.map(\.element)
        let total = ordenadas.reduce(0.0) {
            $0 + Conversion.convertir($1.restante, de: Divisa(codigo: $1.pendiente.divisa, fallback: moneda), a: moneda, tasas: tasas)
        }
        return Resumen(filas: ordenadas, total: total, vencidos: ordenadas.filter(\.vencido).count)
    }
}
