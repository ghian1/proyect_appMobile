import { AuthProvider } from './src/context/Authcontext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
    return (
    <AuthProvider>
        <RootNavigator />
    </AuthProvider>
    );
}