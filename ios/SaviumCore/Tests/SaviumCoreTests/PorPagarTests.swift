import Foundation
import Testing
@testable import SaviumCore

struct FixturePorPagar: Decodable {
    struct Tx: Decodable { let id: String; let fecha: String; let gasto: Double; let divisa: String; let subcategoriaId: String }
    struct Cta: Decodable { let id: String; let nombre: String; let tipo: String; let saldoActual: Double; let divisa: String; let vendida: Bool? }
    struct Cat: Decodable { let id: String; let categoria: String; let subcategoria: String; let tipo: String; let frecuencia_seguimiento: String? }
    struct Fila: Decodable { let id: String; let concepto: String; let tipo: String; let monto: Double; let divisa: String; let fecha: String; let detalle: String }
    struct Caso: Decodable {
        let nombre: String; let horizonte: Int
        let suscripciones: [Suscripcion]?; let categorias: [Cat]?; let transacciones: [Tx]?; let cuentas: [Cta]?
        let esperado: [Fila]?; let esperadoIds: [String]?
    }
    let now: String
    let monedaBase: Divisa
    let casos: [Caso]
}

@Suite("Por pagar")
struct PorPagarTests {
    let cal = Fixtures.calendarioMX

    @Test("fixture compartido cxp.json")
    func fixture() throws {
        let f = try Fixtures.cargar("cxp", como: FixturePorPagar.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for c in f.casos {
            let filas = PorPagar.calcular(
                movimientos: (c.transacciones ?? []).map { Transaccion(id: $0.id, fecha: $0.fecha, gasto: $0.gasto, divisa: $0.divisa, subcategoriaId: $0.subcategoriaId) },
                categorias: (c.categorias ?? []).map { Categoria(id: $0.id, categoria: $0.categoria, subcategoria: $0.subcategoria, tipo: $0.tipo, frecuenciaSeguimiento: $0.frecuencia_seguimiento) },
                cuentas: (c.cuentas ?? []).map { Cuenta(id: $0.id, nombre: $0.nombre, tipo: $0.tipo, divisa: $0.divisa, vendida: $0.vendida ?? false, saldoInicial: 0, saldoActual: $0.saldoActual) },
                suscripciones: c.suscripciones ?? [],
                horizonte: c.horizonte, monedaBase: f.monedaBase, now: now, calendario: cal)
            if let ids = c.esperadoIds {
                #expect(filas.map(\.id) == ids, "\(c.nombre)")
                continue
            }
            let esperado = c.esperado ?? []
            #expect(filas.count == esperado.count, "\(c.nombre)")
            for (r, e) in zip(filas, esperado) {
                #expect(r.id == e.id && r.concepto == e.concepto && r.tipo.rawValue == e.tipo, "\(c.nombre)")
                #expect(r.divisa.rawValue == e.divisa && r.detalle == e.detalle, "\(c.nombre)")
                #expect(Fechas.isoLocal(r.fechaEstimada, calendario: cal) == e.fecha, "\(c.nombre): \(Fechas.isoLocal(r.fechaEstimada, calendario: cal))")
                #expect(abs(r.monto - e.monto) < 1e-6, "\(c.nombre)")
            }
        }
    }

    @Test("subcategorías relevantes: anuales, préstamos y obligaciones fijas de gasto")
    func relevantes() {
        let cats = [
            Categoria(id: "seg", categoria: "Seguros", subcategoria: "Coche", tipo: "Gastos", frecuenciaSeguimiento: "anual"),
            Categoria(id: "pr", categoria: "Deudas", subcategoria: "Préstamo coche", tipo: "Gastos"),
            Categoria(id: "int", categoria: "Servicios", subcategoria: "Internet", tipo: "Gastos"),
            Categoria(id: "cafe", categoria: "Alimentación", subcategoria: "Café", tipo: "Gastos"),
            Categoria(id: "sueldo", categoria: "Sueldo", subcategoria: "Nómina", tipo: "Ingreso"),
        ]
        #expect(PorPagar.subcategoriasRelevantes(cats) == ["seg", "pr", "int"])
    }

    @Test("Review Focus 1: fin de mes recorta (31 ago + 1 mes = 30 sep); la web desborda al 1 oct")
    func finDeMes() throws {
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let filas = PorPagar.calcular(
            movimientos: [Transaccion(id: "t", fecha: "2026-08-31", gasto: 100, subcategoriaId: "pr")],
            categorias: [Categoria(id: "pr", categoria: "Deudas", subcategoria: "Préstamo", tipo: "Gastos")],
            cuentas: [], suscripciones: [], horizonte: 30, monedaBase: .MXN, now: now, calendario: cal)
        #expect(filas.map { Fechas.isoLocal($0.fechaEstimada, calendario: cal) } == ["2026-09-30"])
    }
}
