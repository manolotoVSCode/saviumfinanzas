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
    private(set) var filasPatrimonio: [FilaPatrimonio] = []
    private(set) var categorias: [Categoria] = []
    private(set) var pendientes: [Pendiente] = []
    private(set) var suscripciones: [Suscripcion] = []
    private(set) var inversiones: [Inversion] = []
    private(set) var valuaciones: [Valuacion] = []
    private(set) var movimientosPorPagar: [Transaccion] = []
    private(set) var movimientosMesAnterior: [Transaccion] = []
    private(set) var recientes: [Transaccion] = []
    private(set) var cargando = false
    private(set) var error: String?
    private(set) var actualizado: Date?

    var hayDatos: Bool { actualizado != nil }
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
            let cats = try await repo.categorias()
            let pp = try await repo.movimientos(deSubcategorias: PorPagar.subcategoriasRelevantes(cats))
            let (nc, np, npe, ns, ni, nv) = try await (c, p, pe, s, i, v)
            let (nma, nre) = try await (ma, re)
            let divisaPerfil = try await perfil?.divisaPreferida
            cuentas = nc; filasPatrimonio = np; categorias = cats; pendientes = npe
            suscripciones = ns; inversiones = ni; valuaciones = nv
            movimientosMesAnterior = nma; recientes = nre; movimientosPorPagar = pp
            app.usarDivisaDelPerfil(divisaPerfil)
            error = nil
            actualizado = ahora
        } catch {
            Logger(subsystem: "com.manoloto.savium", category: "datos").error("Error al cargar: \(String(describing: error), privacy: .public)")
            self.error = "Sin conexión"
        }
        await tasas
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
        let porId = Dictionary(categorias.map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
        let movs = movimientosMesAnterior.map {
            MovimientoResumen(fecha: $0.dia(en: cal), ingreso: $0.ingreso, gasto: $0.gasto, divisa: $0.divisa,
                              tipo: porId[$0.subcategoriaId]?.tipo, categoria: porId[$0.subcategoriaId]?.categoria ?? "SIN ASIGNAR")
        }
        return MesAnterior.totales(movs, tasas: app.tasas, moneda: app.divisa, now: .now, calendario: cal)
    }

    func categoria(_ id: String) -> Categoria? { categorias.first { $0.id == id } }
    func cuenta(_ id: String) -> Cuenta? { cuentas.first { $0.id == id } }
}
