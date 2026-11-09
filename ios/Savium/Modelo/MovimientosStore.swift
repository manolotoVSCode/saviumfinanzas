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
    var filtro = FiltroMovimientos()
    /// Subcategorías por las que también busca el texto (las pone la vista, que conoce las categorías).
    var idsCategoria: [String] = []
    private var pagina = 0
    private var consulta = 0   // descarta respuestas de una búsqueda anterior

    /// Con un periodo de un mes se carga todo de una vez y hay total; con «Todo», no (la lista va por páginas).
    var conTotal: Bool { filtro.periodo != .todo }

    /// Quita la fila al momento; si el borrado falla, la repone y devuelve false.
    func borrar(_ t: Transaccion) async -> Bool {
        if ModoSenuelo.activo {
            ModoSenuelo.borrar(id: t.id)
            filas.removeAll { $0.id == t.id }
            return true
        }
        let q = Movimientos.quitar(t.id, de: filas)
        filas = q.filas
        do {
            try await repo.borrar(id: t.id)
            return true
        } catch {
            if let quitada = q.quitada { filas = Movimientos.reponer(quitada, en: filas) }
            return false
        }
    }

    /// Al cerrar sesión.
    func reiniciar() {
        consulta += 1
        filas = []; pagina = 0; hayMas = true; cargando = false; error = nil; filtro = FiltroMovimientos(); idsCategoria = []
    }

    /// `limpiar`: vacía la lista al momento (cambió el filtro). Sin limpiar, la lista anterior sigue a la vista
    /// hasta que llega la primera página (al volver a la app o al tirar para refrescar).
    func recargar(limpiar: Bool = true) async {
        consulta += 1
        pagina = 0; hayMas = true; cargando = false
        if limpiar { filas = [] }
        await cargarMas()
    }

    func cargarMas() async {
        guard hayMas, !cargando else { return }
        let rango = Movimientos.rango(filtro.periodo, now: .now, calendario: .current)
        if let s = ModoSenuelo.datos {
            let ids = Set(idsCategoria)
            filas = s.movimientos.filter { Movimientos.coincide($0, filtro: filtro, idsCategoria: ids, rango: rango) }
            hayMas = false
            error = nil
            return
        }
        cargando = true
        let mia = consulta
        defer { if mia == consulta { cargando = false } }
        do {
            let nuevas = try await repo.movimientos(filtro: filtro, idsCategoria: idsCategoria, rango: rango, pagina: conTotal ? nil : pagina)
            guard mia == consulta else { return }
            filas = pagina == 0 ? nuevas : filas + nuevas
            hayMas = !conTotal && nuevas.count == Repositorio.tamanoPagina
            pagina += 1
            error = nil
        } catch {
            // Una búsqueda cancelada porque el usuario siguió escribiendo no es un fallo.
            if Task.isCancelled || error is CancellationError || (error as? URLError)?.code == .cancelled { return }
            if mia == consulta { self.error = "No se pudieron cargar los movimientos." }
        }
    }
}
