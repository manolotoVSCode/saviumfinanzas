import Foundation

/// Port de valorActualInversion, investmentReturn y totalesInversiones (src/lib/finance/investmentReturn.ts).
public enum Inversiones {
    static func valuacionesDe(_ id: String, _ vals: [Valuacion]) -> [Valuacion] {
        vals.filter { $0.inversionId == id }.enumerated()
            .sorted { $0.element.fecha != $1.element.fecha ? $0.element.fecha < $1.element.fecha : $0.offset < $1.offset }
            .map(\.element)
    }

    /// Última valuación; si no hay, saldo de la cuenta vinculada; si no, valor_actual o monto_invertido.
    public static func valorActual(_ inv: Inversion, valuaciones: [Valuacion], saldoCuenta: Double?) -> Double {
        if let ultima = valuacionesDe(inv.id, valuaciones).last { return ultima.valor }
        if let saldoCuenta { return saldoCuenta }
        return inv.valorActual != 0 ? inv.valorActual : inv.montoInvertido
    }

    public struct Rendimiento: Sendable {
        public let invertido: Double
        public let valor: Double
        public let delta: Double
        public let pct: Double
    }

    /// Capital que entró por la cuenta vinculada además de monto_invertido: aportaciones − retiros
    /// y, si la inversión no tiene monto_invertido, el saldo inicial. 0 sin cuenta vinculada.
    public static func aportesCuenta(_ inv: Inversion, cuenta: Cuenta?) -> Double {
        guard let cuenta else { return 0 }
        return cuenta.capitalNeto + (inv.montoInvertido != 0 ? 0 : cuenta.saldoInicial)
    }

    /// `valor` es el de valorActual (la web sobrescribe valor_actual antes de calcular).
    public static func rendimiento(_ inv: Inversion, valor: Double, valuaciones: [Valuacion], aportes: Double = 0) -> Rendimiento {
        let vals = valuacionesDe(inv.id, valuaciones)
        let invertido = (inv.montoInvertido != 0 ? inv.montoInvertido : (vals.first?.valor ?? 0)) + aportes
        let v = valor != 0 ? valor : invertido
        let base = vals.count > 1 && aportes == 0 ? vals[0].valor : invertido
        let delta = v - base
        return Rendimiento(invertido: invertido, valor: v, delta: delta, pct: base != 0 ? delta / base * 100 : 0)
    }

    /// Invertido (monto_invertido + aportes) y valor de las activas, convertidos a `moneda` (como InversionesMovil).
    public static func totales(_ invs: [(Inversion, valor: Double, aportes: Double)], tasas: Tasas, moneda: Divisa) -> (invertido: Double, valor: Double) {
        invs.filter { $0.0.activa }.reduce((0.0, 0.0)) { acc, par in
            let (i, valor, aportes) = par
            let de = Divisa(codigo: i.moneda, fallback: moneda)
            let v = valor != 0 ? valor : i.montoInvertido
            return (acc.0 + Conversion.convertir(i.montoInvertido + aportes, de: de, a: moneda, tasas: tasas),
                    acc.1 + Conversion.convertir(v, de: de, a: moneda, tasas: tasas))
        }
    }
}
