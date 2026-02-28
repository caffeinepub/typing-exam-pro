import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Keyboard, Loader2, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

export function AuthScreen() {
  const { actor } = useActor();
  const { setSession } = useAuth();

  // Login state
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;
    setLoggingIn(true);
    try {
      const result = await actor.login(loginMobile, loginPassword);
      if (result.__kind__ === "ok") {
        setSession({
          name: result.ok.name,
          mobile: result.ok.mobile,
          sessionId: result.ok.sessionId,
        });
        toast.success(`Welcome back, ${result.ok.name}!`);
      } else {
        toast.error(result.err);
      }
    } catch (err) {
      toast.error("Login failed. Please try again.");
      console.error(err);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;
    setRegistering(true);
    try {
      const result = await actor.registerUser(regName, regMobile, regPassword);
      if (result === "OK") {
        toast.success("Account created! You can now log in.");
        setRegName("");
        setRegMobile("");
        setRegPassword("");
      } else {
        toast.error(result);
      }
    } catch (err) {
      toast.error("Registration failed. Please try again.");
      console.error(err);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Keyboard className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
          Typing Exam Pro
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Professional typing assessment platform
        </p>
      </motion.div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-xl shadow-exam-lg p-6">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1 gap-2">
                <KeyRound className="w-4 h-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1 gap-2">
                <UserPlus className="w-4 h-4" />
                Register
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-mobile">Mobile Number</Label>
                  <Input
                    id="login-mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={loginMobile}
                    onChange={(e) => setLoginMobile(e.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loggingIn || !actor}
                >
                  {loggingIn ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {loggingIn ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-mobile">Mobile Number</Label>
                  <Input
                    id="reg-mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registering || !actor}
                >
                  {registering ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {registering ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Admin hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Admin access: use mobile{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">
            8055926965
          </code>
        </p>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-xs text-muted-foreground"
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </motion.footer>
    </div>
  );
}
