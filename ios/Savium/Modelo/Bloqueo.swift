import Foundation
import LocalAuthentication
import Observation
import SaviumCore

/// Pantalla de acceso al abrir y al volver tras el plazo elegido. Se entra con Face ID (botón, nunca
/// automático), con la contraseña o con el código de coacción. Como siempre queda la contraseña, también
/// bloquea en un iPhone sin Face ID ni código (y en el simulador).
@Observable @MainActor
final class Bloqueo {
    private static let claveActivo = "savium.faceid"
    private static let clavePlazo = "savium.faceid.plazo"
    private var regla: ReglaBloqueo
    var bloqueado: Bool { regla.bloqueado }
    /// El iPhone tiene Face ID o código configurado: se ofrece el botón de Face ID.
    let disponible: Bool
    /// Preferencia de Ajustes; por defecto activado.
    private(set) var activo: Bool
    private(set) var plazo: PlazoBloqueo

    init() {
        #if targetEnvironment(simulator)
        let puede = false   // el simulador no tiene código de dispositivo: ahí solo contraseña o código
        #else
        var error: NSError?
        let puede = LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        #endif
        let preferido = UserDefaults.standard.object(forKey: Self.claveActivo) as? Bool ?? true
        let plazoGuardado = PlazoBloqueo(rawValue: UserDefaults.standard.string(forKey: Self.clavePlazo) ?? "") ?? .alInstante
        disponible = puede
        activo = preferido
        plazo = plazoGuardado
        regla = ReglaBloqueo(puedeAutenticar: preferido, plazo: plazoGuardado)
    }

    /// Desde Ajustes. Al activarlo no se bloquea en ese momento, sino al próximo arranque o regreso.
    func cambiarActivo(_ valor: Bool) {
        activo = valor
        UserDefaults.standard.set(valor, forKey: Self.claveActivo)
        regla = ReglaBloqueo(puedeAutenticar: valor, plazo: plazo)
        regla.desbloqueado()
        if !valor { ClaveConFaceID.borrar() }
    }

    func cambiarPlazo(_ valor: PlazoBloqueo) {
        plazo = valor
        UserDefaults.standard.set(valor.rawValue, forKey: Self.clavePlazo)
        regla = ReglaBloqueo(puedeAutenticar: activo, plazo: valor)
        regla.desbloqueado()
    }

    /// Botón de Face ID de la pantalla de acceso. true si entró.
    func desbloquearConFaceID() async -> Bool {
        guard regla.bloqueado else { return true }
        guard disponible else { return false }
        let ok = (try? await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Entrar en Savium")) ?? false
        if ok { regla.desbloqueado() }
        return ok
    }

    /// Entró con su contraseña o con el código, o acaba de iniciar sesión.
    func recienAutenticado() { regla.desbloqueado() }

    func enSegundoPlano(_ ahora: Date = .now) { regla.enSegundoPlano(ahora) }
    func alVolver(_ ahora: Date = .now) { regla.alVolver(ahora) }
}
