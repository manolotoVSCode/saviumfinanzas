import Foundation

/// Mismas convenciones que src/lib/finance/fechas.ts (ver shared/fixtures/README.md):
/// toda fecha 'YYYY-MM-DD' es un día local.
public enum Fechas {
    private static func partes(_ iso: String) -> (Int, Int, Int)? {
        let p = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
        return p.count == 3 ? (p[0], p[1], p[2]) : nil
    }

    /// parseFechaLocal: 'YYYY-MM-DD' → medianoche local.
    public static func diaLocal(_ iso: String, calendario: Calendar) -> Date? {
        guard let (y, m, d) = partes(iso) else { return nil }
        return calendario.date(from: DateComponents(year: y, month: m, day: d))
    }

    /// 'YYYY-MM-DDTHH:mm:ss' sin zona → hora local (new Date(s) en la web).
    public static func horaLocal(_ s: String, calendario: Calendar) -> Date? {
        let f = DateFormatter()
        f.calendar = calendario
        f.timeZone = calendario.timeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return f.date(from: s)
    }

    /// toFechaISO: el día local.
    public static func isoLocal(_ d: Date, calendario: Calendar) -> String {
        let k = calendario.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", k.year!, k.month!, k.day!)
    }

    /// Último instante del mes anterior: corte de datos (los movimientos del mes en curso aún no se importan).
    public static func finMesAnterior(_ now: Date, calendario: Calendar) -> Date {
        let inicioMes = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        return inicioMes.addingTimeInterval(-0.001)
    }

    /// Días naturales desde hoy (00:00 local) hasta la fecha; negativo si ya pasó.
    public static func diasHasta(_ iso: String, now: Date, calendario: Calendar) -> Int {
        guard let d = diaLocal(iso, calendario: calendario) else { return 0 }
        return Int((d.timeIntervalSince(calendario.startOfDay(for: now)) / 86_400).rounded())
    }
}
