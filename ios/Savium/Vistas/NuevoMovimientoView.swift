import SwiftUI
import SaviumCore

struct NuevoMovimientoView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(DatosStore.self) private var datos
    @Environment(MovimientosStore.self) private var movimientos
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @State private var form: FormularioMovimiento
    @State private var guardando = false
    @State private var error: String?
    @State private var exito = 0
    @State private var confirmarBorrado = false
    @State private var apuntados = 0
    @State private var falloTarea: String?
    /// Tareas ligadas, tal como estaban al abrir la hoja; las marcadas aquí quedan como hechas y no se pueden volver
    /// a marcar (una mensual avanzaría otro mes cada vez).
    @State private var tareasLigadas: [TareaChecklist] = []
    @State private var hechas: Set<String> = []
    @FocusState private var importeEnfocado: Bool
    @ScaledMetric(relativeTo: .largeTitle) private var tamImporte: CGFloat = 40
    /// El movimiento que se edita (nil al apuntar uno nuevo).
    private let original: Transaccion?

    /// Sin movimiento: apuntar uno nuevo. Con movimiento: editarlo (mismo formulario, ya relleno).
    init(editando t: Transaccion? = nil, tipoCategoria: String? = nil) {
        original = t
        _form = State(initialValue: t.map { FormularioMovimiento(editando: $0, tipoCategoria: tipoCategoria, calendario: .current) }
                      ?? FormularioMovimiento(fecha: .now, cuentaId: UserDefaults.standard.string(forKey: "savium.ultimaCuenta")))
    }

    /// Las no vendidas, más la del movimiento que se edita aunque esté vendida.
    private var cuentas: [Cuenta] { datos.cuentas.filter { !$0.vendida || $0.id == form.cuentaId } }
    private var cuenta: Cuenta? { form.cuentaId.flatMap(datos.cuenta) }
    private var tipoCategoria: String { form.tipoCategoria }
    private var titulo: String {
        if form.editando { return "Editar movimiento" }
        return form.esGasto ? "Nuevo gasto" : "Nuevo ingreso"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if let fijo = form.tipoFijo {
                        LabeledContent("Tipo", value: form.esReembolso ? "Reembolso" : fijo)
                    } else {
                        Picker("Tipo", selection: $form.esGasto) { Text("Gasto").tag(true); Text("Ingreso").tag(false) }
                            .pickerStyle(.segmented)
                            .onChange(of: form.esGasto) {
                                if let id = form.subcategoriaId, datos.categoria(id)?.tipo != tipoCategoria { form.subcategoriaId = nil }
                            }
                    }
                    HStack {
                        TextField("0.00", text: $form.importeTexto).keyboardType(.decimalPad).focused($importeEnfocado)
                            .font(.system(size: tamImporte, weight: .semibold, design: .rounded)).monospacedDigit()
                        Text(cuenta?.divisa ?? app.divisa.rawValue).font(.title2).foregroundStyle(.secondary)
                    }
                }
                let frecuentes = categoriasFrecuentes
                if !frecuentes.isEmpty {
                    Section {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(frecuentes) { c in
                                    let elegida = form.subcategoriaId == c.id
                                    Button { form.subcategoriaId = elegida ? nil : c.id } label: {
                                        Text(c.subcategoria).font(.subheadline).padding(.horizontal, 12).padding(.vertical, 7)
                                    }
                                    .buttonStyle(.plain)
                                    .foregroundStyle(elegida ? Color.white : Color.primary)
                                    .background(elegida ? Color.accentColor : Color(.tertiarySystemFill), in: .capsule)
                                    .accessibilityAddTraits(elegida ? .isSelected : [])
                                }
                            }
                            .padding(.vertical, 2)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    } header: {
                        Text("Frecuentes")
                    }
                }
                Section {
                    Picker("Cuenta", selection: $form.cuentaId) {
                        Text("Elige una cuenta").tag(String?.none)
                        ForEach(cuentas) { Text("\($0.nombre) (\($0.divisa))").tag(Optional($0.id)) }
                    }
                    NavigationLink {
                        SelectorCategoria(tipo: tipoCategoria, seleccion: $form.subcategoriaId)
                    } label: {
                        LabeledContent("Categoría", value: form.subcategoriaId.flatMap(datos.categoria).map(\.subcategoria) ?? "Elige una")
                    }
                    DatePicker("Fecha", selection: $form.fecha, displayedComponents: .date)
                    TextField("Comentario (opcional)", text: $form.comentario)
                }
                if !tareasLigadas.isEmpty {
                    Section {
                        ForEach(tareasLigadas) { t in
                            let hecha = hechas.contains(t.id)
                            Button { Task { await marcar(t) } } label: {
                                Label {
                                    VStack(alignment: .leading) {
                                        Text(t.texto).foregroundStyle(hecha ? .secondary : .primary).strikethrough(hecha && !t.esMensual)
                                        if hecha {
                                            Text(t.esMensual ? "Hecha este mes" : "Hecha").font(.caption).foregroundStyle(.green)
                                        } else if let f = t.fecha {
                                            Text(PendientesView.cuando(Fechas.diasHasta(f, now: .now, calendario: .current)).capitalizadoPrimera + (t.esMensual ? " · cada mes" : ""))
                                                .font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                } icon: {
                                    Image(systemName: hecha ? "checkmark.circle.fill" : "circle").foregroundStyle(hecha ? .green : .accentColor)
                                }
                            }
                            .disabled(hecha)
                            .accessibilityHint(hecha ? "" : "Marcar como hecha")
                        }
                    } header: {
                        Text("Tareas")
                    } footer: {
                        Text("Toca una para marcarla como hecha. Se crean y se editan en la web, en Checklist.")
                    }
                }
                if let error {
                    Section { Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red) }
                }
                if original != nil {
                    Section {
                        Button("Borrar movimiento", role: .destructive) { confirmarBorrado = true }
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(titulo)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar", role: .cancel) { dismiss() } }
                // El teclado decimal no tiene tecla para cerrarse.
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Listo") { importeEnfocado = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if guardando { ProgressView() } else if form.editando || error != nil {
                        Button(error == nil ? "Guardar" : "Reintentar") { Task { await guardar() } }
                            .disabled(!form.esValido)
                    } else {
                        // Mantener pulsado: guardar y dejar la hoja lista para otro (tandas de tickets).
                        Menu {
                            Button("Guardar y apuntar otro", systemImage: "plus") { Task { await guardar(otro: true) } }
                        } label: {
                            Text("Guardar")
                        } primaryAction: {
                            Task { await guardar() }
                        }
                        .disabled(!form.esValido)
                    }
                }
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                if apuntados > 0 {
                    Label("\(apuntados) apuntado\(apuntados == 1 ? "" : "s")", systemImage: "checkmark.circle.fill")
                        .font(.footnote).foregroundStyle(.green).padding(.vertical, 4)
                }
            }
            .alert(falloTarea ?? "", isPresented: Binding(get: { falloTarea != nil }, set: { if !$0 { falloTarea = nil } })) {
                Button("Aceptar", role: .cancel) {}
            }
            .alert("¿Borrar este movimiento?", isPresented: $confirmarBorrado) {
                Button("Borrar", role: .destructive) { Task { await borrar() } }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("No se puede deshacer.")
            }
            .sensoryFeedback(.success, trigger: exito)
            .onAppear {
                if !form.editando { importeEnfocado = true }
                if let original, tareasLigadas.isEmpty { tareasLigadas = datos.tareasDe(movimiento: original.id) }
            }
            .interactiveDismissDisabled(guardando)
        }
    }

    /// Las 5 subcategorías más usadas en los últimos 90 días, del tipo que toca.
    private var categoriasFrecuentes: [Categoria] {
        let ids = Set(datos.categorias.filter { $0.tipo == tipoCategoria }.map(\.id))
        return Movimientos.frecuentes(datos.recientes.filter { ids.contains($0.subcategoriaId) }, limite: 5).compactMap(datos.categoria)
    }

    private func marcar(_ t: TareaChecklist) async {
        guard !hechas.contains(t.id) else { return }
        hechas.insert(t.id)
        if !(await datos.marcarHecha(t)) {
            hechas.remove(t.id)
            falloTarea = "No se pudo marcar la tarea. Revisa la conexión y vuelve a intentarlo."
        }
    }

    private func borrar() async {
        guard let original else { return }
        guardando = true
        defer { guardando = false }
        if await movimientos.borrar(original) {
            dismiss()
            Task { await datos.cargar(app: app) }
        } else {
            error = "No se pudo borrar. Revisa la conexión y vuelve a intentarlo."
        }
    }

    /// Tras guardar: cierra la hoja o, con `otro`, la deja en blanco para el siguiente.
    private func terminar(otro: Bool) {
        exito += 1
        if otro {
            form = form.siguiente()
            apuntados += 1
            importeEnfocado = true
        } else {
            dismiss()
        }
        Task { await datos.cargar(app: app); await movimientos.recargar(limpiar: false) }
    }

    private func guardar(otro: Bool = false) async {
        // Review Focus 2: un solo envío a la vez; el botón desaparece mientras guarda.
        guard !guardando, let userId = sesion.userId else { return }
        guardando = true
        defer { guardando = false }
        if ModoSenuelo.activo {
            // Señuelo: parece guardado, pero solo cambia los datos ficticios en memoria.
            if form.editando, let cambio = form.cambios(cuentas: datos.cuentas, calendario: .current) {
                ModoSenuelo.editar(id: form.idEnvio, cambio)
            } else if let nueva = form.construir(cuentas: datos.cuentas, userId: userId, calendario: .current) {
                ModoSenuelo.apuntar(nueva)
            }
            try? await Task.sleep(for: .milliseconds(400))
            terminar(otro: otro)
            return
        }
        do {
            if form.editando {
                guard let cambio = form.cambios(cuentas: datos.cuentas, calendario: .current) else { return }
                try await datos.repo.actualizar(id: form.idEnvio, cambio)
            } else {
                guard let nueva = form.construir(cuentas: datos.cuentas, userId: userId, calendario: .current) else { return }
                try await datos.repo.crear(nueva)
                UserDefaults.standard.set(nueva.cuentaId, forKey: "savium.ultimaCuenta")
            }
            error = nil
            terminar(otro: otro)
        } catch {
            self.error = "No se pudo guardar. Revisa la conexión y vuelve a intentarlo."
        }
    }
}

