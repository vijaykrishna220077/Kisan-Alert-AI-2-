import React, { useState } from "react";
import { 
  Sprout, 
  User, 
  ShieldCheck, 
  Activity, 
  HelpCircle, 
  ChevronRight, 
  Lock,
  Loader2
} from "lucide-react";

interface RoleLoginProps {
  onLoginSuccess: (user: {
    id: string;
    username: string;
    name: string;
    phone: string;
    role: "Farmer" | "Officer" | "Expert" | "Government" | "Admin";
    state: string;
    district: string;
    village: string;
  }) => void;
}

export function RoleLogin({ onLoginSuccess }: RoleLoginProps) {
  const [role, setRole] = useState<"Farmer" | "Officer" | "Expert" | "Government" | "Admin">("Farmer");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please specify a valid account name or username.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          role: role
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "Authentication failed. Please verify credentials.");
      }
    } catch (err) {
      console.warn("API offline, triggering instant developer bypass login");
      // Simulated fallback profile
      onLoginSuccess({
        id: "USR-701",
        username: username.toLowerCase().replace(/\s+/g, "_"),
        name: username,
        phone: "9876543210",
        role: role,
        state: "Andhra Pradesh",
        district: "Guntur",
        village: "Tenali"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (selectedRole: typeof role) => {
    switch (selectedRole) {
      case "Farmer":
        return "Access your field maps, draw polygons, update seed/fertilizer stock, and control your borewell motor.";
      case "Officer":
        return "Oversee regional Rythu Seva Kendrams (RSK), analyze district crop charts, and review lab files.";
      case "Expert":
        return "Provide leaf disease diagnosis reports, write organic remedy recommendations, and review escalations.";
      case "Government":
        return "Review statewide agricultural yield metrics, announce subsidy schemes, and deploy weather/disaster overlays.";
      case "Admin":
        return "Unrestricted developer control. Debug telemetry servers, seed systems, and trigger surveillance events.";
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F4F6F0] z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      
      {/* Background Graphic Accents */}
      <div className="absolute top-10 left-10 w-44 h-44 bg-[#2D5A27]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-[#2D5A27]/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E0E5D8] p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Sleek top indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#2D5A27]"></div>

        {/* Branding */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#2D5A27] rounded-2xl flex items-center justify-center text-white shadow-md">
            <Sprout className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1A2E1A] tracking-tight">Kisan Alert AI</h1>
            <p className="text-xs text-[#8A9A8A] font-medium mt-0.5">Government Agricultural Intelligence Portal</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl text-xs space-y-1">
          <span className="font-extrabold text-[#2D5A27] uppercase text-[9px] block tracking-widest">Selected Access Layer</span>
          <p className="text-[#2D3628] font-bold leading-snug">{getRoleDescription(role)}</p>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Role selection pill tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9A8A] block">Access Role:</label>
            <div className="grid grid-cols-5 gap-1 bg-[#F8F9F5] border border-[#E0E5D8] p-1 rounded-xl text-[10px] font-bold text-center">
              {(["Farmer", "Officer", "Expert", "Government", "Admin"] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    if (!username) {
                      if (r === "Farmer") setUsername("ramesh");
                      else if (r === "Officer") setUsername("officer_sharma");
                      else if (r === "Expert") setUsername("expert_rao");
                      else if (r === "Government") setUsername("govt_patel");
                      else if (r === "Admin") setUsername("admin");
                    }
                  }}
                  className={`py-2 rounded-lg transition-all ${role === r ? "bg-[#2D5A27] text-white shadow" : "text-[#5C6B5C] hover:text-[#2D5A27]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Account name text input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9A8A] block">Account Name / Username:</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9A8A]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ramesh or write your name"
                className="w-full text-xs pl-11 pr-4 py-3 bg-[#F8F9F5] border border-[#E0E5D8] hover:border-[#2D5A27] focus:border-[#2D5A27] rounded-xl outline-none font-semibold text-[#1A2E1A] transition-all"
                required
              />
            </div>
            <p className="text-[10px] text-[#8A9A8A]">
              💡 Quick developer tip: Type <span className="font-bold underline text-[#2D5A27]">ramesh</span> (Farmer) or <span className="font-bold underline text-[#2D5A27]">officer_sharma</span> (Officer) to load seeded profiles.
            </p>
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              ⚠️ {error}
            </p>
          )}

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D5A27] text-white hover:bg-[#1E3E1A] py-3 rounded-xl text-xs font-bold shadow-lg shadow-[#2D5A27]/25 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
              </>
            ) : (
              <>
                Authenticate Secure Session <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex justify-between items-center text-[10px] text-[#8A9A8A] pt-4 border-t border-[#F0F4E8]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27]" /> Encrypted Connection
          </span>
          <span>Coordinated via RSK Cloud</span>
        </div>

      </div>
    </div>
  );
}
