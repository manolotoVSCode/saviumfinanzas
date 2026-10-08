import SwiftUI
import SaviumCore

struct Importe: View {
    let valor: Double
    let divisa: String
    var estilo: Font = .body
    var color: Color? = nil
    var body: some View {
        Text(Formato.importe(valor, divisa)).font(estilo).monospacedDigit()
            .foregroundStyle(color ?? (valor < 0 ? .red : .primary))
    }
}

struct Linea: View {
    let titulo: String
    let valor: Double
    let divisa: String
    var destacado = false
    var body: some View {
        LabeledContent {
            Importe(valor: valor, divisa: divisa, estilo: destacado ? .body.bold() : .body)
        } label: {
            Text(titulo).fontWeight(destacado ? .semibold : .regular)
        }
    }
}

/// «Sin conexión · actualizado hace N min» y «Tasas aproximadas», solo si aplican.
struct AvisoEstado: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    var body: some View {
        if datos.error != nil, let actualizado = datos.actualizado {
            Label("Sin conexión · actualizado \(actualizado, format: .relative(presentation: .named))", systemImage: "wifi.slash")
                .font(.footnote).foregroundStyle(.secondary)
        }
        if app.tasasAproximadas {
            Label("Tasas de cambio aproximadas", systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.orange)
        }
    }
}

/// Estado vacío al arrancar sin datos ni red.
struct SinDatos: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    var body: some View {
        if datos.cargando || datos.error == nil { ProgressView() } else {
            ContentUnavailableView {
                Label("Sin conexión", systemImage: "wifi.slash")
            } description: {
                Text("No se pudieron cargar tus datos.")
            } actions: {
                Button("Reintentar") { Task { await datos.cargar(app: app) } }.buttonStyle(.glassProminent)
            }
        }
    }
}

/// Botón flotante «+» con Liquid Glass.
struct BotonNuevo: View {
    let accion: () -> Void
    var body: some View {
        Button(action: accion) { Image(systemName: "plus").font(.title2.bold()).frame(width: 56, height: 56) }
            .buttonStyle(.glassProminent).buttonBorderShape(.circle)
            .padding(.trailing, 20).padding(.bottom, 12)
            .accessibilityLabel("Apuntar gasto o ingreso")
    }
}

struct MenuPerfil: View {
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    var body: some View {
        @Bindable var app = app
        Menu {
            Picker("Divisa", selection: $app.divisa) {
                ForEach(Divisa.allCases) { Text($0.rawValue).tag($0) }
            }
            Button("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                Task { await sesion.cerrar() }
            }
        } label: {
            Label("Perfil", systemImage: "person.crop.circle")
        }
    }
}
