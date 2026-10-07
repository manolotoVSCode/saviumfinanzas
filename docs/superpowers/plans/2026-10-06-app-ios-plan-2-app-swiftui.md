# App iOS · Plan 2: la app SwiftUI — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App nativa para iPhone (iOS 26, SwiftUI, Liquid Glass) con cinco pestañas (Resumen, Movimientos, Patrimonio, Pendientes y Suscripciones) y una hoja para apuntar gastos e ingresos. Lee y escribe en el mismo Supabase que la web.

**Architecture:**
- `ios/SaviumCore` es un paquete Swift con los modelos y toda la lógica pura (port de `src/lib/finance`), verificada con `swift test` contra los fixtures de `shared/fixtures/`.
- `ios/Savium` es la app:
  - `Repositorio` habla con Supabase.
  - `DatosStore` (`@Observable`) carga los datos de todas las pestañas en paralelo.
  - `MovimientosStore` pagina la lista de transacciones.
  - Las vistas solo pintan.
- El proyecto Xcode se genera con XcodeGen desde `ios/project.yml`.

**Tech Stack:** Swift 6.2, SwiftUI (iOS 26), Swift Charts, LocalAuthentication, AuthenticationServices, `supabase-swift` 2.x (SPM), Swift Testing, XcodeGen.

**Spec:** `docs/superpowers/specs/2026-10-06-app-ios-nativa-design.md`. El plan 1 (`docs/superpowers/plans/2026-10-06-app-ios-plan-1-datos-compartidos.md`) ya está hecho: vistas `saldos_cuentas` y `patrimonio_por_divisa` en producción y fixtures en `shared/fixtures/`.

## Global Constraints

- **Requisito previo:** `xcodebuild -version` debe decir **Xcode 26** o posterior. Si no, **para** e informa al usuario. Solo la tarea 1 (TypeScript) se puede hacer sin Xcode 26.
- iOS mínimo **26.0**. Única dependencia externa de la app: `supabase-swift` (`https://github.com/supabase/supabase-swift`, `from: "2.0.0"`). XcodeGen es herramienta de desarrollo, no dependencia (ya instalado en `/opt/homebrew/bin/xcodegen`).
- Bundle ID `com.manoloto.savium`; nombre visible **Savium**; color de acento **#239005** (el trazo de `public/favicon.svg`).
- Todo texto de UI, nombre nuevo y commit, en **español**. Commits por tema terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Nunca `git push`.**
- La app **no** escribe en ninguna tabla salvo `transacciones` (insertar). No toca `subscription_services` ni `transaction_pendings`.
- No se guardan datos financieros en disco. Solo en `UserDefaults`: la divisa elegida y la última cuenta usada.
- Nunca introduzcas la contraseña real del usuario. Para ver la app con datos reales, el usuario inicia sesión él mismo en el panel del simulador.
- Zona horaria: la app usa `Calendar.current`. Los tests de `SaviumCore` usan un calendario gregoriano con `America/Mexico_City`.
- **Paridad con la web:** las funciones de `SaviumCore` son ports fieles de `src/lib/finance`, incluidas las particularidades de fechas (las transacciones se leen a medianoche UTC, como `new Date(iso)` en la web). **Antes de portar cada función, relee el archivo TypeScript actual**, porque una tarea paralela puede haberlo cambiado. Los fixtures son el contrato: si el TS cambió y el fixture también, porta lo nuevo.
- Verificación:
  - Lógica: `swift test --package-path ios/SaviumCore`.
  - App: `cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build`.
  - Web, en la tarea 1: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`.
- Simulador para la verificación visual: el primer iPhone disponible de `xcrun simctl list devices available`. Usa las herramientas `mcp__Claude_Code_iOS_Simulator__*` para `build`, `launch` y `screenshot`.

## Review Focus

1. **Fin de mes en Por pagar.** `setMonth` en JavaScript desborda (31 ene + 1 mes = 3 mar) y `Calendar.date(byAdding:.month)` recorta (28 feb). Un pago recurrente o un préstamo cuyo último cargo fue un día 29-31 puede tener una fecha estimada distinta en la app y en la web. Se acepta y se documenta en `PorPagar.swift`. Un test lo fija (tarea 5).
2. **Apuntar el mismo gasto dos veces por doble toque o reintento.** El botón Guardar se desactiva mientras guarda y el reintento solo se ofrece tras un error. Lo cubre el test de `FormularioMovimiento` (tarea 13), más la prueba manual.
3. **Importes con coma decimal o vacíos.** `Formato.parsearImporte("1.234,5")`, `"12,5"`, `""` y `"abc"` no deben guardar basura. Tests en la tarea 7.
4. **Sesión caducada a mitad de uso.** Al recibir `signedOut` sin haber pulsado «Cerrar sesión», se vuelve al login con el mensaje «Tu sesión ha caducado». Lo prueba la tarea 8 cerrando la sesión desde el panel de Supabase, o en su defecto con `supabase.auth.signOut(scope: .others)` desde la web.
5. **Un iPhone sin código ni Face ID no debe quedarse bloqueado para siempre.** Si `canEvaluatePolicy(.deviceOwnerAuthentication)` es falso, no se bloquea. Esto también permite usar el simulador. Lo fija un test de `Bloqueo` con un evaluador falso (tarea 8).

---

### Task 1: Inversiones como función pura en la web y su fixture (sin Xcode 26)

**Files:**
- Modify: `src/lib/finance/investmentReturn.ts`
- Create: `src/lib/finance/investmentReturn.test.ts` (si ya existe, añade los `describe` nuevos al final)
- Modify: `src/hooks/useInvestments.ts:62-76`
- Modify: `src/pages/movil/InversionesMovil.tsx` (cálculo de `totals`)
- Create: `shared/fixtures/inversiones.json`
- Modify: `src/lib/finance/fixturesCompartidos.test.ts`

**Interfaces:**
- Produces:
  - `valorActualInversion(inv: { id: string; valor_actual: number; monto_invertido: number }, valuations: { inversion_id: string; fecha: string; valor: number }[], saldoCuenta: number | undefined): number`
  - `totalesInversiones(invs: { activa?: boolean; moneda: string; monto_invertido: number; valor_actual: number }[], convertCurrency: ConvertCurrency, currency: CurrencyCode): { invertido: number; valor: number }`
  - Fixture `inversiones.json`, que leerá la tarea 6 en Swift.

- [ ] **Step 1: Tests que fallan**

Añade a `src/lib/finance/investmentReturn.test.ts`. Crea el archivo si no existe, con `import { describe, expect, it } from 'vitest';`.

```ts
import { totalesInversiones, valorActualInversion } from './investmentReturn';

describe('valorActualInversion', () => {
  const inv = { id: 'i1', valor_actual: 50, monto_invertido: 40 };
  it('usa la última valuación por fecha', () => {
    const vals = [
      { inversion_id: 'i1', fecha: '2026-06-01', valor: 1200 },
      { inversion_id: 'i1', fecha: '2026-01-01', valor: 1000 },
      { inversion_id: 'otra', fecha: '2026-09-01', valor: 9 },
    ];
    expect(valorActualInversion(inv, vals, 777)).toBe(1200);
  });
  it('sin valuaciones usa el saldo de la cuenta vinculada', () => {
    expect(valorActualInversion(inv, [], 600)).toBe(600);
  });
  it('sin valuaciones ni cuenta usa valor_actual y luego monto_invertido', () => {
    expect(valorActualInversion(inv, [], undefined)).toBe(50);
    expect(valorActualInversion({ ...inv, valor_actual: 0 }, [], undefined)).toBe(40);
  });
});

describe('totalesInversiones', () => {
  const RATES = { MXN: 1, USD: 20, EUR: 22 };
  const convert = (a: number, f: 'MXN' | 'USD' | 'EUR', t: 'MXN' | 'USD' | 'EUR') => (f === t ? a : (a * RATES[f]) / RATES[t]);
  it('suma solo las activas, convertidas', () => {
    const r = totalesInversiones([
      { activa: true, moneda: 'MXN', monto_invertido: 1000, valor_actual: 1200 },
      { moneda: 'USD', monto_invertido: 500, valor_actual: 600 },
      { activa: false, moneda: 'EUR', monto_invertido: 100, valor_actual: 150 },
    ], convert, 'MXN');
    expect(r).toEqual({ invertido: 11000, valor: 13200 });
  });
});
```

Run: `npx vitest run src/lib/finance/investmentReturn.test.ts`
Expected: FAIL; `valorActualInversion` y `totalesInversiones` no existen.

- [ ] **Step 2: Implementar**

Añade a `src/lib/finance/investmentReturn.ts`:

```ts
import type { ConvertCurrency, CurrencyCode } from './dashboardMetrics';
import { toCurrencyCode } from './currency';

/** Valor actual: última valuación; si no hay, saldo de la cuenta vinculada; si no, valor_actual o monto_invertido. */
export const valorActualInversion = (
  inv: { id: string; valor_actual: number; monto_invertido: number },
  valuations: { inversion_id: string; fecha: string; valor: number }[],
  saldoCuenta: number | undefined,
): number => {
  const ultima = valuations
    .filter((v) => v.inversion_id === inv.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-1)[0];
  return ultima?.valor ?? (saldoCuenta !== undefined ? saldoCuenta : inv.valor_actual || inv.monto_invertido || 0);
};

/** Invertido y valor de las inversiones activas, convertidos a `currency` (como InversionesMovil). */
export const totalesInversiones = (
  invs: { activa?: boolean; moneda: string; monto_invertido: number; valor_actual: number }[],
  convertCurrency: ConvertCurrency,
  currency: CurrencyCode,
): { invertido: number; valor: number } =>
  invs
    .filter((i) => i.activa !== false)
    .reduce(
      (acc, i) => {
        const de = toCurrencyCode(i.moneda, currency);
        acc.invertido += de === currency ? i.monto_invertido || 0 : convertCurrency(i.monto_invertido || 0, de, currency);
        const valor = i.valor_actual || i.monto_invertido || 0;
        acc.valor += de === currency ? valor : convertCurrency(valor, de, currency);
        return acc;
      },
      { invertido: 0, valor: 0 },
    );
```

En `src/hooks/useInvestments.ts`, sustituye el cálculo de `lastVal` y `valor` dentro del `map` por:

```ts
      const saldoCuenta = i.cuenta_id ? saldoPorCuenta.get(i.cuenta_id) : undefined;
      const valor = valorActualInversion(i, valuations, saldoCuenta);
```

Importa `valorActualInversion` desde `@/lib/finance/investmentReturn`.

En `src/pages/movil/InversionesMovil.tsx`, sustituye el `useMemo` de `totals` por:

```ts
  const totals = useMemo(() => totalesInversiones(activas, convertCurrency, currency), [activas, convertCurrency, currency]);
```

Quita los imports que queden sin uso.

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: todo en verde.

- [ ] **Step 3: Fixture y runner**

`shared/fixtures/inversiones.json`:

```json
{
  "tasas": { "MXN": 1, "USD": 20, "EUR": 22 },
  "moneda": "MXN",
  "inversiones": [
    { "id": "i1", "nombre": "Fondo", "moneda": "MXN", "monto_invertido": 1000, "valor_actual": 0, "activa": true, "cuenta_id": null },
    { "id": "i2", "nombre": "Bono", "moneda": "USD", "monto_invertido": 500, "valor_actual": 0, "activa": true, "cuenta_id": "c1" },
    { "id": "i3", "nombre": "Vieja", "moneda": "EUR", "monto_invertido": 100, "valor_actual": 150, "activa": false, "cuenta_id": null },
    { "id": "i4", "nombre": "Sin capital", "moneda": "MXN", "monto_invertido": 0, "valor_actual": 0, "activa": true, "cuenta_id": null }
  ],
  "valuaciones": [
    { "inversion_id": "i1", "fecha": "2026-06-01", "valor": 1200 },
    { "inversion_id": "i1", "fecha": "2026-01-01", "valor": 1000 },
    { "inversion_id": "i4", "fecha": "2026-02-01", "valor": 300 }
  ],
  "saldosCuenta": { "c1": 600 },
  "esperado": {
    "porInversion": {
      "i1": { "valor": 1200, "invertido": 1000, "delta": 200, "pct": 20 },
      "i2": { "valor": 600, "invertido": 500, "delta": 100, "pct": 20 },
      "i3": { "valor": 150, "invertido": 100, "delta": 50, "pct": 50 },
      "i4": { "valor": 300, "invertido": 300, "delta": 0, "pct": 0 }
    },
    "totales": { "invertido": 11000, "valor": 13500 }
  }
}
```

Añade a `src/lib/finance/fixturesCompartidos.test.ts`:

```ts
import inversiones from '../../../shared/fixtures/inversiones.json';
import { investmentReturn, totalesInversiones, valorActualInversion } from './investmentReturn';
import type { Investment, InvestmentValuation } from '@/types/investments';

describe('fixtures compartidos · inversiones', () => {
  const saldos = inversiones.saldosCuenta as Record<string, number>;
  const conValor = inversiones.inversiones.map((i) => ({
    ...i,
    valor_actual: valorActualInversion(i, inversiones.valuaciones, i.cuenta_id ? saldos[i.cuenta_id] : undefined),
    saldo_cuenta: i.cuenta_id ? saldos[i.cuenta_id] : null,
  }));
  conValor.forEach((i) => {
    it(`rendimiento de ${i.id}`, () => {
      const esperado = (inversiones.esperado.porInversion as Record<string, { valor: number; invertido: number; delta: number; pct: number }>)[i.id];
      const r = investmentReturn(i as unknown as Investment, inversiones.valuaciones as unknown as InvestmentValuation[]);
      expect(r.valor).toBeCloseTo(esperado.valor, TOL);
      expect(r.invertido).toBeCloseTo(esperado.invertido, TOL);
      expect(r.delta).toBeCloseTo(esperado.delta, TOL);
      expect(r.pct).toBeCloseTo(esperado.pct, TOL);
    });
  });
  it('totales de las activas', () => {
    const r = totalesInversiones(conValor, convertir(inversiones.tasas), inversiones.moneda as CurrencyCode);
    expect(r.invertido).toBeCloseTo(inversiones.esperado.totales.invertido, TOL);
    expect(r.valor).toBeCloseTo(inversiones.esperado.totales.valor, TOL);
  });
});
```

Run: `npx vitest run src/lib/finance/fixturesCompartidos.test.ts`
Expected: PASS (21 + 5 = 26). Si falla un valor esperado, la referencia es el TypeScript: revisa el cálculo a mano y corrige el fixture, nunca el código.

- [ ] **Step 4: Verificación y commit**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: verde, 0 errores de lint.

```bash
git add src/lib/finance/investmentReturn.ts src/lib/finance/investmentReturn.test.ts src/hooks/useInvestments.ts src/pages/movil/InversionesMovil.tsx shared/fixtures/inversiones.json src/lib/finance/fixturesCompartidos.test.ts
git commit -m "Valor y totales de inversiones como funciones puras, con fixture compartido para la app iOS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Esqueleto del proyecto iOS

**Files:**
- Create: `ios/project.yml`, `ios/README.md`, `ios/.gitignore`
- Create: `ios/Savium/App/SaviumApp.swift`
- Create: `ios/SaviumCore/Package.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Divisas.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/Fixtures.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/DivisasTests.swift`

**Interfaces:**
- Produces:
  - `enum Divisa: String { MXN, USD, EUR }` con `init(codigo: String?, fallback: Divisa)`.
  - `typealias Tasas = [Divisa: Double]`.
  - `Conversion.convertir(_:de:a:tasas:)`, `Conversion.tasasRespaldo` y `Conversion.tasas(desdeRespuesta: Data) throws -> Tasas`.
  - En los tests: `Fixtures.cargar(_ nombre: String, como: T.Type)` y `Fixtures.calendarioMX`.

- [ ] **Step 1: Comprobar las herramientas**

Run: `xcodebuild -version | head -1 && xcodegen --version && xcrun simctl list devices available | grep -m1 iPhone`
Expected: `Xcode 26.x`, una versión de XcodeGen y al menos un iPhone. Si no hay Xcode 26, **para** e informa al usuario. Si no hay simuladores, ejecuta `xcodebuild -downloadPlatform iOS` y repite.

- [ ] **Step 2: Paquete `SaviumCore` y test de divisas que falla**

`ios/SaviumCore/Package.swift`:

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "SaviumCore",
    platforms: [.iOS(.v26), .macOS(.v15)],
    products: [.library(name: "SaviumCore", targets: ["SaviumCore"])],
    targets: [
        .target(name: "SaviumCore"),
        .testTarget(name: "SaviumCoreTests", dependencies: ["SaviumCore"]),
    ]
)
```

`ios/SaviumCore/Tests/SaviumCoreTests/Fixtures.swift`:

```swift
import Foundation

/// Lee los fixtures compartidos con la web (shared/fixtures, ver su README).
enum Fixtures {
    static let carpeta = URL(filePath: #filePath)
        .deletingLastPathComponent()          // SaviumCoreTests
        .appending(path: "../../../../shared/fixtures")
        .standardized

    static func cargar<T: Decodable>(_ nombre: String, como: T.Type) throws -> T {
        let data = try Data(contentsOf: carpeta.appending(path: "\(nombre).json"))
        return try JSONDecoder().decode(T.self, from: data)
    }

    /// La zona en la que se calcularon los fixtures.
    static let calendarioMX: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Mexico_City")!
        return c
    }()
}
```

`ios/SaviumCore/Tests/SaviumCoreTests/DivisasTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixtureDivisas: Decodable {
    struct Caso: Decodable { let nombre: String; let importe: Double; let de: Divisa; let a: Divisa; let esperado: Double }
    let tasas: Tasas
    let casos: [Caso]
}

