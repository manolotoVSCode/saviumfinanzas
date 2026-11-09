import SwiftUI
import SaviumCore

struct PendientesView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @State private var horizonte = 30
    @State private var detalle: Pendiente?
    @State private var aBorrar: Pendiente?
    @State private var fallo: String?

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Pendientes")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    @Bindable var app = app
                    Picker("Vista", selection: $app.modoPendientes) { ForEach(ModoPendientes.allCases, id: \.self) { Text($0.rawValue) } }
                        .pickerStyle(.segmented).fixedSize()
                }
            }
            .refreshable { await datos.cargar(app: app) }
    }

    @ViewBuilder private var lista: some View {
        let d = app.divisa.rawValue
        switch app.modoPendientes {
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
                        Button { detalle = f.pendiente } label: {
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
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        // Sin deslizamiento completo: un gesto largo por accidente no debe cobrar nada.
                        .swipeActions(edge: .leading, allowsFullSwipe: false) {
                            if !datos.soloLectura {
                                Button("Cobrar", systemImage: "checkmark.circle") { Task { await cobrar(f.pendiente) } }
                                    .tint(.green)
                            }
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            if !datos.soloLectura {
                                Button("Borrar", systemImage: "trash", role: .destructive) { aBorrar = f.pendiente }
                            }
                        }
                        .contextMenu {
                            if !datos.soloLectura {
                                Button("Cobrar todo hoy", systemImage: "checkmark.circle") { Task { await cobrar(f.pendiente) } }
                                Button("Cobrar otra cantidad…", systemImage: "pencil") { detalle = f.pendiente }
                                Button("Borrar", systemImage: "trash", role: .destructive) { aBorrar = f.pendiente }
                            }
                        }
                    }
                } footer: {
                    if !r.filas.isEmpty && !datos.soloLectura {
                        Text("Toca uno para cobrarlo, también solo una parte.")
                    }
                }
            }
            .overlay {
                if r.filas.isEmpty {
                    ContentUnavailableView("Nada por cobrar", systemImage: "checkmark.circle", description: Text("Los pendientes se crean en la web."))
                }
            }
            .sheet(item: $detalle) { p in DetallePendienteView(pendiente: p) }
            // Aviso centrado: un confirmationDialog sale como globo anclado arriba de la lista, lejos de la fila.
            .alert("¿Borrar «\(aBorrar?.concepto ?? "Pendiente")»?",
                   isPresented: Binding(get: { aBorrar != nil }, set: { if !$0 { aBorrar = nil } }), presenting: aBorrar) { p in
                Button("Borrar", role: .destructive) {
                    Task { if !(await datos.borrar(p)) { fallo = "No se pudo borrar. Revisa la conexión y vuelve a intentarlo." } }
                }
                Button("Cancelar", role: .cancel) {}
            } message: { _ in
                Text("No se puede deshacer.")
            }
            .alert(fallo ?? "", isPresented: Binding(get: { fallo != nil }, set: { if !$0 { fallo = nil } })) {
                Button("Aceptar", role: .cancel) {}
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
                                Text("\(f.fechaEstimada.formatted(.dateTime.day().month().locale(Locale(identifier: "es_MX")))) · \(Self.cuando(dias)) · \(f.tipo.rawValue)")
                                    .font(.caption).foregroundStyle(dias < 0 ? .red : dias <= 7 ? .orange : .secondary)
                            }
                        }
                    }
                }
                if filas.isEmpty && datos.provisiones.isEmpty {
                    ContentUnavailableView("Nada por pagar en \(horizonte) días", systemImage: "checkmark.circle")
                }
                // Todas las provisiones pendientes, aunque caigan fuera del horizonte (como «Mis provisiones» en la web).
                if !datos.provisiones.isEmpty {
                    Section {
                        ForEach(datos.provisiones) { p in
                            let fecha = Fechas.diaLocal(p.fecha, calendario: Calendar.current) ?? hoy
                            let dias = Calendar.current.dateComponents([.day], from: hoy, to: fecha).day ?? 0
                            FilaImporte {
                                Importe(valor: p.monto, divisa: p.divisa)
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(p.concepto)
                                    Text("\(fecha.formatted(.dateTime.day().month().year().locale(Locale(identifier: "es_MX")))) · \(Self.cuando(dias))")
                                        .font(.caption).foregroundStyle(dias < 0 ? .red : dias <= 7 ? .orange : .secondary)
                                }
                            }
                        }
                    } header: {
                        Text("Provisiones")
                    } footer: {
                        Text("Todas las pendientes, sea cual sea su fecha. Se crean y se marcan como pagadas en la web.")
                    }
                }
            }
        }
    }

    private func cobrar(_ p: Pendiente) async {
        fallo = await datos.cobrar(p)
    }

    static func cuando(_ dias: Int) -> String {
        switch dias {
        case -1: "venció ayer"
        case ..<0: "venció hace \(-dias) días"
        case 0: "hoy"
        case 1: "mañana"
        default: "en \(dias) días"
        }
    }
}

