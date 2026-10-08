import Foundation

/// Divisas que maneja Savium. Igual que CurrencyCode en la web.
public enum Divisa: String, Codable, CaseIterable, Sendable, Identifiable, CodingKeyRepresentable {
    case MXN, USD, EUR
    public var id: String { rawValue }

    /// toCurrencyCode de la web: código libre de la BD → divisa soportada, o `fallback`.
    public init(codigo: String?, fallback: Divisa) {
        self = codigo.flatMap(Divisa.init(rawValue:)) ?? fallback
    }
}

/// MXN por unidad de cada divisa (MXN = 1).
public typealias Tasas = [Divisa: Double]

public enum Conversion {
    /// Las mismas de respaldo que useExchangeRates.
    public static let tasasRespaldo: Tasas = [.MXN: 1, .USD: 20, .EUR: 22]

    /// convertWithRates de la web: siempre pasando por MXN.
    public static func convertir(_ importe: Double, de: Divisa, a: Divisa, tasas: Tasas) -> Double {
        if de == a { return importe }
        let enMXN = de == .MXN ? importe : importe * (tasas[de] ?? tasasRespaldo[de]!)
        return a == .MXN ? enMXN : enMXN / (tasas[a] ?? tasasRespaldo[a]!)
    }

    /// Respuesta de https://api.exchangerate-api.com/v4/latest/MXN → MXN por unidad.
    public static func tasas(desdeRespuesta data: Data) throws -> Tasas {
        struct Respuesta: Decodable { let rates: [String: Double] }
        let r = try JSONDecoder().decode(Respuesta.self, from: data)
        guard let usd = r.rates["USD"], let eur = r.rates["EUR"], usd > 0, eur > 0 else {
            throw URLError(.cannotParseResponse)
        }
        return [.MXN: 1, .USD: 1 / usd, .EUR: 1 / eur]
    }
}
