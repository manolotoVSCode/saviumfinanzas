import SwiftUI

struct RaizView: View {
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @Environment(\.scenePhase) private var fase

    var body: some View {
        ZStack {
            switch sesion.estado {
            case .cargando: ProgressView()
            case .fuera: LoginView()
            case .dentro:
                if bloqueo.bloqueado {
                    ContentUnavailableView {
                        Label("Savium está bloqueado", systemImage: "faceid")
                    } actions: {
                        Button("Desbloquear") { Task { await bloqueo.desbloquear() } }.buttonStyle(.glassProminent)
                    }
                    .task { await bloqueo.desbloquear() }
                } else {
                    PestanasView()
                }
            }
            // Tapa las cifras en el selector de apps.
            if fase != .active {
                Rectangle().fill(.background).ignoresSafeArea()
                    .overlay { Image(systemName: "cube").font(.system(size: 72, weight: .light)).foregroundStyle(.tint) }
            }
        }
        .onChange(of: sesion.estado) { anterior, nuevo in
            if anterior == .fuera, case .dentro = nuevo { bloqueo.recienAutenticado() }
        }
        .onChange(of: fase) { _, nueva in
            if nueva == .background { bloqueo.enSegundoPlano() }
            if nueva == .active { bloqueo.alVolver() }
        }
    }
}
