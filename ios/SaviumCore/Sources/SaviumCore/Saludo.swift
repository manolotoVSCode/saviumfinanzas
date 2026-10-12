import Foundation

/// Saludo del login para el último usuario de este iPhone: «Buenas noches, Manuel».
public enum Saludo {
    public static func texto(nombre: String?, hora: Int) -> String {
        let saludo = switch hora {
        case 5..<12: "Buenos días"
        case 12..<20: "Buenas tardes"
        default: "Buenas noches"
        }
        guard let primero = nombre?.split(separator: " ").first else { return saludo }
        return "\(saludo), \(primero.lowercased().capitalized(with: Locale(identifier: "es_MX")))"
    }

    /// Las tres primeras letras del correo y el resto tapado.
    public static func correoOculto(_ email: String) -> String {
        String(email.prefix(while: { $0 != "@" }).prefix(3)) + String(repeating: "*", count: 6)
    }
}
