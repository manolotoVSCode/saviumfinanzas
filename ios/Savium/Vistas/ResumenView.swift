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
        .navigationTitle("Inicio")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { BotonAjustes() } }
        .refreshable { await datos.cargar(app: app) }
        .alert(fallo ?? "", isPresented: Binding(get: { fallo != nil }, set: { if !$0 { fallo = nil } })) {
            Button("Aceptar", role: .cancel) {}
        }
        .sheet(item: $movimientoTarea) { t in
            NuevoMovimientoView(editando: t, tipoCategoria: datos.categoria(t.subcategoriaId)?.tipo)
        }
    }

    @State private var fallo: String?
    /// Movimiento de una tarea, abierto para editarlo. La hoja cuelga de la lista y no de la fila:
    /// al marcar la tarea dentro de la hoja la fila desaparece, y la hoja no debe cerrarse con ella.
    @State private var movimientoTarea: Transaccion?
    @State private var abriendoTarea: String?

    private func abrir(_ t: TareaChecklist) async {
        guard let id = t.transaccionId, !ModoSenuelo.activo, abriendoTarea == nil else { return }
        abriendoTarea = t.id
        defer { abriendoTarea = nil }
        do {
            if let m = try await datos.repo.movimiento(id: id) { movimientoTarea = m } else { fallo = "Ese movimiento ya no existe." }
        } catch {
            fallo = "No se pudo abrir el movimiento. Revisa la conexión y vuelve a intentarlo."
        }
    }

    private func marcar(_ t: TareaChecklist) async {
        if !(await datos.marcarHecha(t)) { fallo = "No se pudo marcar la tarea. Revisa la conexión y vuelve a intentarlo." }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let pendientes = datos.resumenPendientes(app)
        let vencidos = pendientes.filas.filter(\.vencido)
        let hoy = Calendar.current.startOfDay(for: .now)
        let grandes = datos.pagosGrandes(app)
        let idsGrandes = Set(grandes.map(\.id))
        // Una provisión grande ya sale arriba: no se repite entre los próximos 7 días.
        let proximos = datos.porPagar(app, horizonte: 30).filter { f in
            (Calendar.current.dateComponents([.day], from: hoy, to: f.fechaEstimada).day ?? 99) <= 7
                && !(f.tipo == .provision && idsGrandes.contains { f.id.hasPrefix("prov-\($0)-") })
        }
        let mes = datos.mesAnterior(app)
        let cripto = datos.alertasCripto(app)
        let tareas = datos.soloLectura ? [] : datos.tareasParaHoy()
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
            if !vencidos.isEmpty || !proximos.isEmpty || !cripto.isEmpty || !grandes.isEmpty || !tareas.isEmpty {
                Section("Atención") {
                    ForEach(grandes) { p in
                        Button { app.abrirPendientes(.pagar) } label: { FilaPagoGrande(provision: p) }.tint(.primary)
                    }
                    ForEach(cripto) { a in
                        FilaAlertaCripto(alerta: a, valor: app.convertir(a.valorUSD, de: "USD"), divisa: d)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                if !datos.soloLectura {
                                    Button("Descartar") { Task { await datos.descartar(a) } }.tint(.gray)
                                }
                            }
                    }
                    ForEach(tareas) { t in
                        FilaTarea(tarea: t, abriendo: abriendoTarea == t.id) { Task { await abrir(t) } }
                            .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                Button("Hecha", systemImage: "checkmark") { Task { await marcar(t) } }.tint(.green)
                            }
                            .contextMenu {
                                Button("Marcar como hecha", systemImage: "checkmark.circle") { Task { await marcar(t) } }
                            }
                    }
                    ForEach(vencidos) { f in
                        Button { app.abrirPendientes(.cobrar) } label: {
                            FilaImporte {
                                Importe(valor: f.restante, divisa: f.pendiente.divisa, color: .red)
                            } label: {
                                Label(f.pendiente.concepto ?? "Pendiente", systemImage: "exclamationmark.circle.fill").foregroundStyle(.red)
                            }
                        }
                    }
                    ForEach(proximos) { f in
                        Button { app.abrirPendientes(.pagar) } label: {
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

/// Tarea del Checklist con fecha de hoy o vencida. Si va ligada a un movimiento, tocarla lo abre.
private struct FilaTarea: View {
    let tarea: TareaChecklist
    let abriendo: Bool
    let abrir: () -> Void

    var body: some View {
        let dias = tarea.fecha.map { Fechas.diasHasta($0, now: .now, calendario: .current) } ?? 0
        let contenido = Label {
            VStack(alignment: .leading) {
                Text(tarea.texto)
                Text((dias < 0 ? "Tarea · " + PendientesView.cuando(dias) : "Tarea · hoy") + (tarea.esMensual ? " · cada mes" : ""))
                    .font(.caption).foregroundStyle(dias < 0 ? .red : .secondary)
            }
        } icon: {
            Image(systemName: "checklist").foregroundStyle(dias < 0 ? .red : .orange)
        }
        if tarea.transaccionId != nil {
            Button(action: abrir) {
                HStack { contenido; Spacer(); if abriendo { ProgressView() } else { Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary) } }
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Abre el movimiento")
        } else {
            contenido
        }
    }
}

/// Provisión de CxP desde 100K MXN (aviso de «Pagos grandes» del Dashboard de la web), con su fecha.
private struct FilaPagoGrande: View {
    let provision: ProvisionCxP

    var body: some View {
        let cal = Calendar.current
        let fecha = Fechas.diaLocal(provision.fecha, calendario: cal) ?? .now
        let dias = cal.dateComponents([.day], from: cal.startOfDay(for: .now), to: fecha).day ?? 0
        let color: Color = dias < 0 ? .red : .orange
        FilaImporte {
            Importe(valor: provision.monto, divisa: provision.divisa)
        } label: {
            Label {
                VStack(alignment: .leading) {
                    Text(provision.concepto)
                    Text("Pago grande · \(fecha.formatted(.dateTime.day().month().year().locale(Locale(identifier: "es_MX")))) · \(PendientesView.cuando(dias))")
                        .font(.caption).foregroundStyle(dias <= 7 ? color : .secondary)
                }
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(color)
            }
        }
    }
}

/// Cripto que llegó a uno de sus niveles (se configuran en la web). Deslizar a la izquierda la descarta.
private struct FilaAlertaCripto: View {
    let alerta: AlertasCripto.Alerta
    let valor: Double
    let divisa: String

    private func pct(_ n: Double, decimales: Int) -> String {
        (n >= 0 ? "+" : "−") + abs(n).formatted(.number.precision(.fractionLength(0...decimales)).locale(Locale(identifier: "en_US"))) + "%"
    }

    var body: some View {
        let color: Color = alerta.arriba ? .green : .red
        FilaImporte {
            Importe(valor: valor, divisa: divisa)
        } label: {
            Label {
                VStack(alignment: .leading) {
                    Text("\(alerta.simbolo) \(pct(alerta.pct, decimales: 1))").foregroundStyle(color)
                    Text("Sobre tu compra · \(alerta.arriba ? "avisar al llegar a" : "avisar al caer a") \(pct(alerta.nivel, decimales: 2))")
                        .font(.caption).foregroundStyle(.secondary)
                }
            } icon: {
                Image(systemName: alerta.arriba ? "chart.line.uptrend.xyaxis" : "chart.line.downtrend.xyaxis").foregroundStyle(color)
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
