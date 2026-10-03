jest.mock(
  '@react-native-firebase/crashlytics',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      log: jest.fn(),
      recordError: jest.fn(),
      setCrashlyticsCollectionEnabled: jest.fn(),
      setUserId: jest.fn(),
      setAttribute: jest.fn(),
    })),
  }),
  { virtual: true }
);

jest.mock(
  '@react-native-firebase/messaging',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      requestPermission: jest.fn(() => Promise.resolve(1)),
      onMessage: jest.fn(() => jest.fn()),
      onNotificationOpenedApp: jest.fn(() => jest.fn()),
      getInitialNotification: jest.fn(() => Promise.resolve(null)),
    })),
  }),
  { virtual: true }
);

jest.mock(
  '@react-native-firebase/remote-config',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      setDefaults: jest.fn(() => Promise.resolve()),
      fetchAndActivate: jest.fn(() => Promise.resolve(true)),
      getValue: jest.fn(() => ({
        asString: () => '',
        asBoolean: () => false,
        asNumber: () => 0,
      })),
      getAll: jest.fn(() => ({})),
    })),
  }),
  { virtual: true }
);

jest.mock(
  '@react-native-firebase/perf',
  () => ({
    __esModule: true,
    default: jest.fn(() => ({
      setPerformanceCollectionEnabled: jest.fn(),
      newTrace: jest.fn(() => ({
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        putAttribute: jest.fn(),
        putMetric: jest.fn(),
      })),
      newHttpMetric: jest.fn(() => ({
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        setHttpResponseCode: jest.fn(),
        setRequestPayloadSize: jest.fn(),
        setResponsePayloadSize: jest.fn(),
      })),
    })),
  }),
  { virtual: true }
);
