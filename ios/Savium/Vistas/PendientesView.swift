import SwiftUI
import SaviumCore

struct PendientesView: View {
    enum Modo: String, CaseIterable { case cobrar = "Por cobrar", pagar = "Por pagar" }
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @State private var modo: Modo = .cobrar
    @State private var horizonte = 30

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Pendientes")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Vista", selection: $modo) { ForEach(Modo.allCases, id: \.self) { Text($0.rawValue) } }
                        .pickerStyle(.segmented).frame(width: 240)
                }
            }
            .refreshable { await datos.cargar(app: app) }
    }

    @ViewBuilder private var lista: some View {
        let d = app.divisa.rawValue
        switch modo {
        case .cobrar:
            let r = datos.resumenPendientes(app)
            List {
                AvisoEstado()
                Section {
                    Linea(titulo: "Total por cobrar", valor: r.total, divisa: d, destacado: true)
                    if r.vencidos > 0 { LabeledContent("Vencidos", value: "\(r.vencidos)").foregroundStyle(.red) }
                }
                Section {
                    ForEach(r.filas) { f in
                        FilaImporte {
                            Importe(valor: f.restante, divisa: f.pendiente.divisa, color: f.vencido ? .red : nil)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(f.pendiente.concepto ?? "Pendiente").foregroundStyle(f.vencido ? .red : .primary)
                                if let fe = f.pendiente.fechaEsperada {
                                    let dia = Fechas.diaLocal(fe, calendario: .current)?.formatted(.dateTime.day().month().locale(Locale(identifier: "es_MX"))) ?? fe
                                    Text(f.vencido ? "Vencido · \(dia)" : dia).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
        case .pagar:
            let filas = datos.porPagar(app, horizonte: horizonte)
            let total = filas.reduce(0.0) { $0 + app.convertir($1.monto, de: $1.divisa.rawValue) }
            let hoy = Calendar.current.startOfDay(for: .now)
            List {
                AvisoEstado()
                Section {
                    Picker("Horizonte", selection: $horizonte) { ForEach([30, 60, 90], id: \.self) { Text("\($0) días") } }
                        .pickerStyle(.segmented)
                    Linea(titulo: "Por pagar en \(horizonte) días", valor: total, divisa: d, destacado: true)
                }
                Section {
                    ForEach(filas) { f in
                        let dias = Calendar.current.dateComponents([.day], from: hoy, to: Calendar.current.startOfDay(for: f.fechaEstimada)).day ?? 0
                        FilaImporte {
                            Importe(valor: f.monto, divisa: f.divisa.rawValue)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(f.concepto)
                                Text("\(f.fechaEstimada.formatted(.dateTime.day().month().locale(Locale(identifier: "es_MX")))) · \(cuando(dias)) · \(f.tipo.rawValue)")
                                    .font(.caption).foregroundStyle(dias <= 7 ? .orange : .secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private func cuando(_ dias: Int) -> String {
        switch dias {
        case 0: "hoy"
        case 1: "mañana"
        default: "en \(dias) d"
        }
    }
}
