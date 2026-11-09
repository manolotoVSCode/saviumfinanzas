import Charts
import SwiftUI
import SaviumCore

struct PatrimonioView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @Environment(MovimientosStore.self) private var movimientos

    static let ordenTipos = ["Efectivo", "Banco", "Ahorros", "Tarjeta de Crédito", "Inversiones", "Empresa Propia", "Bien Raíz", "Hipoteca"]

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Patrimonio")
            .refreshable { await datos.cargar(app: app) }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let d = app.divisa.rawValue
        // Nada a cero: ni rubros, ni cuentas, ni inversiones (menos de un céntimo cuenta como cero).
        let conImporte = { (v: Double) in abs(v) >= 0.005 }
        let activos = Rubro.allCases.filter { !$0.esPasivo && conImporte(p.porRubro[$0] ?? 0) }
        let pasivos = Rubro.allCases.filter { $0.esPasivo && conImporte(p.porRubro[$0] ?? 0) }
        // Se ocultan las vendidas y las de saldo residual, como ResumenMovil.
        let visibles = datos.cuentas.filter { !$0.vendida && conImporte($0.saldoActual) }
        let cuentasPorId = Dictionary(datos.cuentas.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let invs = datos.inversiones.map { i in
            let cuenta = i.cuentaId.flatMap { cuentasPorId[$0] }
            return (i, valor: Inversiones.valorActual(i, valuaciones: datos.valuaciones, saldoCuenta: cuenta?.saldoActual),
                    aportes: Inversiones.aportesCuenta(i, cuenta: cuenta))
        }
        let activas = invs.filter { $0.0.activa && conImporte($0.valor != 0 ? $0.valor : $0.0.montoInvertido) }
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
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Distribución de activos")
                    .accessibilityValue(activos.map { r in
                        let parte = p.activos > 0 ? (p.porRubro[r] ?? 0) / p.activos : 0
                        return "\(r.nombre) \(parte.formatted(.percent.precision(.fractionLength(0))))"
                    }.joined(separator: ", "))
                }
            }
            Section("Activos · \(Formato.importe(p.activos, d))") {
                ForEach(activos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
            }
            if !pasivos.isEmpty {
                Section("Pasivos · \(Formato.importe(p.pasivos, d))") {
                    ForEach(pasivos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
                }
            }
            // Un tipo que no esté en la lista sale en «Otras»: ninguna cuenta con saldo desaparece sin aviso.
            ForEach(Self.ordenTipos + ["Otras"], id: \.self) { tipo in
                let cuentas = tipo == "Otras" ? visibles.filter { !Self.ordenTipos.contains($0.tipo) } : visibles.filter { $0.tipo == tipo }
                if !cuentas.isEmpty {
                    Section(tipo) {
                        ForEach(cuentas) { c in
                            if datos.cuentasConMovimientos.contains(c.id) {
                                Button { verMovimientos(c) } label: {
                                    HStack {
                                        Linea(titulo: c.nombre, valor: c.saldoActual, divisa: c.divisa)
                                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                                    }
                                    .contentShape(.rect)
                                }
                                .buttonStyle(.plain)
                                .accessibilityHint("Ver sus movimientos")
                            } else {
                                Linea(titulo: c.nombre, valor: c.saldoActual, divisa: c.divisa)
                            }
                        }
                    }
                }
            }
            if !activas.isEmpty {
                Section("Inversiones") {
                    // Sin totales (valor, invertido, rendimiento) hasta que cuadren: la web 9.8 también los quitó.
                    ForEach(activas, id: \.0.id) { par in
                        let r = Inversiones.rendimiento(par.0, valor: par.valor, valuaciones: datos.valuaciones, aportes: par.aportes)
                        FilaImporte {
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

    /// Abre Movimientos filtrado por la cuenta, sin búsqueda ni otros filtros.
    private func verMovimientos(_ c: Cuenta) {
        var f = FiltroMovimientos()
        f.cuentaId = c.id
        movimientos.filtro = f
        app.pestana = .movimientos
    }
}
