import Foundation

/// Port de src/lib/finance/subscriptionsSummary.ts.
public enum Suscripciones {
    static let factorMensual: [String: Double] = [
        "Semanal": 52.0 / 12, "Mensual": 1, "Bimestral": 1.0 / 2,
        "Trimestral": 1.0 / 3, "Semestral": 1.0 / 6, "Anual": 1.0 / 12,
    ]

    /// Equivalente mensual de un pago; nil si la frecuencia no se puede estimar (Irregular u otra).
    public static func estimadoMensual(frecuencia: String, monto: Double) -> Double? {
        factorMensual[frecuencia].map { monto * $0 }
    }

    public struct Resumen: Sendable, Equatable {
        public let estimadoMensual: Double
        public let estimadas: Int
        public let sinEstimar: Int
    }

    /// El llamador pasa solo suscripciones activas.
    public static func resumen(_ subs: [(frecuencia: String, monto: Double)]) -> Resumen {
        var total = 0.0, estimadas = 0, sinEstimar = 0
        for s in subs {
            if let m = estimadoMensual(frecuencia: s.frecuencia, monto: s.monto) { total += m; estimadas += 1 } else { sinEstimar += 1 }
        }
        return Resumen(estimadoMensual: total, estimadas: estimadas, sinEstimar: sinEstimar)
    }

    /// «Suscripciones mensuales activas» del escritorio (SubscriptionsManager): suma del último pago
    /// de las de frecuencia Mensual, sin prorratear las demás. El llamador pasa solo las activas.
    public static func totalMensuales(_ subs: [(frecuencia: String, monto: Double)]) -> (total: Double, cantidad: Int) {
        let mensuales = subs.filter { $0.frecuencia == "Mensual" }
        return (mensuales.reduce(0) { $0 + $1.monto }, mensuales.count)
    }

    public enum Estado: String, Sendable {
        /// Caía en un mes ya importado y no apareció el cargo.
        case sinCargo = "sin_cargo"
        /// Cae en el mes en curso (aún sin importar).
        case esteMes = "este_mes"
        case proxima
    }

    public static func estado(proximoPago: String, now: Date, calendario: Calendar) -> (estado: Estado, dias: Int) {
        let dias = Fechas.diasHasta(proximoPago, now: now, calendario: calendario)
        guard let px = Fechas.diaLocal(proximoPago, calendario: calendario) else { return (.proxima, dias) }
        if px <= Fechas.finMesAnterior(now, calendario: calendario) { return (.sinCargo, dias) }
        let inicioMes = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        let finMesActual = calendario.date(byAdding: .month, value: 1, to: inicioMes)!.addingTimeInterval(-0.001)
        return (px <= finMesActual ? .esteMes : .proxima, dias)
    }
}
