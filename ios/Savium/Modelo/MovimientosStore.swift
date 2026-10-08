import Foundation
import Observation
import SaviumCore

@Observable @MainActor
final class MovimientosStore {
    private let repo = Repositorio(db: supabase)
    private(set) var filas: [Transaccion] = []
    private(set) var hayMas = true
    private(set) var cargando = false
    private(set) var error: String?
    var cuentaId: String?
    var texto = ""
    private var pagina = 0
    private var consulta = 0   // descarta respuestas de una búsqueda anterior

    func recargar() async {
        consulta += 1
        pagina = 0; hayMas = true; filas = []; cargando = false
        await cargarMas()
    }

    func cargarMas() async {
        guard hayMas, !cargando else { return }
        cargando = true
        let mia = consulta
        defer { if mia == consulta { cargando = false } }
        do {
            let nuevas = try await repo.movimientos(pagina: pagina, cuentaId: cuentaId, texto: texto)
            guard mia == consulta else { return }
            filas += nuevas
            hayMas = nuevas.count == Repositorio.tamanoPagina
            pagina += 1
            error = nil
        } catch {
            if mia == consulta { self.error = "No se pudieron cargar los movimientos." }
        }
    }
}
