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
    struct Capital: Decodable { let saldoInicial: Double; let capitalNeto: Double }
    let capitalCuenta: [String: Capital]
    let esperado: E
}

@Suite("Inversiones")
struct InversionesTests {
    @Test("fixture compartido inversiones.json")
    func fixture() throws {
        let f = try Fixtures.cargar("inversiones", como: FixtureInversiones.self)
        var conValor: [(Inversion, valor: Double, aportes: Double)] = []
        for i in f.inversiones {
            let saldo = i.cuentaId.flatMap { f.saldosCuenta[$0] }
            let valor = Inversiones.valorActual(i, valuaciones: f.valuaciones, saldoCuenta: saldo)
            let cuenta = i.cuentaId.flatMap { id in f.capitalCuenta[id].map {
                Cuenta(id: id, nombre: "", tipo: "Inversiones", divisa: i.moneda, vendida: false,
                       saldoInicial: $0.saldoInicial, saldoActual: saldo ?? 0, capitalNeto: $0.capitalNeto)
            } }
            let aportes = Inversiones.aportesCuenta(i, cuenta: cuenta)
            conValor.append((i, valor, aportes))
            let r = Inversiones.rendimiento(i, valor: valor, valuaciones: f.valuaciones, aportes: aportes)
            let e = try #require(f.esperado.porInversion[i.id])
            #expect(abs(r.valor - e.valor) < 1e-6 && abs(r.invertido - e.invertido) < 1e-6, "\(i.id)")
            #expect(abs(r.delta - e.delta) < 1e-6 && abs(r.pct - e.pct) < 1e-6, "\(i.id)")
        }
        let t = Inversiones.totales(conValor, tasas: f.tasas, moneda: f.moneda)
        #expect(abs(t.invertido - f.esperado.totales.invertido) < 1e-6)
        #expect(abs(t.valor - f.esperado.totales.valor) < 1e-6)
    }
}
