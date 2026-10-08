import SwiftUI

@main
struct SaviumApp: App {
    @State private var app = AppModel()
    @State private var sesion = Sesion()
    @State private var bloqueo = Bloqueo()
    @State private var datos = DatosStore()
    @State private var movimientos = MovimientosStore()

    var body: some Scene {
        WindowGroup {
            RaizView()
                .environment(app).environment(sesion).environment(bloqueo).environment(datos).environment(movimientos)
        }
    }
}
