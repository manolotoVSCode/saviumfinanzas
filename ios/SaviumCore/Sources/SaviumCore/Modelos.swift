import Foundation

/// Fila de la vista saldos_cuentas.
public struct Cuenta: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let nombre: String
    public let tipo: String
    public let divisa: String
    public let vendida: Bool
    public let saldoInicial: Double
    public let saldoActual: Double
    /// Aportaciones − retiros (capital_neto de la vista saldos_cuentas); 0 si no viene (cachés viejas).
    public let capitalNeto: Double
    enum CodingKeys: String, CodingKey {
        case id, nombre, tipo, divisa, vendida
        case saldoInicial = "saldo_inicial", saldoActual = "saldo_actual", capitalNeto = "capital_neto"
    }
    public init(id: String, nombre: String, tipo: String, divisa: String, vendida: Bool, saldoInicial: Double, saldoActual: Double, capitalNeto: Double = 0) {
        self.id = id; self.nombre = nombre; self.tipo = tipo; self.divisa = divisa
        self.vendida = vendida; self.saldoInicial = saldoInicial; self.saldoActual = saldoActual; self.capitalNeto = capitalNeto
    }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        nombre = try c.decode(String.self, forKey: .nombre)
        tipo = try c.decode(String.self, forKey: .tipo)
        divisa = try c.decode(String.self, forKey: .divisa)
        vendida = try c.decode(Bool.self, forKey: .vendida)
        saldoInicial = try c.decode(Double.self, forKey: .saldoInicial)
        saldoActual = try c.decode(Double.self, forKey: .saldoActual)
        capitalNeto = try c.decodeIfPresent(Double.self, forKey: .capitalNeto) ?? 0
    }
}

public struct Categoria: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let categoria: String
    public let subcategoria: String
    /// 'Gastos', 'Ingreso'… Puede venir null en la BD.
    public let tipo: String?
    public let frecuenciaSeguimiento: String?
    enum CodingKeys: String, CodingKey {
        case id, categoria, subcategoria, tipo
        case frecuenciaSeguimiento = "frecuencia_seguimiento"
    }
    public init(id: String, categoria: String, subcategoria: String, tipo: String?, frecuenciaSeguimiento: String? = nil) {
        self.id = id; self.categoria = categoria; self.subcategoria = subcategoria
        self.tipo = tipo; self.frecuenciaSeguimiento = frecuenciaSeguimiento
    }
}

public struct Transaccion: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let fecha: String
    public let comentario: String
    public let ingreso: Double
    public let gasto: Double
    public let divisa: String
    public let cuentaId: String
    public let subcategoriaId: String
    enum CodingKeys: String, CodingKey {
        case id, fecha, comentario, ingreso, gasto, divisa
        case cuentaId = "cuenta_id", subcategoriaId = "subcategoria_id"
    }
    public init(id: String, fecha: String, comentario: String = "", ingreso: Double = 0, gasto: Double = 0,
                divisa: String = "MXN", cuentaId: String = "a1", subcategoriaId: String = "c1") {
        self.id = id; self.fecha = fecha; self.comentario = comentario; self.ingreso = ingreso
        self.gasto = gasto; self.divisa = divisa; self.cuentaId = cuentaId; self.subcategoriaId = subcategoriaId
    }
    /// ingreso − gasto, como Transaction.monto en la web.
    public var importe: Double { ingreso - gasto }
    /// Medianoche local del día del movimiento (como Transaction.fecha en la web).
    public func dia(en calendario: Calendar) -> Date { Fechas.diaLocal(fecha, calendario: calendario) ?? .distantPast }
}

/// Lo que inserta la app en `transacciones` (mismos campos que addTransaction en la web).
/// Campos que cambia «Editar movimiento» (update de transacciones).
public struct CambioTransaccion: Encodable, Sendable, Equatable {
    public let cuentaId: String
    public let fecha: String
    public let comentario: String
    public let ingreso: Double
    public let gasto: Double
    public let subcategoriaId: String
    public let divisa: String
    enum CodingKeys: String, CodingKey {
        case fecha, comentario, ingreso, gasto, divisa
        case cuentaId = "cuenta_id", subcategoriaId = "subcategoria_id"
    }
    public init(cuentaId: String, fecha: String, comentario: String, ingreso: Double, gasto: Double, subcategoriaId: String, divisa: String) {
        self.cuentaId = cuentaId; self.fecha = fecha; self.comentario = comentario; self.ingreso = ingreso
        self.gasto = gasto; self.subcategoriaId = subcategoriaId; self.divisa = divisa
    }
}