/// Cobrar un pendiente: todo o una parte, en la fecha que se elija. También se borra desde aquí.
struct DetallePendienteView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(\.dismiss) private var cerrar
    let pendiente: Pendiente
    @State private var importeTexto = ""
    @State private var fecha = Date.now
    @State private var guardando = false
    @State private var fallo: String?
    @State private var confirmarBorrado = false

    private var restante: Double { pendiente.montoEsperado - (pendiente.montoCobrado ?? 0) }
    private var importe: Double? { Formato.parsearImporte(importeTexto).flatMap { $0 > 0 ? $0 : nil } }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("Esperado") { Importe(valor: pendiente.montoEsperado, divisa: pendiente.divisa) }
                    if let c = pendiente.montoCobrado, c > 0 {
                        LabeledContent("Ya cobrado") { Importe(valor: c, divisa: pendiente.divisa) }
                    }
                    LabeledContent("Falta") { Importe(valor: restante, divisa: pendiente.divisa).bold() }
                    if let fe = pendiente.fechaEsperada, let d = Fechas.diaLocal(fe, calendario: .current) {
                        LabeledContent("Fecha esperada", value: d.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "es_MX"))))
                    }
                }
                if !datos.soloLectura {
                    Section {
                        HStack {
                            TextField("Importe", text: $importeTexto).keyboardType(.decimalPad)
                            Text(pendiente.divisa).foregroundStyle(.secondary)
                        }
                        DatePicker("Fecha de cobro", selection: $fecha, in: ...Date.now, displayedComponents: .date)
                    } header: {
                        Text("Cobrar")
                    } footer: {
                        if let importe, importe < restante - 0.005 {
                            Text("Quedará pendiente \(Formato.importe(restante - importe, pendiente.divisa)).")
                        } else {
                            Text("No crea ningún movimiento: el ingreso real llega al importar el estado de cuenta.")
                        }
                    }
                    Section {
                        Button("Borrar pendiente", role: .destructive) { confirmarBorrado = true }
                    }
                }
            }
            .navigationTitle(pendiente.concepto ?? "Pendiente")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar", role: .cancel) { cerrar() } }
                if !datos.soloLectura {
                    ToolbarItem(placement: .confirmationAction) {
                        if guardando { ProgressView() } else {
                            Button("Cobrar") { Task { await cobrar() } }.disabled(importe == nil)
                        }
                    }
                }
            }
            .onAppear { importeTexto = String(format: "%.2f", restante) }
            .alert("¿Borrar «\(pendiente.concepto ?? "Pendiente")»?", isPresented: $confirmarBorrado) {
                Button("Borrar", role: .destructive) {
                    Task {
                        if await datos.borrar(pendiente) { cerrar() } else { fallo = "No se pudo borrar. Revisa la conexión y vuelve a intentarlo." }
                    }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("No se puede deshacer.")
            }
            .alert(fallo ?? "", isPresented: Binding(get: { fallo != nil }, set: { if !$0 { fallo = nil } })) {
                Button("Aceptar", role: .cancel) {}
            }
            .interactiveDismissDisabled(guardando)
        }
    }

    private func cobrar() async {
        guard let importe, !guardando else { return }
        guardando = true
        defer { guardando = false }
        if let motivo = await datos.cobrar(pendiente, monto: importe, fecha: fecha) { fallo = motivo } else { cerrar() }
    }
}
