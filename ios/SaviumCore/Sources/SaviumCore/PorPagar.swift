import Foundation

public enum TipoPorPagar: String, Sendable {
    case suscripcion = "Suscripción"
    case pagoAnual = "Pago anual"
    case recurrente = "Recurrente mensual"
    case tarjeta = "Tarjeta de crédito"
    case prestamo = "Préstamo"
    case provision = "Provisión"
}

public struct FilaPorPagar: Sendable, Identifiable {
    public let id: String
    public let concepto: String
    public let tipo: TipoPorPagar
    public let monto: Double
    public let divisa: Divisa
    public let fechaEstimada: Date
    public let detalle: String?
    public init(id: String, concepto: String, tipo: TipoPorPagar, monto: Double, divisa: Divisa, fechaEstimada: Date, detalle: String?) {
        self.id = id; self.concepto = concepto; self.tipo = tipo; self.monto = monto
        self.divisa = divisa; self.fechaEstimada = fechaEstimada; self.detalle = detalle
    }
}

/// Port fiel de computeCxP (src/lib/finance/cxp.ts): días locales y aritmética de fechas
/// en el calendario local.
/// Diferencia conocida: al sumar meses, JavaScript desborda (31 ago + 1 = 1 oct) y Calendar
/// recorta (30 sep). Afecta solo a pagos cuyo último cargo cayó en día 29-31.
public enum PorPagar {
    static let dia: TimeInterval = 86_400

    static func esPrestamo(_ c: Categoria) -> Bool {
        let s = "\(c.categoria) \(c.subcategoria)".lowercased()
        return s.contains("préstamo") || s.contains("prestamo") || s.contains("hipoteca")
    }

    /// Solo obligaciones fijas ineludibles (misma lista blanca que la web).
    static func esObligacionFija(_ cat: Categoria) -> Bool {
        let c = cat.categoria.lowercased(), s = cat.subcategoria.lowercased()
        if c == "hogar" && !s.contains("alquiler") && !s.contains("hipoteca") && !s.contains("servicios hogar") && s != "servicios" { return true }
        if c == "educación" || c == "educacion" { return true }
        if c == "servicios" && (s.contains("celular") || s.contains("telefon") || s.contains("internet")) { return true }
        if c == "salud" && s.contains("seguro") { return true }
        if c == "transporte" && s.contains("seguro") { return true }
        return false
    }

    /// Subcategorías cuyos movimientos necesita `calcular` (para no descargar todo el historial).
    public static func subcategoriasRelevantes(_ categorias: [Categoria]) -> [String] {
        categorias.filter { $0.tipo == "Gastos" && ($0.frecuenciaSeguimiento == "anual" || esPrestamo($0) || esObligacionFija($0)) }.map(\.id)
    }

    /// Meses entre pagos de una provisión recurrente; nil si es de pago único.
    static let mesesPorFrecuencia: [String: Int] = ["mensual": 1, "bimestral": 2, "trimestral": 3, "semestral": 6, "anual": 12]
    static let etiquetaFrecuencia: [String: String] = [
        "unica": "Pago único", "mensual": "Mensual", "bimestral": "Bimestral",
        "trimestral": "Trimestral", "semestral": "Semestral", "anual": "Anual",
    ]

    /// Umbral en MXN a partir del cual una provisión se avisa en el Resumen (como el Dashboard de la web).
    public static let umbralPagoGrandeMXN: Double = 100_000

    /// pagosGrandes de la web: provisiones pendientes desde el umbral (convertidas a MXN), sin importar la fecha.
    public static func pagosGrandes(_ provisiones: [ProvisionCxP], tasas: Tasas, umbral: Double = umbralPagoGrandeMXN) -> [ProvisionCxP] {
        provisiones
            .filter { $0.estado == "pendiente" && Conversion.convertir($0.monto, de: Divisa(codigo: $0.divisa, fallback: .MXN), a: .MXN, tasas: tasas) >= umbral }
            .sorted { $0.fecha < $1.fecha }
    }

