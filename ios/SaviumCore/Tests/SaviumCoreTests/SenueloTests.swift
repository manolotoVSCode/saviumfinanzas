import Foundation
import Testing
@testable import SaviumCore

@Suite("Modo señuelo")
struct SenueloTests {
    let cal = Fixtures.calendarioMX

    @Test("cifras modestas y coherentes", arguments: ["2026-10-12T10:00:00", "2026-10-01T08:00:00", "2026-03-31T22:00:00"])
    func cifras(_ momento: String) throws {
        let now = try #require(Fechas.horaLocal(momento, calendario: cal))
        let s = Senuelo.datos(now: now, calendario: cal)
        let p = Patrimonio.calcular(s.filasPatrimonio, tasas: Conversion.tasasRespaldo, moneda: .MXN)
        #expect(p.neto == 8_700)
        #expect(s.cuentas.reduce(0) { $0 + $1.saldoActual } == 8_700)
        let porId = Dictionary(uniqueKeysWithValues: s.categorias.map { ($0.id, $0) })
        let movs = s.movimientos.map {
            MovimientoResumen(fecha: $0.dia(en: cal), ingreso: $0.ingreso, gasto: $0.gasto, divisa: $0.divisa,
                              tipo: porId[$0.subcategoriaId]?.tipo, categoria: porId[$0.subcategoriaId]?.categoria)
        }
        let mes = MesAnterior.totales(movs, moneda: .MXN, now: now, calendario: cal)
        #expect(mes.ingresos == 26_000)
        #expect(mes.gastos == 24_310)
        // Nada en el futuro: todo movimiento es de hoy o antes.
        #expect(s.movimientos.allSatisfy { $0.dia(en: cal) <= cal.startOfDay(for: now) })
        let idsCuentas = Set(s.cuentas.map(\.id))
        #expect(s.movimientos.allSatisfy { porId[$0.subcategoriaId] != nil && idsCuentas.contains($0.cuentaId) })
        #expect(s.suscripciones.map(\.serviceName) == ["Netflix", "Spotify"])
    }
}

@Suite("Código de emergencia")
struct CodigoEmergenciaTests {
    @Test("hash igual al de Postgres: sha256('savium-coaccion:' || user_id || ':' || código)")
    func hash() {
        // echo -n 'savium-coaccion:01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e:1234' | shasum -a 256
        #expect(CodigoEmergencia.hash("1234", userId: "01AD1BCC-00E7-47A7-88B6-8B2FC8AFA52E")
                == "\(CodigoEmergenciaTests.esperado)")
        #expect(CodigoEmergencia.coincide(" 1234 ", hash: CodigoEmergenciaTests.esperado, userId: "01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e"))
        #expect(!CodigoEmergencia.coincide("12345", hash: CodigoEmergenciaTests.esperado, userId: "01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e"))
        #expect(!CodigoEmergencia.coincide("", hash: CodigoEmergenciaTests.esperado, userId: "01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e"))
    }
    static let esperado = "125b2ec384711627ec32fcd3d7e6be48ff9b0a8c8a255be961d140d3ae0fdebb"
}