@Suite("Divisas")
struct DivisasTests {
    @Test("fixture compartido divisas.json")
    func fixture() throws {
        let f = try Fixtures.cargar("divisas", como: FixtureDivisas.self)
        for c in f.casos {
            #expect(abs(Conversion.convertir(c.importe, de: c.de, a: c.a, tasas: f.tasas) - c.esperado) < 1e-6, "\(c.nombre)")
        }
    }

    @Test("código desconocido cae en el fallback")
    func codigoDesconocido() {
        #expect(Divisa(codigo: "GBP", fallback: .USD) == .USD)
        #expect(Divisa(codigo: nil, fallback: .MXN) == .MXN)
        #expect(Divisa(codigo: "EUR", fallback: .MXN) == .EUR)
    }

    @Test("tasas desde la respuesta de exchangerate-api: se invierten a MXN por unidad")
    func tasasDesdeRespuesta() throws {
        let json = #"{"base":"MXN","rates":{"MXN":1,"USD":0.05,"EUR":0.04}}"#
        let t = try Conversion.tasas(desdeRespuesta: Data(json.utf8))
        #expect(t[.MXN] == 1)
        #expect(abs(t[.USD]! - 20) < 1e-9)
        #expect(abs(t[.EUR]! - 25) < 1e-9)
    }
}
```

Crea `ios/SaviumCore/Sources/SaviumCore/Divisas.swift` vacío (solo `import Foundation`) para que el paquete compile.

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación (`cannot find 'Conversion'`, `cannot find type 'Divisa'`).

- [ ] **Step 3: Implementar `Divisas.swift`**

```swift
import Foundation

/// Divisas que maneja Savium. Igual que CurrencyCode en la web.
public enum Divisa: String, Codable, CaseIterable, Sendable, Identifiable, CodingKeyRepresentable {
    case MXN, USD, EUR
    public var id: String { rawValue }

    /// toCurrencyCode de la web: código libre de la BD → divisa soportada, o `fallback`.
    public init(codigo: String?, fallback: Divisa) {
        self = codigo.flatMap(Divisa.init(rawValue:)) ?? fallback
    }
}

/// MXN por unidad de cada divisa (MXN = 1).
public typealias Tasas = [Divisa: Double]

public enum Conversion {
    /// Las mismas de respaldo que useExchangeRates.
    public static let tasasRespaldo: Tasas = [.MXN: 1, .USD: 20, .EUR: 22]

    /// convertWithRates de la web: siempre pasando por MXN.
    public static func convertir(_ importe: Double, de: Divisa, a: Divisa, tasas: Tasas) -> Double {
        if de == a { return importe }
        let enMXN = de == .MXN ? importe : importe * (tasas[de] ?? tasasRespaldo[de]!)
        return a == .MXN ? enMXN : enMXN / (tasas[a] ?? tasasRespaldo[a]!)
    }

