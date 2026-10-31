/// <reference types="@types/jest" />
// Setup global mocks para Jest y React Native Testing Library
import { Alert } from 'react-native';

// Mock de React Native Alert
jest.spyOn(Alert, 'alert');

// Mock de Safe Area Context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(inset),
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => inset,
  };
});

// Mock de @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, ...props }: any) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
    MaterialIcons: ({ name, ...props }: any) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

// Mock de React Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockGetParent = jest.fn(() => ({
  goBack: jest.fn(),
  navigate: jest.fn(),
}));

const mockUseNavigation = jest.fn(() => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  canGoBack: mockCanGoBack,
  getParent: mockGetParent,
  setOptions: jest.fn(),
}));

const mockUseRoute = jest.fn(() => ({
  params: {},
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: mockUseNavigation,
    useRoute: mockUseRoute,
    useFocusEffect: jest.fn(),
  };
});

// Mock de la configuración centralizada de Firebase
jest.mock('./src/config/firebase', () => ({
  db: { _type: 'mockFirestoreDb' },
  auth: { _type: 'mockFirebaseAuth', currentUser: { uid: 'user_123', email: 'test@mingo.com' } },
}));

// Mock del SDK de Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn((_db, ...pathSegments) => ({
      _path: pathSegments.join('/'),
    })),
    doc: jest.fn((_db, ...pathSegments) => ({
      _path: pathSegments.join('/'),
      id: pathSegments[pathSegments.length - 1],
    })),
    addDoc: jest.fn(async (_ref, data) => ({
      id: 'mock_doc_id_' + Math.random().toString(36).substring(7),
      ...data,
    })),
    updateDoc: jest.fn(async () => Promise.resolve()),
    deleteDoc: jest.fn(async () => Promise.resolve()),
    setDoc: jest.fn(async () => Promise.resolve()),
    onSnapshot: jest.fn((_query, callback) => {
      return jest.fn();
    }),
    query: jest.fn((colRef, ..._constraints) => colRef),
    where: jest.fn(),
    orderBy: jest.fn(),
    serverTimestamp: jest.fn(() => 'MOCK_SERVER_TIMESTAMP'),
    increment: jest.fn((val: number) => ({ _methodName: 'increment', _val: val })),
    getDocs: jest.fn(async () => ({ docs: [], forEach: jest.fn() })),
    getDoc: jest.fn(async () => ({ exists: () => false, data: () => ({}) })),
    writeBatch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(async () => Promise.resolve()),
    })),
  };
});

// Mock del SDK de Firebase Auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback({ uid: 'test_user_id', email: 'vendedor@mingo.com' });
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(async () => ({
    user: { uid: 'test_user_id', email: 'vendedor@mingo.com' },
  })),
  createUserWithEmailAndPassword: jest.fn(async () => ({
    user: { uid: 'new_user_id', email: 'nuevo@mingo.com' },
  })),
  signOut: jest.fn(async () => Promise.resolve()),
  getAuth: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});
