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
    private(set) var umbralesCripto: [UmbralCripto] = []
    private(set) var comprasCripto: [CompraCripto] = []
    private(set) var preciosCripto: [String: Double] = [:]
    private(set) var alertasDescartadas: Set<String> = []
    /// Lector de la cuenta de otro (p. ej. la familia): ve todo y no puede apuntar, editar, cobrar ni borrar.
    /// La base lo impide igualmente; esto solo quita los botones.
    private(set) var soloLectura = false
    /// Titular con algún lector: puede mandar la alerta de emergencia.
    private(set) var tieneLectores = false
    /// Lector: alerta de emergencia que hay que mostrar a pantalla completa.
    var alertaActiva: AlertaRecibida?
    private(set) var cargando = false
    private(set) var error: String?
    private(set) var actualizado: Date?

    var hayDatos: Bool { actualizado != nil }

    /// Al cerrar sesión: nada de la cuenta anterior se queda en memoria.
    func reiniciar() {
        cuentas = []; cuentasConMovimientos = []; filasPatrimonio = []; categorias = []; pendientes = []; suscripciones = []
        inversiones = []; valuaciones = []; movimientosPorPagar = []; movimientosMesAnterior = []; recientes = []
        umbralesCripto = []; comprasCripto = []; preciosCripto = [:]; alertasDescartadas = []
        error = nil; actualizado = nil; soloLectura = false; tieneLectores = false; alertaActiva = nil
    }
    var cal: Calendar { .current }

    func cargar(app: AppModel) async {
        guard !cargando else { return }
        if let s = ModoSenuelo.datos { cargarSenuelo(s); return }
        cargando = true
        defer { cargando = false }
        async let tasas: Void = app.cargarTasas()
        async let cripto: Void = cargarCripto()
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
            async let accesos = repo.accesos(yo)
            async let codigo = repo.hashCodigoEmergencia()
            let cats = try await repo.categorias()
            let pp = try await repo.movimientos(deSubcategorias: PorPagar.subcategoriasRelevantes(cats))
            let (nc, np, npe, ns, ni, nv) = try await (c, p, pe, s, i, v)
            let (nma, nre) = try await (ma, re)
            let nuevoPerfil = try await perfil
            let nuevosAccesos = try await accesos
            CodigoGuardado.guardar(try await codigo)
            let divisaPerfil = nuevoPerfil?.divisaPreferida
            let conMovs = try await repo.cuentasConMovimientos(nc.map(\.id))
            cuentas = nc; cuentasConMovimientos = conMovs; filasPatrimonio = np; categorias = cats; pendientes = npe
            suscripciones = ns; inversiones = ni; valuaciones = nv
            movimientosMesAnterior = nma; recientes = nre; movimientosPorPagar = pp
            soloLectura = nuevosAccesos.titular != nil
            tieneLectores = nuevosAccesos.tieneLectores
            app.usarDivisaDelPerfil(divisaPerfil)
            UsuarioRecordado.ponerNombre(nuevoPerfil?.nombre)
            error = nil
            actualizado = ahora
            if soloLectura {
                await Notificaciones.compartidas.activarParaLector()
                await comprobarAlertas()
            }
            if tieneLectores && !soloLectura { AlertaEmergencia.compartida.prepararPermiso() }
        } catch {
            Logger(subsystem: "com.manoloto.savium", category: "datos").error("Error al cargar: \(String(describing: error), privacy: .public)")
            self.error = "Sin conexión"
        }
        await tasas
        await cripto
    }

    /// Aparte de la carga principal: si falla (CoinGecko, sin red…) se quedan las alertas de antes
    /// y no se marca «Sin conexión». Sin umbrales no pide nada más (el lector no ve los del titular).
    private func cargarCripto() async {
        do {
            let umbrales = try await repo.umbralesCripto()
            guard !umbrales.isEmpty else {
                umbralesCripto = []; comprasCripto = []; preciosCripto = [:]
                return
            }
            async let descartadas = repo.alertasDescartadas()
            let compras = try await repo.comprasCripto()
            let simbolos = Array(Set(compras.map(\.simbolo))).sorted()
            let precios = simbolos.isEmpty ? [:] : try await repo.preciosCripto(simbolos)
            alertasDescartadas = try await descartadas
            umbralesCripto = umbrales; comprasCripto = compras; preciosCripto = precios
        } catch {
            Logger(subsystem: "com.manoloto.savium", category: "cripto").error("Alertas cripto: \(String(describing: error), privacy: .public)")
        }
    }

    // MARK: Alertas de cripto

    func alertasCripto(_ app: AppModel) -> [AlertasCripto.Alerta] {
        AlertasCripto.calcular(compras: comprasCripto, precios: preciosCripto, umbrales: umbralesCripto, tasas: app.tasas)
            .filter { !alertasDescartadas.contains($0.clave) }
    }

    /// Como «Descartar» en la web (vuelve a avisar si se cambia el nivel). Si falla, reaparece.
    func descartar(_ a: AlertasCripto.Alerta) async {
        guard let yo = supabase.auth.currentUser?.id else { return }
        alertasDescartadas.insert(a.clave)
        do { try await repo.descartarAlerta(a.clave, usuario: yo) } catch { alertasDescartadas.remove(a.clave) }
    }

    /// Modo señuelo: los datos ficticios, sin tocar la red.
    private func cargarSenuelo(_ s: Senuelo.Datos) {
        let mes = MesAnterior.rango(now: .now, calendario: cal)
        cuentas = s.cuentas; cuentasConMovimientos = Set(s.cuentas.map(\.id)); filasPatrimonio = s.filasPatrimonio
        categorias = s.categorias; pendientes = []; suscripciones = s.suscripciones; inversiones = []; valuaciones = []
        movimientosPorPagar = []; recientes = s.movimientos
        umbralesCripto = []; comprasCripto = []; preciosCripto = [:]; alertasDescartadas = []
        movimientosMesAnterior = s.movimientos.filter { $0.fecha >= mes.desde && $0.fecha <= mes.hasta }
        soloLectura = false; error = nil; actualizado = .now
    }

    // MARK: Alerta de emergencia (lector)

    /// Al abrir la app o volver a ella: si hay una alerta sin ver, se muestra.
    func comprobarAlertas() async {
        guard soloLectura, alertaActiva == nil, let a = try? await repo.alertaSinVer() else { return }
        alertaActiva = a
    }

    /// Al llegar o tocar la notificación.
    func mostrarAlerta(id: String) async {
        if let a = try? await repo.alerta(id: id) { alertaActiva = a }
    }

    func marcarVista(_ a: AlertaRecibida) async {
        do { try await repo.marcarVistas() } catch {
            Logger(subsystem: "com.manoloto.savium", category: "alerta").error("Marcar vista: \(String(describing: error), privacy: .public)")
        }
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