    /// Respuesta de https://api.exchangerate-api.com/v4/latest/MXN → MXN por unidad.
    public static func tasas(desdeRespuesta data: Data) throws -> Tasas {
        struct Respuesta: Decodable { let rates: [String: Double] }
        let r = try JSONDecoder().decode(Respuesta.self, from: data)
        guard let usd = r.rates["USD"], let eur = r.rates["EUR"], usd > 0, eur > 0 else {
            throw URLError(.cannotParseResponse)
        }
        return [.MXN: 1, .USD: 1 / usd, .EUR: 1 / eur]
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS (3 tests).

- [ ] **Step 4: Proyecto de la app con XcodeGen**

`ios/project.yml`:

```yaml
name: Savium
options:
  bundleIdPrefix: com.manoloto
  deploymentTarget:
    iOS: "26.0"
  developmentLanguage: es
packages:
  Supabase:
    url: https://github.com/supabase/supabase-swift
    from: "2.0.0"
  SaviumCore:
    path: SaviumCore
targets:
  Savium:
    type: application
    platform: iOS
    sources: [Savium]
    dependencies:
      - package: Supabase
      - package: SaviumCore
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.manoloto.savium
        MARKETING_VERSION: "1.0"
        CURRENT_PROJECT_VERSION: "1"
        GENERATE_INFOPLIST_FILE: YES
        INFOPLIST_KEY_CFBundleDisplayName: Savium
        INFOPLIST_KEY_NSFaceIDUsageDescription: "Savium usa Face ID para proteger tus datos financieros."
        INFOPLIST_KEY_UILaunchScreen_Generation: YES
        INFOPLIST_KEY_UISupportedInterfaceOrientations: UIInterfaceOrientationPortrait
        TARGETED_DEVICE_FAMILY: "1"
        SWIFT_VERSION: "6.0"
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: AccentColor
```

`ios/Savium/App/SaviumApp.swift` (provisional; la tarea 8 lo sustituye):

```swift
import SwiftUI

@main
struct SaviumApp: App {
    var body: some Scene {
        WindowGroup { Text("Savium") }
    }
}
```

`ios/.gitignore`:

```
Savium.xcodeproj/
SaviumCore/.build/
DerivedData/
*.xcuserstate
```

`ios/README.md`:

```markdown
# Savium para iPhone

App nativa (SwiftUI, iOS 26). Lee y escribe en el mismo Supabase que la web.

- Generar el proyecto: `cd ios && xcodegen generate` (el `.xcodeproj` no se versiona).
- Tests de la lógica: `swift test --package-path ios/SaviumCore` (leen `shared/fixtures`).
- Compilar: `xcodebuild -project ios/Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' build`.
- Diseño: `docs/superpowers/specs/2026-10-06-app-ios-nativa-design.md`.
```

Run: `cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build; cd ..`
Expected: `** BUILD SUCCEEDED **`, o sin errores con `-quiet`. La primera vez se descarga `supabase-swift`.

- [ ] **Step 5: Commit**

```bash
git add ios/project.yml ios/README.md ios/.gitignore ios/Savium ios/SaviumCore
git commit -m "Esqueleto de la app iOS: proyecto XcodeGen, paquete SaviumCore y conversión de divisas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Fechas, modelos y vencidos

**Files:**
- Create: `ios/SaviumCore/Sources/SaviumCore/Fechas.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Modelos.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Pendientes.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/PendientesTests.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/ModelosTests.swift`

**Interfaces:**
- Consumes: `Divisa`, `Tasas` y `Conversion` (tarea 2).
- Produces:
  - `Fechas`: `diaLocal(_:calendario:) -> Date?`, `medianocheUTC(_:) -> Date?`, `horaLocal(_:calendario:) -> Date?`, `isoUTC(_:) -> String`, `isoLocal(_:calendario:) -> String`, `finMesAnterior(_:calendario:) -> Date`, `diasHasta(_:now:calendario:) -> Int`.
  - Modelos `Codable` en snake_case de la BD:
    - `Cuenta(id, nombre, tipo, divisa, vendida, saldoInicial, saldoActual)`
    - `Categoria(id, categoria, subcategoria, tipo, frecuenciaSeguimiento?)`
    - `Transaccion(id, fecha, comentario, ingreso, gasto, divisa, cuentaId, subcategoriaId)` con `importe` y `fechaUTC`
    - `NuevaTransaccion(cuentaId, fecha, comentario, ingreso, gasto, subcategoriaId, divisa, userId)` (`Encodable`)
    - `Pendiente(id, concepto?, tipo?, montoEsperado, montoCobrado?, divisa, fechaEsperada?, estado)`
    - `Suscripcion(id, serviceName, active, frecuencia, proximoPago, ultimoPagoMonto)`
    - `Inversion(id, nombre, moneda, montoInvertido, valorActual, activa, cuentaId?)`
    - `Valuacion(inversionId, fecha, valor)`
    - `FilaPatrimonio(divisa, clase, rubro, importe)`
    - `Perfil(divisaPreferida)`
  - `Pendientes.estaActivo(_:)`, `Pendientes.estaVencido(_:now:calendario:)`, `Pendientes.resumen(_:tasas:moneda:now:calendario:) -> Pendientes.Resumen`, con `filas: [Fila(pendiente, restante, vencido)]`, `total` y `vencidos`.

- [ ] **Step 1: Tests que fallan**

`ios/SaviumCore/Tests/SaviumCoreTests/PendientesTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixtureVencidos: Decodable {
    struct Esperado: Decodable { let orden: [String]; let vencidos: [String]; let total: Double }
    struct Caso: Decodable { let nombre: String; let moneda: Divisa; let esperado: Esperado }
    let tasas: Tasas
    let now: String
    let pendientes: [Pendiente]
    let casos: [Caso]
}

@Suite("Pendientes")
struct PendientesTests {
    let cal = Fixtures.calendarioMX

    @Test("fixture compartido vencidos.json")
    func fixture() throws {
        let f = try Fixtures.cargar("vencidos", como: FixtureVencidos.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for c in f.casos {
            let r = Pendientes.resumen(f.pendientes, tasas: f.tasas, moneda: c.moneda, now: now, calendario: cal)
            #expect(r.filas.map(\.pendiente.id) == c.esperado.orden, "\(c.nombre)")
            #expect(r.filas.filter(\.vencido).map(\.pendiente.id) == c.esperado.vencidos, "\(c.nombre)")
            #expect(abs(r.total - c.esperado.total) < 1e-6, "\(c.nombre)")
            #expect(r.vencidos == c.esperado.vencidos.count)
        }
    }

    @Test("fechas: medianoche UTC vs día local, y fin del mes anterior")
    func fechas() throws {
        let d = try #require(Fechas.medianocheUTC("2026-08-05"))
        #expect(Fechas.isoUTC(d) == "2026-08-05")
        #expect(Fechas.isoLocal(d, calendario: cal) == "2026-08-04")   // 18:00 del día anterior en México
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let fin = Fechas.finMesAnterior(now, calendario: cal)
        #expect(Fechas.isoLocal(fin, calendario: cal) == "2026-08-31")
        #expect(Fechas.diasHasta("2026-09-30", now: now, calendario: cal) == 15)
        #expect(Fechas.diasHasta("2026-08-30", now: now, calendario: cal) == -16)
    }
}
```

`ios/SaviumCore/Tests/SaviumCoreTests/ModelosTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

@Suite("Modelos")
struct ModelosTests {
    @Test("decodifica filas de PostgREST en snake_case")
    func decodifica() throws {
        let cuenta = #"{"id":"a","nombre":"Banco","tipo":"Banco","divisa":"MXN","vendida":false,"saldo_inicial":10,"saldo_actual":12.5,"user_id":"u","created_at":"x"}"#
        let c = try JSONDecoder().decode(Cuenta.self, from: Data(cuenta.utf8))
        #expect(c.saldoActual == 12.5 && c.saldoInicial == 10 && !c.vendida)

        let tx = #"{"id":"t","fecha":"2026-08-05","comentario":"Luz","ingreso":0,"gasto":540,"divisa":"MXN","cuenta_id":"a","subcategoria_id":"s"}"#
        let t = try JSONDecoder().decode(Transaccion.self, from: Data(tx.utf8))
        #expect(t.importe == -540 && t.cuentaId == "a" && t.subcategoriaId == "s")

        let sub = #"{"id":"s1","service_name":"Netflix","active":true,"frecuencia":"Mensual","proximo_pago":"2026-09-20","ultimo_pago_monto":199}"#
        #expect(try JSONDecoder().decode(Suscripcion.self, from: Data(sub.utf8)).serviceName == "Netflix")
    }

    @Test("codifica la transacción nueva con las columnas de la tabla")
    func codifica() throws {
        let n = NuevaTransaccion(cuentaId: "a", fecha: "2026-10-06", comentario: "Café", ingreso: 0, gasto: 45, subcategoriaId: "s", divisa: "MXN", userId: "u")
        let json = try #require(String(data: JSONEncoder().encode(n), encoding: .utf8))
        for clave in ["\"cuenta_id\"", "\"subcategoria_id\"", "\"user_id\"", "\"fecha\":\"2026-10-06\""] {
            #expect(json.contains(clave), "\(clave)")
        }
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación (`Pendiente`, `Fechas`, `Cuenta`… no existen).

- [ ] **Step 2: `Fechas.swift`**

```swift
import Foundation

/// Mismas convenciones que src/lib/finance/fechas.ts (ver shared/fixtures/README.md).
public enum Fechas {
    static let utc = TimeZone(identifier: "UTC")!
    static let calendarioUTC: Calendar = { var c = Calendar(identifier: .gregorian); c.timeZone = utc; return c }()

    private static func partes(_ iso: String) -> (Int, Int, Int)? {
        let p = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
        return p.count == 3 ? (p[0], p[1], p[2]) : nil
    }

    /// parseFechaLocal: 'YYYY-MM-DD' → medianoche local.
    public static func diaLocal(_ iso: String, calendario: Calendar) -> Date? {
        guard let (y, m, d) = partes(iso) else { return nil }
        return calendario.date(from: DateComponents(year: y, month: m, day: d))
    }

    /// new Date('YYYY-MM-DD') de la web: medianoche UTC. Así se lee Transaction.fecha.
    public static func medianocheUTC(_ iso: String) -> Date? {
        guard let (y, m, d) = partes(iso) else { return nil }
        return calendarioUTC.date(from: DateComponents(year: y, month: m, day: d))
    }

    /// 'YYYY-MM-DDTHH:mm:ss' sin zona → hora local (new Date(s) en la web).
    public static func horaLocal(_ s: String, calendario: Calendar) -> Date? {
        let f = DateFormatter()
        f.calendar = calendario
        f.timeZone = calendario.timeZone
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return f.date(from: s)
    }

    private static func iso(_ d: Date, _ c: Calendar) -> String {
        let k = c.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", k.year!, k.month!, k.day!)
    }

    /// toISOString().slice(0, 10): el día en UTC.
    public static func isoUTC(_ d: Date) -> String { iso(d, calendarioUTC) }

    /// toFechaISO: el día local.
    public static func isoLocal(_ d: Date, calendario: Calendar) -> String { iso(d, calendario) }

    /// Último instante del mes anterior: corte de datos (los movimientos del mes en curso aún no se importan).
    public static func finMesAnterior(_ now: Date, calendario: Calendar) -> Date {
        let inicioMes = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        return inicioMes.addingTimeInterval(-0.001)
    }

    /// Días naturales desde hoy (00:00 local) hasta la fecha; negativo si ya pasó.
    public static func diasHasta(_ iso: String, now: Date, calendario: Calendar) -> Int {
        guard let d = diaLocal(iso, calendario: calendario) else { return 0 }
        return Int((d.timeIntervalSince(calendario.startOfDay(for: now)) / 86_400).rounded())
    }
}
```

- [ ] **Step 3: `Modelos.swift`**

```swift
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
    public let tipo: String
    public let frecuenciaSeguimiento: String?
    enum CodingKeys: String, CodingKey {
        case id, categoria, subcategoria, tipo
        case frecuenciaSeguimiento = "frecuencia_seguimiento"
    }
    public init(id: String, categoria: String, subcategoria: String, tipo: String, frecuenciaSeguimiento: String? = nil) {
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
    /// Fecha como la lee la web (medianoche UTC).
    public var fechaUTC: Date { Fechas.medianocheUTC(fecha) ?? .distantPast }
}

/// Lo que inserta la app en `transacciones` (mismos campos que addTransaction en la web).
public struct NuevaTransaccion: Encodable, Sendable, Equatable {
    public let cuentaId: String
    public let fecha: String
    public let comentario: String
    public let ingreso: Double
    public let gasto: Double
    public let subcategoriaId: String
    public let divisa: String
    public let userId: String
    enum CodingKeys: String, CodingKey {
        case fecha, comentario, ingreso, gasto, divisa
        case cuentaId = "cuenta_id", subcategoriaId = "subcategoria_id", userId = "user_id"
    }
    public init(cuentaId: String, fecha: String, comentario: String, ingreso: Double, gasto: Double,
                subcategoriaId: String, divisa: String, userId: String) {
        self.cuentaId = cuentaId; self.fecha = fecha; self.comentario = comentario; self.ingreso = ingreso
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
```

- [ ] **Step 4: `Pendientes.swift`**

```swift
import Foundation

/// Port de src/lib/finance/pendingsSummary.ts.
public enum Pendientes {
    public static func estaActivo(_ p: Pendiente) -> Bool {
        p.estado == "pendiente" || p.estado == "cobrado_parcial"
    }

    /// Vencido: fecha esperada (día local) anterior a hoy. Lo que vence hoy aún no está vencido.
    public static func estaVencido(_ p: Pendiente, now: Date, calendario: Calendar) -> Bool {
        guard let iso = p.fechaEsperada, let d = Fechas.diaLocal(iso, calendario: calendario) else { return false }
        return d < calendario.startOfDay(for: now)
    }

    public struct Fila: Sendable, Identifiable {
        public let pendiente: Pendiente
        /// monto esperado − cobrado, en la divisa del pendiente.
        public let restante: Double
        public let vencido: Bool
        public var id: String { pendiente.id }
    }

    public struct Resumen: Sendable {
        /// Activos: vencidos primero, luego por fecha esperada; sin fecha al final.
        public let filas: [Fila]
        public let total: Double
        public let vencidos: Int
    }

    public static func resumen(_ pendientes: [Pendiente], tasas: Tasas, moneda: Divisa, now: Date, calendario: Calendar) -> Resumen {
        let filas = pendientes.filter(estaActivo).map {
            Fila(pendiente: $0, restante: $0.montoEsperado - ($0.montoCobrado ?? 0), vencido: estaVencido($0, now: now, calendario: calendario))
        }
        // Orden estable, como Array.prototype.sort.
        let ordenadas = filas.enumerated().sorted { a, b in
            let (x, y) = (a.element, b.element)
            if x.vencido != y.vencido { return x.vencido }
            switch (x.pendiente.fechaEsperada, y.pendiente.fechaEsperada) {
            case let (fa?, fb?) where fa != fb: return fa < fb
            case (nil, .some): return false
            case (.some, nil): return true
            default: return a.offset < b.offset
            }
        }.map(\.element)
        let total = ordenadas.reduce(0.0) {
            $0 + Conversion.convertir($1.restante, de: Divisa(codigo: $1.pendiente.divisa, fallback: moneda), a: moneda, tasas: tasas)
        }
        return Resumen(filas: ordenadas, total: total, vencidos: ordenadas.filter(\.vencido).count)
    }
}
```

- [ ] **Step 5: Tests en verde y commit**

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS (todos los tests hasta ahora).

```bash
git add ios/SaviumCore
git commit -m "SaviumCore: fechas con las convenciones de la web, modelos de la BD y vencidos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Suscripciones y mes anterior

**Files:**
- Create: `ios/SaviumCore/Sources/SaviumCore/Suscripciones.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/MesAnterior.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/SuscripcionesTests.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/MesAnteriorTests.swift`

**Interfaces:**
- Consumes: `Fechas`, `Conversion`, `Divisa`.
- Produces:
  - `Suscripciones.estimadoMensual(frecuencia:monto:) -> Double?`
  - `Suscripciones.resumen(_: [(frecuencia: String, monto: Double)]) -> Suscripciones.Resumen`, con `estimadoMensual`, `estimadas` y `sinEstimar`.
  - `Suscripciones.estado(proximoPago:now:calendario:) -> (estado: Suscripciones.Estado, dias: Int)`, donde `Estado` vale `.sinCargo`, `.esteMes` o `.proxima`.
  - `struct MovimientoResumen(fecha: Date, ingreso, gasto, divisa: String, tipo: String?, categoria: String?)`.
  - `MesAnterior.totales(_:tasas:moneda:now:calendario:) -> MesAnterior.Totales`, con `ingresos`, `gastos` y `balance`.
  - `MesAnterior.rango(now:calendario:) -> (desde: String, hasta: String)`: fechas ISO para la consulta, con un día de margen a cada lado.

- [ ] **Step 1: Tests que fallan**

`SuscripcionesTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixtureSuscripciones: Decodable {
    struct Sub: Decodable { let frecuencia: String; let ultimo_pago_monto: Double }
    struct EsperadoResumen: Decodable { let estimadoMensual: Double; let estimadas: Int; let sinEstimar: Int }
    struct Resumen: Decodable { let suscripciones: [Sub]; let esperado: EsperadoResumen }
    struct EsperadoEstado: Decodable { let estado: String; let dias: Int }
    struct Estado: Decodable { let proximo_pago: String; let esperado: EsperadoEstado }
    let now: String
    let resumen: Resumen
    let estados: [Estado]
}

@Suite("Suscripciones")
struct SuscripcionesTests {
    @Test("fixture compartido suscripciones.json")
    func fixture() throws {
        let cal = Fixtures.calendarioMX
        let f = try Fixtures.cargar("suscripciones", como: FixtureSuscripciones.self)
        let r = Suscripciones.resumen(f.resumen.suscripciones.map { (frecuencia: $0.frecuencia, monto: $0.ultimo_pago_monto) })
        #expect(abs(r.estimadoMensual - f.resumen.esperado.estimadoMensual) < 1e-6)
        #expect(r.estimadas == f.resumen.esperado.estimadas)
        #expect(r.sinEstimar == f.resumen.esperado.sinEstimar)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for e in f.estados {
            let s = Suscripciones.estado(proximoPago: e.proximo_pago, now: now, calendario: cal)
            #expect(s.estado.rawValue == e.esperado.estado, "\(e.proximo_pago)")
            #expect(s.dias == e.esperado.dias, "\(e.proximo_pago)")
        }
    }
}
```

`MesAnteriorTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixtureMesAnterior: Decodable {
    struct Tx: Decodable { let id: String; let fecha: String; let ingreso: Double?; let gasto: Double?; let divisa: String; let tipo: String?; let categoria: String? }
    struct Esperado: Decodable { let ingresos: Double; let gastos: Double; let balance: Double }
    struct Caso: Decodable { let nombre: String; let moneda: Divisa; let esperado: Esperado }
    let tasas: Tasas
    let now: String
    let transacciones: [Tx]
    let casos: [Caso]
}

@Suite("Mes anterior")
struct MesAnteriorTests {
    let cal = Fixtures.calendarioMX

    @Test("fixture compartido mes_anterior.json")
    func fixture() throws {
        let f = try Fixtures.cargar("mes_anterior", como: FixtureMesAnterior.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        let movs = f.transacciones.map {
            MovimientoResumen(fecha: Fechas.medianocheUTC($0.fecha)!, ingreso: $0.ingreso ?? 0, gasto: $0.gasto ?? 0, divisa: $0.divisa, tipo: $0.tipo, categoria: $0.categoria)
        }
        for c in f.casos {
            let t = MesAnterior.totales(movs, tasas: f.tasas, moneda: c.moneda, now: now, calendario: cal)
            #expect(abs(t.ingresos - c.esperado.ingresos) < 1e-6, "\(c.nombre)")
            #expect(abs(t.gastos - c.esperado.gastos) < 1e-6, "\(c.nombre)")
            #expect(abs(t.balance - c.esperado.balance) < 1e-6, "\(c.nombre)")
        }
    }

    @Test("rango de consulta con un día de margen")
    func rango() throws {
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let r = MesAnterior.rango(now: now, calendario: cal)
        #expect(r.desde == "2026-07-31" && r.hasta == "2026-09-01")
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación.

- [ ] **Step 2: Implementar**

Antes, relee `src/lib/finance/subscriptionsSummary.ts` y el bloque «MES ANTERIOR» de `src/lib/finance/dashboardMetrics.ts`. Si la tarea paralela del día 1 cambió cómo se filtra el período, porta la regla nueva y comprueba que el fixture sigue pasando.

`Suscripciones.swift`:

```swift
import Foundation

/// Port de src/lib/finance/subscriptionsSummary.ts.
public enum Suscripciones {
    static let factorMensual: [String: Double] = [
        "Semanal": 52.0 / 12, "Mensual": 1, "Bimestral": 1.0 / 2,
        "Trimestral": 1.0 / 3, "Semestral": 1.0 / 6, "Anual": 1.0 / 12,
    ]

    /// Equivalente mensual de un pago; nil si la frecuencia no se puede estimar (Irregular u otra).
    public static func estimadoMensual(frecuencia: String, monto: Double) -> Double? {
        factorMensual[frecuencia].map { monto * $0 }
    }

    public struct Resumen: Sendable, Equatable {
        public let estimadoMensual: Double
        public let estimadas: Int
        public let sinEstimar: Int
    }

    /// El llamador pasa solo suscripciones activas.
    public static func resumen(_ subs: [(frecuencia: String, monto: Double)]) -> Resumen {
        var total = 0.0, estimadas = 0, sinEstimar = 0
        for s in subs {
            if let m = estimadoMensual(frecuencia: s.frecuencia, monto: s.monto) { total += m; estimadas += 1 } else { sinEstimar += 1 }
        }
        return Resumen(estimadoMensual: total, estimadas: estimadas, sinEstimar: sinEstimar)
    }

    public enum Estado: String, Sendable {
        /// Caía en un mes ya importado y no apareció el cargo.
        case sinCargo = "sin_cargo"
        /// Cae en el mes en curso (aún sin importar).
        case esteMes = "este_mes"
        case proxima
    }

    public static func estado(proximoPago: String, now: Date, calendario: Calendar) -> (estado: Estado, dias: Int) {
        let dias = Fechas.diasHasta(proximoPago, now: now, calendario: calendario)
        guard let px = Fechas.diaLocal(proximoPago, calendario: calendario) else { return (.proxima, dias) }
        if px <= Fechas.finMesAnterior(now, calendario: calendario) { return (.sinCargo, dias) }
        let inicioMes = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        let finMesActual = calendario.date(byAdding: .month, value: 1, to: inicioMes)!.addingTimeInterval(-0.001)
        return (px <= finMesActual ? .esteMes : .proxima, dias)
    }
}
```

`MesAnterior.swift`:

```swift
import Foundation

public struct MovimientoResumen: Sendable {
    /// Medianoche UTC, como Transaction.fecha en la web.
    public let fecha: Date
    public let ingreso: Double
    public let gasto: Double
    public let divisa: String
    public let tipo: String?
    public let categoria: String?
    public init(fecha: Date, ingreso: Double, gasto: Double, divisa: String, tipo: String?, categoria: String?) {
        self.fecha = fecha; self.ingreso = ingreso; self.gasto = gasto; self.divisa = divisa; self.tipo = tipo; self.categoria = categoria
    }
}

/// Ingresos, gastos y balance del mes anterior: mismas reglas que computeDashboardMetrics.
public enum MesAnterior {
    static let excluida = "Compra Venta Inmuebles"

    public struct Totales: Sendable, Equatable {
        public let ingresos: Double
        public let gastos: Double
        public var balance: Double { ingresos - gastos }
    }

    static func limites(now: Date, calendario: Calendar) -> (inicio: Date, fin: Date) {
        let inicioMesActual = calendario.date(from: calendario.dateComponents([.year, .month], from: now))!
        let inicio = calendario.date(byAdding: .month, value: -1, to: inicioMesActual)!
        // new Date(y, m, 0): último día del mes anterior a las 00:00 local (igual que la web).
        let fin = calendario.date(byAdding: .day, value: -1, to: inicioMesActual)!
        return (inicio, fin)
    }

    /// Días (YYYY-MM-DD) a pedir a la BD: el mes anterior con un día de margen a cada lado.
    public static func rango(now: Date, calendario: Calendar) -> (desde: String, hasta: String) {
        let (inicio, fin) = limites(now: now, calendario: calendario)
        let desde = calendario.date(byAdding: .day, value: -1, to: inicio)!
        let hasta = calendario.date(byAdding: .day, value: 1, to: fin)!
        return (Fechas.isoLocal(desde, calendario: calendario), Fechas.isoLocal(hasta, calendario: calendario))
    }

    public static func totales(_ movs: [MovimientoResumen], tasas: Tasas, moneda: Divisa, now: Date, calendario: Calendar) -> Totales {
        let (inicio, fin) = limites(now: now, calendario: calendario)
        let delMes = movs.filter { $0.fecha >= inicio && $0.fecha <= fin }
        func conv(_ x: Double, _ d: String) -> Double {
            Conversion.convertir(x, de: Divisa(codigo: d, fallback: moneda), a: moneda, tasas: tasas)
        }
        // Reembolso: ingreso en una categoría de gasto; resta del gasto, no suma al ingreso.
        let reembolsos = delMes.filter { $0.ingreso > 0 && $0.tipo == "Gastos" }.reduce(0.0) { $0 + conv($1.ingreso, $1.divisa) }
        let ingresos = delMes.filter { $0.ingreso > 0 && $0.tipo == "Ingreso" && $0.categoria != excluida }.reduce(0.0) { $0 + conv($1.ingreso, $1.divisa) }
        let gastos = delMes.filter { $0.tipo == "Gastos" && $0.categoria != excluida }.reduce(0.0) { $0 + conv($1.gasto, $1.divisa) } - reembolsos
        return Totales(ingresos: ingresos, gastos: gastos)
    }
}
```

- [ ] **Step 3: Tests y commit**

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS.

```bash
git add ios/SaviumCore
git commit -m "SaviumCore: suscripciones y totales del mes anterior con los fixtures de la web

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Por pagar

**Files:**
- Create: `ios/SaviumCore/Sources/SaviumCore/PorPagar.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/PorPagarTests.swift`

**Interfaces:**
- Consumes: `Transaccion`, `Categoria`, `Cuenta`, `Suscripcion` y `Fechas` (tarea 3).
- Produces:
  - `enum TipoPorPagar: String`, con los valores `Suscripción`, `Pago anual`, `Recurrente mensual`, `Tarjeta de crédito` y `Préstamo`.
  - `struct FilaPorPagar(id, concepto, tipo, monto, divisa: Divisa, fechaEstimada: Date, detalle: String?)`.
  - `PorPagar.calcular(movimientos:categorias:cuentas:suscripciones:horizonte:monedaBase:now:calendario:) -> [FilaPorPagar]`.
  - `PorPagar.subcategoriasRelevantes(_: [Categoria]) -> [String]`: las subcategorías cuyos movimientos hacen falta para no descargar todo el historial.

- [ ] **Step 1: Test que falla**

`PorPagarTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixturePorPagar: Decodable {
    struct Tx: Decodable { let id: String; let fecha: String; let gasto: Double; let divisa: String; let subcategoriaId: String }
    struct Cta: Decodable { let id: String; let nombre: String; let tipo: String; let saldoActual: Double; let divisa: String; let vendida: Bool? }
    struct Cat: Decodable { let id: String; let categoria: String; let subcategoria: String; let tipo: String; let frecuencia_seguimiento: String? }
    struct Fila: Decodable { let id: String; let concepto: String; let tipo: String; let monto: Double; let divisa: String; let fecha: String; let detalle: String }
    struct Caso: Decodable {
        let nombre: String; let horizonte: Int
        let suscripciones: [Suscripcion]?; let categorias: [Cat]?; let transacciones: [Tx]?; let cuentas: [Cta]?
        let esperado: [Fila]?; let esperadoIds: [String]?
    }
    let now: String
    let monedaBase: Divisa
    let casos: [Caso]
}

@Suite("Por pagar")
struct PorPagarTests {
    let cal = Fixtures.calendarioMX

    @Test("fixture compartido cxp.json")
    func fixture() throws {
        let f = try Fixtures.cargar("cxp", como: FixturePorPagar.self)
        let now = try #require(Fechas.horaLocal(f.now, calendario: cal))
        for c in f.casos {
            let filas = PorPagar.calcular(
                movimientos: (c.transacciones ?? []).map { Transaccion(id: $0.id, fecha: $0.fecha, gasto: $0.gasto, divisa: $0.divisa, subcategoriaId: $0.subcategoriaId) },
                categorias: (c.categorias ?? []).map { Categoria(id: $0.id, categoria: $0.categoria, subcategoria: $0.subcategoria, tipo: $0.tipo, frecuenciaSeguimiento: $0.frecuencia_seguimiento) },
                cuentas: (c.cuentas ?? []).map { Cuenta(id: $0.id, nombre: $0.nombre, tipo: $0.tipo, divisa: $0.divisa, vendida: $0.vendida ?? false, saldoInicial: 0, saldoActual: $0.saldoActual) },
                suscripciones: c.suscripciones ?? [],
                horizonte: c.horizonte, monedaBase: f.monedaBase, now: now, calendario: cal)
            if let ids = c.esperadoIds {
                #expect(filas.map(\.id) == ids, "\(c.nombre)")
                continue
            }
            let esperado = c.esperado ?? []
            #expect(filas.count == esperado.count, "\(c.nombre)")
            for (r, e) in zip(filas, esperado) {
                #expect(r.id == e.id && r.concepto == e.concepto && r.tipo.rawValue == e.tipo, "\(c.nombre)")
                #expect(r.divisa.rawValue == e.divisa && r.detalle == e.detalle, "\(c.nombre)")
                #expect(Fechas.isoUTC(r.fechaEstimada) == e.fecha, "\(c.nombre): \(Fechas.isoUTC(r.fechaEstimada))")
                #expect(abs(r.monto - e.monto) < 1e-6, "\(c.nombre)")
            }
        }
    }

    @Test("subcategorías relevantes: anuales, préstamos y obligaciones fijas de gasto")
    func relevantes() {
        let cats = [
            Categoria(id: "seg", categoria: "Seguros", subcategoria: "Coche", tipo: "Gastos", frecuenciaSeguimiento: "anual"),
            Categoria(id: "pr", categoria: "Deudas", subcategoria: "Préstamo coche", tipo: "Gastos"),
            Categoria(id: "int", categoria: "Servicios", subcategoria: "Internet", tipo: "Gastos"),
            Categoria(id: "cafe", categoria: "Alimentación", subcategoria: "Café", tipo: "Gastos"),
            Categoria(id: "sueldo", categoria: "Sueldo", subcategoria: "Nómina", tipo: "Ingreso"),
        ]
        #expect(PorPagar.subcategoriasRelevantes(cats) == ["seg", "pr", "int"])
    }

    @Test("Review Focus 1: fin de mes recorta (31 ago + 1 mes = 30 sep), la web desborda")
    func finDeMes() throws {
        let now = try #require(Fechas.horaLocal("2026-09-15T12:00:00", calendario: cal))
        let filas = PorPagar.calcular(
            movimientos: [Transaccion(id: "t", fecha: "2026-08-31", gasto: 100, subcategoriaId: "pr")],
            categorias: [Categoria(id: "pr", categoria: "Deudas", subcategoria: "Préstamo", tipo: "Gastos")],
            cuentas: [], suscripciones: [], horizonte: 30, monedaBase: .MXN, now: now, calendario: cal)
        // 2026-08-31 UTC = 30 ago 18:00 local → +1 mes = 30 sep 18:00 local = 2026-10-01 UTC.
        #expect(filas.map { Fechas.isoUTC($0.fechaEstimada) } == ["2026-10-01"])
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación (`PorPagar` no existe).

- [ ] **Step 2: Implementar**

Relee antes `src/lib/finance/cxp.ts`. Si cambió respecto a lo que se porta aquí, porta la versión actual.

`PorPagar.swift`:

```swift
import Foundation

public enum TipoPorPagar: String, Sendable {
    case suscripcion = "Suscripción"
    case pagoAnual = "Pago anual"
    case recurrente = "Recurrente mensual"
    case tarjeta = "Tarjeta de crédito"
    case prestamo = "Préstamo"
}

public struct FilaPorPagar: Sendable, Identifiable {
    public let id: String
    public let concepto: String
    public let tipo: TipoPorPagar
    public let monto: Double
    public let divisa: Divisa
    public let fechaEstimada: Date
    public let detalle: String?
}

/// Port fiel de computeCxP (src/lib/finance/cxp.ts), incluidas sus fechas: las transacciones
/// se leen a medianoche UTC y la aritmética de fechas se hace en el calendario local.
/// Diferencia conocida: al sumar meses, JavaScript desborda (31 ene + 1 = 3 mar) y Calendar
/// recorta (28 feb). Afecta solo a pagos cuyo último cargo cayó en día 29-31.
public enum PorPagar {
    static let dia: TimeInterval = 86_400

    static func esPrestamo(_ c: Categoria) -> Bool {
        let s = "\(c.categoria) \(c.subcategoria)".lowercased()
        return s.contains("préstamo") || s.contains("prestamo") || s.contains("hipoteca")
    }

    /// Solo obligaciones fijas ineludibles (misma lista blanca que la web).
    static func esObligacionFija(_ cat: Categoria) -> Bool {
        let c = cat.categoria.lowercased(), s = cat.subcategoria.lowercased()
        if c == "hogar" && !s.contains("alquiler") && !s.contains("hipoteca") && !s.contains("servicios hogar") && s != "servicios" { return true }
        if c == "educación" || c == "educacion" { return true }
        if c == "servicios" && (s.contains("celular") || s.contains("telefon") || s.contains("internet")) { return true }
        if c == "salud" && s.contains("seguro") { return true }
        if c == "transporte" && s.contains("seguro") { return true }
        return false
    }

    public static func subcategoriasRelevantes(_ categorias: [Categoria]) -> [String] {
        categorias.filter { $0.tipo == "Gastos" && ($0.frecuenciaSeguimiento == "anual" || esPrestamo($0) || esObligacionFija($0)) }.map(\.id)
    }

    /// Orden estable por fecha descendente (como .sort de JS).
    static func recientesPrimero(_ movs: [Transaccion]) -> [Transaccion] {
        movs.enumerated().sorted { a, b in
            a.element.fechaUTC != b.element.fechaUTC ? a.element.fechaUTC > b.element.fechaUTC : a.offset < b.offset
        }.map(\.element)
    }

    public static func calcular(movimientos: [Transaccion], categorias: [Categoria], cuentas: [Cuenta], suscripciones: [Suscripcion],
                                horizonte: Int, monedaBase: Divisa, now: Date, calendario: Calendar) -> [FilaPorPagar] {
        let limite = calendario.date(byAdding: .day, value: horizonte, to: now)!
        let hoy = calendario.startOfDay(for: now)
        let corte = Fechas.finMesAnterior(now, calendario: calendario)
        func divisa(_ s: String) -> Divisa { Divisa(codigo: s.isEmpty ? nil : s, fallback: monedaBase) }
        func sumar(_ c: Calendar.Component, _ n: Int, _ d: Date) -> Date { calendario.date(byAdding: c, value: n, to: d)! }
        func pagosDe(_ catId: String) -> [Transaccion] { recientesPrimero(movimientos.filter { $0.subcategoriaId == catId && $0.gasto > 0 }) }

        // 1) Suscripciones activas con próximo pago dentro del horizonte (sin divisa propia → la del perfil).
        let subs: [FilaPorPagar] = suscripciones.filter(\.active).compactMap { s in
            guard let px = Fechas.diaLocal(s.proximoPago, calendario: calendario), px >= hoy, px <= limite else { return nil }
            return FilaPorPagar(id: "sub-\(s.id)", concepto: s.serviceName, tipo: .suscripcion, monto: s.ultimoPagoMonto,
                                divisa: monedaBase, fechaEstimada: px, detalle: s.frecuencia)
        }

        // 2) Pagos anuales: último pago + 1 año, rodando hacia delante.
        var anuales: [FilaPorPagar] = []
        for cat in categorias where cat.frecuenciaSeguimiento == "anual" && cat.tipo == "Gastos" && !esPrestamo(cat) {
            guard let last = pagosDe(cat.id).first else { continue }
            var next = sumar(.year, 1, last.fechaUTC)
            while next < now { next = sumar(.year, 1, next) }
            if next <= limite {
                anuales.append(FilaPorPagar(id: "anual-\(cat.id)", concepto: "\(cat.categoria) · \(cat.subcategoria)", tipo: .pagoAnual,
                                            monto: last.gasto, divisa: divisa(last.divisa), fechaEstimada: next, detalle: "Estimado según último pago"))
            }
        }

        // 3) Recurrentes por subcategoría + divisa, con periodicidad detectada.
        let desde = sumar(.day, -240, now)
        let catsPorId = Dictionary(categorias.map { ($0.id, $0) }, uniquingKeysWith: { _, ultima in ultima })
        var grupos: [(cat: Categoria, divisa: String, movs: [Transaccion])] = []
        var indice: [String: Int] = [:]
        for t in movimientos {
            guard !t.subcategoriaId.isEmpty, t.gasto > 0, t.fechaUTC >= desde,
                  let cat = catsPorId[t.subcategoriaId], cat.tipo == "Gastos", esObligacionFija(cat),
                  cat.frecuenciaSeguimiento != "anual" else { continue }
            let label = "\(cat.categoria) \(cat.subcategoria)".lowercased()
            if label.contains("suscripc") || label.contains("prestamo") || label.contains("préstamo") || label.contains("hipoteca") { continue }
            let div = t.divisa.isEmpty ? monedaBase.rawValue : t.divisa
            let clave = "\(t.subcategoriaId)::\(div)"
            if let i = indice[clave] { grupos[i].movs.append(t) } else { indice[clave] = grupos.count; grupos.append((cat, div, [t])) }
        }
        var recurrentes: [FilaPorPagar] = []
        for g in grupos {
            let ord = recientesPrimero(g.movs)
            guard ord.count >= 2 else { continue }
            let gaps = zip(ord, ord.dropFirst()).map { $0.fechaUTC.timeIntervalSince($1.fechaUTC) / dia }.sorted()
            let gapMed = gaps[gaps.count / 2]
            let (periodo, etiqueta) = gapMed >= 75 ? (3, "trimestral") : gapMed >= 45 ? (2, "bimensual") : (1, "mensual")
            let last = ord[0]
            if corte.timeIntervalSince(last.fechaUTC) / dia > max(45, Double(periodo) * 30 * 1.5) { continue }
            let ultimos = ord.prefix(2)
            let monto = ultimos.reduce(0.0) { $0 + $1.gasto } / Double(ultimos.count)
            var next = sumar(.month, periodo, last.fechaUTC)
            while next < now { next = sumar(.month, periodo, next) }
            if next > limite { continue }
            recurrentes.append(FilaPorPagar(id: "rec-\(g.cat.id)-\(g.divisa)", concepto: "\(g.cat.categoria) · \(g.cat.subcategoria)", tipo: .recurrente,
                                            monto: monto, divisa: divisa(g.divisa), fechaEstimada: next, detalle: "\(etiqueta) · prom. últimos 2"))
        }

        // 4) Tarjetas con deuda de al menos un céntimo, estimadas a 15 días.
        let tarjetas = cuentas.filter { $0.tipo == "Tarjeta de Crédito" && !$0.vendida && $0.saldoActual <= -0.005 }.map {
            FilaPorPagar(id: "card-\($0.id)", concepto: $0.nombre, tipo: .tarjeta, monto: abs($0.saldoActual), divisa: divisa($0.divisa),
                         fechaEstimada: sumar(.day, 15, now), detalle: "Saldo pendiente actual")
        }

        // 5) Préstamos con pago reciente al corte de datos.
        var prestamos: [FilaPorPagar] = []
        for cat in categorias where cat.tipo == "Gastos" && esPrestamo(cat) {
            guard let last = pagosDe(cat.id).first else { continue }
            if corte.timeIntervalSince(last.fechaUTC) / dia > 45 { continue }
            var next = sumar(.month, 1, last.fechaUTC)
            while next < now { next = sumar(.month, 1, next) }
            if next > limite { continue }
            prestamos.append(FilaPorPagar(id: "loan-\(cat.id)", concepto: "\(cat.categoria) · \(cat.subcategoria)", tipo: .prestamo,
                                          monto: last.gasto, divisa: divisa(last.divisa), fechaEstimada: next, detalle: "Cuota estimada"))
        }

        return (subs + anuales + recurrentes + tarjetas + prestamos).enumerated().sorted { a, b in
            a.element.fechaEstimada != b.element.fechaEstimada ? a.element.fechaEstimada < b.element.fechaEstimada : a.offset < b.offset
        }.map(\.element)
    }
}
```

- [ ] **Step 3: Tests y commit**

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS. Si el test `finDeMes` da otra fecha, mira qué hace realmente `Calendar.date(byAdding:.month)` en ese caso. Ajusta el valor esperado solo si coincide con el comportamiento documentado (recortar al último día del mes), y anótalo en el ledger.

```bash
git add ios/SaviumCore
git commit -m "SaviumCore: Por pagar portado de la web con su fixture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Patrimonio, inversiones y utilidades de la app

**Files:**
- Create: `ios/SaviumCore/Sources/SaviumCore/Patrimonio.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Inversiones.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/PatrimonioTests.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/InversionesTests.swift`

**Interfaces:**
- Consumes: `FilaPatrimonio`, `Inversion` y `Valuacion` (tarea 3); `inversiones.json` (tarea 1).
- Produces:
  - `enum Rubro: String`, con los valores `efectivo_bancos`, `inversiones`, `empresas_privadas`, `bien_raiz`, `tarjetas_credito` e `hipoteca`, y las propiedades `nombre` y `esPasivo`.
  - `Patrimonio.calcular(_:tasas:moneda:) -> Patrimonio.Resultado`, con `porRubro: [Rubro: Double]`, `activos`, `pasivos` y `neto`.
  - `Inversiones.valorActual(_:valuaciones:saldoCuenta:) -> Double`.
  - `Inversiones.rendimiento(_:valor:valuaciones:) -> Inversiones.Rendimiento`, con `invertido`, `valor`, `delta` y `pct`.
  - `Inversiones.totales(_: [(Inversion, valor: Double)], tasas:moneda:) -> (invertido: Double, valor: Double)`.

- [ ] **Step 1: Tests que fallan**

`PatrimonioTests.swift`:

```swift
import Testing
@testable import SaviumCore

@Suite("Patrimonio")
struct PatrimonioTests {
    let tasas: Tasas = [.MXN: 1, .USD: 20, .EUR: 22]

    @Test("reparte por rubro y convierte (mismos números que patrimonio.test.ts)")
    func reparte() {
        let r = Patrimonio.calcular([
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "efectivo_bancos", importe: 1500),
            FilaPatrimonio(divisa: "USD", clase: "activo", rubro: "inversiones", importe: 100),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "bien_raiz", importe: 10000),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "empresas_privadas", importe: 300),
            FilaPatrimonio(divisa: "MXN", clase: "pasivo", rubro: "tarjetas_credito", importe: 400),
            FilaPatrimonio(divisa: "EUR", clase: "pasivo", rubro: "hipoteca", importe: 50),
        ], tasas: tasas, moneda: .MXN)
        #expect(r.activos == 13800 && r.pasivos == 1500 && r.neto == 12300)
        #expect(r.porRubro[.inversiones] == 2000 && r.porRubro[.hipoteca] == 1100)
    }

    @Test("ignora rubros o divisas desconocidos en lugar de dar NaN")
    func desconocidos() {
        let r = Patrimonio.calcular([
            FilaPatrimonio(divisa: "GBP", clase: "activo", rubro: "efectivo_bancos", importe: 9),
            FilaPatrimonio(divisa: "MXN", clase: "activo", rubro: "otro", importe: 9),
        ], tasas: tasas, moneda: .MXN)
        #expect(r.activos == 0 && r.neto == 0)
    }
}
```

`InversionesTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

struct FixtureInversiones: Decodable {
    struct Esperado: Decodable { let valor: Double; let invertido: Double; let delta: Double; let pct: Double }
    struct Totales: Decodable { let invertido: Double; let valor: Double }
    struct E: Decodable { let porInversion: [String: Esperado]; let totales: Totales }
    let tasas: Tasas
    let moneda: Divisa
    let inversiones: [Inversion]
    let valuaciones: [Valuacion]
    let saldosCuenta: [String: Double]
    let esperado: E
}

@Suite("Inversiones")
struct InversionesTests {
    @Test("fixture compartido inversiones.json")
    func fixture() throws {
        let f = try Fixtures.cargar("inversiones", como: FixtureInversiones.self)
        var conValor: [(Inversion, valor: Double)] = []
        for i in f.inversiones {
            let valor = Inversiones.valorActual(i, valuaciones: f.valuaciones, saldoCuenta: i.cuentaId.flatMap { f.saldosCuenta[$0] })
            conValor.append((i, valor))
            let r = Inversiones.rendimiento(i, valor: valor, valuaciones: f.valuaciones)
            let e = try #require(f.esperado.porInversion[i.id])
            #expect(abs(r.valor - e.valor) < 1e-6 && abs(r.invertido - e.invertido) < 1e-6, "\(i.id)")
            #expect(abs(r.delta - e.delta) < 1e-6 && abs(r.pct - e.pct) < 1e-6, "\(i.id)")
        }
        let t = Inversiones.totales(conValor, tasas: f.tasas, moneda: f.moneda)
        #expect(abs(t.invertido - f.esperado.totales.invertido) < 1e-6)
        #expect(abs(t.valor - f.esperado.totales.valor) < 1e-6)
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación.

- [ ] **Step 2: Implementar**

`Patrimonio.swift`:

```swift
import Foundation

public enum Rubro: String, CaseIterable, Sendable, Identifiable {
    case efectivoBancos = "efectivo_bancos"
    case inversiones
    case empresasPrivadas = "empresas_privadas"
    case bienRaiz = "bien_raiz"
    case tarjetasCredito = "tarjetas_credito"
    case hipoteca
    public var id: String { rawValue }
    public var esPasivo: Bool { self == .tarjetasCredito || self == .hipoteca }
    public var nombre: String {
        switch self {
        case .efectivoBancos: "Efectivo y bancos"
        case .inversiones: "Inversiones"
        case .empresasPrivadas: "Empresas"
        case .bienRaiz: "Bien raíz"
        case .tarjetasCredito: "Tarjetas de crédito"
        case .hipoteca: "Hipoteca"
        }
    }
}

/// Activos, pasivos y neto a partir de la vista patrimonio_por_divisa (las reglas viven en la vista).
public enum Patrimonio {
    public struct Resultado: Sendable {
        public let porRubro: [Rubro: Double]
        public var activos: Double { Rubro.allCases.filter { !$0.esPasivo }.reduce(0) { $0 + (porRubro[$1] ?? 0) } }
        public var pasivos: Double { Rubro.allCases.filter(\.esPasivo).reduce(0) { $0 + (porRubro[$1] ?? 0) } }
        public var neto: Double { activos - pasivos }
    }

    public static func calcular(_ filas: [FilaPatrimonio], tasas: Tasas, moneda: Divisa) -> Resultado {
        var porRubro: [Rubro: Double] = [:]
        for f in filas {
            guard let rubro = Rubro(rawValue: f.rubro), let divisa = Divisa(rawValue: f.divisa) else { continue }
            porRubro[rubro, default: 0] += Conversion.convertir(f.importe, de: divisa, a: moneda, tasas: tasas)
        }
        return Resultado(porRubro: porRubro)
    }
}
```

`Inversiones.swift`:

```swift
import Foundation

/// Port de valorActualInversion, investmentReturn y totalesInversiones (src/lib/finance/investmentReturn.ts).
public enum Inversiones {
    static func valuacionesDe(_ id: String, _ vals: [Valuacion]) -> [Valuacion] {
        vals.filter { $0.inversionId == id }.enumerated()
            .sorted { $0.element.fecha != $1.element.fecha ? $0.element.fecha < $1.element.fecha : $0.offset < $1.offset }
            .map(\.element)
    }

    /// Última valuación; si no hay, saldo de la cuenta vinculada; si no, valor_actual o monto_invertido.
    public static func valorActual(_ inv: Inversion, valuaciones: [Valuacion], saldoCuenta: Double?) -> Double {
        if let ultima = valuacionesDe(inv.id, valuaciones).last { return ultima.valor }
        if let saldoCuenta { return saldoCuenta }
        return inv.valorActual != 0 ? inv.valorActual : inv.montoInvertido
    }

    public struct Rendimiento: Sendable {
        public let invertido: Double
        public let valor: Double
        public let delta: Double
        public let pct: Double
    }

    /// `valor` es el de valorActual (la web sobrescribe valor_actual antes de calcular).
    public static func rendimiento(_ inv: Inversion, valor: Double, valuaciones: [Valuacion]) -> Rendimiento {
        let vals = valuacionesDe(inv.id, valuaciones)
        let invertido = inv.montoInvertido != 0 ? inv.montoInvertido : (vals.first?.valor ?? 0)
        let v = valor != 0 ? valor : invertido
        let base = vals.count > 1 ? vals[0].valor : invertido
        let delta = v - base
        return Rendimiento(invertido: invertido, valor: v, delta: delta, pct: base != 0 ? delta / base * 100 : 0)
    }

    public static func totales(_ invs: [(Inversion, valor: Double)], tasas: Tasas, moneda: Divisa) -> (invertido: Double, valor: Double) {
        invs.filter { $0.0.activa }.reduce((0.0, 0.0)) { acc, par in
            let (i, valor) = par
            let de = Divisa(codigo: i.moneda, fallback: moneda)
            let v = valor != 0 ? valor : i.montoInvertido
            return (acc.0 + Conversion.convertir(i.montoInvertido, de: de, a: moneda, tasas: tasas),
                    acc.1 + Conversion.convertir(v, de: de, a: moneda, tasas: tasas))
        }
    }
}
```

Nota de paridad: `investmentReturn` en TS usa `inv.saldo_cuenta ?? 0` como último recurso para `invertido`. Aquí `invertido` cae en la primera valuación o en 0, porque el fixture no tiene inversiones sin capital, sin valuaciones y con cuenta. Si el fixture falla en `invertido`, porta también ese caso con `saldoCuenta`.

- [ ] **Step 3: Tests y commit**

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS.

```bash
git add ios/SaviumCore
git commit -m "SaviumCore: patrimonio por rubro e inversiones con su fixture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Utilidades de movimientos y formato

**Files:**
- Create: `ios/SaviumCore/Sources/SaviumCore/Formato.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Movimientos.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/FormatoTests.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/MovimientosTests.swift`

**Interfaces:**
- Produces:
  - `Formato.numero(_:) -> String`, en formato `1,234.56` (igual que `formatNumber` de la web).
  - `Formato.importe(_:_:) -> String`, en formato `1,234.56 MXN`.
  - `Formato.parsearImporte(_:) -> Double?`.
  - `Movimientos.agruparPorDia(_: [Transaccion]) -> [(dia: String, movimientos: [Transaccion])]`.
  - `Movimientos.frecuentes(_: [Transaccion], limite: Int) -> [String]`, que devuelve subcategoriaIds.
  - `FormularioMovimiento` (struct), con:
    - campos `esGasto`, `importeTexto`, `cuentaId?`, `subcategoriaId?`, `fecha` y `comentario`;
    - `esValido`;
    - `construir(cuentas:userId:calendario:) -> NuevaTransaccion?`.

- [ ] **Step 1: Tests que fallan**

`FormatoTests.swift`:

```swift
import Testing
@testable import SaviumCore

@Suite("Formato")
struct FormatoTests {
    @Test("importe con separador de miles y código de divisa")
    func importe() {
        #expect(Formato.importe(1234.5, "MXN") == "1,234.50 MXN")
        #expect(Formato.importe(-0.004, "USD") == "-0.00 USD")
    }

    @Test("Review Focus 3: parsear lo que escribe el usuario")
    func parsear() {
        #expect(Formato.parsearImporte("12.5") == 12.5)
        #expect(Formato.parsearImporte("12,5") == 12.5)
        #expect(Formato.parsearImporte("1,234.50") == 1234.5)
        #expect(Formato.parsearImporte("1.234,50") == 1234.5)
        #expect(Formato.parsearImporte(" 45 ") == 45)
        #expect(Formato.parsearImporte("") == nil)
        #expect(Formato.parsearImporte("abc") == nil)
        #expect(Formato.parsearImporte("-5") == nil)
    }
}
```

`MovimientosTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

@Suite("Movimientos")
struct MovimientosTests {
    let cal = Fixtures.calendarioMX

    @Test("agrupa por día respetando el orden de llegada")
    func agrupa() {
        let txs = [Transaccion(id: "a", fecha: "2026-10-06"), Transaccion(id: "b", fecha: "2026-10-06"), Transaccion(id: "c", fecha: "2026-10-05")]
        let g = Movimientos.agruparPorDia(txs)
        #expect(g.map(\.dia) == ["2026-10-06", "2026-10-05"])
        #expect(g[0].movimientos.map(\.id) == ["a", "b"])
    }

    @Test("categorías frecuentes: más usadas primero, empate por la más reciente")
    func frecuentes() {
        let txs = [
            Transaccion(id: "1", fecha: "2026-10-06", subcategoriaId: "cafe"),
            Transaccion(id: "2", fecha: "2026-10-05", subcategoriaId: "super"),
            Transaccion(id: "3", fecha: "2026-10-04", subcategoriaId: "super"),
            Transaccion(id: "4", fecha: "2026-10-03", subcategoriaId: "luz"),
        ]
        #expect(Movimientos.frecuentes(txs, limite: 2) == ["super", "cafe"])
    }

    @Test("formulario: válido solo con importe > 0, cuenta y categoría; gasto o ingreso y divisa de la cuenta")
    func formulario() throws {
        let cuentas = [Cuenta(id: "c1", nombre: "Visa", tipo: "Tarjeta de Crédito", divisa: "USD", vendida: false, saldoInicial: 0, saldoActual: 0)]
        let fecha = try #require(Fechas.horaLocal("2026-10-06T23:30:00", calendario: cal))
        var f = FormularioMovimiento(fecha: fecha)
        #expect(!f.esValido)
        f.importeTexto = "45,5"; f.cuentaId = "c1"; f.subcategoriaId = "cafe"; f.comentario = "  Café  "
        #expect(f.esValido)
        let n = try #require(f.construir(cuentas: cuentas, userId: "u", calendario: cal))
        #expect(n == NuevaTransaccion(cuentaId: "c1", fecha: "2026-10-06", comentario: "Café", ingreso: 0, gasto: 45.5, subcategoriaId: "cafe", divisa: "USD", userId: "u"))
        f.esGasto = false
        #expect(f.construir(cuentas: cuentas, userId: "u", calendario: cal)?.ingreso == 45.5)
        f.importeTexto = "0"
        #expect(!f.esValido && f.construir(cuentas: cuentas, userId: "u", calendario: cal) == nil)
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación.

- [ ] **Step 2: Implementar**

`Formato.swift`:

```swift
import Foundation

public enum Formato {
    nonisolated(unsafe) private static let formateador: NumberFormatter = {
        let f = NumberFormatter()
        f.locale = Locale(identifier: "en_US")
        f.numberStyle = .decimal
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    /// Igual que formatNumber de la web (Intl en-US, 2 decimales).
    public static func numero(_ v: Double) -> String { formateador.string(from: NSNumber(value: v)) ?? String(format: "%.2f", v) }

    /// "1,234.56 MXN": siempre con el código de divisa, como la versión móvil web.
    public static func importe(_ v: Double, _ divisa: String) -> String { "\(numero(v)) \(divisa)" }

    /// Importe escrito por el usuario: acepta coma o punto decimal y miles con el otro separador.
    /// Devuelve nil si está vacío, no es un número o es negativo.
    public static func parsearImporte(_ texto: String) -> Double? {
        var s = texto.trimmingCharacters(in: .whitespaces)
        guard !s.isEmpty else { return nil }
        let ultimaComa = s.lastIndex(of: ","), ultimoPunto = s.lastIndex(of: ".")
        switch (ultimaComa, ultimoPunto) {
        case let (c?, p?) where c > p:           // 1.234,50
            s = s.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
        case (.some, .some):                     // 1,234.50
            s = s.replacingOccurrences(of: ",", with: "")
        case (.some, nil):                       // 12,5
            s = s.replacingOccurrences(of: ",", with: ".")
        default: break
        }
        guard let v = Double(s), v.isFinite, v >= 0 else { return nil }
        return v
    }
}
```

`Movimientos.swift`:

```swift
import Foundation

public enum Movimientos {
    /// Secciones por día en el orden en que llegan (la consulta ya viene por fecha desc).
    public static func agruparPorDia(_ txs: [Transaccion]) -> [(dia: String, movimientos: [Transaccion])] {
        var grupos: [(dia: String, movimientos: [Transaccion])] = []
        for t in txs {
            if grupos.last?.dia == t.fecha { grupos[grupos.count - 1].movimientos.append(t) } else { grupos.append((t.fecha, [t])) }
        }
        return grupos
    }

    /// Subcategorías más usadas en `txs` (las más recientes primero si empatan).
    public static func frecuentes(_ txs: [Transaccion], limite: Int) -> [String] {
        var cuenta: [String: (n: Int, ultima: String)] = [:]
        for t in txs {
            let actual = cuenta[t.subcategoriaId]
            cuenta[t.subcategoriaId] = ((actual?.n ?? 0) + 1, max(actual?.ultima ?? "", t.fecha))
        }
        return cuenta.sorted { a, b in
            a.value.n != b.value.n ? a.value.n > b.value.n : (a.value.ultima != b.value.ultima ? a.value.ultima > b.value.ultima : a.key < b.key)
        }.prefix(limite).map(\.key)
    }
}

/// Estado de la hoja «Apuntar» y la transacción que produce.
public struct FormularioMovimiento: Sendable, Equatable {
    public var esGasto = true
    public var importeTexto = ""
    public var cuentaId: String?
    public var subcategoriaId: String?
    public var fecha: Date
    public var comentario = ""

    public init(fecha: Date, cuentaId: String? = nil) { self.fecha = fecha; self.cuentaId = cuentaId }

    public var importe: Double? { Formato.parsearImporte(importeTexto).flatMap { $0 > 0 ? $0 : nil } }
    public var esValido: Bool { importe != nil && cuentaId != nil && subcategoriaId != nil }

    /// Fecha en el día local (la web proponía el día UTC por defecto); divisa de la cuenta.
    public func construir(cuentas: [Cuenta], userId: String, calendario: Calendar) -> NuevaTransaccion? {
        guard let importe, let cuentaId, let subcategoriaId, let cuenta = cuentas.first(where: { $0.id == cuentaId }) else { return nil }
        return NuevaTransaccion(cuentaId: cuentaId, fecha: Fechas.isoLocal(fecha, calendario: calendario),
                                comentario: comentario.trimmingCharacters(in: .whitespacesAndNewlines),
                                ingreso: esGasto ? 0 : importe, gasto: esGasto ? importe : 0,
                                subcategoriaId: subcategoriaId, divisa: cuenta.divisa, userId: userId)
    }
}
```

- [ ] **Step 3: Tests y commit**

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS.

```bash
git add ios/SaviumCore
git commit -m "SaviumCore: formato de importes, movimientos por día y formulario de alta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Datos, sesión, bloqueo y pestañas

**Files:**
- Create: `ios/Savium/Datos/Config.swift`
- Create: `ios/Savium/Datos/Repositorio.swift`
- Create: `ios/Savium/Modelo/AppModel.swift`
- Create: `ios/Savium/Modelo/Sesion.swift`
- Create: `ios/Savium/Modelo/Bloqueo.swift`
- Create: `ios/Savium/Modelo/DatosStore.swift`
- Create: `ios/Savium/Vistas/Comunes.swift`
- Create: `ios/Savium/Vistas/LoginView.swift`
- Create: `ios/Savium/Vistas/RaizView.swift`
- Create: `ios/Savium/Vistas/PestanasView.swift`
- Modify: `ios/Savium/App/SaviumApp.swift`
- Create: `ios/SaviumCore/Sources/SaviumCore/Bloqueo.swift`
- Create: `ios/SaviumCore/Tests/SaviumCoreTests/BloqueoTests.swift`

**Interfaces:**
- Consumes: todo `SaviumCore`.
- Produces:
  - `Repositorio`, con estos métodos:
    - `cuentas()`, `patrimonio()`, `categorias()` y `perfil()`
    - `movimientos(pagina:cuentaId:texto:)`
    - `movimientos(desde:hasta:)`
    - `movimientos(deSubcategorias:)`
    - `pendientes()`, `suscripcionesActivas()`, `inversiones()` y `valuaciones()`
    - `crear(_: NuevaTransaccion)`
  - `AppModel` (`@Observable`): `divisa`, `tasas`, `tasasAproximadas`, `pestana` y `cargarTasas()`.
  - `Sesion` (`@Observable`): `estado` (`.cargando`, `.fuera` o `.dentro(userId:)`), `mensaje`, `entrar(email:clave:)` y `cerrar()`.
  - `Bloqueo` (`@Observable`): `bloqueado`, `desbloquear()`, `enSegundoPlano(_:)` y `alVolver(_:)`.
  - `DatosStore` (`@Observable`): todos los datos de las pestañas (salvo la lista paginada) y `cargar(app:)`.
  - Las vistas comunes `Importe`, `AvisoEstado`, `BotonNuevo` y `MenuPerfil`.
  - En el core: `ReglaBloqueo` (lógica pura del bloqueo, testeable).

**Ruling ya tomado en el plan:** la spec habla de «un almacén por pestaña». Aquí hay un `DatosStore` común más `MovimientosStore` (tarea 10). Así se evitan peticiones duplicadas (Resumen, Patrimonio y Pendientes usan las mismas cuentas y pendientes) y el globo de vencidos siempre cuadra con la pestaña. Las vistas siguen sin hablar con Supabase.

- [ ] **Step 1: Test de la regla de bloqueo (Review Focus 5)**

`ios/SaviumCore/Tests/SaviumCoreTests/BloqueoTests.swift`:

```swift
import Foundation
import Testing
@testable import SaviumCore

@Suite("Regla de bloqueo")
struct BloqueoTests {
    let t0 = Date(timeIntervalSince1970: 1_000_000)

    @Test("sin Face ID ni código no se bloquea nunca")
    func sinProteccion() {
        var r = ReglaBloqueo(puedeAutenticar: false)
        #expect(!r.bloqueado)
        r.enSegundoPlano(t0)
        r.alVolver(t0.addingTimeInterval(3600))
        #expect(!r.bloqueado)
    }

    @Test("bloquea al abrir y al volver tras más de 5 minutos, no antes")
    func cincoMinutos() {
        var r = ReglaBloqueo(puedeAutenticar: true)
        #expect(r.bloqueado)
        r.desbloqueado()
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(299))
        #expect(!r.bloqueado)
        r.enSegundoPlano(t0); r.alVolver(t0.addingTimeInterval(301))
        #expect(r.bloqueado)
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: FAIL de compilación (`ReglaBloqueo` no existe).

`ios/SaviumCore/Sources/SaviumCore/Bloqueo.swift`:

```swift
import Foundation

/// Cuándo pedir Face ID: al abrir y al volver tras más de 5 minutos en segundo plano.
/// Si el iPhone no tiene Face ID ni código, nunca bloquea (se quedaría bloqueado para siempre).
public struct ReglaBloqueo: Sendable {
    public static let margen: TimeInterval = 300
    public let puedeAutenticar: Bool
    public private(set) var bloqueado: Bool
    private var salida: Date?

    public init(puedeAutenticar: Bool) { self.puedeAutenticar = puedeAutenticar; bloqueado = puedeAutenticar }
    public mutating func desbloqueado() { bloqueado = false }
    public mutating func enSegundoPlano(_ ahora: Date) { salida = ahora }
    public mutating func alVolver(_ ahora: Date) {
        if puedeAutenticar, let salida, ahora.timeIntervalSince(salida) > Self.margen { bloqueado = true }
        salida = nil
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 2: Configuración y repositorio**

`ios/Savium/Datos/Config.swift`: copia los valores de `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` de `.env`. Ese archivo ya está versionado y la clave es pública, porque la protección la dan las RLS. No repitas los valores en el chat.

```swift
import Foundation

/// Mismo proyecto de Supabase que la web (.env). La clave es pública: protegen las RLS.
enum Config {
    static let supabaseURL = URL(string: "<VITE_SUPABASE_URL de .env>")!
    static let supabaseClave = "<VITE_SUPABASE_PUBLISHABLE_KEY de .env>"
}
```

(Sustituye los dos marcadores `<…>` por los valores reales al escribir el archivo.)

`ios/Savium/Datos/Repositorio.swift`:

```swift
import Foundation
import Supabase
import SaviumCore

let supabase = SupabaseClient(supabaseURL: Config.supabaseURL, supabaseKey: Config.supabaseClave)

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
        try await db.from("transacciones").insert(t).execute()
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
```

Run: `cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build; cd ..`
Expected: compila. Si algún método del SDK tiene otro nombre en la versión resuelta (por ejemplo `in(_:values:)`), consulta su código en `~/Library/Developer/Xcode/DerivedData/*/SourcePackages/checkouts/supabase-swift`, usa el nombre real y anótalo en el ledger.

- [ ] **Step 3: Modelos de estado**

`ios/Savium/Modelo/AppModel.swift`:

```swift
import Foundation
import Observation
import SaviumCore

enum Pestana: Hashable { case resumen, movimientos, patrimonio, pendientes, suscripciones }

@Observable @MainActor
final class AppModel {
    var pestana: Pestana = .resumen
    var divisa: Divisa {
        didSet { UserDefaults.standard.set(divisa.rawValue, forKey: "savium.divisa") }
    }
    private(set) var tasas: Tasas = Conversion.tasasRespaldo
    private(set) var tasasAproximadas = false
    /// true si el usuario nunca eligió divisa: se toma la del perfil al cargar.
    private(set) var divisaPorDefecto: Bool

    init() {
        let guardada = UserDefaults.standard.string(forKey: "savium.divisa")
        divisa = Divisa(codigo: guardada, fallback: .MXN)
        divisaPorDefecto = guardada == nil
    }

    func usarDivisaDelPerfil(_ codigo: String?) {
        guard divisaPorDefecto, let codigo, let d = Divisa(rawValue: codigo) else { return }
        divisa = d
        UserDefaults.standard.removeObject(forKey: "savium.divisa")   // sigue siendo «por defecto»
    }

    func cargarTasas() async {
        do {
            let (data, resp) = try await URLSession.shared.data(from: URL(string: "https://api.exchangerate-api.com/v4/latest/MXN")!)
            guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            tasas = try Conversion.tasas(desdeRespuesta: data)
            tasasAproximadas = false
        } catch {
            tasas = Conversion.tasasRespaldo
            tasasAproximadas = true
        }
    }

    func convertir(_ importe: Double, de codigo: String) -> Double {
        Conversion.convertir(importe, de: Divisa(codigo: codigo, fallback: divisa), a: divisa, tasas: tasas)
    }
}
```

`ios/Savium/Modelo/Sesion.swift`:

```swift
import Foundation
import Observation
import Supabase

@Observable @MainActor
final class Sesion {
    enum Estado: Equatable { case cargando, fuera, dentro(userId: String) }
    private(set) var estado: Estado = .cargando
    var mensaje: String?
    private var cierreVoluntario = false

    init() { Task { await escuchar() } }

    var userId: String? { if case let .dentro(id) = estado { id } else { nil } }

    private func escuchar() async {
        for await (evento, sesion) in supabase.auth.authStateChanges {
            switch evento {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                estado = sesion.map { .dentro(userId: $0.user.id.uuidString.lowercased()) } ?? .fuera
            case .signedOut:
                // Review Focus 4: si no lo pidió el usuario, la sesión caducó.
                if case .dentro = estado, !cierreVoluntario { mensaje = "Tu sesión ha caducado. Vuelve a iniciar sesión." }
                cierreVoluntario = false
                estado = .fuera
            default:
                break
            }
        }
    }

    func entrar(email: String, clave: String) async {
        mensaje = nil
        do { try await supabase.auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: clave) }
        catch { mensaje = "No se pudo iniciar sesión. Revisa el correo y la contraseña." }
    }

    func cerrar() async {
        cierreVoluntario = true
        try? await supabase.auth.signOut()
    }
}
```

`ios/Savium/Modelo/Bloqueo.swift`:

```swift
import Foundation
import LocalAuthentication
import Observation
import SaviumCore

@Observable @MainActor
final class Bloqueo {
    private var regla: ReglaBloqueo
    var bloqueado: Bool { regla.bloqueado }

    init() {
        var error: NSError?
        regla = ReglaBloqueo(puedeAutenticar: LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error))
    }

    func desbloquear() async {
        guard regla.bloqueado else { return }
        let ok = (try? await LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Desbloquear Savium")) ?? false
        if ok { regla.desbloqueado() }
    }

    func enSegundoPlano(_ ahora: Date = .now) { regla.enSegundoPlano(ahora) }
    func alVolver(_ ahora: Date = .now) { regla.alVolver(ahora) }
}
```

`ios/Savium/Modelo/DatosStore.swift`:

```swift
import Foundation
import Observation
import SaviumCore

@Observable @MainActor
final class DatosStore {
    let repo = Repositorio(db: supabase)
    private(set) var cuentas: [Cuenta] = []
    private(set) var filasPatrimonio: [FilaPatrimonio] = []
    private(set) var categorias: [Categoria] = []
    private(set) var pendientes: [Pendiente] = []
    private(set) var suscripciones: [Suscripcion] = []
    private(set) var inversiones: [Inversion] = []
    private(set) var valuaciones: [Valuacion] = []
    private(set) var movimientosPorPagar: [Transaccion] = []
    private(set) var movimientosMesAnterior: [Transaccion] = []
    private(set) var recientes: [Transaccion] = []
    private(set) var cargando = false
    private(set) var error: String?
    private(set) var actualizado: Date?

    var hayDatos: Bool { actualizado != nil }
    var cal: Calendar { .current }

    func cargar(app: AppModel) async {
        guard !cargando else { return }
        cargando = true
        defer { cargando = false }
        async let tasas: Void = app.cargarTasas()
        do {
            let ahora = Date()
            let mes = MesAnterior.rango(now: ahora, calendario: cal)
            let hace90 = Fechas.isoLocal(cal.date(byAdding: .day, value: -90, to: ahora)!, calendario: cal)
            let hoy = Fechas.isoLocal(ahora, calendario: cal)
            async let c = repo.cuentas()
            async let p = repo.patrimonio()
            async let k = repo.categorias()
            async let pe = repo.pendientes()
            async let s = repo.suscripcionesActivas()
            async let i = repo.inversiones()
            async let v = repo.valuaciones()
            async let ma = repo.movimientos(desde: mes.desde, hasta: mes.hasta)
            async let re = repo.movimientos(desde: hace90, hasta: hoy)
            async let perfil = repo.perfil()
            let cats = try await k
            async let pp = repo.movimientos(deSubcategorias: PorPagar.subcategoriasRelevantes(cats))
            (cuentas, filasPatrimonio, categorias, pendientes, suscripciones, inversiones, valuaciones) =
                try await (c, p, cats, pe, s, i, v)
            (movimientosMesAnterior, recientes, movimientosPorPagar) = try await (ma, re, pp)
            app.usarDivisaDelPerfil(try await perfil?.divisaPreferida)
            error = nil
            actualizado = ahora
        } catch {
            self.error = "Sin conexión"
        }
        await tasas
    }

    // MARK: Derivados (siempre en la divisa elegida)

    func patrimonio(_ app: AppModel) -> Patrimonio.Resultado {
        Patrimonio.calcular(filasPatrimonio, tasas: app.tasas, moneda: app.divisa)
    }

    func resumenPendientes(_ app: AppModel) -> Pendientes.Resumen {
        Pendientes.resumen(pendientes, tasas: app.tasas, moneda: app.divisa, now: .now, calendario: cal)
    }

    func porPagar(_ app: AppModel, horizonte: Int) -> [FilaPorPagar] {
        PorPagar.calcular(movimientos: movimientosPorPagar, categorias: categorias, cuentas: cuentas, suscripciones: suscripciones,
                          horizonte: horizonte, monedaBase: app.divisa, now: .now, calendario: cal)
    }

    func mesAnterior(_ app: AppModel) -> MesAnterior.Totales {
        let porId = Dictionary(categorias.map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
        let movs = movimientosMesAnterior.map {
            MovimientoResumen(fecha: $0.fechaUTC, ingreso: $0.ingreso, gasto: $0.gasto, divisa: $0.divisa,
                              tipo: porId[$0.subcategoriaId]?.tipo, categoria: porId[$0.subcategoriaId]?.categoria ?? "SIN ASIGNAR")
        }
        return MesAnterior.totales(movs, tasas: app.tasas, moneda: app.divisa, now: .now, calendario: cal)
    }

    func categoria(_ id: String) -> Categoria? { categorias.first { $0.id == id } }
    func cuenta(_ id: String) -> Cuenta? { cuentas.first { $0.id == id } }
}
```

Nota: `monedaBase` de Por pagar es la divisa del perfil en la web. Aquí se usa `app.divisa`, que al principio es la del perfil. Si el usuario cambia de divisa en la app, las suscripciones (que no guardan divisa) se muestran en la elegida. Es la misma limitación de la tabla y no cambia ningún importe.

- [ ] **Step 4: Vistas base**

`ios/Savium/Vistas/Comunes.swift`:

```swift
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
        if datos.cargando { ProgressView() } else {
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
```

`ios/Savium/Vistas/LoginView.swift`:

```swift
import SwiftUI

struct LoginView: View {
    @Environment(Sesion.self) private var sesion
    @State private var email = ""
    @State private var clave = ""
    @State private var entrando = false

    var body: some View {
        NavigationStack {
            Form {
                if let mensaje = sesion.mensaje {
                    Section { Label(mensaje, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
                }
                Section {
                    TextField("Correo", text: $email).textContentType(.username).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Contraseña", text: $clave).textContentType(.password)
                }
                Section {
                    Button {
                        entrando = true
                        Task { await sesion.entrar(email: email, clave: clave); entrando = false }
                    } label: {
                        if entrando { ProgressView().frame(maxWidth: .infinity) } else { Text("Entrar").frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.glassProminent).disabled(email.isEmpty || clave.isEmpty || entrando)
                    Link("¿Olvidaste tu contraseña?", destination: URL(string: "https://savium.manoloto.com/#/auth")!)
                }
            }
            .navigationTitle("Savium")
        }
    }
}
```

`ios/Savium/Vistas/RaizView.swift`:

```swift
import SwiftUI

struct RaizView: View {
    @Environment(Sesion.self) private var sesion
    @Environment(Bloqueo.self) private var bloqueo
    @Environment(\.scenePhase) private var fase

    var body: some View {
        ZStack {
            switch sesion.estado {
            case .cargando: ProgressView()
            case .fuera: LoginView()
            case .dentro:
                if bloqueo.bloqueado {
                    ContentUnavailableView {
                        Label("Savium está bloqueado", systemImage: "faceid")
                    } actions: {
                        Button("Desbloquear") { Task { await bloqueo.desbloquear() } }.buttonStyle(.glassProminent)
                    }
                    .task { await bloqueo.desbloquear() }
                } else {
                    PestanasView()
                }
            }
            // Tapa las cifras en el selector de apps.
            if fase != .active {
                Rectangle().fill(.background).ignoresSafeArea()
                    .overlay { Image(systemName: "cube").font(.system(size: 72, weight: .light)).foregroundStyle(.tint) }
            }
        }
        .onChange(of: fase) { _, nueva in
            if nueva == .background { bloqueo.enSegundoPlano() }
            if nueva == .active { bloqueo.alVolver() }
        }
    }
}
```

`ios/Savium/Vistas/PestanasView.swift` (provisional; cada pestaña se rellena en las tareas 9-12):

```swift
import SwiftUI

struct PestanasView: View {
    @Environment(AppModel.self) private var app
    @Environment(DatosStore.self) private var datos

    var body: some View {
        @Bindable var app = app
        TabView(selection: $app.pestana) {
            Tab("Resumen", systemImage: "chart.pie", value: .resumen) { NavigationStack { ResumenView() } }
            Tab("Movimientos", systemImage: "list.bullet.rectangle", value: .movimientos) { NavigationStack { MovimientosView() } }
            Tab("Patrimonio", systemImage: "building.columns", value: .patrimonio) { NavigationStack { PatrimonioView() } }
            Tab("Pendientes", systemImage: "clock", value: .pendientes) { NavigationStack { PendientesView() } }
                .badge(datos.resumenPendientes(app).vencidos)
            Tab("Suscripciones", systemImage: "repeat", value: .suscripciones) { NavigationStack { SuscripcionesView() } }
        }
        .task { await datos.cargar(app: app) }
    }
}

// Provisionales hasta sus tareas.
struct ResumenView: View { var body: some View { Text("Resumen").navigationTitle("Resumen") } }
struct MovimientosView: View { var body: some View { Text("Movimientos").navigationTitle("Movimientos") } }
struct PatrimonioView: View { var body: some View { Text("Patrimonio").navigationTitle("Patrimonio") } }
struct PendientesView: View { var body: some View { Text("Pendientes").navigationTitle("Pendientes") } }
struct SuscripcionesView: View { var body: some View { Text("Suscripciones").navigationTitle("Suscripciones") } }
```

`ios/Savium/App/SaviumApp.swift`:

```swift
import SwiftUI

@main
struct SaviumApp: App {
    @State private var app = AppModel()
    @State private var sesion = Sesion()
    @State private var bloqueo = Bloqueo()
    @State private var datos = DatosStore()

    var body: some Scene {
        WindowGroup {
            RaizView()
                .environment(app).environment(sesion).environment(bloqueo).environment(datos)
        }
    }
}
```

- [ ] **Step 5: Compilar, probar en el simulador y commit**

Run: `cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build; cd ..`
Expected: compila sin errores.

Abre el panel del simulador (`mcp__Claude_Code_iOS_Simulator__control` con `attach`), compila e instala con `build` y `launch`, y haz `screenshot`. Expected: pantalla de login. Pide al usuario que **inicie sesión él mismo** en el panel. Expected: las cinco pestañas, con el texto provisional y un globo en Pendientes si hay vencidos.

Review Focus 4: con la sesión abierta en el simulador, pide al usuario que cierre las demás sesiones desde la web, o que en el panel de Supabase (Authentication › Users › su usuario) cierre sus sesiones. Al volver a la app y refrescar, debe aparecer el login con «Tu sesión ha caducado». Si el SDK no emite `signedOut` en ese caso y la app sigue mostrando datos viejos, anótalo en el ledger como hallazgo, sin parchearlo en esta tarea.

```bash
git add ios/Savium ios/SaviumCore
git commit -m "App iOS: Supabase, sesión con mensaje de caducidad, bloqueo con Face ID y pestañas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Resumen

**Files:**
- Create: `ios/Savium/Vistas/ResumenView.swift`
- Modify: `ios/Savium/Vistas/PestanasView.swift` (quitar el `ResumenView` provisional)
- Modify: `ios/Savium/Vistas/Comunes.swift` (añadir `Linea`)

**Interfaces:**
- Consumes: `DatosStore` (`patrimonio`, `resumenPendientes`, `porPagar` y `mesAnterior`), `AppModel`, `MenuPerfil`, `AvisoEstado`, `BotonNuevo` y `SinDatos`.
- Produces: `ResumenView` y `Linea(_ titulo:, valor:, divisa:, destacado:)`. `NuevoMovimientoView` llega en la tarea 13; hasta entonces el botón «+» abre un `Text` provisional.

- [ ] **Step 1: Escribir la vista**

Añade a `Comunes.swift`:

```swift
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
```

`ResumenView.swift`:

```swift
import SwiftUI
import SaviumCore

struct ResumenView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @State private var apuntando = false

    private var nombreMesAnterior: String {
        let d = Calendar.current.date(byAdding: .month, value: -1, to: .now)!
        return d.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "es_MX"))).capitalized
    }

    var body: some View {
        Group {
            if datos.hayDatos { lista } else { SinDatos() }
        }
        .navigationTitle("Resumen")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { MenuPerfil() } }
        .refreshable { await datos.cargar(app: app) }
        .overlay(alignment: .bottomTrailing) { if datos.hayDatos { BotonNuevo { apuntando = true } } }
        .sheet(isPresented: $apuntando) { NuevoMovimientoView() }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let pendientes = datos.resumenPendientes(app)
        let vencidos = pendientes.filas.filter(\.vencido)
        let proximos = datos.porPagar(app, horizonte: 30).filter {
            (Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: .now), to: $0.fechaEstimada).day ?? 99) <= 7
        }
        let mes = datos.mesAnterior(app)
        let d = app.divisa.rawValue
        return List {
            AvisoEstado()
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Patrimonio neto").font(.subheadline).foregroundStyle(.secondary)
                    Importe(valor: p.neto, divisa: d, estilo: .largeTitle.bold())
                        .minimumScaleFactor(0.5).lineLimit(1)
                }
                .padding(.vertical, 6)
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Activos", valor: p.activos, divisa: d) }.tint(.primary)
                Button { app.pestana = .patrimonio } label: { Linea(titulo: "Pasivos", valor: p.pasivos, divisa: d) }.tint(.primary)
            }
            if !vencidos.isEmpty || !proximos.isEmpty {
                Section("Atención") {
                    ForEach(vencidos) { f in
                        Button { app.pestana = .pendientes } label: {
                            LabeledContent {
                                Importe(valor: f.restante, divisa: f.pendiente.divisa, color: .red)
                            } label: {
                                Label(f.pendiente.concepto ?? "Pendiente", systemImage: "exclamationmark.circle.fill").foregroundStyle(.red)
                            }
                        }
                    }
                    ForEach(proximos) { f in
                        Button { app.pestana = .pendientes } label: {
                            LabeledContent {
                                Importe(valor: f.monto, divisa: f.divisa.rawValue)
                            } label: {
                                Label {
                                    VStack(alignment: .leading) {
                                        Text(f.concepto)
                                        Text(f.fechaEstimada, format: .dateTime.day().month()).font(.caption).foregroundStyle(.secondary)
                                    }
                                } icon: { Image(systemName: "calendar") }
                            }
                        }.tint(.primary)
                    }
                }
            }
            Section("Mes anterior (\(nombreMesAnterior))") {
                Linea(titulo: "Ingresos", valor: mes.ingresos, divisa: d)
                Linea(titulo: "Gastos", valor: mes.gastos, divisa: d)
                Linea(titulo: "Balance", valor: mes.balance, divisa: d, destacado: true)
            }
        }
        .contentMargins(.bottom, 80, for: .scrollContent)
    }
}
```

Quita `struct ResumenView` provisional de `PestanasView.swift`. Mientras no exista la tarea 13, añade al final de `ResumenView.swift`:

```swift
// Provisional hasta la tarea 13.
struct NuevoMovimientoView: View { var body: some View { Text("Apuntar") } }
```

- [ ] **Step 2: Compilar y verificar con datos reales**

Run: el comando de compilación de la app.
Expected: compila.

En el simulador, con la sesión del usuario, haz `screenshot` del Resumen y compara con la web (savium.manoloto.com, Resumen móvil en la misma divisa):
- El patrimonio neto, los activos y los pasivos deben coincidir al céntimo, porque salen de la misma vista. Si no coinciden, para e investiga.
- Los ingresos, gastos y balance del mes anterior también deben coincidir. Recuerda la diferencia conocida del día 1 si la tarea paralela no ha llegado a `main`.

Cambia la divisa en el menú de perfil y comprueba que todo se reconvierte.

- [ ] **Step 3: Commit**

```bash
git add ios/Savium
git commit -m "App iOS: pestaña Resumen con patrimonio, Atención y mes anterior

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Movimientos

