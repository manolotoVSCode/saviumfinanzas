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
        CodigoGuardado.guardar(nil)
    }

    private static func guardar(_ u: UsuarioRecordado) {
        UserDefaults.standard.set(try? JSONEncoder().encode(u), forKey: clave)
    }
}

/// Contraseña en el Llavero, solo legible tras Face ID (se invalida si cambian las caras registradas)
/// y solo en este iPhone, que además debe tener código.
enum ClaveConFaceID {
    private static let servicio = "com.manoloto.savium.clave"
    /// Correo cuya contraseña está guardada. Consultar el Llavero sin pedir Face ID no es fiable
    /// con elementos protegidos por biometría, así que se lleva aparte (no es secreto).
    private static let marca = "savium.claveGuardadaPara"

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
        if SecItemAdd(consulta as CFDictionary, nil) == errSecSuccess {
            UserDefaults.standard.set(email.lowercased(), forKey: marca)
        }
    }

    static func hayGuardada(email: String) -> Bool {
        UserDefaults.standard.string(forKey: marca) == email.lowercased()
    }

    /// Pide Face ID y devuelve la contraseña, o nil si se cancela o falla.
    static func leer(email: String) async -> String? {
        let cuenta = email.lowercased()
        let lectura = await Task.detached {
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
            let estado = SecItemCopyMatching(consulta as CFDictionary, &resultado)
            if estado == errSecItemNotFound { return Lectura.noHay }
            guard estado == errSecSuccess, let datos = resultado as? Data,
                  let clave = String(data: datos, encoding: .utf8) else { return Lectura.cancelada }
            return Lectura.clave(clave)
        }.value
        switch lectura {
        case .clave(let clave): return clave
        case .noHay: borrar(); return nil   // p. ej. cambiaron las caras registradas
        case .cancelada: return nil
        }
    }

    private enum Lectura: Sendable { case clave(String), noHay, cancelada }

    static func borrar() {
        let consulta: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicio]
        SecItemDelete(consulta as CFDictionary)
        UserDefaults.standard.removeObject(forKey: marca)
    }
}

/// Hash del código de coacción, guardado en el Llavero de este iPhone (sin Face ID: se comprueba en la pantalla
/// de acceso, antes de entrar). Se descarga en cada carga normal; así funciona aunque no haya conexión.
enum CodigoGuardado {
    private static let servicio = "com.manoloto.savium.ce"

    static func leer() -> String? {
        let consulta: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicio,
                                       kSecReturnData as String: true]
        var resultado: CFTypeRef?
        guard SecItemCopyMatching(consulta as CFDictionary, &resultado) == errSecSuccess, let d = resultado as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    static func guardar(_ hash: String?) {
        let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: servicio]
        SecItemDelete(base as CFDictionary)
        guard let hash else { return }
        var alta = base
        alta[kSecValueData as String] = Data(hash.utf8)
        alta[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(alta as CFDictionary, nil)
    }
}
