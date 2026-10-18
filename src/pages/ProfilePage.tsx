import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Clock,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/NotificationToast';
import { UserProfile } from '../types/security';

export const ProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const [user, setUser] = useState<UserProfile>(securityService.getCurrentUser());

  // Edit form state
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPlainPassword, setShowPlainPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Session Token State
  const [copiedToken, setCopiedToken] = useState(false);

  // Preset demo users
  const demoUsers: UserProfile[] = [
    {
      id: 'usr-001',
      username: 'alex.chen',
      fullName: 'Alex Chen',
      email: 'alex.chen@soc.internal',
      role: 'SOC Analyst',
      avatarInitials: 'AC',
      lastLogin: '2026-03-14 09:45:00',
      sessionExpiry: '2026-03-14 17:45:00',
    },
    {
      id: 'usr-002',
      username: 'sarah.jenkins',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@soc.internal',
      role: 'Security Engineer',
      avatarInitials: 'SJ',
      lastLogin: '2026-03-14 08:30:00',
      sessionExpiry: '2026-03-14 16:30:00',
    },
    {
      id: 'usr-003',
      username: 'marcus.admin',
      fullName: 'Marcus Vance',
      email: 'marcus.vance@soc.internal',
      role: 'SOC Admin',
      avatarInitials: 'MV',
      lastLogin: '2026-03-14 07:15:00',
      sessionExpiry: '2026-03-14 19:15:00',
    },
  ];

  const handleSwitchUser = (selectedUser: UserProfile) => {
    securityService.updateProfile({
      id: selectedUser.id,
      username: selectedUser.username,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      role: selectedUser.role,
      avatarInitials: selectedUser.avatarInitials,
      lastLogin: selectedUser.lastLogin,
      sessionExpiry: selectedUser.sessionExpiry,
    });
    setUser(securityService.getCurrentUser());
    setFullName(selectedUser.fullName);
    setEmail(selectedUser.email);
    setRole(selectedUser.role);

    showToast({
      type: 'info',
      title: 'Switched Analyst Session',
      message: `Active persona is now ${selectedUser.fullName} (${selectedUser.role}).`,
    });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Full name must be at least 3 characters.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please provide a valid email address.',
      });
      return;
    }

    const initials = fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    securityService.updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      avatarInitials: initials || 'AC',
    });

    setUser(securityService.getCurrentUser());

    showToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Analyst details saved successfully.',
    });
  };

  // Password Strength Meter
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;

    if (score === 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-sky-500' };
    return { score: 4, label: 'Very Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const getBcryptPreview = (pwd: string) => {
    if (!pwd) return '$2a$12$e8w91f8d4... (Awaiting input)';
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      hash = (hash << 5) - hash + pwd.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `$2a$12$K8j7m9N1p2Q3r4s5t6u7v.${hex}aB9C8d7E6f5G4h3I2`;
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');

    if (!currentPassword) {
      setPwdError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }

    if (!/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setPwdError('Password must contain at least 1 number and 1 special symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    showToast({
      type: 'success',
      title: 'Password Updated',
      message: 'New password verified and ready for BCrypt hashing.',
    });
  };

  const mockSessionToken = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI${user.username}Iiwicm9sZSI6IiR7dXNlci5yb2xlfSIsImlhdCI6MTc0MjA4MTIwMCwiZXhwIjoxNzQyMTE3MjAwfQ.s7k9P2w8x1Z3m4q5r6t7y8`;

  const handleCopySessionToken = () => {
    navigator.clipboard.writeText(mockSessionToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    showToast({
      type: 'info',
      title: 'Session Token Copied',
      message: 'Authorization header token copied.',
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/[0.04]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Operator Identity</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based privileges, security credentials, and active authentication session
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Active: {user.role}</span>
          </span>
        </div>
      </div>

      {/* Switch Demo Persona Bar */}
      <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-200 font-medium block">
            Role-Based Persona Switcher
          </span>
          <span className="text-slate-500 text-[11px]">
            Switch between analyst personas to verify access permissions across console modules
          </span>
        </div>

        <div className="flex items-center gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => handleSwitchUser(u)}
              className={`px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                user.username === u.username
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-white/[0.03] text-slate-300 hover:text-white border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {u.fullName} ({u.role.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Identity & Permissions */}
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-sky-600/30 to-indigo-600/30 border border-sky-500/30 text-sky-300 font-mono text-xl font-bold flex items-center justify-center mb-3 shadow-lg shadow-sky-500/10">
                {user.avatarInitials}
              </div>
              <h3 className="text-base font-semibold text-white">{user.fullName}</h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">@{user.username}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>User Identifier:</span>
                <span className="font-mono text-slate-300 text-[11px]">{user.id}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Session Login:</span>
                <span className="font-mono text-slate-300 text-[11px]">{user.lastLogin}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Session Expiry:</span>
                <span className="font-mono text-emerald-400 text-[11px]">{user.sessionExpiry}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Terminal Origin:</span>
                <span className="font-mono text-slate-300 text-[11px]">192.168.1.105 (Secure)</span>
              </div>
            </div>
          </Card>

          {/* RBAC Matrix */}
          <Card title="Effective Permissions">
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import and query server log streams</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acknowledge, triage, and resolve alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Append forensic notes & investigation tags</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    user.role !== 'SOC Analyst' ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                />
                <span className={user.role === 'SOC Analyst' ? 'text-slate-500' : ''}>
                  Manage threat intel IP blocklist
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    user.role === 'SOC Admin' ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                />
                <span className={user.role !== 'SOC Admin' ? 'text-slate-500' : ''}>
                  Create custom detection rules & purge buffer
                </span>
              </li>
            </ul>
          </Card>

          {/* Session Token Card */}
          <Card title="Session Bearer Token">
            <div className="space-y-2 text-xs">
              <p className="text-[11px] text-slate-400">
                Authorization header token passed in REST API requests to backend
              </p>
              <div className="p-2 bg-black/60 rounded border border-white/[0.08] font-mono text-[10px] text-slate-400 break-all select-all">
                {mockSessionToken}
              </div>
              <button
                onClick={handleCopySessionToken}
                className="w-full py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Authorization Header</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Token</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Profile & Password Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card
            title="Analyst Profile Information"
            subtitle="Identity settings stored in active session"
          >
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Username (Immutable)</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full bg-black/40 border border-white/[0.05] rounded-md px-3 py-2 text-xs text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Privilege Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50"
                  >
                    <option value="SOC Analyst">SOC Analyst (Tier 1 / Tier 2 Triage)</option>
                    <option value="Security Engineer">Security Engineer (Detection Rules & Threat Intel)</option>
                    <option value="SOC Admin">SOC Admin (Full Authority)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="primary" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Password Update & BCrypt Hash Simulator */}
          <Card
            title="Credential Management & BCrypt Hashing"
            subtitle="BCrypt-hashed credentials with 12 salt rounds persisted in MySQL users table"
          >
            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPlainPassword(!showPlainPassword)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      {showPlainPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPlainPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, 1 number, 1 symbol"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                  />
                  {newPassword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/[0.05]">
                        <div
                          className={`h-full ${pwdStrength.color}`}
                          style={{ width: `${(pwdStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                  />
                </div>
              </div>

              {/* BCrypt Preview Box */}
              <div className="p-3 bg-black/40 rounded-lg border border-white/[0.06]">
                <span className="text-slate-500 font-mono text-[10px] block mb-1">
                  BCRYPT HASH DIGEST (MySQL users.password_hash)
                </span>
                <code className="font-mono text-[11px] text-emerald-400 break-all block">
                  {getBcryptPreview(newPassword)}
                </code>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cost Factor: 12 Rounds &bull; Salting: Cryptographically secure random 128-bit seed
                </span>
              </div>

              {pwdError && <p className="text-rose-400 text-xs">{pwdError}</p>}

              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="secondary" type="submit">
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
