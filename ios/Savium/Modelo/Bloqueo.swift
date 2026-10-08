import Foundation
import LocalAuthentication
import Observation
import SaviumCore

@Observable @MainActor
final class Bloqueo {
    private var regla: ReglaBloqueo
    var bloqueado: Bool { regla.bloqueado }

    init() {
        #if targetEnvironment(simulator)
        // El simulador pide un código de dispositivo que no existe: ahí no se bloquea (la regla tiene sus tests).
        regla = ReglaBloqueo(puedeAutenticar: false)
        #else
        var error: NSError?
        regla = ReglaBloqueo(puedeAutenticar: LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error))
        #endif
    }

    func desbloquear() async {
        guard regla.bloqueado else { return }
        let ok = (try? await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Desbloquear Savium")) ?? false
        if ok { regla.desbloqueado() }
    }

    /// Acaba de entrar con su contraseña: no se le vuelve a pedir Face ID.
    func recienAutenticado() { regla.desbloqueado() }

    func enSegundoPlano(_ ahora: Date = .now) { regla.enSegundoPlano(ahora) }
    func alVolver(_ ahora: Date = .now) { regla.alVolver(ahora) }
}
