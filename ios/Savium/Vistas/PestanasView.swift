import SwiftUI

/// Barra de pestañas propia: la de iOS 26 marca la activa con una burbuja de cristal que el usuario
/// no quiere. Aquí la activa solo cambia a verde. Las cinco pestañas siguen vivas (conservan su estado).
struct PestanasView: View {
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos

    var body: some View {
        ZStack {
            pestana(.resumen) { ResumenView() }
            pestana(.movimientos) { MovimientosView() }
            pestana(.patrimonio) { PatrimonioView() }
            pestana(.pendientes) { PendientesView() }
            pestana(.suscripciones) { SuscripcionesView() }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { BarraPestanas() }
        .task { await datos.cargar(app: app) }
    }

    private func pestana<V: View>(_ p: Pestana, @ViewBuilder _ contenido: () -> V) -> some View {
        NavigationStack { contenido().botonApuntar() }
            .opacity(app.pestana == p ? 1 : 0)
            .allowsHitTesting(app.pestana == p)
            .accessibilityHidden(app.pestana != p)
    }
}

struct BarraPestanas: View {
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos

    private let items: [(pestana: Pestana, titulo: String, icono: String)] = [
        (.resumen, "Inicio", "chart.pie"),
        (.movimientos, "Movimientos", "list.bullet.rectangle"),
        (.patrimonio, "Patrimonio", "building.columns"),
        (.pendientes, "Pendientes", "clock"),
        (.suscripciones, "Suscrip.", "repeat"),
    ]

    var body: some View {
        let vencidos = datos.resumenPendientes(app).vencidos
        HStack(spacing: 0) {
            ForEach(items, id: \.pestana) { item in
                let activa = app.pestana == item.pestana
                Button { app.pestana = item.pestana } label: {
                    VStack(spacing: 3) {
                        Image(systemName: item.icono)
                            .symbolVariant(activa ? .fill : .none)
                            .font(.system(size: 20, weight: .medium))
                            .frame(height: 24)
                            .overlay(alignment: .topTrailing) {
                                if item.pestana == .pendientes && vencidos > 0 {
                                    Text("\(vencidos)").font(.caption2.bold()).foregroundStyle(.white)
                                        .padding(.horizontal, 5).background(.red, in: .capsule).offset(x: 10, y: -6)
                                }
                            }
                        Text(item.titulo).font(.system(size: 10, weight: activa ? .semibold : .medium)).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .contentShape(.rect)
                    .foregroundStyle(activa ? Color.accentColor : Color.primary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.titulo)
                .accessibilityAddTraits(activa ? .isSelected : [])
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 6)
        .glassEffect(.regular, in: .capsule)
        .padding(.horizontal, 20)
        .padding(.bottom, 2)
        .sensoryFeedback(.selection, trigger: app.pestana)
    }
}
