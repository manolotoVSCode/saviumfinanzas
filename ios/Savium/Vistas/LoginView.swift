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
    @FocusState private var claveEnFoco: Bool

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
                    }
                    HStack {
                        SecureField("Contraseña", text: $clave).textContentType(.password)
                            .focused($claveEnFoco)
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
            .safeAreaInset(edge: .bottom) {
                Text("Proyecto personal de MT").font(.footnote).foregroundStyle(.secondary).padding(.bottom, 8)
            }
            .task {
                conFaceID = recordado.map { ClaveConFaceID.hayGuardada(email: $0.email) } ?? false
                // Como en la banca: al abrir, Face ID directamente (una sola vez; luego, con el botón).
                if conFaceID && !faceIDIntentado { faceIDIntentado = true; await usarFaceID() }
            }
        }
    }

    private var correo: String { recordado?.email ?? email }

    private func usarFaceID() async {
        guard let recordado, let guardada = await ClaveConFaceID.leer(email: recordado.email) else { return }
        clave = guardada
        entrar(con: guardada, desdeFaceID: true)
    }

    private func entrar(con clave: String, desdeFaceID: Bool) {
        guard !correo.isEmpty, !clave.isEmpty, !entrando else { return }
        entrando = true
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
