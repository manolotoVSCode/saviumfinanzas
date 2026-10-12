import Foundation

/// Saludo del login para el último usuario de este iPhone: «Buenas noches, Manuel» (el campo nombre del perfil, entero).
public enum Saludo {
    public static func texto(nombre: String?, hora: Int) -> String {
        let saludo = switch hora {
        case 5..<12: "Buenos días"
        case 12..<20: "Buenas tardes"
        default: "Buenas noches"
        }
        let palabras = (nombre ?? "").split(separator: " ")
        guard !palabras.isEmpty else { return saludo }
        let completo = palabras.joined(separator: " ").lowercased().capitalized(with: Locale(identifier: "es_MX"))
        return "\(saludo), \(completo)"
    }

    /// Las tres primeras letras del correo y el resto tapado.
    public static func correoOculto(_ email: String) -> String {
        String(email.prefix(while: { $0 != "@" }).prefix(3)) + String(repeating: "*", count: 6)
    }
}