**Files:**
- Create: `ios/Savium/Modelo/MovimientosStore.swift`
- Create: `ios/Savium/Vistas/MovimientosView.swift`
- Modify: `ios/Savium/Vistas/PestanasView.swift` (quitar el provisional e inyectar `MovimientosStore`)
- Modify: `ios/Savium/App/SaviumApp.swift` (crear `MovimientosStore`)

**Interfaces:**
- Consumes: `Repositorio.movimientos(pagina:cuentaId:texto:)` y `Movimientos.agruparPorDia`.
- Produces: `MovimientosStore` (`@Observable`), con `filas`, `cuentaId`, `texto`, `hayMas`, `recargar()` y `cargarMas()`.

- [ ] **Step 1: Store y vista**

`MovimientosStore.swift`:

```swift
import Foundation
import Observation
import SaviumCore

@Observable @MainActor
final class MovimientosStore {
    private let repo = Repositorio(db: supabase)
    private(set) var filas: [Transaccion] = []
    private(set) var hayMas = true
    private(set) var cargando = false
    private(set) var error: String?
    var cuentaId: String?
    var texto = ""
    private var pagina = 0
    private var consulta = 0   // descarta respuestas de una búsqueda anterior

    func recargar() async {
        consulta += 1
        pagina = 0; hayMas = true; filas = []
        await cargarMas()
    }

    func cargarMas() async {
        guard hayMas, !cargando else { return }
        cargando = true
        let mia = consulta
        defer { if mia == consulta { cargando = false } }
        do {
            let nuevas = try await repo.movimientos(pagina: pagina, cuentaId: cuentaId, texto: texto)
            guard mia == consulta else { return }
            filas += nuevas
            hayMas = nuevas.count == Repositorio.tamanoPagina
            pagina += 1
            error = nil
        } catch {
            if mia == consulta { self.error = "No se pudieron cargar los movimientos." }
        }
    }
}
```

