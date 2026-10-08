import SwiftUI
import SaviumCore

struct ResumenView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @State private var apuntando = false

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
        .toolbar { ToolbarItem(placement: .topBarTrailing) { MenuPerfil() } }
        .refreshable { await datos.cargar(app: app) }
        .overlay(alignment: .bottomTrailing) { if datos.hayDatos { BotonNuevo { apuntando = true } } }
        .sheet(isPresented: $apuntando) { NuevoMovimientoView() }
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
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Activos", valor: p.activos, divisa: d) }.tint(.primary)
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Pasivos", valor: p.pasivos, divisa: d) }.tint(.primary)
            }
            if !vencidos.isEmpty || !proximos.isEmpty {
                Section("Atención") {
                    ForEach(vencidos) { f in
                        Button { app.pestana = .pendientes } label: {
                            LabeledContent {
                                Importe(valor: f.restante, divisa: f.pendiente.divisa, color: .red)
                            } label: {
                                Label(f.pendiente.concepto ?? "Pendiente", systemImage: "exclamationmark.circle.fill").foregroundStyle(.red)
                            }
                        }
                    }
                    ForEach(proximos) { f in
                        Button { app.pestana = .pendientes } label: {
                            LabeledContent {
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
        }
        .contentMargins(.bottom, 80, for: .scrollContent)
    }
}
