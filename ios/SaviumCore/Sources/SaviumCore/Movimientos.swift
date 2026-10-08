import Foundation

public enum Movimientos {
    /// Secciones por día en el orden en que llegan (la consulta ya viene por fecha desc).
    public static func agruparPorDia(_ txs: [Transaccion]) -> [(dia: String, movimientos: [Transaccion])] {
        var grupos: [(dia: String, movimientos: [Transaccion])] = []
        for t in txs {
            if grupos.last?.dia == t.fecha { grupos[grupos.count - 1].movimientos.append(t) } else { grupos.append((t.fecha, [t])) }
        }
        return grupos
    }

    /// Subcategorías más usadas en `txs` (las más recientes primero si empatan).
    public static func frecuentes(_ txs: [Transaccion], limite: Int) -> [String] {
        var cuenta: [String: (n: Int, ultima: String)] = [:]
        for t in txs {
            let actual = cuenta[t.subcategoriaId]
            cuenta[t.subcategoriaId] = ((actual?.n ?? 0) + 1, max(actual?.ultima ?? "", t.fecha))
        }
        return cuenta.sorted { a, b in
            a.value.n != b.value.n ? a.value.n > b.value.n : (a.value.ultima != b.value.ultima ? a.value.ultima > b.value.ultima : a.key < b.key)
        }.prefix(limite).map(\.key)
    }
}

/// Estado de la hoja «Apuntar» y la transacción que produce.
public struct FormularioMovimiento: Sendable, Equatable {
    public var esGasto = true
    public var importeTexto = ""
    public var cuentaId: String?
    public var subcategoriaId: String?
    public var fecha: Date
    public var comentario = ""

    public init(fecha: Date, cuentaId: String? = nil) { self.fecha = fecha; self.cuentaId = cuentaId }

    public var importe: Double? { Formato.parsearImporte(importeTexto).flatMap { $0 > 0 ? $0 : nil } }
    public var esValido: Bool { importe != nil && cuentaId != nil && subcategoriaId != nil }

    /// Fecha en el día local; divisa de la cuenta.
    public func construir(cuentas: [Cuenta], userId: String, calendario: Calendar) -> NuevaTransaccion? {
        guard let importe, let cuentaId, let subcategoriaId, let cuenta = cuentas.first(where: { $0.id == cuentaId }) else { return nil }
        return NuevaTransaccion(cuentaId: cuentaId, fecha: Fechas.isoLocal(fecha, calendario: calendario),
                                comentario: comentario.trimmingCharacters(in: .whitespacesAndNewlines),
                                ingreso: esGasto ? 0 : importe, gasto: esGasto ? importe : 0,
                                subcategoriaId: subcategoriaId, divisa: cuenta.divisa, userId: userId)
    }
}
