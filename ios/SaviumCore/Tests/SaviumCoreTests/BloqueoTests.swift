import Foundation
import Testing
@testable import SaviumCore

@Suite("Regla de bloqueo")
struct BloqueoTests {
    let t0 = Date(timeIntervalSince1970: 1_000_000)

    @Test("sin Face ID ni código no se bloquea nunca")
    func sinProteccion() {
        var r = ReglaBloqueo(puedeAutenticar: false)
        #expect(!r.bloqueado)
        r.enSegundoPlano(t0)
        r.alVolver(t0.addingTimeInterval(3600))
        #expect(!r.bloqueado)
    }

    @Test("bloquea al abrir y al volver tras más de 5 minutos, no antes")
    func cincoMinutos() {
        var r = ReglaBloqueo(puedeAutenticar: true)
        #expect(r.bloqueado)
        r.desbloqueado()
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(299))
        #expect(!r.bloqueado)
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(301))
        #expect(r.bloqueado)
    }
}
