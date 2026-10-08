import SwiftUI

struct PestanasView: View {
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos

    var body: some View {
        @Bindable var app = app
        TabView(selection: $app.pestana) {
            Tab("Inicio", systemImage: "chart.pie", value: .resumen) { NavigationStack { ResumenView() } }
            Tab("Movimientos", systemImage: "list.bullet.rectangle", value: .movimientos) { NavigationStack { MovimientosView() } }
            Tab("Patrimonio", systemImage: "building.columns", value: .patrimonio) { NavigationStack { PatrimonioView() } }
            Tab("Pendientes", systemImage: "clock", value: .pendientes) { NavigationStack { PendientesView() } }
                .badge(datos.resumenPendientes(app).vencidos)
            Tab("Suscrip.", systemImage: "repeat", value: .suscripciones) { NavigationStack { SuscripcionesView() } }
        }
        .task { await datos.cargar(app: app) }
    }
}
