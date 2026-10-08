import Foundation
import Testing
@testable import SaviumCore

struct FixtureVencidos: Decodable {
    struct Esperado: Decodable { let orden: [String]; let vencidos: [String]; let total: Double }
    struct Caso: Decodable { let nombre: String; let moneda: Divisa; let esperado: Esperado }
    let tasas: Tasas
    let now: String
    let pendientes: [Pendiente]
    let casos: [Caso]
}

@Suite("Pendientes")
struct PendientesTests {
    let cal = Fixtures.calendarioMX

    @Test("fixture compartido vencidos.json")
    func fixture() throws {
        let f = try Fixtures.cargar("vencidos", como: FixtureVencidos.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for c in f.casos {
            let r = Pendientes.resumen(f.pendientes, tasas: f.tasas, moneda: c.moneda, now: now, calendario: cal)
            #expect(r.filas.map(\.pendiente.id) == c.esperado.orden, "\(c.nombre)")
            #expect(r.filas.filter(\.vencido).map(\.pendiente.id) == c.esperado.vencidos, "\(c.nombre)")
            #expect(abs(r.total - c.esperado.total) < 1e-6, "\(c.nombre)")
            #expect(r.vencidos == c.esperado.vencidos.count)
        }
    }

    @Test("fechas: día local ida y vuelta, y fin del mes anterior")
    func fechas() throws {
        let d = try #require(Fechas.diaLocal("2026-08-01", calendario: cal))
        #expect(Fechas.isoLocal(d, calendario: cal) == "2026-08-01")   // el día 1 sigue en su mes
        #expect(Transaccion(id: "t", fecha: "2026-08-01").dia(en: cal) == d)
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let fin = Fechas.finMesAnterior(now, calendario: cal)
        #expect(Fechas.isoLocal(fin, calendario: cal) == "2026-08-31")
        #expect(Fechas.diasHasta("2026-09-30", now: now, calendario: cal) == 15)
        #expect(Fechas.diasHasta("2026-08-30", now: now, calendario: cal) == -16)
    }
}
