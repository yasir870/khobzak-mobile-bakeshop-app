
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
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizeIraqiPhone = (phone: string): string => {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('964')) {
      normalized = '0' + normalized.substring(3);
    }
    if (!normalized.startsWith('07')) {
      if (normalized.startsWith('7')) {
        normalized = '0' + normalized;
      }
    }
    return normalized;
  };

  const isValidIraqiPhone = (phone: string): boolean => {
    const phoneRegex = /^07[3-9]\d{8}$/;
    return phoneRegex.test(phone);
  };

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const findUserByPhone = async (phone: string, userType?: 'customer' | 'driver'): Promise<string[]> => {
    try {
      const normalizedPhone = normalizeIraqiPhone(phone);
      const emails: string[] = [];
      
      // If user type is specified, search only in that table
      if (userType === 'driver') {
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('email')
          .eq('phone', normalizedPhone);

        if (!driverError && driverData) {
          emails.push(...driverData.map(d => d.email));
        }
      } else if (userType === 'customer') {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('email')
          .eq('phone', normalizedPhone);

        if (!customerError && customerData) {
          emails.push(...customerData.map(c => c.email));
        }
      } else {
        // Search in both tables if no user type specified
        const { data: driverData } = await supabase
          .from('drivers')
          .select('email')
          .eq('phone', normalizedPhone);

        const { data: customerData } = await supabase
          .from('customers')
          .select('email')
          .eq('phone', normalizedPhone);

        if (driverData) {
          emails.push(...driverData.map(d => d.email));
        }
        if (customerData) {
          emails.push(...customerData.map(c => c.email));
        }
      }

      return emails;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return [];
    }
  };

  const signUp = async (email: string, password: string, phone: string, name: string, userType: 'customer' | 'driver') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const normalizedPhone = normalizeIraqiPhone(phone);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            phone: normalizedPhone,
            name,
            user_type: userType
          }
        }
      });

      if (error) throw error;

      // Insert user data into appropriate table for legacy compatibility
      if (data.user) {
        const userData = {
          name,
          phone: normalizedPhone,
          email,
        };

        if (userType === 'customer') {
          const { error: insertError } = await supabase
            .from('customers')
            .insert([userData]);
          
          if (insertError) {
            console.error('Error inserting customer:', insertError);
          }
        } else {
          const { error: insertError } = await supabase
            .from('drivers')
            .insert([userData]);
          
          if (insertError) {
            console.error('Error inserting driver:', insertError);
          }
        }
      }

      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم تسجيلك بنجاح في التطبيق",
      });

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (emailOrPhone: string, password: string, userType?: 'customer' | 'driver') => {
    try {
      let email = emailOrPhone;

      // If it's a phone number, find the associated email
      if (!isValidEmail(emailOrPhone)) {
        const normalizedPhone = normalizeIraqiPhone(emailOrPhone);
        if (isValidIraqiPhone(normalizedPhone)) {
          const foundEmails = await findUserByPhone(normalizedPhone, userType);
          if (foundEmails.length === 0) {
            throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم');
          }
          
          // Try each email until one works
          let loginSuccessful = false;
          let lastError: any = null;
          
          for (const foundEmail of foundEmails) {
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email: foundEmail,
                password,
              });
              
              if (!error) {
                loginSuccessful = true;
                break;
              } else {
                lastError = error;
              }
            } catch (e) {
              lastError = e;
            }
          }
          
          if (!loginSuccessful) {
            throw lastError || new Error('فشل في تسجيل الدخول');
          }
        } else {
          throw new Error('يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف عراقي صحيح');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }

      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في التطبيق",
      });

      return { error: null };
    } catch (error) {
      console.error('SignIn error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any localStorage data from old insecure system
      localStorage.removeItem('customerData');
      localStorage.removeItem('driverData');
      localStorage.removeItem('customerId');
      localStorage.removeItem('driverId');
      localStorage.removeItem('customerPhone');
      localStorage.removeItem('driverPhone');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('khobzak_customer_credentials');

      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل خروجك بنجاح",
      });
    } catch (error) {
      console.error('SignOut error:', error);
      toast({
        title: "خطأ في تسجيل الخروج",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const getUserType = (): string | null => {
    if (!user?.user_metadata) return null;
    return user.user_metadata.user_type || 'customer';
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
