
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, phone: string, name: string, userType: 'customer' | 'driver') => Promise<{ error: Error | null }>;
  signIn: (emailOrPhone: string, password: string, userType?: 'customer' | 'driver') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getUserType: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        // Ignore null sessions unless it's an explicit sign-out
        // This prevents token refresh errors (500) from clearing valid sessions
        if (!session && event !== 'SIGNED_OUT') {
          console.log('Ignoring null session for event:', event);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );
...
  const getUserType = (): string | null => {
    const authUser = user ?? session?.user ?? null;
    if (!authUser?.user_metadata) return null;
    return authUser.user_metadata.user_type || 'customer';
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    getUserType,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
