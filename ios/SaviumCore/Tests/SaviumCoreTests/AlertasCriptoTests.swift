import Foundation
import Testing
@testable import SaviumCore

struct FixtureAlertasCripto: Decodable {
    struct Esperado: Decodable { let clave: String; let simbolo: String; let sube: Bool; let pct: Double; let valorUSD: Double }
    let tasas: Tasas
    let criptos: [CompraCripto]
    let precios: [String: Double]
    let umbrales: [UmbralCripto]
    let esperado: [Esperado]
}

@Suite("Alertas cripto")
struct AlertasCriptoTests {
    @Test("fixture compartido alertas_cripto.json")
    func fixture() throws {
        let f = try Fixtures.cargar("alertas_cripto", como: FixtureAlertasCripto.self)
        let r = AlertasCripto.calcular(compras: f.criptos, precios: f.precios, umbrales: f.umbrales, tasas: f.tasas)
        #expect(r.map(\.clave) == f.esperado.map(\.clave))
        for (a, e) in zip(r, f.esperado) {
            #expect(a.simbolo == e.simbolo && a.sube == e.sube)
            #expect(abs(a.pct - e.pct) < 1e-6 && abs(a.valorUSD - e.valorUSD) < 1e-6, "\(a.clave)")
        }
    }

    @Test("la clave escribe el umbral como la web")
    func clave() {
        #expect(AlertasCripto.numeroComoJS(15) == "15")
        #expect(AlertasCripto.numeroComoJS(12.5) == "12.5")
    }
}