public struct NuevaTransaccion: Encodable, Sendable, Equatable {
    /// Lo genera la app: si un reintento llega tras un guardado cuya respuesta se perdió, la BD lo rechaza por duplicado.
    public let id: String
    public let cuentaId: String
    public let fecha: String
    public let comentario: String
    public let ingreso: Double
    public let gasto: Double
    public let subcategoriaId: String
    public let divisa: String
    public let userId: String
    enum CodingKeys: String, CodingKey {
        case id, fecha, comentario, ingreso, gasto, divisa
        case cuentaId = "cuenta_id", subcategoriaId = "subcategoria_id", userId = "user_id"
    }
    public init(id: String, cuentaId: String, fecha: String, comentario: String, ingreso: Double, gasto: Double,
                subcategoriaId: String, divisa: String, userId: String) {
        self.id = id; self.cuentaId = cuentaId; self.fecha = fecha; self.comentario = comentario; self.ingreso = ingreso
        self.gasto = gasto; self.subcategoriaId = subcategoriaId; self.divisa = divisa; self.userId = userId
    }
}

public struct Pendiente: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let concepto: String?
    public let tipo: String?
    public let montoEsperado: Double
    public let montoCobrado: Double?
    public let divisa: String
    public let fechaEsperada: String?
    public let estado: String
    enum CodingKeys: String, CodingKey {
        case id, concepto, tipo, divisa, estado
        case montoEsperado = "monto_esperado", montoCobrado = "monto_cobrado", fechaEsperada = "fecha_esperada"
    }
}

/// Provisión manual de CxP (tabla provisiones_cxp): un pago apartado de antemano. Se crea en la web;
/// la App solo la muestra. No es un movimiento, así que no toca ningún saldo.
public struct ProvisionCxP: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let concepto: String
    public let monto: Double
    public let divisa: String
    /// Próximo pago previsto, 'YYYY-MM-DD'.
    public let fecha: String
    /// unica, mensual, bimestral, trimestral, semestral o anual.
    public let frecuencia: String
    /// pendiente, pagado o cancelado.
    public let estado: String
    public let notas: String?
    public init(id: String, concepto: String, monto: Double, divisa: String, fecha: String, frecuencia: String, estado: String, notas: String?) {
        self.id = id; self.concepto = concepto; self.monto = monto; self.divisa = divisa
        self.fecha = fecha; self.frecuencia = frecuencia; self.estado = estado; self.notas = notas
    }
}

public struct Suscripcion: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let serviceName: String
    public let active: Bool
    public let frecuencia: String
    public let proximoPago: String
    public let ultimoPagoMonto: Double
    enum CodingKeys: String, CodingKey {
        case id, active, frecuencia
        case serviceName = "service_name", proximoPago = "proximo_pago", ultimoPagoMonto = "ultimo_pago_monto"
    }
    public init(id: String, serviceName: String, active: Bool, frecuencia: String, proximoPago: String, ultimoPagoMonto: Double) {
        self.id = id; self.serviceName = serviceName; self.active = active; self.frecuencia = frecuencia
        self.proximoPago = proximoPago; self.ultimoPagoMonto = ultimoPagoMonto
    }
}

public struct Inversion: Codable, Sendable, Identifiable, Hashable {
    public let id: String
    public let nombre: String
    public let moneda: String
    public let montoInvertido: Double
    public let valorActual: Double
    public let activa: Bool
    public let cuentaId: String?
    enum CodingKeys: String, CodingKey {
        case id, nombre, moneda, activa
        case montoInvertido = "monto_invertido", valorActual = "valor_actual", cuentaId = "cuenta_id"
    }
}

public struct Valuacion: Codable, Sendable, Hashable {
    public let inversionId: String
    public let fecha: String
    public let valor: Double
    enum CodingKeys: String, CodingKey { case fecha, valor; case inversionId = "inversion_id" }
}

/// Fila de la vista patrimonio_por_divisa.
public struct FilaPatrimonio: Codable, Sendable, Hashable {
    public let divisa: String
    public let clase: String
    public let rubro: String
    public let importe: Double
    public init(divisa: String, clase: String, rubro: String, importe: Double) {
        self.divisa = divisa; self.clase = clase; self.rubro = rubro; self.importe = importe
    }
}

public struct Perfil: Codable, Sendable {
    public let divisaPreferida: String
    public let nombre: String?
    enum CodingKeys: String, CodingKey { case divisaPreferida = "divisa_preferida", nombre }
}

/// Alerta de emergencia tal como la ve el lector (tabla alertas_emergencia, columnas permitidas).
public struct AlertaRecibida: Codable, Sendable, Identifiable, Hashable {
    public static let columnas = "id, creada, nombre, mensaje, telefono, latitud, longitud, precision_m, vista_en"
    public let id: String
    public let creada: Date
    public let nombre: String?
    public let mensaje: String?
    public let telefono: String?
    public let latitud: Double?
    public let longitud: Double?
    public let precisionM: Double?
    enum CodingKeys: String, CodingKey {
        case id, creada, nombre, mensaje, telefono, latitud, longitud
        case precisionM = "precision_m"
    }
}