struct SelectorCategoria: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(DatosStore.self) private var datos
    let tipo: String
    @Binding var seleccion: String?
    @State private var texto = ""

    var body: some View {
        let todas = datos.categorias.filter { $0.tipo == tipo }
        let ids = Set(todas.map(\.id))
        let filtradas = texto.isEmpty ? todas : todas.filter { "\($0.categoria) \($0.subcategoria)".localizedStandardContains(texto) }
        let frecuentes = Movimientos.frecuentes(datos.recientes.filter { ids.contains($0.subcategoriaId) }, limite: 5)
            .compactMap(datos.categoria)
        let grupos = Dictionary(grouping: filtradas, by: \.categoria).sorted { $0.key < $1.key }
        List {
            if texto.isEmpty && !frecuentes.isEmpty {
                Section("Frecuentes") { ForEach(frecuentes) { fila($0) } }
            }
            ForEach(grupos, id: \.key) { g in
                Section(g.key) { ForEach(g.value.sorted { $0.subcategoria < $1.subcategoria }) { fila($0) } }
            }
        }
        .searchable(text: $texto, prompt: "Buscar categoría")
        .navigationTitle("Categoría")
    }

    private func fila(_ c: Categoria) -> some View {
        Button { seleccion = c.id; dismiss() } label: {
            HStack {
                Text(c.subcategoria).foregroundStyle(.primary)
                Spacer()
                if seleccion == c.id { Image(systemName: "checkmark").foregroundStyle(.tint) }
            }
        }
    }
}
