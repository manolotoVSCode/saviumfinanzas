import Foundation
import Testing
@testable import SaviumCore

@Suite("Checklist")
struct ChecklistTests {
    let cal = Fixtures.calendarioMX

    @Test("mes siguiente: mismo día, último día si no existe, y fin de mes a fin de mes")
    func siguiente() {
        #expect(Checklist.siguienteFechaMensual("2026-01-15", calendario: cal) == "2026-02-15")
        #expect(Checklist.siguienteFechaMensual("2026-01-31", calendario: cal) == "2026-02-28")
        #expect(Checklist.siguienteFechaMensual("2026-02-28", calendario: cal) == "2026-03-31")
        #expect(Checklist.siguienteFechaMensual("2026-03-30", calendario: cal) == "2026-04-30")
        #expect(Checklist.siguienteFechaMensual("2026-12-10", calendario: cal) == "2027-01-10")
    }

    @Test("marcar: una mensual sigue abierta y avanza; una normal se completa")
    func marcar() {
        let ahora = Date(timeIntervalSince1970: 1_800_000_000)
        let mensual = TareaChecklist(id: "1", texto: "AMEX", fecha: "2026-11-05", repetir: "mensual")
        let c = Checklist.cambiosAlMarcar(mensual, completada: true, ahora: ahora, calendario: cal)
        #expect(c == CambioChecklist(completada: false, completadaAt: ahora, fecha: "2026-12-05"))
        let normal = TareaChecklist(id: "2", texto: "Factura", fecha: "2026-11-05")
        #expect(Checklist.cambiosAlMarcar(normal, completada: true, ahora: ahora, calendario: cal)
                == CambioChecklist(completada: true, completadaAt: ahora, fecha: nil))
        #expect(Checklist.aplicar(c, a: mensual).fecha == "2026-12-05")
    }

    @Test("para hoy: abiertas con fecha de hoy o anterior, la más antigua primero")
    func paraHoy() {
        let now = Fechas.diaLocal("2026-11-09", calendario: cal)!.addingTimeInterval(3600 * 15)
        let tareas = [
            TareaChecklist(id: "a", texto: "hoy", fecha: "2026-11-09"),
            TareaChecklist(id: "b", texto: "vencida", fecha: "2026-11-01"),
            TareaChecklist(id: "c", texto: "mañana", fecha: "2026-11-10"),
            TareaChecklist(id: "d", texto: "sin fecha"),
            TareaChecklist(id: "e", texto: "hecha", fecha: "2026-11-01", completada: true),
        ]
        #expect(Checklist.paraHoy(tareas, now: now, calendario: cal).map(\.id) == ["b", "a"])
        #expect(Checklist.estaVencida(tareas[1], now: now, calendario: cal))
        #expect(!Checklist.estaVencida(tareas[0], now: now, calendario: cal))
    }
}

@Suite("Filtros y cobros")
struct FiltrosTests {
    let cal = Fixtures.calendarioMX

    @Test("periodos: este mes y mes anterior, días incluidos")
    func periodos() {
        let now = Fechas.diaLocal("2026-03-15", calendario: cal)!
        #expect(Movimientos.rango(.esteMes, now: now, calendario: cal)! == ("2026-03-01", "2026-03-31"))
        #expect(Movimientos.rango(.mesAnterior, now: now, calendario: cal)! == ("2026-02-01", "2026-02-28"))
        #expect(Movimientos.rango(.todo, now: now, calendario: cal) == nil)
    }

    @Test("coincide por comentario, categoría o importe exacto, y respeta tipo y periodo")
    func coincide() {
        let t = Transaccion(id: "1", fecha: "2026-03-10", comentario: "Tacos", gasto: 160, subcategoriaId: "rest")
        var f = FiltroMovimientos()
        f.texto = "taco"
        #expect(Movimientos.coincide(t, filtro: f, idsCategoria: [], rango: nil))
        f.texto = "restau"
        #expect(Movimientos.coincide(t, filtro: f, idsCategoria: ["rest"], rango: nil))
        f.texto = "160"
        #expect(Movimientos.coincide(t, filtro: f, idsCategoria: [], rango: nil))
        f.texto = "161"
        #expect(!Movimientos.coincide(t, filtro: f, idsCategoria: [], rango: nil))
        f.texto = ""; f.tipo = .ingresos
        #expect(!Movimientos.coincide(t, filtro: f, idsCategoria: [], rango: nil))
        f.tipo = .gastos
        #expect(!Movimientos.coincide(t, filtro: f, idsCategoria: [], rango: ("2026-02-01", "2026-02-28")))
    }

    @Test("condición del servidor: sin caracteres que rompan la lista, subcategorías e importe")
    func condicion() {
        #expect(Movimientos.condicionBusqueda("  ", idsCategoria: []) == nil)
        #expect(Movimientos.condicionBusqueda("pan, \"dulce\"", idsCategoria: ["a", "b"])
                == "comentario.ilike.*pan_ _dulce_*,subcategoria_id.in.(a,b)")
        #expect(Movimientos.condicionBusqueda("1,234.5", idsCategoria: [])
                == "comentario.ilike.*1_234.5*,gasto.eq.1234.50,ingreso.eq.1234.50")
    }

    @Test("cobro parcial suma a lo cobrado; al llegar al total pasa a cobrado")
    func cobro() {
        let p = Pendiente(id: "p", montoEsperado: 1000, montoCobrado: 300, estado: "cobrado_parcial")
        #expect(Pendientes.cobro(p, monto: 200) == (500, "cobrado_parcial"))
        #expect(Pendientes.cobro(p, monto: 700) == (1000, "cobrado"))
    }

    @Test("apuntar otro: misma cuenta, fecha y tipo; id nuevo y el resto en blanco")
    func siguiente() {
        var f = FormularioMovimiento(fecha: Date(timeIntervalSince1970: 0), cuentaId: "c1")
        f.esGasto = false; f.importeTexto = "10"; f.subcategoriaId = "s"; f.comentario = "x"
        let g = f.siguiente()
        #expect(g.cuentaId == "c1" && g.fecha == f.fecha && !g.esGasto)
        #expect(g.importeTexto.isEmpty && g.subcategoriaId == nil && g.comentario.isEmpty && g.idEnvio != f.idEnvio)
    }
}
