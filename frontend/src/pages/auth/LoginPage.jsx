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
  Layers,
  Cpu,
  Shield,
  Check
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

  const fillDemo = (roleKey, demoEmail, demoPassword = 'Admin@123') => {
    setSelectedRole(roleKey);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setApprovalNotice(null);
  };

  const demoRoles = [
    {
      id: 'superadmin',
      label: 'Super Admin',
      subtitle: 'Mohit (Full Master Access)',
      email: 'mohitpoewal12@gmail.com',
      pass: '798214',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      activeRing: 'ring-2 ring-purple-500 bg-purple-50 text-purple-900 border-purple-300',
      icon: ShieldCheck,
      iconColor: 'text-purple-600',
    },
    {
      id: 'admin',
      label: 'Admin',
      subtitle: 'Operations & Management',
      email: 'admin@oms.com',
      pass: 'Admin@123',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      activeRing: 'ring-2 ring-blue-500 bg-blue-50 text-blue-900 border-blue-300',
      icon: UserCheck,
      iconColor: 'text-blue-600',
    },
    {
      id: 'salesmanager',
      label: 'Sales Manager',
      subtitle: 'Quotations & Pipeline',
      email: 'salesmanager@oms.com',
      pass: 'Admin@123',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-900 border-emerald-300',
      icon: Briefcase,
      iconColor: 'text-emerald-600',
    },
    {
      id: 'salesperson',
      label: 'Sales Person',
      subtitle: 'Assigned Clients & Orders',
      email: 'salesperson@oms.com',
      pass: 'Admin@123',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50 text-amber-900 border-amber-300',
      icon: UserCheck,
      iconColor: 'text-amber-600',
    },
    {
      id: 'storemanager',
      label: 'Store Manager',
      subtitle: 'Central Hub & Packaging',
      email: 'storemanager@oms.com',
      pass: 'Admin@123',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
      activeRing: 'ring-2 ring-cyan-500 bg-cyan-50 text-cyan-900 border-cyan-300',
      icon: Warehouse,
      iconColor: 'text-cyan-600',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 flex">
      {/* 1. Left Feature & Brand Showcase Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white flex-col justify-between p-12 xl:p-14 select-none border-r border-slate-800">
        {/* Subtle grid pattern & glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-brand-400/20 text-white font-bold text-xl">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">Prismatech</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full font-mono">
                  v2.6
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">Enterprise Order & Toolroom Management</p>
            </div>
          </div>
        </div>

        {/* Center Hero Message & Value Cards */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Next-Gen Manufacturing OMS</span>
            </div>
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Unified control for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-teal-300">
                every order, mould & trial.
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              Streamline multi-tier sales permissions, central warehouse logistics, line-item pricing, and automated packaging workflows.
            </p>
          </div>

          {/* Value Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Granular Sales & RBAC Matrix</h4>
                <p className="text-xs text-slate-400 mt-0.5">Custom permissions per sales representative with instant auto-approval.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                <Warehouse className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Central Warehouse & Packaging Flow</h4>
                <p className="text-xs text-slate-400 mt-0.5">Automated packaging pipeline from order verification to gate dispatch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status & Security Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-300">All Systems Operational</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>256-Bit TLS Secured</span>
          </div>
        </div>
      </div>

      {/* 2. Right Sign-In Panel */}
      <div className="w-full lg:w-1/2 xl:w-7/12 flex flex-col justify-center items-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8 sm:py-12 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header (visible only on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">Prismatech OMS</span>
              <span className="block text-xs text-slate-500">Enterprise Edition</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-left space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              Please enter your enterprise credentials to access your workspace.
            </p>
          </div>

          {/* Approval Notice Banner */}
          {approvalNotice && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-xs">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-left">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider font-mono">
                  Pending Verification
                </h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  {approvalNotice}
                </p>
                <p className="text-xs text-amber-700">
                  Please verify your email or contact Super Admin for immediate clearance.
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm shadow-slate-200/40 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 shadow-xs transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 shadow-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500/20 border-slate-300"
                  />
                  <span className="text-sm text-slate-600">Remember on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 transition shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick One-Click Demo Logins */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  One-Click Demo Roles
                </span>
                <span className="text-xs text-slate-500 font-mono">Click to autofill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {demoRoles.map((role) => {
                  const Icon = role.icon;
                  const isCurrent = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => fillDemo(role.id, role.email, role.pass)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition ${
                        isCurrent ? role.activeRing : `${role.badgeColor}`
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${role.iconColor}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate leading-none">{role.label}</div>
                        <div className="text-xs opacity-75 truncate mt-1">{role.subtitle}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 shrink-0 text-slate-900" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-center text-slate-500 pt-1">
                Demo password: <code className="text-slate-700 font-mono font-medium">Admin@123</code> (Super Admin: <code className="text-slate-700 font-mono font-medium">798214</code>)
              </p>
            </div>
          </div>

          {/* Registration Link */}
          <div className="text-center text-sm text-slate-600">
            Don't have an enterprise account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