`MovimientosView.swift`:

```swift
import SwiftUI
import SaviumCore

struct MovimientosView: View {
    @Environment(MovimientosStore.self) private var store
    @Environment(DatosStore.self) private var datos
    @State private var apuntando = false

    var body: some View {
        @Bindable var store = store
        List {
            if let error = store.error { Label(error, systemImage: "wifi.slash").foregroundStyle(.secondary) }
            ForEach(Movimientos.agruparPorDia(store.filas), id: \.dia) { grupo in
                Section(titulo(grupo.dia)) {
                    ForEach(grupo.movimientos) { t in
                        NavigationLink { DetalleMovimientoView(t: t) } label: { FilaMovimiento(t: t) }
                            .onAppear { if t.id == store.filas.last?.id { Task { await store.cargarMas() } } }
                    }
                }
            }
            if store.cargando { ProgressView().frame(maxWidth: .infinity) }
            if !store.cargando && store.filas.isEmpty && store.error == nil {
                ContentUnavailableView.search(text: store.texto)
            }
        }
        .navigationTitle("Movimientos")
        .searchable(text: $store.texto, prompt: "Buscar en comentarios")
        .onSubmit(of: .search) { Task { await store.recargar() } }
        .onChange(of: store.texto) { _, nuevo in if nuevo.isEmpty { Task { await store.recargar() } } }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Cuenta", selection: $store.cuentaId) {
                        Text("Todas las cuentas").tag(String?.none)
                        ForEach(datos.cuentas.filter { !$0.vendida }) { Text($0.nombre).tag(Optional($0.id)) }
                    }
                } label: {
                    Label("Filtrar", systemImage: store.cuentaId == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                }
            }
        }
        .onChange(of: store.cuentaId) { Task { await store.recargar() } }
        .refreshable { await store.recargar() }
        .task { if store.filas.isEmpty { await store.recargar() } }
        .overlay(alignment: .bottomTrailing) { BotonNuevo { apuntando = true } }
        .sheet(isPresented: $apuntando) { NuevoMovimientoView() }
        .contentMargins(.bottom, 80, for: .scrollContent)
    }

    private func titulo(_ dia: String) -> String {
        guard let d = Fechas.diaLocal(dia, calendario: .current) else { return dia }
        return d.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "es_MX"))).capitalized
    }
}

struct FilaMovimiento: View {
    @Environment(DatosStore.self) private var datos
    let t: Transaccion
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(t.comentario.isEmpty ? "Sin comentario" : t.comentario).lineLimit(1)
                Text([datos.categoria(t.subcategoriaId)?.subcategoria, datos.cuenta(t.cuentaId)?.nombre].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            Importe(valor: t.importe, divisa: t.divisa, color: t.importe > 0 ? .green : .primary)
        }
    }
}

struct DetalleMovimientoView: View {
    @Environment(DatosStore.self) private var datos
    let t: Transaccion
    var body: some View {
        List {
            Section { Importe(valor: t.importe, divisa: t.divisa, estilo: .title.bold(), color: t.importe > 0 ? .green : .primary) }
            Section {
                LabeledContent("Fecha", value: t.fecha)
                LabeledContent("Cuenta", value: datos.cuenta(t.cuentaId)?.nombre ?? "—")
                LabeledContent("Categoría", value: datos.categoria(t.subcategoriaId).map { "\($0.categoria) · \($0.subcategoria)" } ?? "—")
                if !t.comentario.isEmpty { LabeledContent("Comentario", value: t.comentario) }
            }
        }
        .navigationTitle("Movimiento").navigationBarTitleDisplayMode(.inline)
    }
}
```

