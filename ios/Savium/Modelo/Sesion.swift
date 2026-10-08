import Foundation
import Observation
import Supabase

@Observable @MainActor
final class Sesion {
    enum Estado: Equatable { case cargando, fuera, dentro(userId: String) }
    private(set) var estado: Estado = .cargando
    var mensaje: String?
    private var cierreVoluntario = false

    init() { Task { await escuchar() } }

    var userId: String? { if case let .dentro(id) = estado { id } else { nil } }

    private func escuchar() async {
        for await (evento, sesion) in supabase.auth.authStateChanges {
            switch evento {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                estado = sesion.map { .dentro(userId: $0.user.id.uuidString.lowercased()) } ?? .fuera
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

    func entrar(email: String, clave: String) async {
        mensaje = nil
        do { try await supabase.auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: clave) }
        catch { mensaje = "No se pudo iniciar sesión. Revisa el correo y la contraseña." }
    }

    func cerrar() async {
        cierreVoluntario = true
        try? await supabase.auth.signOut()
    }
}
