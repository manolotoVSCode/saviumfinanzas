import Testing
@testable import SaviumCore

@Suite("Formato")
struct FormatoTests {
    @Test("importe con separador de miles y código de divisa")
    func importe() {
        #expect(Formato.importe(1234.5, "MXN") == "1,234.50 MXN")
        #expect(Formato.importe(-0.004, "USD") == "-0.00 USD")
    }

    @Test("Review Focus 3: parsear lo que escribe el usuario")
    func parsear() {
        #expect(Formato.parsearImporte("12.5") == 12.5)
        #expect(Formato.parsearImporte("12,5") == 12.5)
        #expect(Formato.parsearImporte("1,234.50") == 1234.5)
        #expect(Formato.parsearImporte("1.234,50") == 1234.5)
        #expect(Formato.parsearImporte(" 45 ") == 45)
        #expect(Formato.parsearImporte("") == nil)
        #expect(Formato.parsearImporte("abc") == nil)
        #expect(Formato.parsearImporte("-5") == nil)
    }
}
