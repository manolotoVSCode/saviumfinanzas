import Foundation
import Observation
import Supabase

@Observable @MainActor
final class Sesion {
    enum Estado: Equatable { case cargando, fuera, dentro(userId: String) }
    private(set) var estado: Estado = .cargando
    var mensaje: String?
    private(set) var email: String?
    /// Cerró sesión él mismo: el login no lanza Face ID solo (si no, no podría salir). Hasta el próximo arranque.
    private(set) var salidaVoluntaria = false
    private var cierreVoluntario = false

    init() { Task { await escuchar() } }

    var userId: String? { if case let .dentro(id) = estado { id } else { nil } }

    private func escuchar() async {
        for await (evento, sesion) in supabase.auth.authStateChanges {
            switch evento {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                estado = sesion.map { .dentro(userId: $0.user.id.uuidString.lowercased()) } ?? .fuera
                email = sesion?.user.email
                if let email { UsuarioRecordado.recordar(email: email) }
            case .signedOut:
                // Review Focus 4: si no lo pidió el usuario, la sesión caducó.
                if case .dentro = estado, !cierreVoluntario { mensaje = "Tu sesión ha caducado. Vuelve a iniciar sesión." }
                cierreVoluntario = false
                estado = .fuera
            default:
                break
            }
        }
    }

    @discardableResult
    func entrar(email: String, clave: String) async -> Bool {
        mensaje = nil
        do {
            try await supabase.auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: clave)
            return true
        } catch {
            mensaje = "No se pudo iniciar sesión. Revisa el correo y la contraseña."
            return false
        }
    }

    func cerrar() async {
        cierreVoluntario = true
        salidaVoluntaria = true
        await Notificaciones.compartidas.olvidarDispositivo()
        // Solo este iPhone: el alcance por defecto (global) cerraría también la web y los demás dispositivos.
        try? await supabase.auth.signOut(scope: .local)
    }
}
