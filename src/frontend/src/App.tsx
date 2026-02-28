import { Toaster } from "@/components/ui/sonner";
import { AdminPanel } from "./components/AdminPanel";
import { AuthScreen } from "./components/AuthScreen";
import { ExamInterface } from "./components/ExamInterface";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppRouter() {
  const { session, isAdmin } = useAuth();

  if (!session) {
    return <AuthScreen />;
  }

  if (isAdmin) {
    return <AdminPanel />;
  }

  return <ExamInterface />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
