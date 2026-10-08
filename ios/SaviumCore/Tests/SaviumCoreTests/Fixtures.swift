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
