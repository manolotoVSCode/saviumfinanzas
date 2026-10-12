import Foundation
import SaviumCore

/// Modo señuelo: se activa al entrar con el código de coacción. Mientras dure, DatosStore y MovimientosStore
/// muestran Senuelo en vez de la base, y apuntar, editar o borrar solo cambian estos datos en memoria
/// (parece que se guarda, pero nada llega a Supabase). Se apaga al entrar con Face ID o la contraseña real.
@MainActor
enum ModoSenuelo {
    private(set) static var datos: Senuelo.Datos?
    static var activo: Bool { datos != nil }

    static func activar() { datos = Senuelo.datos(now: .now, calendario: .current) }
    static func desactivar() { datos = nil }

    static func apuntar(_ n: NuevaTransaccion) {
        datos?.movimientos.insert(Transaccion(id: n.id, fecha: n.fecha, comentario: n.comentario, ingreso: n.ingreso,
                                              gasto: n.gasto, divisa: n.divisa, cuentaId: n.cuentaId, subcategoriaId: n.subcategoriaId), at: 0)
        ordenar()
    }

    static func editar(id: String, _ c: CambioTransaccion) {
        guard let i = datos?.movimientos.firstIndex(where: { $0.id == id }) else { return }
        datos?.movimientos[i] = Transaccion(id: id, fecha: c.fecha, comentario: c.comentario, ingreso: c.ingreso, gasto: c.gasto,
                                            divisa: c.divisa, cuentaId: c.cuentaId, subcategoriaId: c.subcategoriaId)
        ordenar()
    }

    static func borrar(id: String) { datos?.movimientos.removeAll { $0.id == id } }

    private static func ordenar() { datos?.movimientos.sort { $0.fecha > $1.fecha } }
}
