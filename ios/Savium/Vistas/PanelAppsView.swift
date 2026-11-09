import SwiftUI
import SaviumCore

// Lo esencial del panel de la web (Apps → Savium Share): descargas y uso.
// La misma función de la base; solo se piden los campos que se enseñan aquí.

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

/// Panel de las apps, en Ajustes. AjustesView solo lo enseña a Config.adminId.
struct PanelAppsView: View {
    private let repo = Repositorio(db: supabase)
    @State private var share: Result<PanelShare, Error>?

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
                    let fecha = Fechas.diaLocal(dia, calendario: .current)?.formatted(.dateTime.day().month().locale(Locale(identifier: "es_MX"))) ?? dia
                    Text("App Store Connect llega con un día de retraso: último día \(fecha).")
                }
            }
        }
        .navigationTitle("Panel de las apps")
        .navigationBarTitleDisplayMode(.inline)
        .task { await cargar() }
        .refreshable { await cargar() }
    }

    private func cargar() async {
        do { share = .success(try await repo.panelShare()) } catch { share = .failure(error) }
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
