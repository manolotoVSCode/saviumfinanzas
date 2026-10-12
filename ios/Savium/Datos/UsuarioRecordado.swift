import Foundation
import LocalAuthentication
import Security

/// Último usuario que entró en este iPhone: el login le saluda por su nombre y no le pide el correo.
/// Sobrevive a «Cerrar sesión»; solo «¿No eres tú?» lo olvida.
struct UsuarioRecordado: Codable, Equatable {
    var email: String
    var nombre: String?

    private static let clave = "savium.ultimoUsuario"

    static func cargar() -> UsuarioRecordado? {
        UserDefaults.standard.data(forKey: clave).flatMap { try? JSONDecoder().decode(Self.self, from: $0) }
    }

    /// Al entrar: si es otra persona, empieza sin nombre y sin contraseña guardada.
    static func recordar(email: String) {
        let anterior = cargar()
        if let anterior, anterior.email.caseInsensitiveCompare(email) == .orderedSame { return }
        ClaveConFaceID.borrar()
        guardar(UsuarioRecordado(email: email, nombre: nil))
    }

    /// El nombre llega del perfil al cargar los datos.
    static func ponerNombre(_ nombre: String?) {
        guard var actual = cargar(), let nombre, !nombre.isEmpty, actual.nombre != nombre else { return }
        actual.nombre = nombre
        guardar(actual)
    }

    static func olvidar() {
        UserDefaults.standard.removeObject(forKey: clave)
        ClaveConFaceID.borrar()
    }

    private static func guardar(_ u: UsuarioRecordado) {
        UserDefaults.standard.set(try? JSONEncoder().encode(u), forKey: clave)
    }
}

/// Contraseña en el Llavero, solo legible tras Face ID (se invalida si cambian las caras registradas)
/// y solo en este iPhone, que además debe tener código.
enum ClaveConFaceID {
    private static let servicio = "com.manoloto.savium.clave"

    static var disponible: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
    }

    static func guardar(_ clave: String, email: String) {
        borrar()
        guard let control = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .biometryCurrentSet, nil)
        else { return }
        let consulta: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servicio,
            kSecAttrAccount as String: email.lowercased(),
            kSecAttrAccessControl as String: control,
            kSecValueData as String: Data(clave.utf8),
        ]
        SecItemAdd(consulta as CFDictionary, nil)
    }

    /// Sin pedir Face ID: solo mira si existe.
    static func hayGuardada(email: String) -> Bool {
        let contexto = LAContext()
        contexto.interactionNotAllowed = true
        let consulta: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: servicio,
            kSecAttrAccount as String: email.lowercased(),
            kSecUseAuthenticationContext as String: contexto,
        ]
        let estado = SecItemCopyMatching(consulta as CFDictionary, nil)
        return estado == errSecSuccess || estado == errSecInteractionNotAllowed
    }

    /// Pide Face ID y devuelve la contraseña, o nil si se cancela o falla.
    static func leer(email: String) async -> String? {
        let cuenta = email.lowercased()
        return await Task.detached {
            let contexto = LAContext()
            contexto.localizedReason = "Entrar en Savium"
            let consulta: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: servicio,
                kSecAttrAccount as String: cuenta,
                kSecUseAuthenticationContext as String: contexto,
                kSecReturnData as String: true,
            ]
            var resultado: CFTypeRef?
            guard SecItemCopyMatching(consulta as CFDictionary, &resultado) == errSecSuccess,
                  let datos = resultado as? Data else { return nil }
            return String(data: datos, encoding: .utf8)
        }.value
    }

    static func borrar() {
        let consulta: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicio]
        SecItemDelete(consulta as CFDictionary)
    }
}
