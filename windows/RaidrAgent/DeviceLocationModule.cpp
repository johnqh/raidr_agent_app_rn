#include "pch.h"
#include "DeviceLocationModule.h"

#include <winrt/Windows.Devices.Geolocation.h>
#include <winrt/Windows.Foundation.h>

using namespace winrt;
using namespace Windows::Devices::Geolocation;
using namespace Windows::Foundation;
using namespace Microsoft::ReactNative;

namespace {
fire_and_forget ResolveCurrentLocation(ReactPromise<JSValue> result) {
  try {
    const auto access = co_await Geolocator::RequestAccessAsync();
    if (access != GeolocationAccessStatus::Allowed) {
      result.Reject(ReactError{"LOCATION_PERMISSION_DENIED", "Location permission was denied"});
      co_return;
    }

    Geolocator locator;
    locator.DesiredAccuracy(PositionAccuracy::Default);
    const auto position = co_await locator.GetGeopositionAsync();
    const auto point = position.Coordinate().Point().Position();
    const auto accuracy = position.Coordinate().Accuracy();
    result.Resolve(JSValueObject{
        {"latitude", point.Latitude},
        {"longitude", point.Longitude},
        {"accuracy", accuracy},
    });
  } catch (const hresult_error &) {
    result.Reject(ReactError{"LOCATION_UNAVAILABLE", "Could not determine the current location"});
  }
}
} // namespace

void DeviceLocationModule::Initialize(ReactContext const &context) noexcept {
  m_context = context;
}

void DeviceLocationModule::getCurrentLocation(ReactPromise<JSValue> result) noexcept {
  m_context.UIDispatcher().Post([result = std::move(result)]() mutable {
    ResolveCurrentLocation(std::move(result));
  });
}
