import SwiftUI
import SaviumCore

struct MovimientosView: View {
    @Environment(MovimientosStore.self) private var store
    @Environment(DatosStore.self) private var datos
    @State private var aBorrar: Transaccion?
    @State private var aEditar: Transaccion?
    @State private var aVer: Transaccion?
    @State private var fallo: String?
    @Environment(AppModel.self) private var app

    var body: some View {
        @Bindable var store = store
        List {
            if let error = store.error {
                HStack {
                    Label(error, systemImage: "wifi.slash").foregroundStyle(.secondary)
                    Spacer()
                    Button("Reintentar") { Task { await store.recargar() } }
                }
            }
            if store.conTotal && !store.filas.isEmpty {
                Section {
                    Linea(titulo: "Total · \(store.filas.count) movimiento\(store.filas.count == 1 ? "" : "s")",
                          valor: Movimientos.total(store.filas, moneda: app.divisa, tasas: app.tasas), divisa: app.divisa.rawValue, destacado: true)
                }
            }
            ForEach(Movimientos.agruparPorDia(store.filas), id: \.dia) { grupo in
                Section(titulo(grupo.dia)) {
                    ForEach(grupo.movimientos) { t in
                        Button { if datos.soloLectura { aVer = t } else { aEditar = t } } label: { FilaMovimiento(t: t).contentShape(.rect) }
                            .buttonStyle(.plain)
                            .onAppear { if t.id == store.filas.last?.id { Task { await store.cargarMas() } } }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                if !datos.soloLectura {
                                    Button("Borrar", systemImage: "trash", role: .destructive) { aBorrar = t }
                                }
                            }
                    }
                }
            }
            if store.cargando { ProgressView().frame(maxWidth: .infinity) }
        }
        .overlay {
            if !store.cargando && store.filas.isEmpty && store.error == nil { vacio }
        }
        .navigationTitle("Movimientos")
        // Arriba, bajo el título: abajo (lo normal en iOS 26) queda tapado por la barra de pestañas propia.
        .searchable(text: $store.filtro.texto, placement: .navigationBarDrawer(displayMode: .always), prompt: "Comentario, categoría o importe")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Cuenta", selection: $store.filtro.cuentaId) {
                        Text("Todas las cuentas").tag(String?.none)
                        ForEach(datos.cuentas.filter { !$0.vendida && datos.cuentasConMovimientos.contains($0.id) }) { Text($0.nombre).tag(Optional($0.id)) }
                    }
                    .pickerStyle(.menu)
                    Picker("Tipo", selection: $store.filtro.tipo) {
                        ForEach(TipoMovimientos.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    Picker("Periodo", selection: $store.filtro.periodo) {
                        ForEach(PeriodoMovimientos.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    if store.filtro.hayFiltros {
                        Divider()
                        Button("Quitar filtros", systemImage: "xmark.circle") {
                            let texto = store.filtro.texto
                            store.filtro = FiltroMovimientos()
                            store.filtro.texto = texto
                        }
                    }
                } label: {
                    Label("Filtrar", systemImage: store.filtro.hayFiltros ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                }
            }
        }
        // Cualquier cambio de filtro o de texto recarga; la espera corta junta las teclas de una palabra.
        .task(id: store.filtro) {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            store.idsCategoria = Movimientos.categoriasQueCoinciden(store.filtro.texto, en: datos.categorias)
            await store.recargar()
        }
        .sheet(item: $aEditar) { t in
            NuevoMovimientoView(editando: t, tipoCategoria: datos.categoria(t.subcategoriaId)?.tipo)
        }
        .sheet(item: $aVer) { t in DetalleMovimientoView(t: t) }
        .refreshable { await store.recargar(limpiar: false) }
        // Aviso centrado: un confirmationDialog sale como globo anclado arriba de la lista, lejos de la fila.
        .alert(aBorrar.map(textoConfirmacion) ?? "", isPresented: Binding(get: { aBorrar != nil }, set: { if !$0 { aBorrar = nil } }),
               presenting: aBorrar) { t in
            Button("Borrar", role: .destructive) {
                Task {
                    if await store.borrar(t) { await datos.cargar(app: app) } else { fallo = "No se pudo borrar. Revisa la conexión y vuelve a intentarlo." }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text("No se puede deshacer.")
        }
        .alert(fallo ?? "", isPresented: Binding(get: { fallo != nil }, set: { if !$0 { fallo = nil } })) {
            Button("Aceptar", role: .cancel) {}
        }
    }

    @ViewBuilder private var vacio: some View {
        let texto = store.filtro.textoLimpio
        if !texto.isEmpty {
            ContentUnavailableView.search(text: texto)
        } else if store.filtro.hayFiltros {
            ContentUnavailableView("Sin movimientos con estos filtros", systemImage: "line.3.horizontal.decrease.circle",
                                   description: Text("Prueba con otra cuenta, otro tipo u otro periodo."))
        } else {
            ContentUnavailableView("Sin movimientos", systemImage: "list.bullet.rectangle",
                                   description: Text("Apunta uno con el botón +."))
        }
    }

    private func textoConfirmacion(_ t: Transaccion) -> String {
        let dia = Fechas.diaLocal(t.fecha, calendario: .current)?.formatted(.dateTime.day().month().locale(Locale(identifier: "es_MX"))) ?? t.fecha
        return "¿Borrar «\(t.comentario.isEmpty ? "Sin comentario" : t.comentario)» (\(Formato.importe(t.importe, t.divisa)), \(dia))?"
    }

    private func titulo(_ dia: String) -> String {
        guard let d = Fechas.diaLocal(dia, calendario: .current) else { return dia }
        let s = d.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "es_MX")))
        return s.prefix(1).uppercased() + s.dropFirst()
    }
}

struct FilaMovimiento: View {
    @Environment(DatosStore.self) private var datos
    let t: Transaccion
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(t.comentario.isEmpty ? "Sin comentario" : t.comentario).lineLimit(1)
                Text([datos.categoria(t.subcategoriaId)?.subcategoria, datos.cuenta(t.cuentaId)?.nombre].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            Importe(valor: t.importe, divisa: t.divisa, color: t.importe > 0 ? .green : .primary)
        }
    }
}


/// Solo lectura: lo que ve un lector al tocar un movimiento.
struct DetalleMovimientoView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(\.dismiss) private var cerrar
    let t: Transaccion
    var body: some View {
        NavigationStack {
            List {
                Section { Importe(valor: t.importe, divisa: t.divisa, estilo: .title.bold(), color: t.importe > 0 ? .green : .primary) }
                Section {
                    LabeledContent("Fecha", value: Fechas.diaLocal(t.fecha, calendario: .current)?
                        .formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "es_MX"))) ?? t.fecha)
                    LabeledContent("Cuenta", value: datos.cuenta(t.cuentaId)?.nombre ?? "—")
                    LabeledContent("Categoría", value: datos.categoria(t.subcategoriaId).map { "\($0.categoria) · \($0.subcategoria)" } ?? "—")
                    if !t.comentario.isEmpty { LabeledContent("Comentario", value: t.comentario) }
                }
            }
            .navigationTitle("Movimiento").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Listo") { cerrar() } } }
        }
    }
}
