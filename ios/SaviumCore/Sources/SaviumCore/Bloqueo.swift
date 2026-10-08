import Foundation

/// Cuándo pedir Face ID: al abrir y al volver tras más de 5 minutos en segundo plano.
/// Si el iPhone no tiene Face ID ni código, nunca bloquea (se quedaría bloqueado para siempre).
public struct ReglaBloqueo: Sendable {
    public static let margen: TimeInterval = 300
    public let puedeAutenticar: Bool
    public private(set) var bloqueado: Bool
    private var salida: Date?

    public init(puedeAutenticar: Bool) { self.puedeAutenticar = puedeAutenticar; bloqueado = puedeAutenticar }
    public mutating func desbloqueado() { bloqueado = false }
    public mutating func enSegundoPlano(_ ahora: Date) { salida = ahora }
    public mutating func alVolver(_ ahora: Date) {
        if puedeAutenticar, let salida, ahora.timeIntervalSince(salida) > Self.margen { bloqueado = true }
        salida = nil
    }
}
