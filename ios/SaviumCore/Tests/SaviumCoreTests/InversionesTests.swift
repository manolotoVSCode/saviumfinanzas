import Foundation
import Testing
@testable import SaviumCore

struct FixtureInversiones: Decodable {
    struct Esperado: Decodable { let valor: Double; let invertido: Double; let delta: Double; let pct: Double }
    struct Totales: Decodable { let invertido: Double; let valor: Double }
    struct E: Decodable { let porInversion: [String: Esperado]; let totales: Totales }
    let tasas: Tasas
    let moneda: Divisa
    let inversiones: [Inversion]
    let valuaciones: [Valuacion]
    let saldosCuenta: [String: Double]
    let esperado: E
}

@Suite("Inversiones")
struct InversionesTests {
    @Test("fixture compartido inversiones.json")
    func fixture() throws {
        let f = try Fixtures.cargar("inversiones", como: FixtureInversiones.self)
        var conValor: [(Inversion, valor: Double)] = []
        for i in f.inversiones {
            let valor = Inversiones.valorActual(i, valuaciones: f.valuaciones, saldoCuenta: i.cuentaId.flatMap { f.saldosCuenta[$0] })
            conValor.append((i, valor))
            let r = Inversiones.rendimiento(i, valor: valor, valuaciones: f.valuaciones)
            let e = try #require(f.esperado.porInversion[i.id])
            #expect(abs(r.valor - e.valor) < 1e-6 && abs(r.invertido - e.invertido) < 1e-6, "\(i.id)")
            #expect(abs(r.delta - e.delta) < 1e-6 && abs(r.pct - e.pct) < 1e-6, "\(i.id)")
        }
        let t = Inversiones.totales(conValor, tasas: f.tasas, moneda: f.moneda)
        #expect(abs(t.invertido - f.esperado.totales.invertido) < 1e-6)
        #expect(abs(t.valor - f.esperado.totales.valor) < 1e-6)
    }
}
