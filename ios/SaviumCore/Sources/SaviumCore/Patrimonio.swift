import Foundation

public enum Rubro: String, CaseIterable, Sendable, Identifiable {
    case efectivoBancos = "efectivo_bancos"
    case inversiones
    case empresasPrivadas = "empresas_privadas"
    case bienRaiz = "bien_raiz"
    case tarjetasCredito = "tarjetas_credito"
    case hipoteca
    public var id: String { rawValue }
    public var esPasivo: Bool { self == .tarjetasCredito || self == .hipoteca }
    public var nombre: String {
        switch self {
        case .efectivoBancos: "Efectivo y bancos"
        case .inversiones: "Inversiones"
        case .empresasPrivadas: "Empresas"
        case .bienRaiz: "Bien raíz"
        case .tarjetasCredito: "Tarjetas de crédito"
        case .hipoteca: "Hipoteca"
        }
    }
}

/// Activos, pasivos y neto a partir de la vista patrimonio_por_divisa (las reglas viven en la vista).
public enum Patrimonio {
    public struct Resultado: Sendable {
        public let porRubro: [Rubro: Double]
        public var activos: Double { Rubro.allCases.filter { !$0.esPasivo }.reduce(0) { $0 + (porRubro[$1] ?? 0) } }
        public var pasivos: Double { Rubro.allCases.filter(\.esPasivo).reduce(0) { $0 + (porRubro[$1] ?? 0) } }
        public var neto: Double { activos - pasivos }
    }

    public static func calcular(_ filas: [FilaPatrimonio], tasas: Tasas, moneda: Divisa) -> Resultado {
        var porRubro: [Rubro: Double] = [:]
        for f in filas {
            guard let rubro = Rubro(rawValue: f.rubro), let divisa = Divisa(rawValue: f.divisa) else { continue }
            porRubro[rubro, default: 0] += Conversion.convertir(f.importe, de: divisa, a: moneda, tasas: tasas)
        }
        return Resultado(porRubro: porRubro)
    }
}
