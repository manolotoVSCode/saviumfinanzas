import Testing
@testable import SaviumCore

@Suite("Patrimonio")
struct PatrimonioTests {
    let tasas: Tasas = [.MXN: 1, .USD: 20, .EUR: 22]

    @Test("reparte por rubro y convierte (mismos números que patrimonio.test.ts)")
    func reparte() {
        let r = Patrimonio.calcular([
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "efectivo_bancos", importe: 1500),
            FilaPatrimonio(divisa: "USD", clase: "activo", rubro: "inversiones", importe: 100),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "bien_raiz", importe: 10000),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "empresas_privadas", importe: 300),
            FilaPatrimonio(divisa: "MXN", clase: "pasivo", rubro: "tarjetas_credito", importe: 400),
            FilaPatrimonio(divisa: "EUR", clase: "pasivo", rubro: "hipoteca", importe: 50),
        ], tasas: tasas, moneda: .MXN)
        #expect(r.activos == 13800 && r.pasivos == 1500 && r.neto == 12300)
        #expect(r.porRubro[.inversiones] == 2000 && r.porRubro[.hipoteca] == 1100)
    }

    @Test("ignora rubros o divisas desconocidos en lugar de dar NaN")
    func desconocidos() {
        let r = Patrimonio.calcular([
            FilaPatrimonio(divisa: "GBP", clase: "activo", rubro: "efectivo_bancos", importe: 9),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "otro", importe: 9),
        ], tasas: tasas, moneda: .MXN)
        #expect(r.activos == 0 && r.neto == 0)
    }
}
