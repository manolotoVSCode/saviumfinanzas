import SwiftUI

// Lo esencial de los paneles de la web (Apps → Savium Share, Piggy Bank, Rewards): descargas y uso.
// Las mismas funciones de la base; solo se piden los campos que se enseñan aquí.

struct PanelShare: Decodable {
    struct Totales: Decodable { let grupos: Int; let activos_7d: Int }
    struct Dispositivos: Decodable { let hoy: Int; let media_7d: Double }
    struct Hoy: Decodable { let movimientos: Int; let grupos_nuevos: Int }
    struct Descargas: Decodable {
        struct Aperturas: Decodable { let hoy: Int; let semana: Int; let total: Int }
        struct Tienda: Decodable { let ultimo_dia: String?; let ultimo: Int; let semana: Int; let total: Int }
        let aperturas: Aperturas
        let tienda: Tienda
    }
    let totales: Totales
    let dispositivos: Dispositivos
    let hoy: Hoy
    let descargas: Descargas
    let comentarios_sin_leer: Int
}

struct PanelPiggy: Decodable {
    struct Dispositivos: Decodable { let hoy: Int; let media_7d: Double }
    /// Suma de 30 días; «familias» y «niños» serían familias·día, por eso no se piden.
    struct Totales: Decodable { let tareas_aprobadas: Int?; let modo_nino: Int? }
    let dispositivos: Dispositivos
    let totales: Totales
    let comentarios_sin_leer: Int
}

struct PanelRewards: Decodable {
    struct Totales: Decodable { let familias: Int; let miembros: Int; let tarjetas: Int }
    let totales: Totales
}

/// Panel de las apps, en Ajustes. AjustesView solo lo enseña a Config.adminId.
struct PanelAppsView: View {
    private let repo = Repositorio(db: supabase)
    @State private var share: Result<PanelShare, Error>?
    @State private var piggy: Result<PanelPiggy, Error>?
    @State private var rewards: Result<PanelRewards, Error>?

    var body: some View {
        List {
            Section {
                bloque(share) { s in
                    Fila("Descargas App Store, 7 días", s.descargas.tienda.semana)
                    Fila("Descargas App Store, total", s.descargas.tienda.total)
                    Fila("Primeras aperturas hoy", s.descargas.aperturas.hoy)
                    Fila("iPhone activos hoy", s.dispositivos.hoy)
                    Fila("iPhone activos, media 7 días", s.dispositivos.media_7d)
                    Fila("Movimientos hoy", s.hoy.movimientos)
                    Fila("Grupos activos 7 días", s.totales.activos_7d, de: s.totales.grupos)
                    comentarios(s.comentarios_sin_leer)
                }
            } header: {
                Text("Savium Share")
            } footer: {
                if case let .success(s) = share, let dia = s.descargas.tienda.ultimo_dia {
                    Text("App Store Connect llega con un día de retraso: último día \(dia).")
                }
            }

            Section("Savium Piggy Bank") {
                bloque(piggy) { p in
                    Fila("iPhone activos hoy", p.dispositivos.hoy)
                    Fila("iPhone activos, media 7 días", p.dispositivos.media_7d)
                    Fila("Tareas aprobadas, 30 días", p.totales.tareas_aprobadas ?? 0)
                    Fila("Entradas al modo niño, 30 días", p.totales.modo_nino ?? 0)
                    comentarios(p.comentarios_sin_leer)
                }
            }

            Section("Savium Rewards") {
                bloque(rewards) { r in
                    Fila("Familias", r.totales.familias)
                    Fila("Miembros", r.totales.miembros)
                    Fila("Tarjetas", r.totales.tarjetas)
                }
            }
        }
        .navigationTitle("Panel de las apps")
        .navigationBarTitleDisplayMode(.inline)
        .task { await cargar() }
        .refreshable { await cargar() }
    }

    private func cargar() async {
        // Cada app por su lado: si una función falla, las otras se ven igual.
        async let s = Result { try await repo.panelShare() }
        async let p = Result { try await repo.panelPiggy() }
        async let r = Result { try await repo.panelRewards() }
        (share, piggy, rewards) = await (s, p, r)
    }

    @ViewBuilder
    private func bloque<T, C: View>(_ r: Result<T, Error>?, @ViewBuilder _ contenido: (T) -> C) -> some View {
        switch r {
        case nil: ProgressView().frame(maxWidth: .infinity)
        case .failure: Label("No se pudo cargar", systemImage: "exclamationmark.triangle").foregroundStyle(.secondary)
        case let .success(v): contenido(v)
        }
    }

    @ViewBuilder
    private func comentarios(_ n: Int) -> some View {
        if n > 0 {
            LabeledContent("Comentarios sin leer") { Text("\(n)").foregroundStyle(.red).bold() }
        }
    }
}

private struct Fila: View {
    let titulo: String
    let valor: String
    init(_ titulo: String, _ n: Int, de total: Int? = nil) {
        self.titulo = titulo
        valor = total.map { "\(n) de \($0)" } ?? n.formatted()
    }
    init(_ titulo: String, _ x: Double) {
        self.titulo = titulo
        valor = x.formatted(.number.precision(.fractionLength(0...1)))
    }
    var body: some View {
        LabeledContent(titulo) { Text(valor).monospacedDigit() }
    }
}

private extension Result where Failure == Error {
    init(_ cuerpo: () async throws -> Success) async {
        do { self = .success(try await cuerpo()) } catch { self = .failure(error) }
    }
}
