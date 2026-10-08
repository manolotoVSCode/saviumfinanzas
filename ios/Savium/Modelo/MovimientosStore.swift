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

    /// Quita la fila al momento; si el borrado falla, la repone y devuelve false.
    func borrar(_ t: Transaccion) async -> Bool {
        let q = Movimientos.quitar(t.id, de: filas)
        guard let quitada = q.quitada else { return false }
        filas = q.filas
        do {
            try await repo.borrar(id: t.id)
            return true
        } catch {
            filas = Movimientos.reponer(quitada, en: filas)
            self.error = "No se pudo borrar. Revisa la conexión y vuelve a intentarlo."
            return false
        }
    }

    /// Al cerrar sesión.
    func reiniciar() {
        consulta += 1
        filas = []; pagina = 0; hayMas = true; cargando = false; error = nil; cuentaId = nil; texto = ""
    }

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
