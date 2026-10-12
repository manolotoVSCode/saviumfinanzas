import Foundation
import Testing
@testable import SaviumCore

@Suite("Gastos por categoría")
struct GastosPorCategoriaTests {
    let cal = Fixtures.calendarioMX

    func mov(_ dia: String, gasto: Double = 0, ingreso: Double = 0, divisa: String = "MXN", tipo: String = "Gastos",
             categoria: String, sub: String) -> MovimientoResumen {
        MovimientoResumen(fecha: Fechas.diaLocal(dia, calendario: cal)!, ingreso: ingreso, gasto: gasto, divisa: divisa,
                          tipo: tipo, categoria: categoria, subcategoria: sub)
    }

    @Test("mes anterior, solo la divisa elegida, reembolsos restan, inmuebles fuera, ordenado")
    func reglas() throws {
        let now = try #require(Fechas.horaLocal("2026-10-12T10:00:00", calendario: cal))
        let movs = [
            mov("2026-09-03", gasto: 1000, categoria: "Casa", sub: "Luz"),
            mov("2026-09-10", gasto: 500, categoria: "Casa", sub: "Agua"),
            mov("2026-09-11", ingreso: 200, categoria: "Casa", sub: "Luz"),          // reembolso
            mov("2026-09-12", gasto: 3000, categoria: "Comida", sub: "Súper"),
            mov("2026-09-13", gasto: 50, divisa: "USD", categoria: "Viajes", sub: "Hotel"),
            mov("2026-09-14", gasto: 900000, categoria: "Compra Venta Inmuebles", sub: "Casa"),
            mov("2026-09-15", ingreso: 40000, tipo: "Ingreso", categoria: "Sueldo", sub: "Nómina"),
            mov("2026-09-16", ingreso: 100, categoria: "Ocio", sub: "Cine"),          // solo reembolso: fuera
            mov("2026-10-01", gasto: 777, categoria: "Casa", sub: "Luz"),             // otro mes
        ]
        let filas = GastosPorCategoria.calcular(movs, moneda: .MXN, now: now, calendario: cal)
        #expect(filas.map(\.nombre) == ["Comida", "Casa"])
        #expect(filas[1].total == 1300)
        #expect(filas[1].subcategorias == [.init(nombre: "Luz", total: 800), .init(nombre: "Agua", total: 500)])
        #expect(GastosPorCategoria.calcular(movs, moneda: .USD, now: now, calendario: cal).map(\.total) == [50])
    }
}
