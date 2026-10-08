# Savium para iPhone

App nativa (SwiftUI, iOS 26). Lee y escribe en el mismo Supabase que la web.

- Generar el proyecto: `cd ios && xcodegen generate` (el `.xcodeproj` no se versiona).
- Tests de la lógica: `swift test --package-path ios/SaviumCore` (leen `shared/fixtures`).
- Compilar: `xcodebuild -project ios/Savium.xcodeproj -scheme Savium -destination 'generic/platform=iOS Simulator' build`.
- Diseño: `docs/superpowers/specs/2026-10-06-app-ios-nativa-design.md`.
