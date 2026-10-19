import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/security';
import { securityService } from '../services/securityService';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchUser: (user: UserProfile) => void;
  updateUser: (updated: Partial<UserProfile>) => void;
}

const AUTH_TOKEN_KEY = 'sla_auth_token_v1';
const AUTH_DEMO_FLAG_KEY = 'sla_auth_is_demo';

const DEMO_ACCOUNTS: Record<string, { password: string; profile: UserProfile }> = {
  'alex.chen': {
    password: 'Sentinel@2026',
    profile: {
      id: 'usr-001',
      username: 'alex.chen',
      fullName: 'Alex Chen',
      email: 'alex.chen@soc.internal',
      role: 'SOC Analyst',
      avatarInitials: 'AC',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    },
  },
  'sarah.jenkins': {
    password: 'Sentinel@2026',
    profile: {
      id: 'usr-002',
      username: 'sarah.jenkins',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@soc.internal',
      role: 'Security Engineer',
      avatarInitials: 'SJ',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    },
  },
  'marcus.admin': {
    password: 'Sentinel@2026',
    profile: {
      id: 'usr-003',
      username: 'marcus.admin',
      fullName: 'Marcus Vance',
      email: 'marcus.vance@soc.internal',
      role: 'SOC Admin',
      avatarInitials: 'MV',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return false;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_DEMO_FLAG_KEY) === 'true';
    } catch {
      return true;
    }
  });

  const [user, setUser] = useState<UserProfile>(() => securityService.getCurrentUser());

  useEffect(() => {
    return securityService.subscribe(() => {
      setUser(securityService.getCurrentUser());
    });
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanUsername || !cleanPassword) {
        return { success: false, message: 'Please provide both username and password.' };
      }

      // 1. Try Java REST API if available
      try {
        const res = await apiClient.post<{ user: any; token: string }>('/auth/login', {
          username: cleanUsername,
          password: cleanPassword,
        });

        if (res.success && res.data?.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
          localStorage.setItem(AUTH_DEMO_FLAG_KEY, 'false');
          setIsDemoMode(false);
          setIsAuthenticated(true);

          if (res.data.user) {
            const mappedUser: UserProfile = {
              id: res.data.user.id ? `usr-${res.data.user.id}` : 'usr-001',
              username: res.data.user.username || cleanUsername,
              fullName: res.data.user.fullName || cleanUsername,
              email: res.data.user.email || `${cleanUsername}@soc.internal`,
              role: res.data.user.role || 'SOC Analyst',
              avatarInitials: (res.data.user.fullName || cleanUsername)
                .substring(0, 2)
                .toUpperCase(),
              lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
              sessionExpiry: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19),
            };
            securityService.updateProfile(mappedUser);
            setUser(mappedUser);
          }

          securityService.logAudit({
            actor: cleanUsername,
            action: 'OPERATOR_LOGIN_BACKEND',
            category: 'AUTH',
            details: 'Operator authenticated via Java REST backend with BCrypt hash verification.',
            ipAddress: '127.0.0.1',
            status: 'SUCCESS',
          });

          return { success: true };
        }
      } catch {
        // Continue to local demo authentication
      }

      // 2. Local Demo Authentication Fallback
      const matched = DEMO_ACCOUNTS[cleanUsername];
      if (matched && matched.password === cleanPassword) {
        const syntheticToken = `Bearer eyJhbGciOiJIUzI1NiJ9.${btoa(
          JSON.stringify({ sub: cleanUsername, role: matched.profile.role, ts: Date.now() })
        )}.demo_signature`;

        localStorage.setItem(AUTH_TOKEN_KEY, syntheticToken);
        localStorage.setItem(AUTH_DEMO_FLAG_KEY, 'true');
        setIsDemoMode(true);
        setIsAuthenticated(true);

        securityService.updateProfile(matched.profile);
        setUser(matched.profile);

        securityService.logAudit({
          actor: cleanUsername,
          action: 'OPERATOR_LOGIN_LOCAL',
          category: 'AUTH',
          details: 'Operator authenticated via simulated local demo session.',
          ipAddress: '127.0.0.1',
          status: 'SUCCESS',
        });

        return { success: true };
      }

      // Failed attempt
      securityService.logAudit({
        actor: cleanUsername || 'anonymous',
        action: 'OPERATOR_LOGIN_FAILED',
        category: 'AUTH',
        details: `Failed authentication attempt for username "${cleanUsername}".`,
        ipAddress: '127.0.0.1',
        status: 'FAILURE',
      });

      return {
        success: false,
        message: 'Invalid credentials. Check username and password, or use demo credentials.',
      };
    },
    []
  );

  const logout = useCallback(() => {
    const currentUsername = user.username;
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_DEMO_FLAG_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);

    securityService.logAudit({
      actor: currentUsername,
      action: 'OPERATOR_LOGOUT',
      category: 'AUTH',
      details: 'Operator terminated active console session.',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });
  }, [user.username]);

  const switchUser = useCallback((newUser: UserProfile) => {
    securityService.updateProfile(newUser);
    setUser(newUser);
  }, []);

  const updateUser = useCallback((updated: Partial<UserProfile>) => {
    securityService.updateProfile(updated);
    setUser(securityService.getCurrentUser());
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isDemoMode,
        login,
        logout,
        switchUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
