import Foundation

/// Una compra de la tabla criptomonedas (solo lo que usa la alerta).
public struct CompraCripto: Codable, Sendable, Hashable {
    public let simbolo: String
    public let cantidad: Double
    public let precioCompra: Double
    public let divisaCompra: String
    enum CodingKeys: String, CodingKey {
        case simbolo, cantidad
        case precioCompra = "precio_compra", divisaCompra = "divisa_compra"
    }
    public init(simbolo: String, cantidad: Double, precioCompra: Double, divisaCompra: String) {
        self.simbolo = simbolo; self.cantidad = cantidad; self.precioCompra = precioCompra; self.divisaCompra = divisaCompra
    }
}

/// Fila de alertas_cripto: niveles del % sobre el precio de compra, con signo.
/// Avisa cuando el % es ≥ nivelArriba o ≤ nivelAbajo; nil = sin ese aviso.
public struct UmbralCripto: Codable, Sendable, Hashable {
    public let simbolo: String
    public let nivelArriba: Double?
    public let nivelAbajo: Double?
    enum CodingKeys: String, CodingKey { case simbolo, nivelArriba = "nivel_arriba", nivelAbajo = "nivel_abajo" }
    public init(simbolo: String, nivelArriba: Double?, nivelAbajo: Double?) {
        self.simbolo = simbolo; self.nivelArriba = nivelArriba; self.nivelAbajo = nivelAbajo
    }
}

/// Port de posicionesCripto y criptoAlerts (src/lib/finance/alerts.ts); fixture shared/fixtures/alertas_cripto.json.
public enum AlertasCripto {
    public struct Alerta: Sendable, Hashable, Identifiable {
        /// La misma clave que la web: un descarte vale en los dos sitios.
        public let clave: String
        public let simbolo: String
        /// true = llegó a nivelArriba; false = cayó a nivelAbajo.
        public let arriba: Bool
        /// Ganancia (+) o pérdida (−) sobre lo pagado, en %.
        public let pct: Double
        public let nivel: Double
        public let valorUSD: Double
        public var id: String { clave }
    }

    /// Todas las compras de cada símbolo juntas; `precios` en USD.
    public static func calcular(compras: [CompraCripto], precios: [String: Double], umbrales: [UmbralCripto], tasas: Tasas) -> [Alerta] {
        var acumulado: [String: (costo: Double, valor: Double)] = [:]
        for c in compras {
            guard let precio = precios[c.simbolo] else { continue }
            let de = Divisa(codigo: c.divisaCompra, fallback: .USD)
            let a = acumulado[c.simbolo] ?? (0, 0)
            acumulado[c.simbolo] = (a.costo + c.cantidad * Conversion.convertir(c.precioCompra, de: de, a: .USD, tasas: tasas),
                                    a.valor + c.cantidad * precio)
        }
        return umbrales.sorted { $0.simbolo < $1.simbolo }.compactMap { u in
            guard let a = acumulado[u.simbolo], a.costo > 0 else { return nil }
            let pct = (a.valor / a.costo - 1) * 100
            let arriba = u.nivelArriba.map { pct >= $0 } ?? false
            let abajo = u.nivelAbajo.map { pct <= $0 } ?? false
            guard arriba || abajo, let nivel = arriba ? u.nivelArriba : u.nivelAbajo else { return nil }
            return Alerta(clave: "cripto_\(arriba ? "arriba" : "abajo"):\(u.simbolo):\(numeroComoJS(nivel))",
                          simbolo: u.simbolo, arriba: arriba, pct: pct, nivel: nivel, valorUSD: a.valor)
        }
    }

    /// Como `${n}` en JavaScript para los niveles: 15 → «15», -20 → «-20», 12.5 → «12.5».
    static func numeroComoJS(_ n: Double) -> String {
        n == n.rounded() && abs(n) < 1e15 ? String(Int64(n)) : String(n)
    }
}
