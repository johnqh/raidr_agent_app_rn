import UIKit
import React

/// Owns the window, on the scene it belongs to.
///
/// `AppDelegate` still builds the React Native factory once, at launch. Only
/// where the window comes from moved here: `UIWindow(windowScene:)` rather than
/// `UIWindow(frame: UIScreen.main.bounds)`, because Xcode 27's iOS 27 SDK
/// crashes at launch (`EXC_BREAKPOINT` in
/// `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) for an app
/// with no scene adoption at all, where earlier SDKs only warned.
///
/// Once an app adopts scenes, UIKit stops delivering URL opens, universal links
/// and the active/background transitions to `UIApplicationDelegate`. The app
/// delegate (and, in Expo apps, its subscribers) and `RCTLinkingManager` still
/// listen there, so every scene callback below is forwarded to the matching
/// app delegate method when it implements one.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var applicationDelegate: UIApplicationDelegate? {
    UIApplication.shared.delegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else { return }

    // A cold start from a deep link or universal link no longer lands in
    // `didFinishLaunchingWithOptions`; it arrives here. Put it back into the
    // launch options so `Linking.getInitialURL()` keeps working.
    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let userActivity = connectionOptions.userActivities.first,
       userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "RaidrAgent",
      in: window,
      launchOptions: launchOptions
    )
  }

  // MARK: - URLs and universal links

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [
        .openInPlace: context.options.openInPlace,
      ]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      _ = applicationDelegate?.application?(
        UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = applicationDelegate?.application?(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  // MARK: - Life cycle, forwarded to the app delegate

  func sceneDidBecomeActive(_ scene: UIScene) {
    applicationDelegate?.applicationDidBecomeActive?(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    applicationDelegate?.applicationWillResignActive?(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    applicationDelegate?.applicationWillEnterForeground?(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    applicationDelegate?.applicationDidEnterBackground?(UIApplication.shared)
  }
}
