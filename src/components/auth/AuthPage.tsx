
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AuthPageProps {
  role: 'customer' | 'driver';
  onBack: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ role, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Auto-create test drivers when driver login page opens (runs once)
  useEffect(() => {
    if (role !== 'driver') return;
    try {
      const seeded = localStorage.getItem('seeded_test_drivers');
      if (seeded === '1') return;
    } catch {}

    (async () => {
      try {
        console.log('Seeding test drivers via edge function...');
        const { data, error } = await supabase.functions.invoke('create-test-drivers', { body: {} });
        if (error) throw error;
        console.log('Seed results:', data);
        try { localStorage.setItem('seeded_test_drivers', '1'); } catch {}
        toast({
          title: 'تم تجهيز حسابات السائقين',
          description: 'يمكنك الآن تسجيل الدخول بـ driver1@test.com / password123',
        });
      } catch (err) {
        console.error('Seeding test drivers failed:', err);
      }
    })();
  }, [role, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailOrPhone || !password) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && (!phone || !name)) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة للتسجيل",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin) {
      const normalizedPhone = normalizeIraqiPhone(phone);
      if (!isValidIraqiPhone(normalizedPhone)) {
        toast({
          title: "رقم هاتف غير صحيح",
          description: "يرجى إدخال رقم هاتف عراقي صحيح (07XXXXXXXXX)",
          variant: "destructive",
        });
        return;
      }
      setPhone(normalizedPhone);

      // For signup, we need a proper email
      if (!isValidEmail(emailOrPhone)) {
        toast({
          title: "خطأ في البيانات",
          description: "يرجى إدخال بريد إلكتروني صحيح للتسجيل",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await signIn(emailOrPhone, password, role);
      } else {
        result = await signUp(emailOrPhone, password, normalizeIraqiPhone(phone), name, role);
      }

      if (result.error) {
        toast({
          title: isLogin ? "خطأ في تسجيل الدخول" : "خطأ في إنشاء الحساب",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (isLogin) {
        // Login successful, user will be redirected by the useEffect
        navigate('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleText = () => {
    return role === 'customer' ? 'الزبون' : 'السائق';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-center flex-1">
              {isLogin ? `تسجيل دخول ${getRoleText()}` : `إنشاء حساب ${getRoleText()}`}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">
                {isLogin ? "البريد الإلكتروني أو رقم الهاتف" : "البريد الإلكتروني"}
              </Label>
              <Input
                id="emailOrPhone"
                type={isLogin ? "text" : "email"}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder={isLogin ? "أدخل بريدك الإلكتروني أو رقم هاتفك" : "أدخل بريدك الإلكتروني"}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "جاري التحميل..." : isLogin ? "دخول" : "إنشاء حساب"}
            </Button>

            {role === 'customer' && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm"
                >
                  {isLogin ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب؟ تسجيل الدخول"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
