import UIKit
import WebKit
import Capacitor

/// Serves the Next.js static export: `/chords/cmajor` → `chords/cmajor.html`.
/// Capacitor's default router sends every extension-less path to `/index.html`,
/// which would show the home page on reloads and deep links.
struct NextExportRouter: Router {
    var basePath: String = ""

    func route(for path: String) -> String {
        guard URL(fileURLWithPath: path).pathExtension.isEmpty else {
            return basePath + path
        }
        let trimmed = path.hasSuffix("/") ? String(path.dropLast()) : path
        if trimmed.isEmpty {
            return basePath + "/index.html"
        }
        for candidate in [trimmed + ".html", trimmed + "/index.html"]
        where FileManager.default.fileExists(atPath: basePath + candidate) {
            return basePath + candidate
        }
        return basePath + "/404.html"
    }
}

class AppViewController: CAPBridgeViewController {
    override func router() -> Router {
        NextExportRouter()
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeShellPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        webView?.isOpaque = false
        webView?.backgroundColor = .black
        webView?.scrollView.backgroundColor = .black
        webView?.allowsLinkPreview = false
        // Swipe from the edge goes back through the app's page history.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
