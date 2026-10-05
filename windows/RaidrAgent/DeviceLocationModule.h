#pragma once

#include "NativeModules.h"
#include <winrt/Microsoft.ReactNative.h>

REACT_MODULE(DeviceLocationModule)
struct DeviceLocationModule {
  REACT_INIT(Initialize)
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const &context) noexcept;

  REACT_METHOD(getCurrentLocation)
  void getCurrentLocation(
      winrt::Microsoft::ReactNative::ReactPromise<winrt::Microsoft::ReactNative::JSValue> result) noexcept;

 private:
  winrt::Microsoft::ReactNative::ReactContext m_context;
};
