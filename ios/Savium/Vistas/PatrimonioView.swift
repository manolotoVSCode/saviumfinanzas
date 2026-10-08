import Charts
import SwiftUI
import SaviumCore

struct PatrimonioView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app

    static let ordenTipos = ["Efectivo", "Banco", "Ahorros", "Tarjeta de Crédito", "Inversiones", "Empresa Propia", "Bien Raíz", "Hipoteca"]

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Patrimonio")
            .refreshable { await datos.cargar(app: app) }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let d = app.divisa.rawValue
        let activos = Rubro.allCases.filter { !$0.esPasivo && (p.porRubro[$0] ?? 0) != 0 }
        let pasivos = Rubro.allCases.filter { $0.esPasivo && (p.porRubro[$0] ?? 0) != 0 }
        // Se ocultan las vendidas y las de saldo residual, como ResumenMovil.
        let visibles = datos.cuentas.filter { !$0.vendida && abs($0.saldoActual) >= 0.005 }
        let saldos = Dictionary(datos.cuentas.map { ($0.id, $0.saldoActual) }, uniquingKeysWith: { a, _ in a })
        let invs = datos.inversiones.map { i in
            (i, valor: Inversiones.valorActual(i, valuaciones: datos.valuaciones, saldoCuenta: i.cuentaId.flatMap { saldos[$0] }))
        }
        let activas = invs.filter { $0.0.activa }
        let totales = Inversiones.totales(invs, tasas: app.tasas, moneda: app.divisa)
        let rend = totales.valor - totales.invertido
        return List {
            AvisoEstado()
            Section {
                Linea(titulo: "Patrimonio neto", valor: p.neto, divisa: d, destacado: true)
                if !activos.isEmpty {
                    Chart(activos) { r in
                        SectorMark(angle: .value("Importe", p.porRubro[r] ?? 0), innerRadius: .ratio(0.6), angularInset: 1.5)
                            .foregroundStyle(by: .value("Rubro", r.nombre))
                    }
                    .frame(height: 180)
                    .accessibilityLabel("Distribución de activos")
                }
            }
            Section("Activos · \(Formato.importe(p.activos, d))") {
                ForEach(activos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
            }
            Section("Pasivos · \(Formato.importe(p.pasivos, d))") {
                ForEach(pasivos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
            }
            ForEach(Self.ordenTipos, id: \.self) { tipo in
                let cuentas = visibles.filter { $0.tipo == tipo }
                if !cuentas.isEmpty {
                    Section(tipo) {
                        ForEach(cuentas) { Linea(titulo: $0.nombre, valor: $0.saldoActual, divisa: $0.divisa) }
                    }
                }
            }
            if !activas.isEmpty {
                Section("Inversiones") {
                    Linea(titulo: "Valor actual", valor: totales.valor, divisa: d, destacado: true)
                    Linea(titulo: "Invertido", valor: totales.invertido, divisa: d)
                    LabeledContent("Rendimiento") {
                        Text("\(rend >= 0 ? "+" : "")\(Formato.importe(rend, d)) (\(String(format: "%.2f", totales.invertido != 0 ? rend / totales.invertido * 100 : 0))%)")
                            .monospacedDigit().foregroundStyle(rend >= 0 ? .green : .red)
                    }
                    ForEach(activas, id: \.0.id) { par in
                        let r = Inversiones.rendimiento(par.0, valor: par.valor, valuaciones: datos.valuaciones,
                                                        saldoCuenta: par.0.cuentaId.flatMap { saldos[$0] })
                        LabeledContent {
                            VStack(alignment: .trailing) {
                                Importe(valor: r.valor, divisa: par.0.moneda)
                                Text(String(format: "%+.2f%%", r.pct)).font(.caption).foregroundStyle(r.pct >= 0 ? .green : .red)
                            }
                        } label: { Text(par.0.nombre) }
                    }
                }
            }
        }
    }
}
