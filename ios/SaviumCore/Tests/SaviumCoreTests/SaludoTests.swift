import Testing
@testable import SaviumCore

@Suite("Saludo del login")
struct SaludoTests {
    @Test("según la hora", arguments: [
        (5, "Buenos días"), (11, "Buenos días"), (12, "Buenas tardes"), (19, "Buenas tardes"),
        (20, "Buenas noches"), (23, "Buenas noches"), (0, "Buenas noches"), (4, "Buenas noches"),
    ])
    func hora(_ hora: Int, _ esperado: String) {
        #expect(Saludo.texto(nombre: nil, hora: hora) == esperado)
    }

    @Test("solo el primer nombre, sin mayúsculas sostenidas")
    func nombre() {
        #expect(Saludo.texto(nombre: "MANUEL", hora: 22) == "Buenas noches, Manuel")
        #expect(Saludo.texto(nombre: "  manuel jesús ", hora: 9) == "Buenos días, Manuel")
        #expect(Saludo.texto(nombre: "", hora: 13) == "Buenas tardes")
    }

    @Test("correo oculto como en la banca")
    func correo() {
        #expect(Saludo.correoOculto("manoloto@gmail.com") == "man******")
        #expect(Saludo.correoOculto("ab@x.com") == "ab******")
    }
}
