import Foundation

/// Mismo proyecto de Supabase que la web (.env). La clave es pública: protegen las RLS.
enum Config {
    static let supabaseURL = URL(string: "https://alexhdutnvlxwhziudnr.supabase.co")!
    /// manoloto@gmail.com, igual que ADMIN_ID en src/lib/admin.ts: solo él ve el panel de las apps.
    static let adminId = "01ad1bcc-00e7-47a7-88b6-8b2fc8afa52e"
    static let supabaseClave = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZXhoZHV0bnZseHdoeml1ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTk4NjAsImV4cCI6MjA2MzA5NTg2MH0.5xENkTcPI7cQR3fPG8_zD05E8b0EbfCMtr0HAhmHhzI"
}