    public static func calcular(movimientos: [Transaccion], categorias: [Categoria], cuentas: [Cuenta], suscripciones: [Suscripcion],
                                provisiones: [ProvisionCxP] = [],
                                horizonte: Int, monedaBase: Divisa, now: Date, calendario: Calendar) -> [FilaPorPagar] {
        let limite = calendario.date(byAdding: .day, value: horizonte, to: now)!
        let hoy = calendario.startOfDay(for: now)
        let corte = Fechas.finMesAnterior(now, calendario: calendario)
        func divisa(_ s: String) -> Divisa { Divisa(codigo: s.isEmpty ? nil : s, fallback: monedaBase) }
        func sumar(_ c: Calendar.Component, _ n: Int, _ d: Date) -> Date { calendario.date(byAdding: c, value: n, to: d)! }
        func diaDe(_ t: Transaccion) -> Date { t.dia(en: calendario) }
        /// Orden estable por fecha descendente (como .sort de JS).
        func recientesPrimero(_ movs: [Transaccion]) -> [Transaccion] {
            movs.enumerated().sorted { a, b in
                let (fa, fb) = (diaDe(a.element), diaDe(b.element))
                return fa != fb ? fa > fb : a.offset < b.offset
            }.map(\.element)
        }
        func pagosDe(_ catId: String) -> [Transaccion] { recientesPrimero(movimientos.filter { $0.subcategoriaId == catId && $0.gasto > 0 }) }

        // 1) Suscripciones activas con próximo pago dentro del horizonte (sin divisa propia → la del perfil).
        let subs: [FilaPorPagar] = suscripciones.filter(\.active).compactMap { s in
            guard let px = Fechas.diaLocal(s.proximoPago, calendario: calendario), px >= hoy, px <= limite else { return nil }
            return FilaPorPagar(id: "sub-\(s.id)", concepto: s.serviceName, tipo: .suscripcion, monto: s.ultimoPagoMonto,
                                divisa: monedaBase, fechaEstimada: px, detalle: s.frecuencia)
        }

        // 2) Pagos anuales: último pago + 1 año, rodando hacia delante.
        var anuales: [FilaPorPagar] = []
        for cat in categorias where cat.frecuenciaSeguimiento == "anual" && cat.tipo == "Gastos" && !esPrestamo(cat) {
            guard let last = pagosDe(cat.id).first else { continue }
            var next = sumar(.year, 1, diaDe(last))
            while next < now { next = sumar(.year, 1, next) }
            if next <= limite {
                anuales.append(FilaPorPagar(id: "anual-\(cat.id)", concepto: "\(cat.categoria) · \(cat.subcategoria)", tipo: .pagoAnual,
                                            monto: last.gasto, divisa: divisa(last.divisa), fechaEstimada: next, detalle: "Estimado según último pago"))
            }
        }

        // 3) Recurrentes por subcategoría + divisa, con periodicidad detectada.
        let desde = sumar(.day, -240, now)
        let catsPorId = Dictionary(categorias.map { ($0.id, $0) }, uniquingKeysWith: { _, ultima in ultima })
        var grupos: [(cat: Categoria, divisa: String, movs: [Transaccion])] = []
        var indice: [String: Int] = [:]
        for t in movimientos {
            guard !t.subcategoriaId.isEmpty, t.gasto > 0, diaDe(t) >= desde,
                  let cat = catsPorId[t.subcategoriaId], cat.tipo == "Gastos", esObligacionFija(cat),
                  cat.frecuenciaSeguimiento != "anual" else { continue }
            let label = "\(cat.categoria) \(cat.subcategoria)".lowercased()
            if label.contains("suscripc") || label.contains("prestamo") || label.contains("préstamo") || label.contains("hipoteca") { continue }
            let div = t.divisa.isEmpty ? monedaBase.rawValue : t.divisa
            let clave = "\(t.subcategoriaId)::\(div)"
            if let i = indice[clave] { grupos[i].movs.append(t) } else { indice[clave] = grupos.count; grupos.append((cat, div, [t])) }
        }
        var recurrentes: [FilaPorPagar] = []
        for g in grupos {
            let ord = recientesPrimero(g.movs)
            guard ord.count >= 2 else { continue }
            let gaps = zip(ord, ord.dropFirst()).map { diaDe($0).timeIntervalSince(diaDe($1)) / dia }.sorted()
            let gapMed = gaps[gaps.count / 2]
            let (periodo, etiqueta) = gapMed >= 75 ? (3, "trimestral") : gapMed >= 45 ? (2, "bimensual") : (1, "mensual")
            let last = ord[0]
            if corte.timeIntervalSince(diaDe(last)) / dia > max(45, Double(periodo) * 30 * 1.5) { continue }
            let ultimos = ord.prefix(2)
            let monto = ultimos.reduce(0.0) { $0 + $1.gasto } / Double(ultimos.count)
            var next = sumar(.month, periodo, diaDe(last))
            while next < now { next = sumar(.month, periodo, next) }
            if next > limite { continue }
            recurrentes.append(FilaPorPagar(id: "rec-\(g.cat.id)-\(g.divisa)", concepto: "\(g.cat.categoria) · \(g.cat.subcategoria)", tipo: .recurrente,
                                            monto: monto, divisa: divisa(g.divisa), fechaEstimada: next, detalle: "\(etiqueta) · prom. últimos 2"))
        }

        // 4) Tarjetas con deuda de al menos un céntimo, estimadas a 15 días.
        let tarjetas = cuentas.filter { $0.tipo == "Tarjeta de Crédito" && !$0.vendida && $0.saldoActual <= -0.005 }.map {
            FilaPorPagar(id: "card-\($0.id)", concepto: $0.nombre, tipo: .tarjeta, monto: abs($0.saldoActual), divisa: divisa($0.divisa),
                         fechaEstimada: sumar(.day, 15, now), detalle: "Saldo pendiente actual")
        }

        // 5) Préstamos con pago reciente al corte de datos.
        var prestamos: [FilaPorPagar] = []
        for cat in categorias where cat.tipo == "Gastos" && esPrestamo(cat) {
            guard let last = pagosDe(cat.id).first else { continue }
            if corte.timeIntervalSince(diaDe(last)) / dia > 45 { continue }
            var next = sumar(.month, 1, diaDe(last))
            while next < now { next = sumar(.month, 1, next) }
            if next > limite { continue }
            prestamos.append(FilaPorPagar(id: "loan-\(cat.id)", concepto: "\(cat.categoria) · \(cat.subcategoria)", tipo: .prestamo,
                                          monto: last.gasto, divisa: divisa(last.divisa), fechaEstimada: next, detalle: "Cuota estimada"))
        }

        // 6) Provisiones manuales pendientes: una vencida sigue contando y una recurrente aporta cada
        //    ocurrencia del horizonte, contada desde la primera (Calendar recorta el 31 igual que sumarMeses).
        var provs: [FilaPorPagar] = []
        for p in provisiones where p.estado == "pendiente" {
            guard let primera = Fechas.diaLocal(p.fecha, calendario: calendario) else { continue }
            let detalle = [etiquetaFrecuencia[p.frecuencia], p.notas].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
            var i = 0
            while true {
                let fecha: Date
                if i == 0 { fecha = primera }
                else if let m = mesesPorFrecuencia[p.frecuencia] { fecha = sumar(.month, m * i, primera) }
                else { break }
                if fecha > limite { break }
                provs.append(FilaPorPagar(id: "prov-\(p.id)-\(i)", concepto: p.concepto, tipo: .provision, monto: p.monto,
                                          divisa: divisa(p.divisa), fechaEstimada: fecha, detalle: detalle))
                i += 1
            }
        }

        return (subs + anuales + recurrentes + tarjetas + prestamos + provs).enumerated().sorted { a, b in
            a.element.fechaEstimada != b.element.fechaEstimada ? a.element.fechaEstimada < b.element.fechaEstimada : a.offset < b.offset
        }.map(\.element)
    }
}
