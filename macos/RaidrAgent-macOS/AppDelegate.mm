#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"RaidrAgent";
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];

  // Register URL scheme handler for deep linking
  [[NSAppleEventManager sharedAppleEventManager]
    setEventHandler:[RCTLinkingManager class]
        andSelector:@selector(getUrlEventHandler:withReplyEvent:)
      forEventClass:kInternetEventClass
         andEventID:kAEGetURL];

  [super applicationDidFinishLaunching:notification];

  // Keep the RN module name unchanged, but override the visible window title.
  if (self.window) {
    self.window.title = @"raidr agent";
  }
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  NSURL *url = [NSURL URLWithString:@"http://localhost:8090/index.bundle?platform=macos&dev=true&minify=false"];
  NSLog(@"[RaidrAgent] bundleURL called, returning: %@", url);
  return url;
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