En `SaviumApp.swift`, añade `@State private var movimientos = MovimientosStore()` y `.environment(movimientos)`. Quita el provisional `MovimientosView` de `PestanasView.swift`.

- [ ] **Step 2: Compilar y verificar**

Run: el comando de compilación de la app.
Expected: compila.

En el simulador:
1. Desplázate hasta cargar al menos 3 páginas y comprueba que no hay filas duplicadas. Mira las secciones de días límite entre páginas.
2. Filtra por una cuenta y busca una palabra que sepas que existe.
3. Haz `screenshot` de la lista y de un detalle.

- [ ] **Step 3: Commit**

```bash
git add ios/Savium
git commit -m "App iOS: Movimientos por día con paginación, filtro por cuenta y búsqueda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Patrimonio

**Files:**
- Create: `ios/Savium/Vistas/PatrimonioView.swift`
- Modify: `ios/Savium/Vistas/PestanasView.swift` (quitar el provisional)

**Interfaces:**
- Consumes: `DatosStore` (`patrimonio`, `cuentas`, `inversiones` y `valuaciones`), `Inversiones` y `Rubro`.

- [ ] **Step 1: Vista**

```swift
import Charts
import SwiftUI
import SaviumCore

struct PatrimonioView: View {
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app

    static let ordenTipos = ["Efectivo", "Banco", "Ahorros", "Tarjeta de Crédito", "Inversiones", "Empresa Propia", "Bien Raíz", "Hipoteca"]

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Patrimonio")
            .refreshable { await datos.cargar(app: app) }
    }

    private var lista: some View {
        let p = datos.patrimonio(app)
        let d = app.divisa.rawValue
        let activos = Rubro.allCases.filter { !$0.esPasivo && (p.porRubro[$0] ?? 0) != 0 }
        let pasivos = Rubro.allCases.filter { $0.esPasivo && (p.porRubro[$0] ?? 0) != 0 }
        // Se ocultan las vendidas y las de saldo residual, como ResumenMovil.
        let visibles = datos.cuentas.filter { !$0.vendida && abs($0.saldoActual) >= 0.005 }
        let saldos = Dictionary(datos.cuentas.map { ($0.id, $0.saldoActual) }, uniquingKeysWith: { a, _ in a })
        let invs = datos.inversiones.map { i in
            (i, valor: Inversiones.valorActual(i, valuaciones: datos.valuaciones, saldoCuenta: i.cuentaId.flatMap { saldos[$0] }))
        }
        let totales = Inversiones.totales(invs, tasas: app.tasas, moneda: app.divisa)
        return List {
            AvisoEstado()
            Section {
                Linea(titulo: "Patrimonio neto", valor: p.neto, divisa: d, destacado: true)
                if !activos.isEmpty {
                    Chart(activos) { r in
                        SectorMark(angle: .value("Importe", p.porRubro[r] ?? 0), innerRadius: .ratio(0.6), angularInset: 1.5)
                            .foregroundStyle(by: .value("Rubro", r.nombre))
                    }
                    .frame(height: 180)
                    .accessibilityLabel("Distribución de activos")
                }
            }
            Section("Activos · \(Formato.importe(p.activos, d))") {
                ForEach(activos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
            }
            Section("Pasivos · \(Formato.importe(p.pasivos, d))") {
                ForEach(pasivos) { Linea(titulo: $0.nombre, valor: p.porRubro[$0] ?? 0, divisa: d) }
            }
            ForEach(Self.ordenTipos, id: \.self) { tipo in
                let cuentas = visibles.filter { $0.tipo == tipo }
                if !cuentas.isEmpty {
                    Section(tipo) {
                        ForEach(cuentas) { Linea(titulo: $0.nombre, valor: $0.saldoActual, divisa: $0.divisa) }
                    }
                }
            }
            let activas = invs.filter { $0.0.activa }
            if !activas.isEmpty {
                Section("Inversiones") {
                    Linea(titulo: "Valor actual", valor: totales.valor, divisa: d, destacado: true)
                    Linea(titulo: "Invertido", valor: totales.invertido, divisa: d)
                    let rend = totales.valor - totales.invertido
                    LabeledContent("Rendimiento") {
                        Text("\(rend >= 0 ? "+" : "")\(Formato.importe(rend, d)) (\(String(format: "%.2f", totales.invertido != 0 ? rend / totales.invertido * 100 : 0))%)")
                            .monospacedDigit().foregroundStyle(rend >= 0 ? .green : .red)
                    }
                    ForEach(activas, id: \.0.id) { par in
                        let r = Inversiones.rendimiento(par.0, valor: par.valor, valuaciones: datos.valuaciones)
                        LabeledContent {
                            VStack(alignment: .trailing) {
                                Importe(valor: r.valor, divisa: par.0.moneda)
                                Text(String(format: "%+.2f%%", r.pct)).font(.caption).foregroundStyle(r.pct >= 0 ? .green : .red)
                            }
                        } label: { Text(par.0.nombre) }
                    }
                }
            }
        }
    }
}
```

Quita el provisional `PatrimonioView` de `PestanasView.swift`.

- [ ] **Step 2: Compilar, verificar y commit**

Run: el comando de compilación de la app.
Expected: compila.

En el simulador, compara con la web:
- Los totales de activos y pasivos (deben coincidir con el Resumen).
- El saldo de 2-3 cuentas.
- El valor actual de las inversiones de la versión móvil web (`/inversiones`).

Haz `screenshot` en claro y en oscuro (`resize_window` no aplica: usa los ajustes del simulador o `xcrun simctl ui booted appearance dark`).

```bash
git add ios/Savium
git commit -m "App iOS: Patrimonio con distribución, cuentas por tipo e inversiones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Pendientes y Suscripciones

