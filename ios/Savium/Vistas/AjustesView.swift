import SwiftUI
import SaviumCore

struct AjustesView: View {
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
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
                    Toggle("Bloquear con Face ID", isOn: Binding(get: { bloqueo.activo }, set: { bloqueo.cambiarActivo($0) }))
                        .disabled(!bloqueo.disponible)
                    if bloqueo.disponible && bloqueo.activo {
                        Picker("Pedirlo al volver", selection: Binding(get: { bloqueo.plazo }, set: { bloqueo.cambiarPlazo($0) })) {
                            ForEach(PlazoBloqueo.allCases) { Text($0.titulo).tag($0) }
                        }
                    }
                } footer: {
                    Text(bloqueo.disponible
                         ? "Se pide siempre al abrir la app y al volver a ella después del tiempo elegido."
                         : "Este iPhone no tiene Face ID ni código configurado.")
                }

                Section("Cuenta") {
                    LabeledContent("Correo", value: sesion.email ?? "—")
                    Button("Cerrar sesión", role: .destructive) { confirmandoSalida = true }
                }

                Section {
                    LabeledContent("Versión", value: Self.version)
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

    private static var version: String { "\(Bundle.main.versionCorta) (\(Bundle.main.build))" }
}
