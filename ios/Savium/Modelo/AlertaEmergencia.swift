import CoreLocation
import Foundation
import Supabase

/// Alerta silenciosa del titular (triple toque en «Patrimonio neto»): toma la ubicación y la manda a la Edge
/// Function «alerta», que avisa a los lectores. No muestra nada, no vibra y no deja historial visible.
/// Si no hay conexión, queda guardada y se reintenta al volver a la app (mismo id: el servidor no avisa dos veces).
@MainActor
final class AlertaEmergencia {
    static let compartida = AlertaEmergencia()
    private let gestor = CLLocationManager()
    private static let clavePendiente = "savium.ae"
    private var enviando = false

    struct Envio: Codable, Sendable {
        let id: String
        let latitud: Double?
        let longitud: Double?
        let precision: Double?
        let momento: String
    }

    /// Titular con lectores: pide el permiso de ubicación una sola vez (después iOS lo recuerda).
    func prepararPermiso() {
        if gestor.authorizationStatus == .notDetermined { gestor.requestWhenInUseAuthorization() }
    }

    func disparar() {
        Task {
            let ubicacion = await ubicacionActual()
            let envio = Envio(id: UUID().uuidString.lowercased(),
                              latitud: ubicacion?.coordinate.latitude, longitud: ubicacion?.coordinate.longitude,
                              precision: ubicacion?.horizontalAccuracy,
                              momento: ISO8601DateFormatter().string(from: .now))
            UserDefaults.standard.set(try? JSONEncoder().encode(envio), forKey: Self.clavePendiente)
            await enviarPendiente()
        }
    }

    /// También al volver a la app: si quedó una alerta sin enviar, se manda ahora.
    func enviarPendiente() async {
        guard !enviando, let datos = UserDefaults.standard.data(forKey: Self.clavePendiente),
              let envio = try? JSONDecoder().decode(Envio.self, from: datos) else { return }
        enviando = true
        defer { enviando = false }
        do {
            try await supabase.functions.invoke("alerta", options: FunctionInvokeOptions(body: envio))
            UserDefaults.standard.removeObject(forKey: Self.clavePendiente)
        } catch {
            // Se queda guardada para el siguiente intento.
        }
    }

    /// Como mucho 5 s: sin permiso o sin señal, la alerta sale sin ubicación.
    private func ubicacionActual() async -> CLLocation? {
        let estado = gestor.authorizationStatus
        guard estado == .authorizedWhenInUse || estado == .authorizedAlways else { return nil }
        let reciente = gestor.location
        return await withTaskGroup(of: CLLocation?.self) { grupo in
            grupo.addTask {
                do {
                    for try await actualizacion in CLLocationUpdate.liveUpdates() {
                        if let l = actualizacion.location, l.horizontalAccuracy >= 0, l.horizontalAccuracy < 100 { return l }
                    }
                } catch {}
                return nil
            }
            grupo.addTask { try? await Task.sleep(for: .seconds(5)); return nil }
            let primera = await grupo.next() ?? nil
            grupo.cancelAll()
            return primera ?? reciente
        }
    }
}