**Files:**
- Create: `ios/Savium/Vistas/PendientesView.swift`
- Create: `ios/Savium/Vistas/SuscripcionesView.swift`
- Modify: `ios/Savium/Vistas/PestanasView.swift` (quitar los dos provisionales)

**Interfaces:**
- Consumes: `DatosStore` (`resumenPendientes`, `porPagar` y `suscripciones`) y `Suscripciones`.

- [ ] **Step 1: Vistas**

`PendientesView.swift`:

```swift
import SwiftUI
import SaviumCore

struct PendientesView: View {
    enum Modo: String, CaseIterable { case cobrar = "Por cobrar", pagar = "Por pagar" }
    @Environment(DatosStore.self) private var datos
    @Environment(AppModel.self) private var app
    @State private var modo: Modo = .cobrar
    @State private var horizonte = 30

    var body: some View {
        Group { if datos.hayDatos { lista } else { SinDatos() } }
            .navigationTitle("Pendientes")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Vista", selection: $modo) { ForEach(Modo.allCases, id: \.self) { Text($0.rawValue) } }
                        .pickerStyle(.segmented).frame(width: 240)
                }
            }
            .refreshable { await datos.cargar(app: app) }
    }

    @ViewBuilder private var lista: some View {
        let d = app.divisa.rawValue
        switch modo {
        case .cobrar:
            let r = datos.resumenPendientes(app)
            List {
                AvisoEstado()
                Section {
                    Linea(titulo: "Total por cobrar", valor: r.total, divisa: d, destacado: true)
                    if r.vencidos > 0 { LabeledContent("Vencidos", value: "\(r.vencidos)").foregroundStyle(.red) }
                }
                Section {
                    ForEach(r.filas) { f in
                        LabeledContent {
                            Importe(valor: f.restante, divisa: f.pendiente.divisa, color: f.vencido ? .red : nil)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(f.pendiente.concepto ?? "Pendiente").foregroundStyle(f.vencido ? .red : .primary)
                                if let fe = f.pendiente.fechaEsperada { Text(f.vencido ? "Vencido · \(fe)" : fe).font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                    }
                }
            }
        case .pagar:
            let filas = datos.porPagar(app, horizonte: horizonte)
            let total = filas.reduce(0.0) { $0 + app.convertir($1.monto, de: $1.divisa.rawValue) }
            List {
                AvisoEstado()
                Section {
                    Picker("Horizonte", selection: $horizonte) { ForEach([30, 60, 90], id: \.self) { Text("\($0) días") } }
                        .pickerStyle(.segmented)
                    Linea(titulo: "Por pagar en \(horizonte) días", valor: total, divisa: d, destacado: true)
                }
                Section {
                    ForEach(filas) { f in
                        let dias = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: .now), to: f.fechaEstimada).day ?? 0
                        LabeledContent {
                            Importe(valor: f.monto, divisa: f.divisa.rawValue)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(f.concepto)
                                Text("\(f.fechaEstimada.formatted(.dateTime.day().month())) · en \(dias) d · \(f.tipo.rawValue)")
                                    .font(.caption).foregroundStyle(dias <= 7 ? .orange : .secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}
```

`SuscripcionesView.swift`:

```swift
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
        let r = Suscripciones.resumen(subs.map { (frecuencia: $0.frecuencia, monto: $0.ultimoPagoMonto) })
        // subscription_services no guarda divisa: la web asume la del perfil.
        let d = app.divisa.rawValue
        return List {
            AvisoEstado()
            Section {
                Linea(titulo: "Coste mensual estimado", valor: r.estimadoMensual, divisa: d, destacado: true)
                if r.sinEstimar > 0 { Text("\(r.sinEstimar) irregulares sin estimar").font(.footnote).foregroundStyle(.secondary) }
            }
            Section("Activas") {
                ForEach(subs) { s in
                    let e = Suscripciones.estado(proximoPago: s.proximoPago, now: .now, calendario: .current)
                    LabeledContent {
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
```

Quita los provisionales de `PestanasView.swift`.

- [ ] **Step 2: Compilar, verificar y commit**

Run: el comando de compilación de la app.
Expected: compila.

En el simulador, compara con la web:
- El total por cobrar y los vencidos con `/pendientes`.
- El total por pagar a 30, 60 y 90 días con «Por pagar» del móvil web.
- El coste mensual con `/suscripciones`.

El globo de la pestaña debe coincidir con el número de vencidos.

```bash
git add ios/Savium
git commit -m "App iOS: Pendientes (por cobrar y por pagar) y Suscripciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Apuntar un gasto o ingreso

**Files:**
- Create: `ios/Savium/Vistas/NuevoMovimientoView.swift`
- Modify: `ios/Savium/Vistas/ResumenView.swift` (quitar el `NuevoMovimientoView` provisional)

**Interfaces:**
- Consumes: `FormularioMovimiento`, `Movimientos.frecuentes`, `Repositorio.crear`, `DatosStore`, `MovimientosStore` y `Sesion.userId`.

- [ ] **Step 1: Vista**

```swift
import SwiftUI
import SaviumCore

