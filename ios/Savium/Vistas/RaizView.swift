import SwiftUI

struct RaizView: View {
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @Environment(DatosStore.self) private var datos
    @Environment(MovimientosStore.self) private var movimientos
    @Environment(\.scenePhase) private var fase

    var body: some View {
        ZStack {
            switch sesion.estado {
            case .cargando: ProgressView()
            case .fuera: LoginView()
            case .dentro:
                if bloqueo.bloqueado {
                    LoginView(acceso: true)
                } else {
                    PestanasView()
                }
            }
            // Tapa las cifras en el selector de apps.
            if fase != .active {
                Rectangle().fill(.background).ignoresSafeArea()
                    .overlay { CuboSavium(lado: 88) }
            }
        }
        .preferredColorScheme(app.apariencia.esquema)
        .onChange(of: sesion.estado) { anterior, nuevo in
            if anterior == .fuera, case .dentro = nuevo { bloqueo.recienAutenticado() }
            if nuevo == .fuera { ModoSenuelo.desactivar(); datos.reiniciar(); movimientos.reiniciar() }
        }
        .onChange(of: fase) { _, nueva in
            if nueva == .background { bloqueo.enSegundoPlano() }
            if nueva == .active {
                bloqueo.alVolver()
                Task { await AlertaEmergencia.compartida.enviarPendiente(); await datos.comprobarAlertas() }
                // Lo apuntado en la web mientras tanto: si los datos tienen más de 5 minutos, se recargan sin vaciar la pantalla.
                // Bloqueada no hace falta: al desbloquear, las pestañas cargan de nuevo.
                if !bloqueo.bloqueado, let t = datos.actualizado, Date.now.timeIntervalSince(t) > 300 {
                    Task { await datos.cargar(app: app); await movimientos.recargar(limpiar: false) }
                }
            }
        }
    }
}
