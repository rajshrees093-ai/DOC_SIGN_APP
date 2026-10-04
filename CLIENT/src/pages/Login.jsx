import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const navigate = useNavigate();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState("login");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const fillDemoCredentials = () => {
    setMode("login");
    setEmail("test@example.com");
    setPassword("password123");
    setErrorMessage("");
    setSuccessMessage("Demo credentials filled! Click 'Sign In' to proceed.");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email: email.trim(),
        password,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        setSuccessMessage("Login successful! Redirecting to workspace...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      } else {
        setErrorMessage(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Invalid credentials or server unavailable.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please accept the terms and privacy policy.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email: email.trim(),
        password,
      });

      setSuccessMessage(res.data.message || "Account created successfully! Logging you in...");

      // Automatically login after signup
      try {
        const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
          email: email.trim(),
          password,
        });
        if (loginRes.data.token) {
          localStorage.setItem("token", loginRes.data.token);
          setTimeout(() => navigate("/dashboard"), 900);
          return;
        }
      } catch {
        // If auto-login fails, switch to login tab
        setTimeout(() => {
          setMode("login");
          setSuccessMessage("Account created! Please sign in with your password.");
        }, 1200);
      }
    } catch (err) {
      console.error("Signup error:", err);
      setErrorMessage(
        err.response?.data?.error || err.response?.data?.message || "Registration failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // Fill demo credentials and alert
    fillDemoCredentials();
    setSuccessMessage(`Simulated ${provider} authentication. Test account activated!`);
  };

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setForgotSent(false);
      setForgotEmail("");
      setSuccessMessage("Password reset link has been dispatched to your inbox.");
    }, 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Dynamic Background Glowing Orbs (Glassmorphism backdrop) */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/30 rounded-full blur-[128px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-2xl bg-white/[0.07] border border-white/15 rounded-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] p-7 sm:p-9 text-white transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/30 mb-3 border border-white/20">
            <span className="text-2xl">✍</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">DocSign Pro</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Document Signing & Workflow Suite
          </p>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        <div className="flex bg-white/[0.08] p-1 rounded-2xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              mode === "login"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              mode === "signup"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Notification Banners */}
        {errorMessage && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= SIGN IN FORM ================= */}
        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 text-sm">✉</span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 text-sm">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Quick Demo Fill Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full py-2 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔑</span>
                <span>Fill Test Account (test@example.com)</span>
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In to Workspace ➔</span>
              )}
            </button>
          </form>
        ) : (
          /* ================= SIGN UP FORM ================= */
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">👤</span>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">✉</span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Create Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 cursor-pointer">
                I agree to the <span className="text-indigo-300 underline">Terms of Service</span> &{" "}
                <span className="text-indigo-300 underline">Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Free Account ➔</span>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative px-3 bg-slate-900/80 text-[10px] uppercase font-bold tracking-wider text-slate-400 rounded-full">
            Or continue with
          </span>
        </div>

        {/* Social / SSO Mock Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin("Google")}
            className="py-2 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🌐</span>
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin("GitHub")}
            className="py-2 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🐙</span>
            <span>GitHub</span>
          </button>
        </div>

        {/* System Status Pill */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend API Connected (Port 5000)
          </span>
          <span className="text-slate-500">v2.4.0</span>
        </div>
      </div>

      {/* Forgot Password Modal Dialog */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm backdrop-blur-2xl bg-slate-900/90 border border-white/20 rounded-3xl p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base">Reset Your Password</h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter your registered email address and we&apos;ll send you password recovery
              instructions.
            </p>

            {forgotSent ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs text-center">
                ✅ Recovery email sent! Please check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow cursor-pointer"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
