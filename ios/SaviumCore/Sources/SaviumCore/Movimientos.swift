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

    /// Borrado optimista: la lista sin la fila y dónde estaba, para reponerla si el borrado falla.
    public static func quitar(_ id: String, de filas: [Transaccion]) -> (filas: [Transaccion], quitada: (indice: Int, transaccion: Transaccion)?) {
        guard let i = filas.firstIndex(where: { $0.id == id }) else { return (filas, nil) }
        var resto = filas
        let t = resto.remove(at: i)
        return (resto, (i, t))
    }

    public static func reponer(_ quitada: (indice: Int, transaccion: Transaccion), en filas: [Transaccion]) -> [Transaccion] {
        var resultado = filas
        resultado.insert(quitada.transaccion, at: min(quitada.indice, resultado.count))
        return resultado
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
    /// Id de la transacción: al apuntar, uno nuevo que se repite en todos los reintentos; al editar, el del movimiento.
    public let idEnvio: String
    public private(set) var editando = false
    /// Al editar un reembolso, una aportación o un retiro: su tipo de categoría no se cambia desde la app.
    public private(set) var tipoFijo: String?
    /// Reembolso: ingreso en una categoría de gasto (como «Es un reembolso» en la web).
    public private(set) var esReembolso = false
    public var esGasto = true
    public var importeTexto = ""
    public var cuentaId: String?
    public var subcategoriaId: String?
    public var fecha: Date
    public var comentario = ""

    public init(fecha: Date, cuentaId: String? = nil) {
        idEnvio = UUID().uuidString.lowercased(); self.fecha = fecha; self.cuentaId = cuentaId
    }

    public init(editando t: Transaccion, tipoCategoria: String?, calendario: Calendar) {
        idEnvio = t.id
        editando = true
        fecha = t.dia(en: calendario)
        cuentaId = t.cuentaId
        subcategoriaId = t.subcategoriaId
        comentario = t.comentario
        importeTexto = String(format: "%.2f", t.ingreso > 0 ? t.ingreso : t.gasto)
        switch tipoCategoria {
        case "Ingreso": esGasto = false
        case "Gastos": esGasto = true; if t.ingreso > 0 { esReembolso = true; tipoFijo = "Gastos" }
        case "Aportación": esGasto = false; tipoFijo = "Aportación"
        case "Retiro": esGasto = true; tipoFijo = "Retiro"
        default: esGasto = t.gasto > 0
        }
    }

    /// Tipo de las categorías que se ofrecen.
    public var tipoCategoria: String { tipoFijo ?? (esGasto ? "Gastos" : "Ingreso") }
    private var vaEnIngreso: Bool { esReembolso || !esGasto }

    public var importe: Double? { Formato.parsearImporte(importeTexto).flatMap { $0 > 0 ? $0 : nil } }
    public var esValido: Bool { importe != nil && cuentaId != nil && subcategoriaId != nil }

    /// Fecha en el día local; divisa de la cuenta.
    public func construir(cuentas: [Cuenta], userId: String, calendario: Calendar) -> NuevaTransaccion? {
        guard let importe, let cuentaId, let subcategoriaId, let cuenta = cuentas.first(where: { $0.id == cuentaId }) else { return nil }
        return NuevaTransaccion(id: idEnvio, cuentaId: cuentaId, fecha: Fechas.isoLocal(fecha, calendario: calendario),
                                comentario: comentario.trimmingCharacters(in: .whitespacesAndNewlines),
                                ingreso: vaEnIngreso ? importe : 0, gasto: vaEnIngreso ? 0 : importe,
                                subcategoriaId: subcategoriaId, divisa: cuenta.divisa, userId: userId)
    }

    /// Lo que se guarda al editar: mismos campos que la web; la divisa, la de la cuenta.
    public func cambios(cuentas: [Cuenta], calendario: Calendar) -> CambioTransaccion? {
        guard let importe, let cuentaId, let subcategoriaId, let cuenta = cuentas.first(where: { $0.id == cuentaId }) else { return nil }
        return CambioTransaccion(cuentaId: cuentaId, fecha: Fechas.isoLocal(fecha, calendario: calendario),
                                 comentario: comentario.trimmingCharacters(in: .whitespacesAndNewlines),
                                 ingreso: vaEnIngreso ? importe : 0, gasto: vaEnIngreso ? 0 : importe,
                                 subcategoriaId: subcategoriaId, divisa: cuenta.divisa)
    }
}
