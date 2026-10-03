import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Warehouse,
  Briefcase,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Shield,
  Check,
  Activity,
  Layers,
  Zap,
  Cpu,
  BadgeCheck,
  TrendingUp,
  BarChart2,
  ArrowUpRight,
  CircleDot
} from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState(null);
  const { login } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApprovalNotice(null);
    if (!email || !password) {
      error('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      success('Welcome back! Login successful.');
      navigate(from, { replace: true });
    } catch (err) {
      if (err.data?.pendingApproval || err.message?.toLowerCase().includes('pending verification')) {
        setApprovalNotice(err.message || 'Your account is pending Super Admin verification and approval.');
      } else {
        error(err.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoRoles = [
    {
      id: 'superadmin',
      label: 'Super Admin',
      holder: 'Mohit (Master)',
      email: 'mohitpoewal12@gmail.com',
      pass: '798214',
      roleTag: 'Full Master Access',
      icon: ShieldCheck,
      accent: 'emerald',
    },
    {
      id: 'admin',
      label: 'Admin',
      holder: 'Operations',
      email: 'admin@oms.com',
      pass: 'Admin@123',
      roleTag: 'System Operations',
      icon: UserCheck,
      accent: 'blue',
    },
    {
      id: 'salesmanager',
      label: 'Sales Mgr',
      holder: 'Quotations',
      email: 'salesmanager@oms.com',
      pass: 'Admin@123',
      roleTag: 'Pipeline & Quotes',
      icon: Briefcase,
      accent: 'indigo',
    },
    {
      id: 'salesperson',
      label: 'Sales Rep',
      holder: 'Assigned Orders',
      email: 'salesperson@oms.com',
      pass: 'Admin@123',
      roleTag: 'Orders & Clients',
      icon: UserCheck,
      accent: 'amber',
    },
    {
      id: 'storemanager',
      label: 'Store Mgr',
      holder: 'Warehouse Hub',
      email: 'storemanager@oms.com',
      pass: 'Admin@123',
      roleTag: 'Packaging & Dispatch',
      icon: Warehouse,
      accent: 'cyan',
    },
  ];

  const handleSelectRole = (role) => {
    setSelectedRole(role.id);
    setEmail(role.email);
    setPassword(role.pass);
    setApprovalNotice(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col lg:flex-row antialiased">
      {/* 1. Left Showcase Panel: Rich Industrial Analytics & Operations Command Center */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-[#070b14] text-slate-200 flex-col justify-between p-8 xl:p-11 select-none border-r border-slate-800/80">
        {/* Subtle structural grid & ambient depth */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[110px] pointer-events-none" />

        {/* Top Header & Brand */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-bold text-lg ring-1 ring-white/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  Prismatech OMS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md font-mono">
                  v2.6.4 PROD
                </span>
              </div>
              <p className="text-xs text-slate-400">Industrial Manufacturing & Toolroom Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TELEMETRY LIVE</span>
          </div>
        </div>

        {/* Center: High-Impact Analytical Showcase */}
        <div className="relative z-10 my-auto py-5 space-y-4 max-w-lg w-full">
          {/* Main Analytics KPI Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                  Order Throughput Velocity
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-2xl font-bold tracking-tight text-white font-mono">
                    ₹54.80L
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3 h-3" />
                    +18.4% WoW
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-mono">Monthly Target</span>
                <span className="text-sm font-bold text-slate-200 font-mono">₹65.0L</span>
                <span className="text-[10px] text-blue-400 font-mono block">84% completed</span>
              </div>
            </div>

            {/* SVG Interactive Area Trend Sparkline */}
            <div className="relative pt-1 pb-1">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 320 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Subtle horizontal grid lines */}
                <line x1="0" y1="15" x2="320" y2="15" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="40" x2="320" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                
                {/* Area fill */}
                <path
                  d="M0,48 Q40,42 80,32 T160,24 T240,14 T320,6 L320,60 L0,60 Z"
                  fill="url(#chartGradient)"
                />
                {/* Curve line */}
                <path
                  d="M0,48 Q40,42 80,32 T160,24 T240,14 T320,6"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Data point glow */}
                <circle cx="320" cy="6" r="4" fill="#60a5fa" className="animate-pulse" />
                <circle cx="240" cy="14" r="3" fill="#3b82f6" />
                <circle cx="160" cy="24" r="3" fill="#3b82f6" />
                <circle cx="80" cy="32" r="3" fill="#3b82f6" />
              </svg>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-blue-400 font-bold">Today (Peak: 142 Orders)</span>
              </div>
            </div>

            {/* Pipeline Stage Visualizer Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-medium">Pipeline Distribution</span>
                <span className="text-slate-300 font-mono text-[10px]">240 Orders in Motion</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex gap-0.5">
                <div style={{ width: '38%' }} className="h-full bg-blue-500 rounded-l-full" title="In Toolroom Moulding (38%)" />
                <div style={{ width: '28%' }} className="h-full bg-indigo-500" title="Assembly & QA (28%)" />
                <div style={{ width: '22%' }} className="h-full bg-emerald-500" title="Packaging Stage (22%)" />
                <div style={{ width: '12%' }} className="h-full bg-cyan-400 rounded-r-full" title="Gate Out Dispatched (12%)" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Moulding (38%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Assembly (28%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Packing (22%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Dispatch (12%)
                </span>
              </div>
            </div>
          </div>

          {/* 4 Mini Analytical Metrics Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium">Toolroom Utilization</span>
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">42 / 45 Dies</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                93.3% capacity load
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium">Fulfillment SLA</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono mt-1">99.4%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Avg turnaround 3.8 hrs</div>
            </div>
          </div>

          {/* Live Operational Event Stream Ticker */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/60 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-200">Live Operation Feeds</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Synced 12s ago</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-slate-400">[17:15]</span> PO-4901: Mould #MD-88 QA Passed
                </span>
                <span className="text-slate-400 shrink-0 pl-2">₹1,85,000</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-slate-400">[17:08]</span> Batch #B-312: Packed at Central Hub
                </span>
                <span className="text-emerald-400 shrink-0 pl-2">Gate Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status & Enterprise Trust */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300 font-medium">All Plant Clusters Online</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>256-Bit TLS Secured</span>
          </div>
        </div>
      </div>

      {/* 2. Right Sign-In Panel (Modern, Clean, Human-Designed) */}
      <div className="w-full lg:w-1/2 xl:w-7/12 flex flex-col justify-center items-center px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12 relative overflow-y-auto">

        <div className="w-full max-w-[440px] space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                P
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">Prismatech OMS</span>
                <span className="block text-[11px] text-slate-500 font-mono">v2.6 Enterprise</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              Sign in to manage sales orders, tooling runs, and dispatch.
            </p>
          </div>

          {/* Approval Notice Banner */}
          {approvalNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 shadow-xs">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-left text-xs">
                <h4 className="font-bold text-amber-900 uppercase tracking-wide font-mono text-[11px]">
                  Pending Verification
                </h4>
                <p className="text-amber-800 leading-relaxed">
                  {approvalNotice}
                </p>
                <p className="text-amber-700 pt-0.5">
                  Contact Super Admin for account activation.
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Persona Switcher (Clean, professional, not toy buttons) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Quick Demo Access</span>
              <span className="text-[11px] text-slate-400 font-mono">Click to autofill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoRoles.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`relative text-left p-2.5 rounded-xl border transition-all duration-150 flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {role.label}
                      </span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors" />
                      )}
                    </div>
                    <div className="mt-1">
                      <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {role.holder}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Enterprise Login Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-200/50 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedRole(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSelectedRole(null);
                    }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs text-slate-600">Remember credentials on this workstation</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 transition-all shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Authenticating terminal...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Registration and Security Meta */}
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-600">
              Need access for a new employee?{' '}
              <Link
                to="/register"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                Submit registration request
              </Link>
            </p>

            <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
              <span>Enterprise RBAC</span>
              <span>•</span>
              <span>Audit Logging Active</span>
              <span>•</span>
              <span>v2.6.4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