struct NuevoMovimientoView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(DatosStore.self) private var datos
    @Environment(MovimientosStore.self) private var movimientos
    @Environment(AppModel.self) private var app
    @Environment(Sesion.self) private var sesion
    @State private var form = FormularioMovimiento(fecha: .now, cuentaId: UserDefaults.standard.string(forKey: "savium.ultimaCuenta"))
    @State private var guardando = false
    @State private var error: String?
    @State private var exito = 0
    @FocusState private var importeEnfocado: Bool

    private var cuentas: [Cuenta] { datos.cuentas.filter { !$0.vendida } }
    private var cuenta: Cuenta? { form.cuentaId.flatMap(datos.cuenta) }
    private var tipoCategoria: String { form.esGasto ? "Gastos" : "Ingreso" }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Tipo", selection: $form.esGasto) { Text("Gasto").tag(true); Text("Ingreso").tag(false) }
                        .pickerStyle(.segmented)
                        .onChange(of: form.esGasto) {
                            if let id = form.subcategoriaId, datos.categoria(id)?.tipo != tipoCategoria { form.subcategoriaId = nil }
                        }
                    HStack {
                        TextField("0.00", text: $form.importeTexto).keyboardType(.decimalPad).focused($importeEnfocado)
                            .font(.system(size: 40, weight: .semibold, design: .rounded)).monospacedDigit()
                        Text(cuenta?.divisa ?? app.divisa.rawValue).font(.title2).foregroundStyle(.secondary)
                    }
                }
                Section {
                    Picker("Cuenta", selection: $form.cuentaId) {
                        Text("Elige una cuenta").tag(String?.none)
                        ForEach(cuentas) { Text("\($0.nombre) (\($0.divisa))").tag(Optional($0.id)) }
                    }
                    NavigationLink {
                        SelectorCategoria(tipo: tipoCategoria, seleccion: $form.subcategoriaId)
                    } label: {
                        LabeledContent("Categoría", value: form.subcategoriaId.flatMap(datos.categoria).map(\.subcategoria) ?? "Elige una")
                    }
                    DatePicker("Fecha", selection: $form.fecha, displayedComponents: .date)
                    TextField("Comentario (opcional)", text: $form.comentario)
                }
                if let error {
                    Section { Label(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red) }
                }
            }
            .navigationTitle(form.esGasto ? "Nuevo gasto" : "Nuevo ingreso")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar", role: .cancel) { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if guardando { ProgressView() } else {
                        Button(error == nil ? "Guardar" : "Reintentar") { Task { await guardar() } }
                            .disabled(!form.esValido)
                    }
                }
            }
            .sensoryFeedback(.success, trigger: exito)
            .onAppear { importeEnfocado = true }
            .interactiveDismissDisabled(guardando)
        }
    }

    private func guardar() async {
        // Review Focus 2: un solo envío a la vez; el botón desaparece mientras guarda.
        guard !guardando, let userId = sesion.userId,
              let nueva = form.construir(cuentas: datos.cuentas, userId: userId, calendario: .current) else { return }
        guardando = true
        defer { guardando = false }
        do {
            try await datos.repo.crear(nueva)
            UserDefaults.standard.set(nueva.cuentaId, forKey: "savium.ultimaCuenta")
            exito += 1
            dismiss()
            Task { await datos.cargar(app: app); await movimientos.recargar() }
        } catch {
            self.error = "No se pudo guardar. Revisa la conexión y vuelve a intentarlo."
        }
    }
}

struct SelectorCategoria: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(DatosStore.self) private var datos
    let tipo: String
    @Binding var seleccion: String?
    @State private var texto = ""

    var body: some View {
        let todas = datos.categorias.filter { $0.tipo == tipo }
        let filtradas = texto.isEmpty ? todas : todas.filter { "\($0.categoria) \($0.subcategoria)".localizedStandardContains(texto) }
        let frecuentes = Movimientos.frecuentes(datos.recientes.filter { t in todas.contains { $0.id == t.subcategoriaId } }, limite: 5)
            .compactMap(datos.categoria)
        let grupos = Dictionary(grouping: filtradas, by: \.categoria).sorted { $0.key < $1.key }
        List {
            if texto.isEmpty && !frecuentes.isEmpty {
                Section("Frecuentes") { ForEach(frecuentes) { fila($0) } }
            }
            ForEach(grupos, id: \.key) { g in
                Section(g.key) { ForEach(g.value.sorted { $0.subcategoria < $1.subcategoria }) { fila($0) } }
            }
        }
        .searchable(text: $texto, prompt: "Buscar categoría")
        .navigationTitle("Categoría")
    }

    private func fila(_ c: Categoria) -> some View {
        Button { seleccion = c.id; dismiss() } label: {
            HStack {
                Text(c.subcategoria).foregroundStyle(.primary)
                Spacer()
                if seleccion == c.id { Image(systemName: "checkmark").foregroundStyle(.tint) }
            }
        }
    }
}
```

Quita el provisional `NuevoMovimientoView` de `ResumenView.swift`.

- [ ] **Step 2: Compilar y verificar el flujo completo**

Run: `swift test --package-path ios/SaviumCore && (cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build)`
Expected: tests en verde y compila.

En el simulador, con la sesión del usuario y su visto bueno (escribe en su BD real), pídele que:
1. Apunte un gasto de **1** en Efectivo con el comentario «Prueba app». Comprueba que se cierra la hoja, que aparece arriba en Movimientos y que el patrimonio baja 1.
2. Abra la web y compruebe que la transacción está con la fecha local de hoy, su cuenta, su categoría y la divisa de la cuenta (criterio 4 de la spec).
3. La borre desde la web, que la app no borra. Al refrescar la app, el patrimonio vuelve.

Prueba de error (Review Focus 2): activa el modo avión del Mac o corta la red del simulador e intenta guardar. Debe aparecer el error con «Reintentar» sin cerrarse la hoja. Con la red de vuelta, «Reintentar» guarda **una sola** vez; compruébalo en la web y borra la prueba.

- [ ] **Step 3: Commit**

```bash
git add ios/Savium
git commit -m "App iOS: hoja para apuntar gastos e ingresos con categorías frecuentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Icono, color de acento y verificación visual

**Files:**
- Create: `ios/scripts/generar_icono.py`
- Create: `ios/Savium/Assets.xcassets/Contents.json`
- Create: `ios/Savium/Assets.xcassets/AppIcon.appiconset/Contents.json` y `icono-1024.png` (generado)
- Create: `ios/Savium/Assets.xcassets/AccentColor.colorset/Contents.json`

- [ ] **Step 1: Generar el icono desde el logo**

`ios/scripts/generar_icono.py` (dibuja el cubo de `public/favicon.svg` a 1024 px con Pillow, que ya está instalado):

```python
"""Icono de la app: el cubo de public/favicon.svg sobre fondo blanco, a 1024 px."""
from pathlib import Path
from PIL import Image, ImageDraw

VERDE = (0x23, 0x90, 0x05)
LADO = 1024
ESCALA = LADO * 0.62 / 184          # el cubo ocupa ~62 % del icono
DESPLAZAMIENTO = (LADO - 184 * ESCALA) / 2
TRAZO = round(10 * ESCALA)

# Mismos trazos que el SVG (viewBox 184×184).
TRAZOS = [
    [(91.5, 10), (172.5, 48), (91.5, 86), (10.5, 48), (91.5, 10)],
    [(10.5, 48), (10.5, 136), (91.5, 175), (172.5, 136), (172.5, 48)],
    [(91.5, 106), (91.5, 175)],
]

def punto(p):
    return (DESPLAZAMIENTO + p[0] * ESCALA, DESPLAZAMIENTO + p[1] * ESCALA)

img = Image.new("RGB", (LADO, LADO), "white")
d = ImageDraw.Draw(img)
for trazo in TRAZOS:
    pts = [punto(p) for p in trazo]
    d.line(pts, fill=VERDE, width=TRAZO, joint="curve")
    for x, y in pts:  # extremos redondeados (stroke-linecap="round")
        r = TRAZO / 2
        d.ellipse((x - r, y - r, x + r, y + r), fill=VERDE)

destino = Path(__file__).resolve().parent.parent / "Savium/Assets.xcassets/AppIcon.appiconset/icono-1024.png"
destino.parent.mkdir(parents=True, exist_ok=True)
img.save(destino)
print(destino)
```

Run: `python3 ios/scripts/generar_icono.py`
Expected: imprime la ruta del PNG. Ábrelo con la herramienta Read para verlo: el cubo verde centrado sobre blanco.

`ios/Savium/Assets.xcassets/Contents.json`:

```json
{ "info": { "author": "xcode", "version": 1 } }
```

`AppIcon.appiconset/Contents.json`:

```json
{
  "images": [ { "filename": "icono-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024" } ],
  "info": { "author": "xcode", "version": 1 }
}
```

`AccentColor.colorset/Contents.json` (#239005; en oscuro, un verde algo más claro para mantener el contraste):

```json
{
  "colors": [
    { "idiom": "universal", "color": { "color-space": "srgb", "components": { "red": "0x23", "green": "0x90", "blue": "0x05", "alpha": "1.000" } } },
    { "idiom": "universal", "appearances": [ { "appearance": "luminosity", "value": "dark" } ],
      "color": { "color-space": "srgb", "components": { "red": "0x4C", "green": "0xC2", "blue": "0x2A", "alpha": "1.000" } } }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

- [ ] **Step 2: Verificación visual completa**

Run: el comando de compilación de la app.
Expected: compila sin advertencias de assets.

En el simulador, con la sesión del usuario, haz `screenshot` de las cinco pestañas y de la hoja «Apuntar»:
1. En modo claro.
2. En modo oscuro: `xcrun simctl ui booted appearance dark`.
3. Con letra grande: `xcrun simctl ui booted content_size extra-extra-large`.

Restablece después con `light` y `large`. Revisa en cada captura que no haya textos cortados, que los importes no se salgan, que la barra de pestañas y el botón «+» tengan Liquid Glass y que el icono se vea en la pantalla de inicio.

Envía al usuario las capturas más representativas con `SendUserFile`.

- [ ] **Step 3: Commit**

```bash
git add ios/scripts ios/Savium/Assets.xcassets
git commit -m "App iOS: icono a partir del logo y color de acento de Savium

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Iniciar sesión con Apple (bloqueada hasta tener la cuenta de Apple Developer de pago)

**Precondiciones. Si falta alguna, para y avisa al usuario:**
- El usuario tiene la cuenta de Apple Developer de pago y la ha seleccionado como *Team* en Xcode. La capacidad «Sign in with Apple» no funciona con el equipo personal gratuito.
- El usuario ha activado en Supabase (Authentication › Providers › Apple) el proveedor Apple con **Client IDs = `com.manoloto.savium`**, sin clave secreta porque solo se usa el flujo nativo, y en Authentication › Settings la opción **«Allow manual linking»**.

**Files:**
- Modify: `ios/project.yml` (entitlement `com.apple.developer.applesignin`)
- Modify: `ios/Savium/Modelo/Sesion.swift` (`entrarConApple` y `vincularApple`)
- Modify: `ios/Savium/Vistas/LoginView.swift` y `Comunes.swift` (`MenuPerfil`)
- Create: `ios/SaviumCore/Sources/SaviumCore/Nonce.swift` y su test

- [ ] **Step 1: Comprobar la API del SDK**

Run: `grep -rn "func linkIdentityWithIdToken\|func signInWithIdToken" ~/Library/Developer/Xcode/DerivedData/*/SourcePackages/checkouts/supabase-swift/Sources/Auth/ | head`
Expected: aparecen las dos funciones. **Si no existe `linkIdentityWithIdToken`**, para y explica al usuario que esta versión del SDK no permite vincular con el token nativo. Las alternativas son actualizar el SDK, si una versión posterior lo trae, o no ofrecer Apple. Nunca se permite que «Iniciar sesión con Apple» cree un usuario nuevo vacío.

- [ ] **Step 2: Nonce (test primero)**

`ios/SaviumCore/Tests/SaviumCoreTests/NonceTests.swift`:

```swift
import Testing
@testable import SaviumCore

@Suite("Nonce")
struct NonceTests {
    @Test("aleatorio de 32 caracteres y SHA-256 en hex")
    func nonce() {
        let a = Nonce.aleatorio(), b = Nonce.aleatorio()
        #expect(a.count == 32 && a != b)
        #expect(Nonce.sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -3`
Expected: FAIL de compilación.

`ios/SaviumCore/Sources/SaviumCore/Nonce.swift`:

```swift
import CryptoKit
import Foundation

/// Nonce para Sign in with Apple: se envía el SHA-256 a Apple y el original a Supabase.
public enum Nonce {
    public static func aleatorio(longitud: Int = 32) -> String {
        let caracteres = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generador = SystemRandomNumberGenerator()
        return String((0..<longitud).map { _ in caracteres.randomElement(using: &generador)! })
    }

    public static func sha256(_ texto: String) -> String {
        SHA256.hash(data: Data(texto.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
```

Run: `swift test --package-path ios/SaviumCore 2>&1 | tail -3`
Expected: PASS.

- [ ] **Step 3: Entitlement, sesión y vistas**

En `ios/project.yml`, dentro del target `Savium`:

```yaml
    entitlements:
      path: Savium/Savium.entitlements
      properties:
        com.apple.developer.applesignin: [Default]
```

En `Sesion.swift`, añade `import AuthenticationServices` y `import SaviumCore`, y estos métodos:

```swift
    /// Nonce en curso: el SHA-256 va en la petición a Apple y el original a Supabase.
    private(set) var nonceActual = ""

    func prepararApple(_ peticion: ASAuthorizationAppleIDRequest) {
        nonceActual = Nonce.aleatorio()
        peticion.requestedScopes = [.email]
        peticion.nonce = Nonce.sha256(nonceActual)
    }

    private func token(_ resultado: Result<ASAuthorization, Error>) -> String? {
        guard case let .success(auth) = resultado,
              let cred = auth.credential as? ASAuthorizationAppleIDCredential,
              let data = cred.identityToken else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Solo entra en un usuario que ya tenga Apple vinculado. Si Supabase crea uno nuevo
    /// (sin vincular antes), se cierra la sesión y se avisa: nunca se entra en un usuario vacío.
    func entrarConApple(_ resultado: Result<ASAuthorization, Error>) async {
        guard let idToken = token(resultado) else { mensaje = "No se pudo iniciar sesión con Apple."; return }
        do {
            let s = try await supabase.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: idToken, nonce: nonceActual))
            let creadoAhora = abs(s.user.createdAt.timeIntervalSinceNow) < 60
            if creadoAhora {
                cierreVoluntario = true
                try? await supabase.auth.signOut()
                mensaje = "Este Apple ID no está vinculado. Entra con tu correo y vincúlalo desde el menú de perfil."
            }
        } catch {
            mensaje = "No se pudo iniciar sesión con Apple."
        }
    }

    func vincularApple(_ resultado: Result<ASAuthorization, Error>) async -> Bool {
        guard let idToken = token(resultado) else { return false }
        do {
            try await supabase.auth.linkIdentityWithIdToken(credentials: .init(provider: .apple, idToken: idToken, nonce: nonceActual))
            return true
        } catch {
            mensaje = "No se pudo vincular con Apple."
            return false
        }
    }
```

Si en el paso 1 la firma real de `linkIdentityWithIdToken` era otra, adáptala y anótalo en el ledger.

**Riesgo del chequeo `creadoAhora`:** el usuario nuevo vacío llega a crearse en Supabase antes de cerrar la sesión. Si eso ocurre, avisa al usuario de que hay que borrarlo en Authentication › Users. Es un usuario de auth sin datos, así que no afecta a sus tablas.

En `LoginView.swift`, añade al principio del `Form` (importa `AuthenticationServices`):

```swift
                Section {
                    SignInWithAppleButton(.signIn) { sesion.prepararApple($0) } onCompletion: { r in
                        Task { await sesion.entrarConApple(r) }
                    }
                    .signInWithAppleButtonStyle(.black).frame(height: 50)
                } footer: {
                    Text("Primero entra con tu correo y vincula tu Apple ID desde el menú de perfil.")
                }
```

En `MenuPerfil` (`Comunes.swift`), añade una opción que abra una hoja con `SignInWithAppleButton(.continue)` y llame a `vincularApple`. Al terminar muestra «Apple ID vinculado» o el error:

```swift
            Button("Vincular con Apple", systemImage: "apple.logo") { vinculando = true }
```

```swift
        .sheet(isPresented: $vinculando) {
            VStack(spacing: 16) {
                Text("Vincula tu Apple ID para entrar sin contraseña.").multilineTextAlignment(.center)
                SignInWithAppleButton(.continue) { sesion.prepararApple($0) } onCompletion: { r in
                    Task { vinculado = await sesion.vincularApple(r); vinculando = false }
                }
                .frame(height: 50)
            }
            .padding().presentationDetents([.height(200)])
        }
        .alert("Apple ID vinculado", isPresented: $vinculado) { Button("OK") {} }
```

Declara `@State private var vinculando = false` y `@State private var vinculado = false` en `MenuPerfil`.

- [ ] **Step 4: Verificar en un iPhone real o en el simulador con sesión de Apple**

Con el usuario:
1. Entra con el correo y pulsa «Vincular con Apple».
2. Cierra la sesión y entra con Apple. Comprueba en Supabase (Authentication › Users) que sigue habiendo **un solo** usuario con dos identidades: email y apple.
3. Comprueba que los datos son los suyos (criterio 5 de la spec).

```bash
git add ios
git commit -m "App iOS: iniciar sesión con Apple vinculado a la cuenta existente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Cierre

- [ ] **Step 1: Verificación final**

Run: `npx vitest run && swift test --package-path ios/SaviumCore && (cd ios && xcodegen generate && xcodebuild -project Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' -quiet build)`
Expected: todo en verde.

- [ ] **Step 2: Informar al usuario**

Resume las pestañas hechas y las capturas, lo que quedó pendiente (por ejemplo, la tarea 15 si falta la cuenta) y los siguientes pasos del plan 3:
- cuenta de Apple Developer;
- App Store Connect;
- política de privacidad;
- cuenta de revisión con datos ficticios;
- solicitud de distribución no listada;
- eliminar la versión móvil web cuando la app esté aprobada.
