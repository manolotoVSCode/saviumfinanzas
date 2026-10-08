import Foundation
import Testing
@testable import SaviumCore

struct FixtureDivisas: Decodable {
    struct Caso: Decodable { let nombre: String; let importe: Double; let de: Divisa; let a: Divisa; let esperado: Double }
    let tasas: Tasas
    let casos: [Caso]
}

@Suite("Divisas")
struct DivisasTests {
    @Test("fixture compartido divisas.json")
    func fixture() throws {
        let f = try Fixtures.cargar("divisas", como: FixtureDivisas.self)
        for c in f.casos {
            #expect(abs(Conversion.convertir(c.importe, de: c.de, a: c.a, tasas: f.tasas) - c.esperado) < 1e-6, "\(c.nombre)")
        }
    }

    @Test("código desconocido cae en el fallback")
    func codigoDesconocido() {
        #expect(Divisa(codigo: "GBP", fallback: .USD) == .USD)
        #expect(Divisa(codigo: nil, fallback: .MXN) == .MXN)
        #expect(Divisa(codigo: "EUR", fallback: .MXN) == .EUR)
    }

    @Test("tasas desde la respuesta de exchangerate-api: se invierten a MXN por unidad")
    func tasasDesdeRespuesta() throws {
        let json = #"{"base":"MXN","rates":{"MXN":1,"USD":0.05,"EUR":0.04}}"#
        let t = try Conversion.tasas(desdeRespuesta: Data(json.utf8))
        #expect(t[.MXN] == 1)
        #expect(abs(t[.USD]! - 20) < 1e-9)
        #expect(abs(t[.EUR]! - 25) < 1e-9)
    }
}
