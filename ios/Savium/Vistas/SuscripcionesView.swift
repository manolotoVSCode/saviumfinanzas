import SwiftUI
import SaviumCore

struct SuscripcionesView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Suscripciones")
            .refreshable { await datos.cargar(app: app) }
    }

    private var lista: some View {
        let subs = datos.suscripciones.sorted { $0.proximoPago < $1.proximoPago }
        let mensuales = Suscripciones.totalMensuales(subs.map { (frecuencia: $0.frecuencia, monto: $0.ultimoPagoMonto) })
        let otras = subs.count - mensuales.cantidad
        // subscription_services no guarda divisa: la web asume la del perfil.
        let d = app.divisa.rawValue
        return List {
            AvisoEstado()
            Section {
                Linea(titulo: "Mensuales activas", valor: mensuales.total, divisa: d, destacado: true)
                Text("\(mensuales.cantidad) mensuales" + (otras > 0 ? " · \(otras) con otra frecuencia (no suman)" : ""))
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section("Activas") {
                ForEach(subs) { s in
                    let e = Suscripciones.estado(proximoPago: s.proximoPago, now: .now, calendario: .current)
                    FilaImporte {
                        Importe(valor: s.ultimoPagoMonto, divisa: d)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(s.serviceName)
                            Text(texto(e, s)).font(.caption).foregroundStyle(e.estado == .sinCargo ? .orange : .secondary)
                        }
                    }
                }
            }
        }
    }

    private func texto(_ e: (estado: Suscripciones.Estado, dias: Int), _ s: Suscripcion) -> String {
        switch e.estado {
        case .sinCargo: "Sin cargo detectado (\(s.proximoPago)) · \(s.frecuencia)"
        case .esteMes: "Este mes · \(s.frecuencia)"
        case .proxima: "En \(e.dias) días · \(s.frecuencia)"
        }
    }
}
