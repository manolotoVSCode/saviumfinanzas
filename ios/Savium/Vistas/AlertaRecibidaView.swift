import MapKit
import SwiftUI
import SaviumCore

/// Lo que ve el lector al llegar o tocar una alerta de emergencia: a pantalla completa, en rojo,
/// con la hora, el mapa y los botones para llamar o abrir Mapas. Al mostrarse deja de repetirse.
struct AlertaRecibidaView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(\.dismiss) private var cerrar
    @Environment(\.openURL) private var abrir
    let alerta: AlertaRecibida

    private var nombre: String { alerta.nombre ?? "tu familiar" }
    private var punto: CLLocationCoordinate2D? {
        guard let lat = alerta.latitud, let lon = alerta.longitud else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 56)).foregroundStyle(.white)
            Text("Alerta de \(nombre)").font(.largeTitle.bold()).foregroundStyle(.white).multilineTextAlignment(.center)
            if let mensaje = alerta.mensaje {
                Text("«\(mensaje)»").font(.title3).foregroundStyle(.white).multilineTextAlignment(.center)
            }
            Text(alerta.creada, format: .dateTime.day().month().hour().minute().locale(Locale(identifier: "es_MX")))
                .font(.headline).foregroundStyle(.white.opacity(0.9))
            + Text(" · ") .foregroundStyle(.white.opacity(0.9))
            + Text(alerta.creada, style: .relative).font(.headline).foregroundStyle(.white.opacity(0.9))

            if let punto {
                Map(initialPosition: .region(MKCoordinateRegion(center: punto, latitudinalMeters: 600, longitudinalMeters: 600))) {
                    Marker(nombre, systemImage: "person.fill", coordinate: punto).tint(.red)
                }
                .frame(maxHeight: 260)
                .clipShape(.rect(cornerRadius: 16))
                if let p = alerta.precisionM { Text("Precisión ± \(Int(p)) m").font(.caption).foregroundStyle(.white.opacity(0.8)) }
            } else {
                Text("Sin ubicación").foregroundStyle(.white.opacity(0.8))
            }

            Spacer(minLength: 0)
            if let tel = alerta.telefono, let url = URL(string: "tel:\(tel.filter { $0.isNumber || $0 == "+" })") {
                Button { abrir(url) } label: {
                    Label("Llamar a \(nombre)", systemImage: "phone.fill").frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glassProminent).tint(.white).foregroundStyle(.red).font(.title3.bold())
            }
            if let punto {
                // Las dos apps de mapas; el enlace de Google abre su app si está instalada y, si no, el navegador.
                HStack(spacing: 12) {
                    botonMapa("Apple Maps", "https://maps.apple.com/?ll=\(punto.latitude),\(punto.longitude)&q=\(nombre)")
                    botonMapa("Google Maps", "https://www.google.com/maps/search/?api=1&query=\(punto.latitude),\(punto.longitude)")
                }
            }
            Button("Cerrar") { cerrar() }.foregroundStyle(.white.opacity(0.9)).padding(.top, 4)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.red.gradient)
        .task { await datos.marcarVista(alerta) }
        .sensoryFeedback(.warning, trigger: alerta.id)
    }

    @ViewBuilder private func botonMapa(_ titulo: String, _ enlace: String) -> some View {
        if let url = URL(string: enlace.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? enlace) {
            Button { abrir(url) } label: {
                Label(titulo, systemImage: "map.fill").frame(maxWidth: .infinity).padding(.vertical, 4)
            }
            .buttonStyle(.glass).foregroundStyle(.white)
        }
    }
}
