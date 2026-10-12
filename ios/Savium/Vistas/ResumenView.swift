import SwiftUI
import SaviumCore

struct ResumenView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app

    private var nombreMesAnterior: String {
        let d = Calendar.current.date(byAdding: .month, value: -1, to: .now)!
        let s = d.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "es_MX")))
        return s.prefix(1).uppercased() + s.dropFirst()   // «Septiembre de 2026», no «De»
    }

    var body: some View {
        Group {
            if datos.hayDatos { lista } else { SinDatos() }
        }
        .navigationTitle("Resumen")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { BotonAjustes() } }
        .refreshable { await datos.cargar(app: app) }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let pendientes = datos.resumenPendientes(app)
        let vencidos = pendientes.filas.filter(\.vencido)
        let hoy = Calendar.current.startOfDay(for: .now)
        let proximos = datos.porPagar(app, horizonte: 30).filter {
            (Calendar.current.dateComponents([.day], from: hoy, to: $0.fechaEstimada).day ?? 99) <= 7
        }
        let mes = datos.mesAnterior(app)
        let d = app.divisa.rawValue
        return List {
            AvisoEstado()
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Patrimonio neto").font(.subheadline).foregroundStyle(.secondary)
                    Importe(valor: p.neto, divisa: d, estilo: .largeTitle.bold())
                        .minimumScaleFactor(0.5).lineLimit(1)
                }
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(.rect)
                // Alerta de emergencia silenciosa (ver docs/superpowers/specs/2026-10-12-alerta-emergencia-design.md).
                .onTapGesture(count: 3) {
                    if datos.tieneLectores && !datos.soloLectura { AlertaEmergencia.compartida.disparar() }
                }
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Activos", valor: p.activos, divisa: d) }.tint(.primary)
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Pasivos", valor: p.pasivos, divisa: d) }.tint(.primary)
            }
            if !vencidos.isEmpty || !proximos.isEmpty {
                Section("Atención") {
                    ForEach(vencidos) { f in
                        Button { app.pestana = .pendientes } label: {
                            FilaImporte {
                                Importe(valor: f.restante, divisa: f.pendiente.divisa, color: .red)
                            } label: {
                                Label(f.pendiente.concepto ?? "Pendiente", systemImage: "exclamationmark.circle.fill").foregroundStyle(.red)
                            }
                        }
                    }
                    ForEach(proximos) { f in
                        Button { app.pestana = .pendientes } label: {
                            FilaImporte {
                                Importe(valor: f.monto, divisa: f.divisa.rawValue)
                            } label: {
                                Label {
                                    VStack(alignment: .leading) {
                                        Text(f.concepto)
                                        Text(f.fechaEstimada, format: .dateTime.day().month()).font(.caption).foregroundStyle(.secondary)
                                    }
                                } icon: { Image(systemName: "calendar") }
                            }
                        }.tint(.primary)
                    }
                }
            }
            Section("Mes anterior (\(nombreMesAnterior))") {
                Linea(titulo: "Ingresos", valor: mes.ingresos, divisa: d)
                Linea(titulo: "Gastos", valor: mes.gastos, divisa: d)
                Linea(titulo: "Balance", valor: mes.balance, divisa: d, destacado: true)
            }
            let categorias = datos.gastosPorCategoria(app)
            if !categorias.isEmpty {
                let total = categorias.reduce(0) { $0 + $1.total }
                Section("En qué se fue el dinero") {
                    ForEach(categorias.prefix(5)) { c in
                        FilaCategoriaGasto(nombre: c.nombre, total: c.total, sobre: total, divisa: d, subcategorias: c.subcategorias)
                    }
                    if categorias.count > 5 {
                        let resto = Array(categorias.dropFirst(5))
                        FilaCategoriaGasto(nombre: "Otras", total: resto.reduce(0) { $0 + $1.total }, sobre: total, divisa: d,
                                           subcategorias: resto.map { .init(nombre: $0.nombre, total: $0.total) })
                    }
                }
            }
        }
    }
}

/// Categoría con su barra y su porcentaje; al tocarla despliega el detalle.
private struct FilaCategoriaGasto: View {
    let nombre: String
    let total: Double
    let sobre: Double
    let divisa: String
    let subcategorias: [GastosPorCategoria.Sub]
    @State private var abierta = false

    var body: some View {
        let parte = sobre > 0 ? total / sobre : 0
        DisclosureGroup(isExpanded: $abierta) {
            ForEach(subcategorias, id: \.nombre) { s in
                FilaImporte { Importe(valor: s.total, divisa: divisa) } label: { Text(s.nombre).foregroundStyle(.secondary) }
                    .font(.subheadline)
            }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                FilaImporte { Importe(valor: total, divisa: divisa) } label: { Text(nombre) }
                HStack(spacing: 8) {
                    ProgressView(value: parte).tint(.accentColor)
                    Text(parte, format: .percent.precision(.fractionLength(0)))
                        .font(.caption).monospacedDigit().foregroundStyle(.secondary).frame(width: 40, alignment: .trailing)
                }
            }
            .padding(.vertical, 2)
        }
    }
}
