import SwiftUI
import SaviumCore

struct NuevoMovimientoView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(DatosStore.self) private var datos
    @Environment(MovimientosStore.self) private var movimientos
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @State private var form = FormularioMovimiento(fecha: .now, cuentaId: UserDefaults.standard.string(forKey: "savium.ultimaCuenta"))
    @State private var guardando = false
    @State private var error: String?
    @State private var exito = 0
    @FocusState private var importeEnfocado: Bool

    private var cuentas: [Cuenta] { datos.cuentas.filter { !$0.vendida } }
    private var cuenta: Cuenta? { form.cuentaId.flatMap(datos.cuenta) }
    private var tipoCategoria: String { form.esGasto ? "Gastos" : "Ingreso" }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Tipo", selection: $form.esGasto) { Text("Gasto").tag(true); Text("Ingreso").tag(false) }
                        .pickerStyle(.segmented)
                        .onChange(of: form.esGasto) {
                            if let id = form.subcategoriaId, datos.categoria(id)?.tipo != tipoCategoria { form.subcategoriaId = nil }
                        }
                    HStack {
                        TextField("0.00", text: $form.importeTexto).keyboardType(.decimalPad).focused($importeEnfocado)
                            .font(.system(size: 40, weight: .semibold, design: .rounded)).monospacedDigit()
                        Text(cuenta?.divisa ?? app.divisa.rawValue).font(.title2).foregroundStyle(.secondary)
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
                if let error {
                    Section { Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red) }
                }
            }
            .navigationTitle(form.esGasto ? "Nuevo gasto" : "Nuevo ingreso")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar", role: .cancel) { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if guardando { ProgressView() } else {
                        Button(error == nil ? "Guardar" : "Reintentar") { Task { await guardar() } }
                            .disabled(!form.esValido)
                    }
                }
            }
            .sensoryFeedback(.success, trigger: exito)
            .onAppear { importeEnfocado = true }
            .interactiveDismissDisabled(guardando)
        }
    }

    private func guardar() async {
        // Review Focus 2: un solo envío a la vez; el botón desaparece mientras guarda.
        guard !guardando, let userId = sesion.userId,
              let nueva = form.construir(cuentas: datos.cuentas, userId: userId, calendario: .current) else { return }
        guardando = true
        defer { guardando = false }
        do {
            try await datos.repo.crear(nueva)
            UserDefaults.standard.set(nueva.cuentaId, forKey: "savium.ultimaCuenta")
            exito += 1
            dismiss()
            Task { await datos.cargar(app: app); await movimientos.recargar() }
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
