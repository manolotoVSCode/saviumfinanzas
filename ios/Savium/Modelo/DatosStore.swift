import Foundation
import Observation
import OSLog
import SaviumCore

/// Datos de todas las pestañas salvo la lista paginada de Movimientos. Una sola carga en paralelo
/// para que Resumen, Patrimonio y Pendientes (y el globo de vencidos) cuadren entre sí.
@Observable @MainActor
final class DatosStore {
    let repo = Repositorio(db: supabase)
    private(set) var cuentas: [Cuenta] = []
    /// Cuentas con al menos un movimiento: las únicas que ofrece el filtro de Movimientos.
    private(set) var cuentasConMovimientos: Set<String> = []
    private(set) var filasPatrimonio: [FilaPatrimonio] = []
    private(set) var categorias: [Categoria] = []
    private(set) var pendientes: [Pendiente] = []
    private(set) var suscripciones: [Suscripcion] = []
    private(set) var inversiones: [Inversion] = []
    private(set) var valuaciones: [Valuacion] = []
    private(set) var movimientosPorPagar: [Transaccion] = []
    private(set) var movimientosMesAnterior: [Transaccion] = []
    private(set) var recientes: [Transaccion] = []
    /// Lector de la cuenta de otro (p. ej. la familia): ve todo y no puede apuntar, editar, cobrar ni borrar.
    /// La base lo impide igualmente; esto solo quita los botones.
    private(set) var soloLectura = false
    private(set) var cargando = false
    private(set) var error: String?
    private(set) var actualizado: Date?

    var hayDatos: Bool { actualizado != nil }

    /// Al cerrar sesión: nada de la cuenta anterior se queda en memoria.
    func reiniciar() {
        cuentas = []; cuentasConMovimientos = []; filasPatrimonio = []; categorias = []; pendientes = []; suscripciones = []
        inversiones = []; valuaciones = []; movimientosPorPagar = []; movimientosMesAnterior = []; recientes = []
        error = nil; actualizado = nil; soloLectura = false
    }
    var cal: Calendar { .current }

    func cargar(app: AppModel) async {
        guard !cargando else { return }
        cargando = true
        defer { cargando = false }
        async let tasas: Void = app.cargarTasas()
        do {
            let ahora = Date()
            let mes = MesAnterior.rango(now: ahora, calendario: cal)
            let hace90 = Fechas.isoLocal(cal.date(byAdding: .day, value: -90, to: ahora)!, calendario: cal)
            let hoy = Fechas.isoLocal(ahora, calendario: cal)
            async let c = repo.cuentas()
            async let p = repo.patrimonio()
            async let pe = repo.pendientes()
            async let s = repo.suscripcionesActivas()
            async let i = repo.inversiones()
            async let v = repo.valuaciones()
            async let ma = repo.movimientos(desde: mes.desde, hasta: mes.hasta)
            async let re = repo.movimientos(desde: hace90, hasta: hoy)
            async let perfil = repo.perfil()
            let yo = supabase.auth.currentUser?.id.uuidString.lowercased() ?? ""
            async let titular = repo.titularComoLector(yo)
            let cats = try await repo.categorias()
            let pp = try await repo.movimientos(deSubcategorias: PorPagar.subcategoriasRelevantes(cats))
            let (nc, np, npe, ns, ni, nv) = try await (c, p, pe, s, i, v)
            let (nma, nre) = try await (ma, re)
            let nuevoPerfil = try await perfil
            let esLector = try await titular != nil
            let divisaPerfil = nuevoPerfil?.divisaPreferida
            let conMovs = try await repo.cuentasConMovimientos(nc.map(\.id))
            cuentas = nc; cuentasConMovimientos = conMovs; filasPatrimonio = np; categorias = cats; pendientes = npe
            suscripciones = ns; inversiones = ni; valuaciones = nv
            movimientosMesAnterior = nma; recientes = nre; movimientosPorPagar = pp
            soloLectura = esLector
            app.usarDivisaDelPerfil(divisaPerfil)
            UsuarioRecordado.ponerNombre(nuevoPerfil?.nombre)
            error = nil
            actualizado = ahora
        } catch {
            Logger(subsystem: "com.manoloto.savium", category: "datos").error("Error al cargar: \(String(describing: error), privacy: .public)")
            self.error = "Sin conexión"
        }
        await tasas
    }

    // MARK: Pendientes

    /// Lo quita de la lista al momento; si falla, lo repone y devuelve false.
    func cobrar(_ p: Pendiente) async -> Bool {
        await quitarPendiente(p) { try await self.repo.cobrarPendiente(p, fecha: Fechas.isoLocal(.now, calendario: self.cal)) }
    }

    func borrar(_ p: Pendiente) async -> Bool {
        await quitarPendiente(p) { try await self.repo.borrarPendiente(id: p.id) }
    }

    private func quitarPendiente(_ p: Pendiente, _ accion: () async throws -> Void) async -> Bool {
        guard let i = pendientes.firstIndex(where: { $0.id == p.id }) else { return false }
        pendientes.remove(at: i)
        do {
            try await accion()
            return true
        } catch {
            pendientes.insert(p, at: min(i, pendientes.count))
            return false
        }
    }

    // MARK: Derivados (siempre en la divisa elegida)

    func patrimonio(_ app: AppModel) -> Patrimonio.Resultado {
        Patrimonio.calcular(filasPatrimonio, tasas: app.tasas, moneda: app.divisa)
    }

    func resumenPendientes(_ app: AppModel) -> Pendientes.Resumen {
        Pendientes.resumen(pendientes, tasas: app.tasas, moneda: app.divisa, now: .now, calendario: cal)
    }

    func porPagar(_ app: AppModel, horizonte: Int) -> [FilaPorPagar] {
        PorPagar.calcular(movimientos: movimientosPorPagar, categorias: categorias, cuentas: cuentas, suscripciones: suscripciones,
                          horizonte: horizonte, monedaBase: app.divisa, now: .now, calendario: cal)
    }

    func mesAnterior(_ app: AppModel) -> MesAnterior.Totales {
        MesAnterior.totales(movimientosResumen, moneda: app.divisa, now: .now, calendario: cal)
    }

    func gastosPorCategoria(_ app: AppModel) -> [GastosPorCategoria.Fila] {
        GastosPorCategoria.calcular(movimientosResumen, moneda: app.divisa, now: .now, calendario: cal)
    }

    private var movimientosResumen: [MovimientoResumen] {
        let porId = Dictionary(categorias.map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
        return movimientosMesAnterior.map {
            let c = porId[$0.subcategoriaId]
            return MovimientoResumen(fecha: $0.dia(en: cal), ingreso: $0.ingreso, gasto: $0.gasto, divisa: $0.divisa,
                                     tipo: c?.tipo, categoria: c?.categoria ?? "SIN ASIGNAR", subcategoria: c?.subcategoria)
        }
    }

    func categoria(_ id: String) -> Categoria? { categorias.first { $0.id == id } }
    func cuenta(_ id: String) -> Cuenta? { cuentas.first { $0.id == id } }
}
