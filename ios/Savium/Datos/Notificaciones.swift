import Foundation
import Observation
import Supabase
import UIKit
import UserNotifications

/// Notificaciones de alerta: solo las recibe el lector (la familia). Al titular nunca se le pide el permiso.
@Observable @MainActor
final class Notificaciones: NSObject, UNUserNotificationCenterDelegate {
    static let compartidas = Notificaciones()
    @ObservationIgnored private var tokenActual: String?
    /// Id de la alerta que acaba de llegar o que se tocó: la app del lector abre su pantalla.
    var alertaRecibida: String?

    /// Al arrancar: para mostrar la alerta aunque la app esté abierta y abrir el mapa al tocarla.
    func configurar() { UNUserNotificationCenter.current().delegate = self }

    /// Lector: pide permiso (una vez; iOS lo recuerda) y registra el iPhone para recibir alertas.
    func activarParaLector() async {
        let ok = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        if ok { UIApplication.shared.registerForRemoteNotifications() }
    }

    func guardar(token datos: Data) {
        let token = datos.map { String(format: "%02x", $0) }.joined()
        tokenActual = token
        Task {
            guard let yo = supabase.auth.currentUser?.id else { return }
            struct Fila: Encodable { let token: String; let user_id: UUID; let entorno: String; let actualizado: Date }
            #if DEBUG
            let entorno = "desarrollo"
            #else
            let entorno = "produccion"
            #endif
            _ = try? await supabase.from("dispositivos")
                .upsert(Fila(token: token, user_id: yo, entorno: entorno, actualizado: .now), onConflict: "token").execute()
        }
    }

    /// Al cerrar sesión: este iPhone deja de recibir alertas de esa cuenta.
    func olvidarDispositivo() async {
        guard let tokenActual else { return }
        _ = try? await supabase.from("dispositivos").delete().eq("token", value: tokenActual).execute()
    }

    /// Con la app abierta: suena igual y se abre la pantalla de alerta.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification)
        async -> UNNotificationPresentationOptions {
        let id = notification.request.content.userInfo["alerta"] as? String
        await MainActor.run { if let id { alertaRecibida = id } }
        return [.banner, .list, .sound]
    }

    /// Al tocar la notificación: la pantalla de alerta (mapa, llamar).
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let id = response.notification.request.content.userInfo["alerta"] as? String
        await MainActor.run { if let id { alertaRecibida = id } }
    }
}

final class Delegado: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        MainActor.assumeIsolated { Notificaciones.compartidas.configurar() }
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        MainActor.assumeIsolated { Notificaciones.compartidas.guardar(token: deviceToken) }
    }
}
