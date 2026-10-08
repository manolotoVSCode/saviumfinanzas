import SwiftUI

struct LoginView: View {
    @Environment(Sesion.self) private var sesion
    @State private var email = ""
    @State private var clave = ""
    @State private var entrando = false

    var body: some View {
        NavigationStack {
            Form {
                if let mensaje = sesion.mensaje {
                    Section { Label(mensaje, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
                }
                Section {
                    TextField("Correo", text: $email).textContentType(.username).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Contraseña", text: $clave).textContentType(.password)
                }
                Section {
                    Button {
                        entrando = true
                        Task { await sesion.entrar(email: email, clave: clave); entrando = false }
                    } label: {
                        if entrando { ProgressView().frame(maxWidth: .infinity) } else { Text("Entrar").frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.glassProminent).disabled(email.isEmpty || clave.isEmpty || entrando)
                    Link("¿Olvidaste tu contraseña?", destination: URL(string: "https://savium.manoloto.com/#/auth")!)
                }
            }
            .navigationTitle("Savium")
        }
    }
}
