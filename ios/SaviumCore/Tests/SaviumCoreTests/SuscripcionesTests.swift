import Foundation
import Testing
@testable import SaviumCore

struct FixtureSuscripciones: Decodable {
    struct Sub: Decodable { let frecuencia: String; let ultimo_pago_monto: Double }
    struct EsperadoResumen: Decodable { let estimadoMensual: Double; let estimadas: Int; let sinEstimar: Int }
    struct Resumen: Decodable { let suscripciones: [Sub]; let esperado: EsperadoResumen }
    struct EsperadoEstado: Decodable { let estado: String; let dias: Int }
    struct Estado: Decodable { let proximo_pago: String; let esperado: EsperadoEstado }
    let now: String
    let resumen: Resumen
    let estados: [Estado]
}

@Suite("Suscripciones")
struct SuscripcionesTests {
    @Test("fixture compartido suscripciones.json")
    func fixture() throws {
        let cal = Fixtures.calendarioMX
        let f = try Fixtures.cargar("suscripciones", como: FixtureSuscripciones.self)
        let r = Suscripciones.resumen(f.resumen.suscripciones.map { (frecuencia: $0.frecuencia, monto: $0.ultimo_pago_monto) })
        #expect(abs(r.estimadoMensual - f.resumen.esperado.estimadoMensual) < 1e-6)
        #expect(r.estimadas == f.resumen.esperado.estimadas)
        #expect(r.sinEstimar == f.resumen.esperado.sinEstimar)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for e in f.estados {
            let s = Suscripciones.estado(proximoPago: e.proximo_pago, now: now, calendario: cal)
            #expect(s.estado.rawValue == e.esperado.estado, "\(e.proximo_pago)")
            #expect(s.dias == e.esperado.dias, "\(e.proximo_pago)")
        }
    }

    @Test("total mensual: solo las de frecuencia Mensual, sin prorratear (como el escritorio de la web)")
    func totalMensuales() {
        let r = Suscripciones.totalMensuales([
            (frecuencia: "Mensual", monto: 184.99), (frecuencia: "Mensual", monto: 1737.70),
            (frecuencia: "Anual", monto: 2000), (frecuencia: "Semanal", monto: 100), (frecuencia: "Mensual", monto: 49),
        ])
        #expect(abs(r.total - 1971.69) < 1e-6)
        #expect(r.cantidad == 3)
    }
}
