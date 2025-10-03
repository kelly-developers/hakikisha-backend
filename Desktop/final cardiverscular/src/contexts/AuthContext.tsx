import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserAccount {
  username: string;
  password: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  signup: (username: string, password: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('cvms_auth');
    const user = localStorage.getItem('cvms_user');
    setIsAuthenticated(authStatus === 'true');
    setCurrentUser(user);
  }, []);

  const signup = (username: string, password: string) => {
    const accountsJson = localStorage.getItem('cvms_accounts');
    const accounts: UserAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
    
    if (accounts.some(acc => acc.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    
    accounts.push({ username, password });
    localStorage.setItem('cvms_accounts', JSON.stringify(accounts));
    
    return { success: true };
  };

  const login = (username: string, password: string) => {
    const accountsJson = localStorage.getItem('cvms_accounts');
    const accounts: UserAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
    
    const account = accounts.find(
      acc => acc.username === username && acc.password === password
    );
    
    if (account) {
      localStorage.setItem('cvms_auth', 'true');
      localStorage.setItem('cvms_user', username);
      setIsAuthenticated(true);
      setCurrentUser(username);
      return { success: true };
    }
    
    return { success: false, error: 'Invalid username or password' };
  };

  const logout = () => {
    localStorage.removeItem('cvms_auth');
    localStorage.removeItem('cvms_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
