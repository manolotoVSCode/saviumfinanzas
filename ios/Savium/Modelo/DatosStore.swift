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
    /// Provisiones pendientes de CxP (se crean y se marcan pagadas en la web).
    private(set) var provisiones: [ProvisionCxP] = []
    private(set) var inversiones: [Inversion] = []
    private(set) var valuaciones: [Valuacion] = []
    private(set) var movimientosPorPagar: [Transaccion] = []
    private(set) var movimientosMesAnterior: [Transaccion] = []
    private(set) var recientes: [Transaccion] = []
    private(set) var umbralesCripto: [UmbralCripto] = []
    private(set) var comprasCripto: [CompraCripto] = []
    private(set) var preciosCripto: [String: Double] = [:]
    private(set) var alertasDescartadas: Set<String> = []
    /// Tareas abiertas del Checklist (se crean en la web). Personales: el lector no las ve.
    private(set) var tareas: [TareaChecklist] = []
    /// Aviso con «Deshacer» tras cobrar un pendiente; lo enseña la barra de pestañas unos segundos.
    var deshacer: CobroHecho?
    /// Lector de la cuenta de otro (p. ej. la familia): ve todo y no puede apuntar, editar, cobrar ni borrar.
    /// La base lo impide igualmente; esto solo quita los botones.
    private(set) var soloLectura = false
    /// Titular con algún lector: puede mandar la alerta de emergencia.
    private(set) var tieneLectores = false
    /// Lector: alerta de emergencia que hay que mostrar a pantalla completa.
    var alertaActiva: AlertaRecibida?
    private(set) var cargando = false
    /// Sube en cada reiniciar (cerrar sesión, entrar o salir del señuelo): una carga que empezó antes descarta su
    /// resultado, para que una respuesta tardía no pinte datos reales encima del señuelo (ni los de otra cuenta).
    private var generacion = 0
    /// Sube con cada cambio optimista (cobrar, borrar, marcar): una carga que empezó antes no pisa pendientes ni tareas.
    private var cambiosLocales = 0
    private(set) var error: String?
    private(set) var actualizado: Date?

    var hayDatos: Bool { actualizado != nil }

    /// Al cerrar sesión: nada de la cuenta anterior se queda en memoria.
    func reiniciar() {
        cuentas = []; cuentasConMovimientos = []; filasPatrimonio = []; categorias = []; pendientes = []; suscripciones = []; provisiones = []
        inversiones = []; valuaciones = []; movimientosPorPagar = []; movimientosMesAnterior = []; recientes = []
        umbralesCripto = []; comprasCripto = []; preciosCripto = [:]; alertasDescartadas = []; tareas = []; deshacer = nil
        error = nil; actualizado = nil; soloLectura = false; tieneLectores = false; alertaActiva = nil
        generacion += 1
    }
    var cal: Calendar { .current }

    func cargar(app: AppModel) async {
        // El señuelo va antes que «ya está cargando»: una carga real en vuelo no debe impedir mostrarlo.
        if let s = ModoSenuelo.datos { cargarSenuelo(s); return }
        guard !cargando else { return }
        let mia = generacion
        let cambiosAlEmpezar = cambiosLocales
        var repetir = false
        cargando = true
        defer { cargando = false }
        async let tasas: Void = app.cargarTasas()
        async let cripto: Void = cargarCripto(generacion: mia)
        do {
            let ahora = Date()
            let mes = MesAnterior.rango(now: ahora, calendario: cal)
            let hace90 = Fechas.isoLocal(cal.date(byAdding: .day, value: -90, to: ahora)!, calendario: cal)
            let hoy = Fechas.isoLocal(ahora, calendario: cal)
            async let c = repo.cuentas()
            async let p = repo.patrimonio()
            async let pe = repo.pendientes()
            async let s = repo.suscripcionesActivas()
            async let pr = repo.provisiones()
            async let i = repo.inversiones()
            async let v = repo.valuaciones()
            async let ma = repo.movimientos(desde: mes.desde, hasta: mes.hasta)
            async let re = repo.movimientos(desde: hace90, hasta: hoy)
            async let perfil = repo.perfil()
            let yo = supabase.auth.currentUser?.id.uuidString.lowercased() ?? ""
            async let accesos = repo.accesos(yo)
            async let codigo = repo.hashCodigoEmergencia()
            async let ch = repo.checklist()
            let cats = try await repo.categorias()
            let pp = try await repo.movimientos(deSubcategorias: PorPagar.subcategoriasRelevantes(cats))
            let (nc, np, npe, ns, ni, nv) = try await (c, p, pe, s, i, v)
            let (nma, nre, npr) = try await (ma, re, pr)
            let nuevoPerfil = try await perfil
            let nuevosAccesos = try await accesos
            let nuevasTareas = try await ch
            CodigoGuardado.guardar(try await codigo)
            let divisaPerfil = nuevoPerfil?.divisaPreferida
            let conMovs = try await repo.cuentasConMovimientos(nc.map(\.id))
            guard mia == generacion, !ModoSenuelo.activo else { return }
            cuentas = nc; cuentasConMovimientos = conMovs; filasPatrimonio = np; categorias = cats
            suscripciones = ns; provisiones = npr; inversiones = ni; valuaciones = nv
            movimientosMesAnterior = nma; recientes = nre; movimientosPorPagar = pp
            // Si algo se cobró, borró o marcó mientras cargaba, esta respuesta es anterior: se pide otra.
            if cambiosAlEmpezar == cambiosLocales { pendientes = npe; tareas = nuevasTareas } else { repetir = true }
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
            if mia == generacion, !ModoSenuelo.activo { self.error = "Sin conexión" }
        }
        await tasas
        await cripto
        if repetir, mia == generacion {
            cargando = false
            await cargar(app: app)
        }
    }

    /// Aparte de la carga principal: si falla (CoinGecko, sin red…) se quedan las alertas de antes
    /// y no se marca «Sin conexión». Sin umbrales no pide nada más. El lector ve las del titular, sin descartarlas.
    private func cargarCripto(generacion mia: Int) async {
        do {
            let umbrales = try await repo.umbralesCripto()
            guard mia == generacion, !ModoSenuelo.activo else { return }
            guard !umbrales.isEmpty else {
                umbralesCripto = []; comprasCripto = []; preciosCripto = [:]
                return
            }
            async let descartadas = repo.alertasDescartadas()
            let compras = try await repo.comprasCripto()
            let simbolos = Array(Set(compras.map(\.simbolo))).sorted()
            let precios = simbolos.isEmpty ? [:] : try await repo.preciosCripto(simbolos)
            let nuevasDescartadas = try await descartadas
            guard mia == generacion, !ModoSenuelo.activo else { return }
            alertasDescartadas = nuevasDescartadas
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
        categorias = s.categorias; pendientes = []; suscripciones = s.suscripciones; provisiones = []; inversiones = []; valuaciones = []
        movimientosPorPagar = []; recientes = s.movimientos
        umbralesCripto = []; comprasCripto = []; preciosCripto = [:]; alertasDescartadas = []; tareas = []
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

    struct CobroHecho: Identifiable, Equatable {
        let id = UUID()
        /// El pendiente tal como estaba antes de cobrar, y como quedó.
        let antes: Pendiente
        let despues: Pendiente
        let mensaje: String
        var enCurso = false
        var fallo: String?
    }

    /// Cobra `monto` (por defecto lo que falta) en `fecha`. Cambia la lista al momento; si falla, la repone y devuelve el motivo.
    func cobrar(_ p: Pendiente, monto: Double? = nil, fecha: Date = .now) async -> String? {
        guard !ModoSenuelo.activo, let i = pendientes.firstIndex(where: { $0.id == p.id }) else { return nil }
        let mia = generacion
        cambiosLocales += 1
        let importe = monto ?? (p.montoEsperado - (p.montoCobrado ?? 0))
        let r = Pendientes.cobro(p, monto: importe)
        let dia = Fechas.isoLocal(fecha, calendario: cal)
        let nuevo = Pendiente(id: p.id, concepto: p.concepto, tipo: p.tipo, montoEsperado: p.montoEsperado, montoCobrado: r.montoCobrado,
                              divisa: p.divisa, fechaEsperada: p.fechaEsperada, estado: r.estado, fechaCobro: dia)
        pendientes[i] = nuevo
        do {
            try await repo.cobrarPendiente(p, monto: importe, fecha: dia)
            guard mia == generacion else { return nil }
            let nombre = p.concepto ?? "Pendiente"
            deshacer = CobroHecho(antes: p, despues: nuevo, mensaje: r.estado == "cobrado" ? "«\(nombre)» cobrado" : "Cobro parcial de «\(nombre)»")
            return nil
        } catch {
            guard mia == generacion else { return nil }
            if let j = pendientes.firstIndex(where: { $0.id == p.id }) { pendientes[j] = p }
            return Self.motivo(error, "No se pudo marcar como cobrado")
        }
    }

    /// Deshace el último cobro: el pendiente vuelve a como estaba. El aviso sigue a la vista hasta saber el resultado.
    func deshacerCobro() async {
        guard !ModoSenuelo.activo, var c = deshacer, !c.enCurso else { return }
        let mia = generacion
        cambiosLocales += 1
        c.enCurso = true; c.fallo = nil
        deshacer = c
        do {
            try await repo.reponerPendiente(c.antes, desde: c.despues)
            guard mia == generacion else { return }
            if let i = pendientes.firstIndex(where: { $0.id == c.antes.id }) { pendientes[i] = c.antes }
            if deshacer?.id == c.id { deshacer = nil }
        } catch {
            guard mia == generacion, deshacer?.id == c.id else { return }
            c.enCurso = false
            c.fallo = Self.motivo(error, "No se pudo deshacer")
            deshacer = c
        }
    }

    func borrar(_ p: Pendiente) async -> Bool {
        guard !ModoSenuelo.activo, let i = pendientes.firstIndex(where: { $0.id == p.id }) else { return false }
        let mia = generacion
        cambiosLocales += 1
        pendientes.remove(at: i)
        do {
            try await repo.borrarPendiente(id: p.id)
            return true
        } catch {
            if mia == generacion { pendientes.insert(p, at: min(i, pendientes.count)) }
            return false
        }
    }

    private static func motivo(_ error: Error, _ base: String) -> String {
        error is Repositorio.CambioEnOtroSitio
            ? "\(base): cambió en otro sitio mientras tanto. Tira hacia abajo para ver cómo quedó."
            : "\(base). Revisa la conexión y vuelve a intentarlo."
    }

    // MARK: Checklist

    func tareasParaHoy() -> [TareaChecklist] { Checklist.paraHoy(tareas, now: .now, calendario: cal) }

    func tareasDe(movimiento id: String) -> [TareaChecklist] { tareas.filter { $0.transaccionId == id } }

    /// Marca como hecha (una mensual avanza un mes). Optimista; si falla, la repone y devuelve false.
    func marcarHecha(_ t: TareaChecklist) async -> Bool {
        guard !ModoSenuelo.activo, let i = tareas.firstIndex(where: { $0.id == t.id }) else { return false }
        let mia = generacion
        cambiosLocales += 1
        let cambio = Checklist.cambiosAlMarcar(t, completada: true, ahora: .now, calendario: cal)
        let nueva = Checklist.aplicar(cambio, a: t)
        if nueva.completada { tareas.remove(at: i) } else { tareas[i] = nueva }
        do {
            try await repo.marcarTarea(id: t.id, cambio)
            return true
        } catch {
            guard mia == generacion else { return false }
            if let j = tareas.firstIndex(where: { $0.id == t.id }) { tareas[j] = t } else { tareas.insert(t, at: min(i, tareas.count)) }
            return false
        }
    }

    /// Pendientes de pagar ya vencidos (para el globo de la pestaña).
    func pagosVencidos(_ app: AppModel) -> Int {
        let hoy = cal.startOfDay(for: .now)
        return porPagar(app, horizonte: 30).filter { $0.fechaEstimada < hoy }.count
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
                          provisiones: provisiones, horizonte: horizonte, monedaBase: app.divisa, now: .now, calendario: cal)
    }

    /// Provisiones desde 100K MXN, sin importar la fecha (el aviso del Dashboard de la web).
    func pagosGrandes(_ app: AppModel) -> [ProvisionCxP] {
        PorPagar.pagosGrandes(provisiones, tasas: app.tasas)
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
