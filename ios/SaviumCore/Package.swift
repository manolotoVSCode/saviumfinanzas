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
