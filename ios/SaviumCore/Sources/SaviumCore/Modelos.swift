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
    enum CodingKeys: String, CodingKey {
        case id, nombre, tipo, divisa, vendida
        case saldoInicial = "saldo_inicial", saldoActual = "saldo_actual"
    }
    public init(id: String, nombre: String, tipo: String, divisa: String, vendida: Bool, saldoInicial: Double, saldoActual: Double) {
        self.id = id; self.nombre = nombre; self.tipo = tipo; self.divisa = divisa
        self.vendida = vendida; self.saldoInicial = saldoInicial; self.saldoActual = saldoActual
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
    enum CodingKeys: String, CodingKey { case divisaPreferida = "divisa_preferida" }
}
