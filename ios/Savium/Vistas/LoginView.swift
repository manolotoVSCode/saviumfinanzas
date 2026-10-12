import SwiftUI
import SaviumCore

struct LoginView: View {
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @State private var recordado = UsuarioRecordado.cargar()
    @State private var email = ""
    @State private var clave = ""
    @State private var entrando = false
    @State private var conFaceID = false
    @State private var faceIDIntentado = false
    @FocusState private var campo: Campo?
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
                            Button("¿No eres tú?") { olvidar() }.font(.callout)
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
                if campo != nil {
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
                            Text("Desde 2025 ·")
                            Link("Privacidad", destination: URL(string: "https://savium.manoloto.com/privacidad.html")!).foregroundStyle(.tint)
                        }
                    }
                    .font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
                }
            }
            .task {
                conFaceID = recordado.map { ClaveConFaceID.hayGuardada(email: $0.email) } ?? false
                // Como en la banca: al abrir, Face ID directamente (una sola vez; luego, con el botón).
                // Si acaba de cerrar sesión él mismo, no: le volvería a meter y no podría salir.
                if conFaceID && !faceIDIntentado && !sesion.salidaVoluntaria {
                    faceIDIntentado = true
                    await usarFaceID()
                }
            }
        }
    }

    private var correo: String { recordado?.email ?? email }

    private func usarFaceID() async {
        campo = nil
        guard let recordado else { return }
        guard let guardada = await ClaveConFaceID.leer(email: recordado.email) else {
            conFaceID = ClaveConFaceID.hayGuardada(email: recordado.email)
            return
        }
        clave = guardada
        entrar(con: guardada, desdeFaceID: true)
    }

    private func entrar(con clave: String, desdeFaceID: Bool) {
        guard !correo.isEmpty, !clave.isEmpty, !entrando else { return }
        entrando = true
        campo = nil
        let correo = correo
        Task {
            let ok = await sesion.entrar(email: correo, clave: clave)
            if ok, !desdeFaceID, bloqueo.activo, ClaveConFaceID.disponible {
                ClaveConFaceID.guardar(clave, email: correo)
            }
            if !ok, desdeFaceID {
                // La contraseña cambió en la web: se olvida la guardada y se pide a mano.
                ClaveConFaceID.borrar()
                conFaceID = false
                self.clave = ""
            }
            entrando = false
        }
    }

    private func olvidar() {
        UsuarioRecordado.olvidar()
        recordado = nil
        conFaceID = false
        clave = ""
        email = ""
    }
}
