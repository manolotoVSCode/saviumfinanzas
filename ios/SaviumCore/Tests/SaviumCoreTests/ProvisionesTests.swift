import Foundation
import Testing
@testable import SaviumCore

@Suite("Provisiones de CxP")
struct ProvisionesTests {
    let cal = Fixtures.calendarioMX

    func prov(_ id: String = "p1", monto: Double = 900_000, divisa: String = "MXN", fecha: String = "2026-12-21",
              frecuencia: String = "unica", estado: String = "pendiente") -> ProvisionCxP {
        ProvisionCxP(id: id, concepto: "Fideicomiso", monto: monto, divisa: divisa, fecha: fecha, frecuencia: frecuencia, estado: estado, notas: nil)
    }
    func dia(_ s: String) -> Date { Fechas.diaLocal(s, calendario: cal)! }
    func calcular(_ p: [ProvisionCxP], horizonte: Int, now: String = "2026-09-15") -> [FilaPorPagar] {
        PorPagar.calcular(movimientos: [], categorias: [], cuentas: [], suscripciones: [], provisiones: p,
                          horizonte: horizonte, monedaBase: .MXN, now: dia(now), calendario: cal)
    }

    @Test("solo las pendientes dentro del horizonte, y una vencida sigue contando")
    func horizonte() {
        let filas = calcular([
            prov("dentro", fecha: "2026-09-25"), prov("vencida", fecha: "2026-09-01"), prov("lejos", fecha: "2026-11-01"),
            prov("pagada", fecha: "2026-09-20", estado: "pagado"), prov("cancelada", fecha: "2026-09-20", estado: "cancelado"),
        ], horizonte: 30)
        #expect(filas.map(\.id) == ["prov-vencida-0", "prov-dentro-0"])
        #expect(filas.allSatisfy { $0.tipo == .provision })
    }

    @Test("una recurrente aporta cada ocurrencia sin perder el día 31")
    func recurrente() {
        let filas = calcular([prov(fecha: "2027-01-31", frecuencia: "mensual")], horizonte: 90, now: "2027-01-01")
        #expect(filas.map(\.fechaEstimada) == [dia("2027-01-31"), dia("2027-02-28"), dia("2027-03-31")])
    }

    @Test("pagos grandes: desde 100K MXN convertidos, sin importar la fecha")
    func grandes() {
        let tasas: Tasas = [.MXN: 1, .USD: 20, .EUR: 22]
        let r = PorPagar.pagosGrandes([
            prov("lejana", fecha: "2027-06-01"), prov("justa", monto: 100_000, fecha: "2026-10-01"),
            prov("chica", monto: 99_999.99), prov("usd", monto: 6_000, divisa: "USD", fecha: "2026-11-01"),
            prov("pagada", estado: "pagado"),
        ], tasas: tasas)
        #expect(r.map(\.id) == ["justa", "usd", "lejana"])
    }
}
