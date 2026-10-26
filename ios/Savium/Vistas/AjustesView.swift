import SwiftUI
import SaviumCore

struct AjustesView: View {
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @Environment(DatosStore.self) private var datos
    @Environment(\.dismiss) private var cerrarHoja
    @State private var confirmandoSalida = false

    var body: some View {
        @Bindable var app = app
        NavigationStack {
            Form {
                Section {
                    Picker("Divisa", selection: $app.divisa) {
                        ForEach(Divisa.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Divisa")
                } footer: {
                    Text("Los importes en otras divisas se convierten a esta.")
                }

                Section("Apariencia") {
                    Picker("Apariencia", selection: $app.apariencia) {
                        ForEach(Apariencia.allCases) { Text($0.titulo).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Toggle("Pedir acceso al abrir", isOn: Binding(get: { bloqueo.activo }, set: { bloqueo.cambiarActivo($0) }))
                    if bloqueo.activo {
                        Picker("Pedirlo al volver", selection: Binding(get: { bloqueo.plazo }, set: { bloqueo.cambiarPlazo($0) })) {
                            ForEach(PlazoBloqueo.allCases) { Text($0.titulo).tag($0) }
                        }
                    }
                } footer: {
                    Text(bloqueo.disponible
                         ? "Al abrir la app y al volver a ella después del tiempo elegido: Face ID o tu contraseña."
                         : "Al abrir la app y al volver a ella después del tiempo elegido: tu contraseña.")
                }

                Section {
                    LabeledContent("Correo", value: sesion.email ?? "—")
                    if datos.soloLectura {
                        Label("Acceso de solo lectura", systemImage: "eye")
                    }
                    Button("Cerrar sesión", role: .destructive) { confirmandoSalida = true }
                } header: {
                    Text("Cuenta")
                } footer: {
                    if datos.soloLectura { Text("Puedes ver todos los datos, pero no apuntar, editar, cobrar ni borrar.") }
                }

                // Solo manoloto@gmail.com y nunca en el señuelo (las funciones de la base también rechazan a los demás).
                if sesion.userId == Config.adminId && !ModoSenuelo.activo {
                    Section {
                        NavigationLink { PanelAppsView() } label: {
                            Label("Panel de las apps", systemImage: "chart.bar")
                        }
                    } footer: {
                        Text("Descargas y uso de Savium Share, Piggy Bank y Rewards.")
                    }
                }

                Section {
                    LabeledContent("Versión", value: Bundle.main.versionCorta)
                }
            }
            .navigationTitle("Ajustes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Listo") { cerrarHoja() } }
            }
            .confirmationDialog("¿Cerrar sesión en este iPhone?", isPresented: $confirmandoSalida, titleVisibility: .visible) {
                Button("Cerrar sesión", role: .destructive) {
                    cerrarHoja()
                    Task { await sesion.cerrar() }
                }
            } message: {
                Text("La web y tus otros dispositivos seguirán con la sesión abierta.")
            }
        }
    }
}
