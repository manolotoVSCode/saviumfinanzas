import Foundation
import Supabase
import SaviumCore

// emitLocalSessionAsInitialSession: al abrir sin red con el token caducado se entra con la sesión
// guardada (y «Sin conexión») en vez de mandar al login; una caducidad real llega luego como signedOut.
let supabase = SupabaseClient(
    supabaseURL: Config.supabaseURL,
    supabaseKey: Config.supabaseClave,
    options: SupabaseClientOptions(auth: .init(emitLocalSessionAsInitialSession: true))
)

/// Única puerta a Supabase. Las RLS limitan todo al usuario de la sesión.
struct Repositorio: Sendable {
    static let tamanoPagina = 50
    let db: SupabaseClient

    private static let columnasMovimiento = "id, fecha, comentario, ingreso, gasto, divisa, cuenta_id, subcategoria_id"

    func cuentas() async throws -> [Cuenta] {
        try await db.from("saldos_cuentas").select("id, nombre, tipo, divisa, vendida, saldo_inicial, saldo_actual").execute().value
    }
    func patrimonio() async throws -> [FilaPatrimonio] {
        try await db.from("patrimonio_por_divisa").select("divisa, clase, rubro, importe").execute().value
    }
    func categorias() async throws -> [Categoria] {
        try await db.from("categorias").select("id, categoria, subcategoria, tipo, frecuencia_seguimiento").execute().value
    }
    func perfil() async throws -> Perfil? {
        let filas: [Perfil] = try await db.from("profiles").select("divisa_preferida").limit(1).execute().value
        return filas.first
    }
    func pendientes() async throws -> [Pendiente] {
        try await db.from("transaction_pendings").select("id, concepto, tipo, monto_esperado, monto_cobrado, divisa, fecha_esperada, estado").execute().value
    }
    func suscripcionesActivas() async throws -> [Suscripcion] {
        try await db.from("subscription_services").select("id, service_name, active, frecuencia, proximo_pago, ultimo_pago_monto")
            .eq("active", value: true).execute().value
    }
    func inversiones() async throws -> [Inversion] {
        try await db.from("inversiones").select("id, nombre, moneda, monto_invertido, valor_actual, activa, cuenta_id").order("nombre").execute().value
    }
    func valuaciones() async throws -> [Valuacion] {
        try await db.from("investment_valuations").select("inversion_id, fecha, valor").order("fecha").execute().value
    }

    /// Una página de la lista de movimientos (fecha desc, desempate por id como la web).
    func movimientos(pagina: Int, cuentaId: String?, texto: String?) async throws -> [Transaccion] {
        var q = db.from("transacciones").select(Self.columnasMovimiento)
        if let cuentaId { q = q.eq("cuenta_id", value: cuentaId) }
        if let texto, !texto.isEmpty { q = q.ilike("comentario", pattern: "%\(texto)%") }
        let desde = pagina * Self.tamanoPagina
        return try await q.order("fecha", ascending: false).order("id", ascending: true)
            .range(from: desde, to: desde + Self.tamanoPagina - 1).execute().value
    }

    /// Todos los movimientos entre dos días (incluidos), paginando de 1000 en 1000.
    func movimientos(desde: String, hasta: String) async throws -> [Transaccion] {
        try await todas { a, b in
            try await db.from("transacciones").select(Self.columnasMovimiento).gte("fecha", value: desde).lte("fecha", value: hasta)
                .order("fecha", ascending: false).order("id", ascending: true).range(from: a, to: b).execute().value
        }
    }

    /// Historial completo, pero solo de las subcategorías que necesita Por pagar.
    func movimientos(deSubcategorias ids: [String]) async throws -> [Transaccion] {
        guard !ids.isEmpty else { return [] }
        return try await todas { a, b in
            try await db.from("transacciones").select(Self.columnasMovimiento).in("subcategoria_id", values: ids)
                .order("fecha", ascending: false).order("id", ascending: true).range(from: a, to: b).execute().value
        }
    }

    func crear(_ t: NuevaTransaccion) async throws {
        do {
            try await db.from("transacciones").insert(t).execute()
        } catch let error as PostgrestError where error.code == "23505" {
            // Mismo id ya guardado: el intento anterior llegó aunque se perdiera la respuesta.
        }
    }

    /// Borra una transacción por id (las RLS solo dejan borrar las del usuario).
    func borrar(id: String) async throws {
        try await db.from("transacciones").delete().eq("id", value: id).execute()
    }

    private func todas(_ pagina: (Int, Int) async throws -> [Transaccion]) async throws -> [Transaccion] {
        var todas: [Transaccion] = []
        var desde = 0
        while true {
            let filas = try await pagina(desde, desde + 999)
            todas += filas
            if filas.count < 1000 { return todas }
            desde += 1000
        }
    }
}
