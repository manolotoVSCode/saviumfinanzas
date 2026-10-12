import Foundation
import LocalAuthentication
import Observation
import SaviumCore

@Observable @MainActor
final class Bloqueo {
    private static let claveActivo = "savium.faceid"
    private var regla: ReglaBloqueo
    var bloqueado: Bool { regla.bloqueado }
    /// El iPhone tiene Face ID o código configurado.
    let disponible: Bool
    /// Preferencia de Ajustes; por defecto activado.
    private(set) var activo: Bool

    init() {
        #if targetEnvironment(simulator)
        // El simulador pide un código de dispositivo que no existe: ahí no se bloquea (la regla tiene sus tests).
        let puede = false
        #else
        var error: NSError?
        let puede = LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        #endif
        let preferido = UserDefaults.standard.object(forKey: Self.claveActivo) as? Bool ?? true
        disponible = puede
        activo = preferido
        regla = ReglaBloqueo(puedeAutenticar: puede && preferido)
    }

    /// Desde Ajustes. Al activarlo no se bloquea en ese momento, sino al próximo arranque o regreso.
    func cambiarActivo(_ valor: Bool) {
        activo = valor
        UserDefaults.standard.set(valor, forKey: Self.claveActivo)
        regla = ReglaBloqueo(puedeAutenticar: disponible && valor)
        regla.desbloqueado()
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
