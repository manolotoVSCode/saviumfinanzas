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

/// Filtros de la pestaña Movimientos.
public enum PeriodoMovimientos: String, CaseIterable, Sendable { case todo = "Todo", esteMes = "Este mes", mesAnterior = "Mes anterior" }
public enum TipoMovimientos: String, CaseIterable, Sendable { case todos = "Todos", gastos = "Gastos", ingresos = "Ingresos" }

public struct FiltroMovimientos: Equatable, Sendable {
    public var texto = ""
    public var cuentaId: String?
    public var tipo: TipoMovimientos = .todos
    public var periodo: PeriodoMovimientos = .todo
    public init() {}
    /// Algo distinto de «todo»: cuenta, tipo o periodo (el texto va aparte, en la búsqueda).
    public var hayFiltros: Bool { cuentaId != nil || tipo != .todos || periodo != .todo }
    public var textoLimpio: String { texto.trimmingCharacters(in: .whitespaces) }
}

extension Movimientos {
    /// Días (incluidos) del periodo; nil = sin límite.
    public static func rango(_ p: PeriodoMovimientos, now: Date, calendario cal: Calendar) -> (desde: String, hasta: String)? {
        let inicioMes = cal.date(from: cal.dateComponents([.year, .month], from: now))!
        switch p {
        case .todo: return nil
        case .esteMes:
            let fin = cal.date(byAdding: DateComponents(month: 1, day: -1), to: inicioMes)!
            return (Fechas.isoLocal(inicioMes, calendario: cal), Fechas.isoLocal(fin, calendario: cal))
        case .mesAnterior:
            let inicio = cal.date(byAdding: .month, value: -1, to: inicioMes)!
            let fin = cal.date(byAdding: .day, value: -1, to: inicioMes)!
            return (Fechas.isoLocal(inicio, calendario: cal), Fechas.isoLocal(fin, calendario: cal))
        }
    }

    /// Subcategorías cuyo nombre (o el de su categoría) contiene el texto. Desde 2 letras y como mucho 40:
    /// los ids van en la URL y una sola letra coincidiría con casi todas.
    public static func categoriasQueCoinciden(_ texto: String, en categorias: [Categoria]) -> [String] {
        let t = texto.trimmingCharacters(in: .whitespaces)
        guard t.count >= 2 else { return [] }
        return Array(categorias.filter { "\($0.categoria) \($0.subcategoria)".localizedStandardContains(t) }.map(\.id).prefix(40))
    }

    /// El mismo criterio que la consulta del servidor, para el modo señuelo: comentario, categoría o importe exacto.
    public static func coincide(_ t: Transaccion, filtro f: FiltroMovimientos, idsCategoria: Set<String>, rango: (desde: String, hasta: String)?) -> Bool {
        if let c = f.cuentaId, t.cuentaId != c { return false }
        if f.tipo == .gastos && t.gasto <= 0 { return false }
        if f.tipo == .ingresos && t.ingreso <= 0 { return false }
        if let r = rango, t.fecha < r.desde || t.fecha > r.hasta { return false }
        let texto = f.textoLimpio
        guard !texto.isEmpty else { return true }
        if t.comentario.localizedStandardContains(texto) || idsCategoria.contains(t.subcategoriaId) { return true }
        if let n = Formato.parsearImporte(texto) { return abs(t.gasto - n) < 0.005 || abs(t.ingreso - n) < 0.005 }
        return false
    }

    /// Condición `or` de PostgREST para la búsqueda: comentario, subcategorías e importe exacto.
    /// Comas, paréntesis, comillas y barras romperían la lista: se cambian por `_` (comodín de un carácter en ilike).
    public static func condicionBusqueda(_ texto: String, idsCategoria: [String]) -> String? {
        let t = texto.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return nil }
        let comodin = String(t.map { ",()\"\\:".contains($0) ? "_" : $0 })
        var partes = ["comentario.ilike.*\(comodin)*"]
        if !idsCategoria.isEmpty { partes.append("subcategoria_id.in.(\(idsCategoria.joined(separator: ",")))") }
        if let n = Formato.parsearImporte(t) {
            let s = String(format: "%.2f", n)
            partes += ["gasto.eq.\(s)", "ingreso.eq.\(s)"]
        }
        return partes.joined(separator: ",")
    }

    /// Suma de ingreso − gasto en la divisa elegida.
    public static func total(_ txs: [Transaccion], moneda: Divisa, tasas: Tasas) -> Double {
        txs.reduce(0) { $0 + Conversion.convertir($1.importe, de: Divisa(codigo: $1.divisa, fallback: moneda), a: moneda, tasas: tasas) }
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

    /// «Guardar y apuntar otro»: uno nuevo con la misma cuenta, fecha y tipo; importe, categoría y comentario en blanco.
    public func siguiente() -> FormularioMovimiento {
        var f = FormularioMovimiento(fecha: fecha, cuentaId: cuentaId)
        f.esGasto = esGasto
        return f
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
