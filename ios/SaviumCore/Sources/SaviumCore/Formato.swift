import Foundation

public enum Formato {
    nonisolated(unsafe) private static let formateador: NumberFormatter = {
        let f = NumberFormatter()
        f.locale = Locale(identifier: "en_US")
        f.numberStyle = .decimal
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    /// Igual que formatNumber de la web (Intl en-US, 2 decimales).
    public static func numero(_ v: Double) -> String { formateador.string(from: NSNumber(value: v)) ?? String(format: "%.2f", v) }

    /// "1,234.56 MXN": siempre con el código de divisa, como la versión móvil web.
    public static func importe(_ v: Double, _ divisa: String) -> String { "\(numero(v)) \(divisa)" }

    /// Importe escrito por el usuario: acepta coma o punto decimal y miles con el otro separador.
    /// Devuelve nil si está vacío, no es un número o es negativo.
    public static func parsearImporte(_ texto: String) -> Double? {
        var s = texto.trimmingCharacters(in: .whitespaces)
        guard !s.isEmpty else { return nil }
        let ultimaComa = s.lastIndex(of: ","), ultimoPunto = s.lastIndex(of: ".")
        switch (ultimaComa, ultimoPunto) {
        case let (c?, p?) where c > p:           // 1.234,50
            s = s.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
        case (.some, .some):                     // 1,234.50
            s = s.replacingOccurrences(of: ",", with: "")
        case (.some, nil):                       // 12,5
            s = s.replacingOccurrences(of: ",", with: ".")
        default: break
        }
        guard let v = Double(s), v.isFinite, v >= 0 else { return nil }
        return v
    }
}
