import UIKit
import AuthenticationServices
import Capacitor

/// Native pieces the web app can't do inside a WKWebView:
/// iCloud sync for the library, OAuth in the system auth sheet, and keeping the screen awake.
@objc(NativeShellPlugin)
public class NativeShellPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeShellPlugin"
    public let jsName = "NativeShell"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startWebAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cloudGet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cloudSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "aiStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateJamIdea", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "analyzeChannelStyle", returnType: CAPPluginReturnPromise),
    ]

    private var webAuthSession: ASWebAuthenticationSession?
    private let cloud = NSUbiquitousKeyValueStore.default

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(cloudDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: cloud
        )
        cloud.synchronize()
    }

    // MARK: iCloud key-value storage (the user's own iCloud account, no sign-in)

    @objc func cloudGet(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        call.resolve(["value": cloud.string(forKey: key) ?? NSNull()])
    }

    @objc func cloudSet(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        if let value = call.getString("value") {
            cloud.set(value, forKey: key)
        } else {
            cloud.removeObject(forKey: key)
        }
        cloud.synchronize()
        call.resolve()
    }

    @objc private func cloudDidChange(_ note: Notification) {
        let keys = note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        notifyListeners("cloudChanged", data: ["keys": keys])
    }

    // MARK: Apple Intelligence (on-device Foundation Models, iOS 26+)

    @objc func aiStatus(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.resolve(["available": false, "reason": "osTooOld"])
            return
        }
        call.resolve(JamIdeaGenerator.status())
    }

    @objc func generateJamIdea(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.reject("Apple Intelligence needs iOS 26 or later", "unavailable")
            return
        }
        let request = JamIdeaRequest(
            style: call.getString("style") ?? "Rock",
            styleDescription: call.getString("styleDescription") ?? "",
            key: call.getString("key") ?? "C",
            mode: call.getString("mode") ?? "major",
            meter: call.getString("meter") ?? "4/4",
            tonic: call.getString("tonic") ?? "C",
            bpmMin: call.getInt("bpmMin") ?? 60,
            bpmMax: call.getInt("bpmMax") ?? 180,
            palette: call.getArray("palette", String.self) ?? [],
            avoid: call.getArray("avoid", String.self) ?? [],
            inspiration: call.getString("inspiration")
        )
        Task {
            do {
                call.resolve(try await JamIdeaGenerator.generate(request))
            } catch {
                call.reject(String(describing: error), "failed")
            }
        }
    }

    @objc func analyzeChannelStyle(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.reject("Apple Intelligence needs iOS 26 or later", "unavailable")
            return
        }
        let styles: [(id: String, description: String)] = (call.getArray("styles", JSObject.self) ?? []).compactMap {
            guard let id = $0["id"] as? String else { return nil }
            return (id, ($0["description"] as? String) ?? id)
        }
        let request = ChannelStyleRequest(
            channel: call.getString("channel") ?? "",
            titles: call.getArray("titles", String.self) ?? [],
            focus: call.getString("focus"),
            styles: styles
        )
        Task {
            do {
                call.resolve(try await JamIdeaGenerator.analyzeChannel(request))
            } catch {
                call.reject(String(describing: error), "failed")
            }
        }
    }

    // MARK: OAuth (TONE3000)

    @objc func startWebAuth(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString),
              let scheme = call.getString("callbackScheme") else {
            call.reject("url and callbackScheme are required")
            return
        }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callbackURL, error in
                self?.webAuthSession = nil
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.resolve(["url": NSNull(), "canceled": true])
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                call.resolve(["url": callbackURL?.absoluteString ?? NSNull(), "canceled": false])
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = call.getBool("ephemeral", false)
            self.webAuthSession = session
            if !session.start() {
                self.webAuthSession = nil
                call.reject("Could not open the sign-in window")
            }
        }
    }

    // MARK: Screen stays on during practice

    @objc func setKeepAwake(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled", false)
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled
            call.resolve()
        }
    }
}

extension NativeShellPlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
