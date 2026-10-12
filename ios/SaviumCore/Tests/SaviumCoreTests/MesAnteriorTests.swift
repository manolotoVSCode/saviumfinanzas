import Foundation
import Testing
@testable import SaviumCore

struct FixtureMesAnterior: Decodable {
    struct Tx: Decodable { let id: String; let fecha: String; let ingreso: Double?; let gasto: Double?; let divisa: String; let tipo: String?; let categoria: String? }
    struct Esperado: Decodable { let ingresos: Double; let gastos: Double; let balance: Double }
    struct Caso: Decodable { let nombre: String; let moneda: Divisa; let esperado: Esperado; let esperadoSoloDivisa: Esperado }
    let tasas: Tasas
    let now: String
    let transacciones: [Tx]
    let casos: [Caso]
}

@Suite("Mes anterior")
struct MesAnteriorTests {
    let cal = Fixtures.calendarioMX

    /// La app sigue a la tarjeta mensual de la web: solo la divisa elegida, sin convertir.
    @Test("fixture compartido mes_anterior.json")
    func fixture() throws {
        let f = try Fixtures.cargar("mes_anterior", como: FixtureMesAnterior.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        let movs = f.transacciones.map {
            MovimientoResumen(fecha: Fechas.diaLocal($0.fecha, calendario: cal)!, ingreso: $0.ingreso ?? 0, gasto: $0.gasto ?? 0,
                              divisa: $0.divisa, tipo: $0.tipo, categoria: $0.categoria)
        }
        for c in f.casos {
            let t = MesAnterior.totales(movs, moneda: c.moneda, now: now, calendario: cal)
            let e = c.esperadoSoloDivisa
            #expect(abs(t.ingresos - e.ingresos) < 1e-6, "\(c.nombre)")
            #expect(abs(t.gastos - e.gastos) < 1e-6, "\(c.nombre)")
            #expect(abs(t.balance - e.balance) < 1e-6, "\(c.nombre)")
        }
    }

    @Test("el día 1 y el último día cuentan en su mes")
    func limites() throws {
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let movs = ["2026-07-31", "2026-08-01", "2026-08-31", "2026-09-01"].map {
            MovimientoResumen(fecha: Fechas.diaLocal($0, calendario: cal)!, ingreso: 0, gasto: 10, divisa: "MXN", tipo: "Gastos", categoria: "Casa")
        }
        #expect(MesAnterior.totales(movs, moneda: .MXN, now: now, calendario: cal).gastos == 20)
        let r = MesAnterior.rango(now: now, calendario: cal)
        #expect(r.desde == "2026-08-01" && r.hasta == "2026-08-31")
    }
}
