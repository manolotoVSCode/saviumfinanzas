import Foundation
import Testing
@testable import SaviumCore

@Suite("Modelos")
struct ModelosTests {
    @Test("decodifica filas de PostgREST en snake_case")
    func decodifica() throws {
        let cuenta = #"{"id":"a","nombre":"Banco","tipo":"Banco","divisa":"MXN","vendida":false,"saldo_inicial":10,"saldo_actual":12.5,"user_id":"u","created_at":"x"}"#
        let c = try JSONDecoder().decode(Cuenta.self, from: Data(cuenta.utf8))
        #expect(c.saldoActual == 12.5 && c.saldoInicial == 10 && !c.vendida)

        let tx = #"{"id":"t","fecha":"2026-08-05","comentario":"Luz","ingreso":0,"gasto":540,"divisa":"MXN","cuenta_id":"a","subcategoria_id":"s"}"#
        let t = try JSONDecoder().decode(Transaccion.self, from: Data(tx.utf8))
        #expect(t.importe == -540 && t.cuentaId == "a" && t.subcategoriaId == "s")

        let sub = #"{"id":"s1","service_name":"Netflix","active":true,"frecuencia":"Mensual","proximo_pago":"2026-09-20","ultimo_pago_monto":199}"#
        #expect(try JSONDecoder().decode(Suscripcion.self, from: Data(sub.utf8)).serviceName == "Netflix")
    }

    @Test("una categoría con tipo null en la BD no rompe la carga")
    func categoriaSinTipo() throws {
        let json = #"[{"id":"c","categoria":"Varios","subcategoria":"Otros","tipo":null,"frecuencia_seguimiento":null}]"#
        let cats = try JSONDecoder().decode([Categoria].self, from: Data(json.utf8))
        #expect(cats.first?.tipo == nil)
        #expect(PorPagar.subcategoriasRelevantes(cats).isEmpty)
    }

    @Test("codifica la transacción nueva con las columnas de la tabla")
    func codifica() throws {
        let n = NuevaTransaccion(cuentaId: "a", fecha: "2026-10-06", comentario: "Café", ingreso: 0, gasto: 45, subcategoriaId: "s", divisa: "MXN", userId: "u")
        let json = try #require(String(data: JSONEncoder().encode(n), encoding: .utf8))
        for clave in ["\"cuenta_id\"", "\"subcategoria_id\"", "\"user_id\"", "\"fecha\":\"2026-10-06\""] {
            #expect(json.contains(clave), "\(clave)")
        }
    }
}
