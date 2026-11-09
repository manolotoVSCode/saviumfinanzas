import Foundation

/// Fila de checklist_items. Port de src/lib/finance/checklist.ts. Las tareas se crean en la web;
/// la app solo las enseña y las marca como hechas.
public struct TareaChecklist: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let texto: String
    /// 'YYYY-MM-DD' o nil.
    public let fecha: String?
    public let transaccionId: String?
    /// "mensual": al marcarla sigue abierta y su fecha pasa al mes siguiente.
    public let repetir: String?
    public let completada: Bool
    enum CodingKeys: String, CodingKey {
        case id, texto, fecha, repetir, completada
        case transaccionId = "transaccion_id"
    }
    public init(id: String, texto: String, fecha: String? = nil, transaccionId: String? = nil, repetir: String? = nil, completada: Bool = false) {
        self.id = id; self.texto = texto; self.fecha = fecha; self.transaccionId = transaccionId
        self.repetir = repetir; self.completada = completada
    }
    public var esMensual: Bool { repetir == "mensual" }
}

/// Lo que se manda al marcar (update de checklist_items).
public struct CambioChecklist: Encodable, Sendable, Equatable {
    public let completada: Bool
    public let completadaAt: Date?
    /// Solo en las mensuales: la fecha del mes siguiente.
    public let fecha: String?
    enum CodingKeys: String, CodingKey { case completada, completadaAt = "completada_at", fecha }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(completada, forKey: .completada)
        try c.encode(completadaAt, forKey: .completadaAt)   // null al desmarcar
        try c.encodeIfPresent(fecha, forKey: .fecha)
    }
}

public enum Checklist {
    /// Misma fecha del mes siguiente; si el día no existe, el último del mes, y una fecha en el último
    /// día de su mes pasa al último del siguiente (31 ene → 28 feb → 31 mar). Como siguienteFechaMensual.
    public static func siguienteFechaMensual(_ iso: String, calendario cal: Calendar) -> String {
        guard let d = Fechas.diaLocal(iso, calendario: cal) else { return iso }
        let k = cal.dateComponents([.year, .month, .day], from: d)
        let diasMes = cal.range(of: .day, in: .month, for: d)!.count
        let primeroSiguiente = cal.date(byAdding: .month, value: 1, to: cal.date(from: DateComponents(year: k.year, month: k.month, day: 1))!)!
        let diasSiguiente = cal.range(of: .day, in: .month, for: primeroSiguiente)!.count
        let dia = k.day! == diasMes ? diasSiguiente : min(k.day!, diasSiguiente)
        return Fechas.isoLocal(cal.date(byAdding: .day, value: dia - 1, to: primeroSiguiente)!, calendario: cal)
    }

    /// Una mensual no se completa: sigue abierta y avanza un mes. Como cambiosAlMarcar.
    public static func cambiosAlMarcar(_ t: TareaChecklist, completada: Bool, ahora: Date, calendario: Calendar) -> CambioChecklist {
        if completada, t.esMensual, let f = t.fecha {
            return CambioChecklist(completada: false, completadaAt: ahora, fecha: siguienteFechaMensual(f, calendario: calendario))
        }
        return CambioChecklist(completada: completada, completadaAt: completada ? ahora : nil, fecha: nil)
    }

    /// La tarea tras aplicar el cambio (para la actualización optimista).
    public static func aplicar(_ c: CambioChecklist, a t: TareaChecklist) -> TareaChecklist {
        TareaChecklist(id: t.id, texto: t.texto, fecha: c.fecha ?? t.fecha, transaccionId: t.transaccionId, repetir: t.repetir, completada: c.completada)
    }

    /// Vencida: sin completar y su fecha ya pasó (el día de la fecha aún no cuenta).
    public static func estaVencida(_ t: TareaChecklist, now: Date, calendario: Calendar) -> Bool {
        guard !t.completada, let f = t.fecha else { return false }
        return Fechas.diasHasta(f, now: now, calendario: calendario) < 0
    }

    /// Lo que va en «Atención» de Inicio: abiertas con fecha de hoy o anterior, la más antigua primero.
    public static func paraHoy(_ tareas: [TareaChecklist], now: Date, calendario: Calendar) -> [TareaChecklist] {
        tareas.filter { t in
            guard !t.completada, let f = t.fecha else { return false }
            return Fechas.diasHasta(f, now: now, calendario: calendario) <= 0
        }
        .sorted { ($0.fecha ?? "", $0.id) < ($1.fecha ?? "", $1.id) }
    }
}
