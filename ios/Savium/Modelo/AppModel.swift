import Foundation
import Observation
import SaviumCore
import SwiftUI

enum Pestana: Hashable { case resumen, movimientos, patrimonio, pendientes, suscripciones }

enum Apariencia: String, CaseIterable, Identifiable {
    case sistema, claro, oscuro
    var id: Self { self }
    var titulo: String {
        switch self { case .sistema: "Automática"; case .claro: "Clara"; case .oscuro: "Oscura" }
    }
    var esquema: ColorScheme? {
        switch self { case .sistema: nil; case .claro: .light; case .oscuro: .dark }
    }
}

@Observable @MainActor
final class AppModel {
    var pestana: Pestana = .resumen
    var divisa: Divisa {
        didSet { UserDefaults.standard.set(divisa.rawValue, forKey: "savium.divisa") }
    }
    var apariencia: Apariencia {
        didSet { UserDefaults.standard.set(apariencia.rawValue, forKey: "savium.apariencia") }
    }
    private(set) var tasas: Tasas = Conversion.tasasRespaldo
    private(set) var tasasAproximadas = false
    /// true si el usuario nunca eligió divisa: se toma la del perfil al cargar.
    private(set) var divisaPorDefecto: Bool

    init() {
        let guardada = UserDefaults.standard.string(forKey: "savium.divisa")
        divisa = Divisa(codigo: guardada, fallback: .MXN)
        divisaPorDefecto = guardada == nil
        apariencia = Apariencia(rawValue: UserDefaults.standard.string(forKey: "savium.apariencia") ?? "") ?? .sistema
    }

    func usarDivisaDelPerfil(_ codigo: String?) {
        guard divisaPorDefecto, let codigo, let d = Divisa(rawValue: codigo) else { return }
        divisa = d
        UserDefaults.standard.removeObject(forKey: "savium.divisa")   // sigue siendo «por defecto»
    }

    func cargarTasas() async {
        do {
            let (data, resp) = try await URLSession.shared.data(from: URL(string: "https://api.exchangerate-api.com/v4/latest/MXN")!)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            tasas = try Conversion.tasas(desdeRespuesta: data)
            tasasAproximadas = false
        } catch {
            tasas = Conversion.tasasRespaldo
            tasasAproximadas = true
        }
    }

    func convertir(_ importe: Double, de codigo: String) -> Double {
        Conversion.convertir(importe, de: Divisa(codigo: codigo, fallback: divisa), a: divisa, tasas: tasas)
    }
}
