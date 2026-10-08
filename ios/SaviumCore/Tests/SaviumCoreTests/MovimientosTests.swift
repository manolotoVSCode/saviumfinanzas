import Foundation
import Testing
@testable import SaviumCore

@Suite("Movimientos")
struct MovimientosTests {
    let cal = Fixtures.calendarioMX

    @Test("agrupa por día respetando el orden de llegada")
    func agrupa() {
        let txs = [Transaccion(id: "a", fecha: "2026-10-06"), Transaccion(id: "b", fecha: "2026-10-06"), Transaccion(id: "c", fecha: "2026-10-05")]
        let g = Movimientos.agruparPorDia(txs)
        #expect(g.map(\.dia) == ["2026-10-06", "2026-10-05"])
        #expect(g[0].movimientos.map(\.id) == ["a", "b"])
    }

    @Test("categorías frecuentes: más usadas primero, empate por la más reciente")
    func frecuentes() {
        let txs = [
            Transaccion(id: "1", fecha: "2026-10-06", subcategoriaId: "cafe"),
            Transaccion(id: "2", fecha: "2026-10-05", subcategoriaId: "super"),
            Transaccion(id: "3", fecha: "2026-10-04", subcategoriaId: "super"),
            Transaccion(id: "4", fecha: "2026-10-03", subcategoriaId: "luz"),
        ]
        #expect(Movimientos.frecuentes(txs, limite: 2) == ["super", "cafe"])
    }

    @Test("formulario: válido solo con importe > 0, cuenta y categoría; gasto o ingreso y divisa de la cuenta")
    func formulario() throws {
        let cuentas = [Cuenta(id: "c1", nombre: "Visa", tipo: "Tarjeta de Crédito", divisa: "USD", vendida: false, saldoInicial: 0, saldoActual: 0)]
        let fecha = try #require(Fechas.horaLocal("2026-10-06T23:30:00", calendario: cal))
        var f = FormularioMovimiento(fecha: fecha)
        #expect(!f.esValido)
        f.importeTexto = "45,5"; f.cuentaId = "c1"; f.subcategoriaId = "cafe"; f.comentario = "  Café  "
        #expect(f.esValido)
        let n = try #require(f.construir(cuentas: cuentas, userId: "u", calendario: cal))
        #expect(n == NuevaTransaccion(cuentaId: "c1", fecha: "2026-10-06", comentario: "Café", ingreso: 0, gasto: 45.5, subcategoriaId: "cafe", divisa: "USD", userId: "u"))
        f.esGasto = false
        #expect(f.construir(cuentas: cuentas, userId: "u", calendario: cal)?.ingreso == 45.5)
        f.importeTexto = "0"
        #expect(!f.esValido && f.construir(cuentas: cuentas, userId: "u", calendario: cal) == nil)
    }
}
