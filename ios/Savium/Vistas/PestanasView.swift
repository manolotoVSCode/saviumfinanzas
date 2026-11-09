import SwiftUI

/// Barra de pestañas propia: la de iOS 26 marca la activa con una burbuja de cristal que el usuario
/// no quiere. Aquí la activa solo cambia a verde. Las cinco pestañas siguen vivas (conservan su estado).
struct PestanasView: View {
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos
    /// Con el teclado abierto la barra se esconde: si no, sube con él y tapa lo que se está buscando.
    @State private var teclado = false

    var body: some View {
        ZStack {
            pestana(.resumen) { ResumenView() }
            pestana(.movimientos) { MovimientosView() }
            pestana(.patrimonio) { PatrimonioView() }
            pestana(.pendientes) { PendientesView() }
            pestana(.suscripciones) { SuscripcionesView() }
        }
        .overlay(alignment: .bottom) {
            VStack(spacing: 8) {
                if let c = datos.deshacer { AvisoDeshacer(cobro: c).transition(.move(edge: .bottom).combined(with: .opacity)) }
                if !teclado { BarraPestanas() }
            }
            .animation(.snappy, value: datos.deshacer)
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in teclado = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in teclado = false }
        .task { await datos.cargar(app: app) }
        // Lector: alerta de emergencia a pantalla completa (por encima de todo, tras desbloquear con Face ID).
        .fullScreenCover(item: Binding(get: { datos.alertaActiva }, set: { datos.alertaActiva = $0 })) { a in
            AlertaRecibidaView(alerta: a)
        }
        .onChange(of: Notificaciones.compartidas.alertaRecibida) { _, id in
            guard let id else { return }
            Notificaciones.compartidas.alertaRecibida = nil
            Task { await datos.mostrarAlerta(id: id) }
        }
        .task {
            // Si la app se abrió tocando la notificación, el id ya estaba puesto antes de esta vista.
            if let id = Notificaciones.compartidas.alertaRecibida {
                Notificaciones.compartidas.alertaRecibida = nil
                await datos.mostrarAlerta(id: id)
            }
        }
    }

    private func pestana<V: View>(_ p: Pestana, @ViewBuilder _ contenido: () -> V) -> some View {
        // El hueco de la barra va dentro de cada pestaña: desde fuera del NavigationStack
        // las listas no lo respetaban y la última fila quedaba debajo de la barra.
        NavigationStack {
            contenido().botonApuntar()
                .safeAreaInset(edge: .bottom, spacing: 0) { Color.clear.frame(height: BarraPestanas.alto) }
        }
            .opacity(app.pestana == p ? 1 : 0)
            .allowsHitTesting(app.pestana == p)
            .accessibilityHidden(app.pestana != p)
    }
}

struct BarraPestanas: View {
    /// Alto que ocupa la barra sobre el borde inferior seguro (botones 48 + márgenes).
    static let alto: CGFloat = 64
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos
    // Crecen con el tamaño de letra del sistema, con tope para que la barra no se desborde.
    @ScaledMetric(relativeTo: .body) private var tamIcono: CGFloat = 20
    @ScaledMetric(relativeTo: .caption2) private var tamTexto: CGFloat = 10

    private let items: [(pestana: Pestana, titulo: String, icono: String)] = [
        (.resumen, "Inicio", "chart.pie"),
        (.movimientos, "Movimientos", "list.bullet.rectangle"),
        (.patrimonio, "Patrimonio", "building.columns"),
        (.pendientes, "Pendientes", "clock"),
        (.suscripciones, "Suscripciones", "repeat"),
    ]

    var body: some View {
        // Lo vencido de las dos listas: cobros que no llegaron y pagos que ya pasaron su fecha.
        let vencidos = datos.resumenPendientes(app).vencidos + datos.pagosVencidos(app)
        HStack(spacing: 0) {
            ForEach(items, id: \.pestana) { item in
                let activa = app.pestana == item.pestana
                Button { app.pestana = item.pestana } label: {
                    VStack(spacing: 3) {
                        Image(systemName: item.icono)
                            .symbolVariant(activa ? .fill : .none)
                            .font(.system(size: min(tamIcono, 26), weight: .medium))
                            .frame(height: min(tamIcono, 26) + 4)
                            .overlay(alignment: .topTrailing) {
                                if item.pestana == .pendientes && vencidos > 0 {
                                    Text("\(vencidos)").font(.caption2.bold()).foregroundStyle(.white)
                                        .padding(.horizontal, 5).background(.red, in: .capsule).offset(x: 10, y: -6)
                                }
                            }
                        Text(item.titulo).font(.system(size: min(tamTexto, 13), weight: activa ? .semibold : .medium))
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .contentShape(.rect)
                    .foregroundStyle(activa ? Color.accentColor : Color.primary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.titulo)
                .accessibilityValue(item.pestana == .pendientes && vencidos > 0 ? "\(vencidos) vencido\(vencidos == 1 ? "" : "s")" : "")
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

/// «Cobrado · Deshacer» unos segundos tras cobrar un pendiente. Si deshacer falla, el aviso se queda con el motivo.
private struct AvisoDeshacer: View {
    @Environment(DatosStore.self) private var datos
    let cobro: DatosStore.CobroHecho

    var body: some View {
        HStack {
            Label(cobro.fallo ?? cobro.mensaje, systemImage: cobro.fallo == nil ? "checkmark.circle.fill" : "exclamationmark.triangle")
                .lineLimit(3)
            Spacer()
            if cobro.enCurso {
                ProgressView()
            } else if cobro.fallo != nil {
                Button("Cerrar") { datos.deshacer = nil }
            } else {
                Button("Deshacer") { Task { await datos.deshacerCobro() } }.bold()
            }
        }
        .font(.subheadline)
        .padding(.horizontal, 16).padding(.vertical, 12)
        .glassEffect(.regular, in: .rect(cornerRadius: 24))
        .padding(.horizontal, 20)
        // Se va solo a los 6 s, salvo mientras deshace o si mostró un fallo.
        .task(id: cobro.id) {
            try? await Task.sleep(for: .seconds(6))
            if let d = datos.deshacer, d.id == cobro.id, !d.enCurso, d.fallo == nil { datos.deshacer = nil }
        }
        .accessibilityElement(children: .combine)
    }
}
