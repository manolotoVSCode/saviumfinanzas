import SwiftUI
import SaviumCore

/// Inicio de sesión y, con `acceso`, pantalla de acceso con la sesión ya abierta (al abrir la app o volver a ella).
/// En acceso se entra con el botón de Face ID (nunca automático), con la contraseña o con el código de coacción:
/// este último entra igual, en modo señuelo, y manda la alerta en silencio.
struct LoginView: View {
    var acceso = false
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos
    @Environment(MovimientosStore.self) private var movimientos
    @State private var recordado = UsuarioRecordado.cargar()
    @State private var email = ""
    @State private var clave = ""
    @State private var entrando = false
    @State private var conFaceID = false
    /// Una distinta cada vez que se abre el login, al estilo de los mensajes de Claude mientras piensa.
    @State private var frase = Self.frases.randomElement()!
    private static let frases = [
        "Cuadrando cuentas desde 2025",
        "Contando centavos desde 2025",
        "Domando gastos desde 2025",
        "Persiguiendo pesos desde 2025",
        "Sumando y restando desde 2025",
        "Vigilando la cartera desde 2025",
        "Haciendo números desde 2025",
        "Ahorrando con estilo desde 2025",
    ]
    @FocusState private var campo: Campo?
    /// El teclado en pantalla (no basta con el foco: con teclado físico hay foco sin teclado).
    @State private var tecladoVisible = false
    private enum Campo { case correo, clave }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 18) {
                        HStack(spacing: 14) {
                            CuboSavium(lado: 52)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Savium Finance").font(.title2.bold())
                                Text("Wealth Management Platform").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        if let recordado {
                            Text(Saludo.texto(nombre: recordado.nombre, hora: Calendar.current.component(.hour, from: .now)))
                                .font(.title3.weight(.semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .listRowBackground(Color.clear)
                }
                if let mensaje = sesion.mensaje {
                    Section { Label(mensaje, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
                }
                Section {
                    if let recordado {
                        HStack {
                            Text(Saludo.correoOculto(recordado.email)).foregroundStyle(.secondary)
                            Spacer()
                            // Borderless: si no, tocar cualquier punto de la fila (p. ej. al ir a la contraseña) lo activa.
                            Button("¿No eres tú?") { olvidar() }.font(.callout).buttonStyle(.borderless)
                        }
                    } else {
                        TextField("Correo", text: $email).textContentType(.username).keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .focused($campo, equals: .correo)
                            .submitLabel(.next)
                            .onSubmit { campo = .clave }
                    }
                    HStack {
                        SecureField("Contraseña", text: $clave).textContentType(.password)
                            .focused($campo, equals: .clave)
                            .submitLabel(.go)
                            .onSubmit { entrar(con: clave, desdeFaceID: false) }
                        if conFaceID {
                            Button { Task { await usarFaceID() } } label: {
                                Image(systemName: "faceid").font(.title2)
                            }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Entrar con Face ID")
                        }
                    }
                }
                Section {
                    Button {
                        entrar(con: clave, desdeFaceID: false)
                    } label: {
                        if entrando { ProgressView().frame(maxWidth: .infinity) } else { Text("Entrar").frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.glassProminent).disabled(correo.isEmpty || clave.isEmpty || entrando)
                    Link("¿Olvidaste tu contraseña?", destination: URL(string: "https://savium.manoloto.com/#/auth")!)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            // Con campos de correo y contraseña iOS pone su barra de Contraseñas y no muestra la de
            // «Listo» (.keyboard); por eso un botón propio sobre el teclado.
            .safeAreaInset(edge: .bottom) {
                if tecladoVisible {
                    HStack {
                        Spacer()
                        Button { campo = nil } label: {
                            Image(systemName: "keyboard.chevron.compact.down").font(.title3)
                        }
                        .buttonStyle(.glass)
                        .accessibilityLabel("Ocultar teclado")
                    }
                    .padding(.horizontal).padding(.bottom, 8)
                } else {
                    VStack(spacing: 2) {
                        Text("v\(Bundle.main.versionCorta) · Proyecto personal de MT")
                        HStack(spacing: 4) {
                            Text("\(frase) ·")
                            Link("Privacidad", destination: URL(string: "https://savium.manoloto.com/privacidad.html")!).foregroundStyle(.tint)
                        }
                    }
                    .font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in tecladoVisible = true }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in tecladoVisible = false }
            .task {
                if acceso {
                    if recordado == nil, let e = sesion.email { recordado = UsuarioRecordado(email: e, nombre: nil) }
                    conFaceID = bloqueo.disponible
                } else {
                    // Siempre que haya Face ID: con la contraseña guardada entra directo; sin ella, el icono lleva a
                    // la sugerencia de Contraseñas de iCloud (dominio asociado savium.manoloto.com).
                    conFaceID = recordado != nil && ClaveConFaceID.disponible
                }
                // Face ID nunca salta solo: con el iPhone en manos de otro, abrir la app no debe bastar.
            }
        }
    }

    private var correo: String { recordado?.email ?? email }

    private func usarFaceID() async {
        campo = nil
        if acceso {
            if await bloqueo.desbloquearConFaceID() { salirDeSenuelo() }
            return
        }
        guard let recordado else { return }
        guard ClaveConFaceID.hayGuardada(email: recordado.email) else {
            // Aún no la tiene la app: al poner el foco, iOS ofrece la de Contraseñas de iCloud (con Face ID).
            // Al entrar con ella, la app la guarda y la próxima vez el icono entra directo.
            campo = .clave
            return
        }
        guard let guardada = await ClaveConFaceID.leer(email: recordado.email) else { return }
        clave = guardada
        entrar(con: guardada, desdeFaceID: true)
    }

    private func entrar(con clave: String, desdeFaceID: Bool) {
        guard !correo.isEmpty, !clave.isEmpty, !entrando else { return }
        entrando = true
        campo = nil
        let correo = correo
        Task {
            if acceso, await esCodigoEmergencia(clave) {
                // Mismo aspecto que con la contraseña: la espera, la entrada y los datos (ficticios).
                try? await Task.sleep(for: .milliseconds(700))
                entrarEnSenuelo()
                entrando = false
                return
            }
            let ok = await sesion.entrar(email: correo, clave: clave)
            if ok, acceso {
                salirDeSenuelo()
                bloqueo.recienAutenticado()
            }
            if ok, !desdeFaceID, bloqueo.activo, ClaveConFaceID.disponible {
                ClaveConFaceID.guardar(clave, email: correo)
            }
            if !ok, desdeFaceID {
                // La contraseña cambió en la web: se olvida la guardada (el icono pasa a ofrecer la de iCloud).
                ClaveConFaceID.borrar()
                self.clave = ""
            }
            entrando = false
        }
    }

    private func esCodigoEmergencia(_ texto: String) async -> Bool {
        guard let yo = sesion.userId else { return false }
        var hash = CodigoGuardado.leer()
        if hash == nil, let remoto = try? await datos.repo.hashCodigoEmergencia() {
            CodigoGuardado.guardar(remoto)
            hash = remoto
        }
        guard let hash else { return false }
        return CodigoEmergencia.coincide(texto, hash: hash, userId: yo)
    }

    private func entrarEnSenuelo() {
        ModoSenuelo.activar()
        datos.reiniciar()
        movimientos.reiniciar()
        AlertaEmergencia.compartida.disparar()
        bloqueo.recienAutenticado()
    }

    /// Al entrar de verdad (Face ID o contraseña): fuera los datos ficticios.
    private func salirDeSenuelo() {
        guard ModoSenuelo.activo else { return }
        ModoSenuelo.desactivar()
        datos.reiniciar()
        movimientos.reiniciar()
    }

    private func olvidar() {
        if acceso { Task { await sesion.cerrar() } }
        UsuarioRecordado.olvidar()
        recordado = nil
        conFaceID = false
        clave = ""
        email = ""
    }
}
