import Foundation

/// Cuánto puede estar la app en segundo plano sin volver a pedir Face ID.
public enum PlazoBloqueo: String, CaseIterable, Sendable, Identifiable {
    case alInstante, unMinuto, cincoMinutos
    public var id: Self { self }
    public var segundos: TimeInterval {
        switch self { case .alInstante: 0; case .unMinuto: 60; case .cincoMinutos: 300 }
    }
    public var titulo: String {
        switch self { case .alInstante: "Al instante"; case .unMinuto: "1 minuto"; case .cincoMinutos: "5 minutos" }
    }
}

/// Cuándo pedir Face ID: al abrir y al volver de segundo plano tras el plazo elegido (por defecto, siempre).
/// Si el iPhone no tiene Face ID ni código, nunca bloquea (se quedaría bloqueado para siempre).
public struct ReglaBloqueo: Sendable {
    public let puedeAutenticar: Bool
    public let plazo: PlazoBloqueo
    public private(set) var bloqueado: Bool
    private var salida: Date?

    public init(puedeAutenticar: Bool, plazo: PlazoBloqueo = .alInstante) {
        self.puedeAutenticar = puedeAutenticar; self.plazo = plazo; bloqueado = puedeAutenticar
    }
    public mutating func desbloqueado() { bloqueado = false }
    public mutating func enSegundoPlano(_ ahora: Date) { salida = ahora }
    public mutating func alVolver(_ ahora: Date) {
        if puedeAutenticar, let salida, ahora.timeIntervalSince(salida) > plazo.segundos { bloqueado = true }
        salida = nil
    }
}
