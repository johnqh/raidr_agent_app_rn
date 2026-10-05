#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>

@interface DeviceLocationModule : NSObject <RCTBridgeModule, CLLocationManagerDelegate>
@property(nonatomic, strong) CLLocationManager *manager;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@end

@implementation DeviceLocationModule

RCT_EXPORT_MODULE(DeviceLocationModule)

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_REMAP_METHOD(getCurrentLocation,
                 getCurrentLocationWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  self.resolve = resolve;
  self.reject = reject;
  self.manager = [CLLocationManager new];
  self.manager.delegate = self;
  self.manager.desiredAccuracy = kCLLocationAccuracyHundredMeters;

  CLAuthorizationStatus status = self.manager.authorizationStatus;
  if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted) {
    [self finishWithError:@"Location permission was denied"];
    return;
  }
  if (status == kCLAuthorizationStatusNotDetermined) {
    [self.manager requestWhenInUseAuthorization];
  } else {
    [self.manager requestLocation];
  }

  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(20 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (self.resolve) [self finishWithError:@"Could not determine the current location"];
  });
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  CLAuthorizationStatus status = manager.authorizationStatus;
  if (status == kCLAuthorizationStatusAuthorizedAlways || status == kCLAuthorizationStatusAuthorizedWhenInUse) {
    [manager requestLocation];
  } else if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted) {
    [self finishWithError:@"Location permission was denied"];
  }
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (!location) {
    [self finishWithError:@"Could not determine the current location"];
    return;
  }
  RCTPromiseResolveBlock resolve = self.resolve;
  self.resolve = nil;
  self.reject = nil;
  [manager stopUpdatingLocation];
  if (resolve) {
    resolve(@{
      @"latitude": @(location.coordinate.latitude),
      @"longitude": @(location.coordinate.longitude),
      @"accuracy": @(location.horizontalAccuracy)
    });
  }
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  [self finishWithError:error.localizedDescription ?: @"Could not determine the current location"];
}

- (void)finishWithError:(NSString *)message
{
  RCTPromiseRejectBlock reject = self.reject;
  self.resolve = nil;
  self.reject = nil;
  [self.manager stopUpdatingLocation];
  if (reject) reject(@"LOCATION_UNAVAILABLE", message, nil);
}

@end
