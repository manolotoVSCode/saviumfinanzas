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
        try await db.from("saldos_cuentas").select("id, nombre, tipo, divisa, vendida, saldo_inicial, saldo_actual, capital_neto").execute().value
    }
    /// Ids de las cuentas que tienen al menos un movimiento (una consulta de una fila por cuenta).
    func cuentasConMovimientos(_ ids: [String]) async throws -> Set<String> {
        struct Fila: Decodable { let id: String }
        return try await withThrowingTaskGroup(of: String?.self) { grupo in
            for id in ids {
                grupo.addTask {
                    let filas: [Fila] = try await db.from("transacciones").select("id").eq("cuenta_id", value: id).limit(1).execute().value
                    return filas.isEmpty ? nil : id
                }
            }
            var conMovimientos = Set<String>()
            for try await id in grupo { if let id { conMovimientos.insert(id) } }
            return conMovimientos
        }
    }
    func patrimonio() async throws -> [FilaPatrimonio] {
        try await db.from("patrimonio_por_divisa").select("divisa, clase, rubro, importe").execute().value
    }
    func categorias() async throws -> [Categoria] {
        try await db.from("categorias").select("id, categoria, subcategoria, tipo, frecuencia_seguimiento").execute().value
    }
    func perfil() async throws -> Perfil? {
        let filas: [Perfil] = try await db.from("profiles").select("divisa_preferida, nombre").limit(1).execute().value
        return filas.first
    }
    /// Accesos de lectura en los que participa este usuario: de quién es lector y si alguien lo es de él.
    /// Un error de la base (p. ej. la tabla aún no existe) cuenta como «sin accesos»; uno de red, no.
    func accesos(_ yo: String) async throws -> (titular: String?, tieneLectores: Bool) {
        struct Fila: Decodable { let propietario_id: String; let lector_id: String }
        do {
            let filas: [Fila] = try await db.from("lectores").select("propietario_id, lector_id").execute().value
            return (filas.first { $0.lector_id.lowercased() == yo }?.propietario_id,
                    filas.contains { $0.propietario_id.lowercased() == yo })
        } catch is PostgrestError {
            return (nil, false)
        }
    }
    /// Lector: la alerta de emergencia más reciente sin ver (las RLS solo dejan ver las de su titular, de las últimas 24 h).
    func alertaSinVer() async throws -> AlertaRecibida? {
        let filas: [AlertaRecibida] = try await db.from("alertas_emergencia").select(AlertaRecibida.columnas)
            .is("vista_en", value: nil).order("creada", ascending: false).limit(1).execute().value
        return filas.first
    }
    func alerta(id: String) async throws -> AlertaRecibida? {
        let filas: [AlertaRecibida] = try await db.from("alertas_emergencia").select(AlertaRecibida.columnas)
            .eq("id", value: id).limit(1).execute().value
        return filas.first
    }
    /// Al ver una alerta dejan de repetirse todas las que no había visto (las RLS limitan a su titular).
    /// Sin devolver filas: el lector no tiene permiso para leer todas las columnas.
    func marcarVistas() async throws {
        struct Vista: Encodable { let vista_en: Date }
        try await db.from("alertas_emergencia").update(Vista(vista_en: .now), returning: .minimal)
            .is("vista_en", value: nil).execute()
    }
    /// Hash del código de coacción del usuario (nil si no tiene, o si la tabla aún no existe).
    func hashCodigoEmergencia() async throws -> String? {
        struct Fila: Decodable { let hash: String }
        do {
            let filas: [Fila] = try await db.from("codigos_emergencia").select("hash").limit(1).execute().value
            return filas.first?.hash
        } catch is PostgrestError {
            return nil
        }
    }
    // MARK: Alertas de cripto (umbrales en la web, Inversiones → Criptomonedas)

    func umbralesCripto() async throws -> [UmbralCripto] {
        try await db.from("alertas_cripto").select("simbolo, nivel_arriba, nivel_abajo").execute().value
    }
    func comprasCripto() async throws -> [CompraCripto] {
        try await db.from("criptomonedas").select("simbolo, cantidad, precio_compra, divisa_compra").execute().value
    }
    /// Precio en USD por símbolo (la misma Edge Function que la web, que pregunta a CoinGecko).
    func preciosCripto(_ simbolos: [String]) async throws -> [String: Double] {
        struct Peticion: Encodable { let symbols: [String] }
        struct Precio: Decodable { let price: Double }
        let r: [String: Precio] = try await db.functions.invoke("crypto-prices", options: FunctionInvokeOptions(body: Peticion(symbols: simbolos)))
        return r.mapValues(\.price)
    }
    /// Claves descartadas (tabla compartida con la página Alertas de la web).
    func alertasDescartadas() async throws -> Set<String> {
        struct Fila: Decodable { let alert_key: String }
        let filas: [Fila] = try await db.from("alert_dismissals").select("alert_key").execute().value
        return Set(filas.map(\.alert_key))
    }
    func descartarAlerta(_ clave: String, usuario: UUID) async throws {
        struct Fila: Encodable { let user_id: UUID; let alert_key: String }
        try await db.from("alert_dismissals").upsert(Fila(user_id: usuario, alert_key: clave), onConflict: "user_id,alert_key").execute()
    }

    func pendientes() async throws -> [Pendiente] {
        try await db.from("transaction_pendings").select("id, concepto, tipo, monto_esperado, monto_cobrado, divisa, fecha_esperada, estado, fecha_cobro").execute().value
    }
    /// Provisiones de CxP (se crean en la web). Un error de la base (la tabla aún no existe
    /// o el lector no tiene permiso) cuenta como «ninguna»; uno de red, no.
    func provisiones() async throws -> [ProvisionCxP] {
        do {
            return try await db.from("provisiones_cxp").select("id, concepto, monto, divisa, fecha, frecuencia, estado, notas")
                .eq("estado", value: "pendiente").order("fecha").execute().value
        } catch is PostgrestError {
            return []
        }
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
    /// `pagina` nil: todas las que cumplen el filtro (para un periodo de un mes, con su total).
    func movimientos(filtro f: FiltroMovimientos, idsCategoria: [String], rango: (desde: String, hasta: String)?, pagina: Int?) async throws -> [Transaccion] {
        func consulta() -> PostgrestFilterBuilder {
            var q = db.from("transacciones").select(Self.columnasMovimiento)
            if let c = f.cuentaId { q = q.eq("cuenta_id", value: c) }
            if f.tipo == .gastos { q = q.gt("gasto", value: 0) }
            if f.tipo == .ingresos { q = q.gt("ingreso", value: 0) }
            if let r = rango { q = q.gte("fecha", value: r.desde).lte("fecha", value: r.hasta) }
            if let o = Movimientos.condicionBusqueda(f.texto, idsCategoria: idsCategoria) { q = q.or(o) }
            return q
        }
        guard let pagina else {
            return try await todas { a, b in
                try await consulta().order("fecha", ascending: false).order("id", ascending: true).range(from: a, to: b).execute().value
            }
        }
        let desde = pagina * Self.tamanoPagina
        return try await consulta().order("fecha", ascending: false).order("id", ascending: true)
            .range(from: desde, to: desde + Self.tamanoPagina - 1).execute().value
    }

    func movimiento(id: String) async throws -> Transaccion? {
        let filas: [Transaccion] = try await db.from("transacciones").select(Self.columnasMovimiento).eq("id", value: id).limit(1).execute().value
        return filas.first
    }

    // MARK: Checklist (se crea y se edita en la web; aquí solo se marca)

    /// Sin la tabla o sin la columna `repetir` (migraciones aún no aplicadas) no se rompe la carga:
    /// sin `repetir` se piden las demás columnas, y sin tabla no hay tareas. Cualquier otro error se propaga.
    func checklist() async throws -> [TareaChecklist] {
        let falta: Set<String> = ["42703", "42P01", "PGRST204", "PGRST205"]
        func pedir(_ columnas: String) async throws -> [TareaChecklist] {
            try await db.from("checklist_items").select(columnas).eq("completada", value: false).order("created_at").execute().value
        }
        do {
            return try await pedir("id, texto, fecha, transaccion_id, repetir, completada")
        } catch let e as PostgrestError where falta.contains(e.code ?? "") {
            do {
                return try await pedir("id, texto, fecha, transaccion_id, completada")
            } catch let e as PostgrestError where falta.contains(e.code ?? "") {
                return []
            }
        }
    }

    func marcarTarea(id: String, _ cambio: CambioChecklist) async throws {
        try await db.from("checklist_items").update(cambio).eq("id", value: id).execute()
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

    func actualizar(id: String, _ cambio: CambioTransaccion) async throws {
        try await db.from("transacciones").update(cambio).eq("id", value: id).execute()
    }

    /// El update solo se aplica si la fila sigue como `p` (otro cobro hecho entretanto en la web no se pisa).
    struct CambioEnOtroSitio: Error {}

    private func siSigueIgual(_ q: PostgrestFilterBuilder, _ p: Pendiente) -> PostgrestFilterBuilder {
        var q = q.eq("id", value: p.id).eq("estado", value: p.estado)
        if let c = p.montoCobrado { q = q.gte("monto_cobrado", value: c - 0.005).lte("monto_cobrado", value: c + 0.005) }
        else { q = q.is("monto_cobrado", value: nil) }
        return q
    }

    private func comprobarUnaFila(_ q: PostgrestFilterBuilder) async throws {
        struct Fila: Decodable { let id: String }
        let filas: [Fila] = try await q.select("id").execute().value
        if filas.isEmpty { throw CambioEnOtroSitio() }
    }

    /// Como «Cobrar» en la web (markAsPaid): suma `monto` a lo cobrado; no crea ningún movimiento.
    func cobrarPendiente(_ p: Pendiente, monto: Double, fecha: String) async throws {
        struct Cobro: Encodable { let monto_cobrado: Double; let fecha_cobro: String; let estado: String }
        let r = Pendientes.cobro(p, monto: monto)
        try await comprobarUnaFila(siSigueIgual(db.from("transaction_pendings")
            .update(Cobro(monto_cobrado: r.montoCobrado, fecha_cobro: fecha, estado: r.estado)), p))
    }

    /// Deshacer: `despues` (lo que dejó el cobro) vuelve a `antes`, solo si nadie lo cambió entretanto.
    func reponerPendiente(_ antes: Pendiente, desde despues: Pendiente) async throws {
        struct Estado: Encodable {
            let monto_cobrado: Double?; let fecha_cobro: String?; let estado: String
            func encode(to encoder: Encoder) throws {
                var c = encoder.container(keyedBy: CodingKeys.self)
                try c.encode(monto_cobrado, forKey: .monto_cobrado)
                try c.encode(fecha_cobro, forKey: .fecha_cobro)
                try c.encode(estado, forKey: .estado)
            }
            enum CodingKeys: String, CodingKey { case monto_cobrado, fecha_cobro, estado }
        }
        try await comprobarUnaFila(siSigueIgual(db.from("transaction_pendings")
            .update(Estado(monto_cobrado: antes.montoCobrado, fecha_cobro: antes.fechaCobro, estado: antes.estado)), despues))
    }

    func borrarPendiente(id: String) async throws {
        try await db.from("transaction_pendings").delete().eq("id", value: id).execute()
    }

    /// Borra una transacción por id (las RLS solo dejan borrar las del usuario).
    func borrar(id: String) async throws {
        try await db.from("transacciones").delete().eq("id", value: id).execute()
    }

    // MARK: Panel de las apps (solo el administrador: cada función de la base rechaza a los demás con 42501)

    private struct Dias: Encodable { let p_dias: Int }
    func panelShare() async throws -> PanelShare {
        try await db.rpc("share_panel_v3", params: Dias(p_dias: 30)).execute().value
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
