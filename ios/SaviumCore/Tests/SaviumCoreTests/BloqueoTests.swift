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

    @Test("por defecto, como la banca: bloquea siempre que se vuelve a la app")
    func alInstante() {
        var r = ReglaBloqueo(puedeAutenticar: true)
        #expect(r.bloqueado)
        r.desbloqueado()
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(1))
        #expect(r.bloqueado)
    }

    @Test("volver sin haber pasado a segundo plano (Face ID, centro de control) no bloquea")
    func sinSegundoPlano() {
        var r = ReglaBloqueo(puedeAutenticar: true)
        r.desbloqueado()
        r.alVolver(t0)
        #expect(!r.bloqueado)
    }

    @Test("con plazo de 5 minutos bloquea al volver tras más de 5 minutos, no antes")
    func cincoMinutos() {
        var r = ReglaBloqueo(puedeAutenticar: true, plazo: .cincoMinutos)
        #expect(r.bloqueado)
        r.desbloqueado()
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(299))
        #expect(!r.bloqueado)
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(301))
        #expect(r.bloqueado)
    }
}

@Suite("Plazo de bloqueo")
struct PlazoBloqueoTests {
    @Test("segundos y valor guardado")
    func plazos() {
        #expect(PlazoBloqueo.alInstante.segundos == 0)
        #expect(PlazoBloqueo.unMinuto.segundos == 60)
        #expect(PlazoBloqueo.cincoMinutos.segundos == 300)
        #expect(PlazoBloqueo(rawValue: "cincoMinutos") == .cincoMinutos)
    }
}
