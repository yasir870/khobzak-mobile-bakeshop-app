
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  role: 'customer' | 'driver';
  onAuthSuccess: (role: 'customer' | 'driver') => void;
  onBack: () => void;
}

const LoginForm = ({ role, onAuthSuccess, onBack }: LoginFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (role === 'driver') {
        // التحقق من السائق في قاعدة البيانات
        const identifier = email || phone;
        
        const { data: driver, error } = await supabase
          .from('drivers')
          .select('*')
          .or(`email.eq.${identifier},phone.eq.${identifier}`)
          .single();

        if (error || !driver) {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: "السائق غير موجود في النظام. يرجى التواصل مع الإدارة.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (!driver.approved) {
          toast({
            title: "حساب غير مُفعّل",
            description: "حسابك لم يتم تفعيله بعد. يرجى انتظار موافقة الإدارة.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // محاكاة تسجيل دخول ناجح للسائق المُفعّل
        setTimeout(() => {
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: `مرحباً ${driver.name}!`
          });
          onAuthSuccess(role);
          setIsLoading(false);
        }, 1000);
      } else {
        // للزبائن - محاكاة تسجيل الدخول العادي
        setTimeout(() => {
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: `مرحباً بك!`
          });
          onAuthSuccess(role);
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-4 text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          العودة لاختيار نوع الحساب
        </Button>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-amber-800">
              {role === 'customer' ? 'زبون' : 'سائق'} - {isLogin ? 'تسجيل دخول' : 'إنشاء حساب'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center text-amber-700">
                  <Mail className="mr-2 h-4 w-4" />
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  className="border-amber-200 focus:border-amber-500"
                />
              </div>

              {role === 'driver' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center text-amber-700">
                    <Phone className="mr-2 h-4 w-4" />
                    رقم الهاتف (بديل)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+964 7XX XXX XXX"
                    className="border-amber-200 focus:border-amber-500"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-700">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="border-amber-200 focus:border-amber-500"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading || (!email && !phone)}
              >
                {isLoading ? 'جاري التحقق...' : `${isLogin ? 'تسجيل دخول' : 'إنشاء حساب'} كـ${role === 'customer' ? 'زبون' : 'سائق'}`}
              </Button>

              {role === 'customer' && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    {isLogin ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ تسجيل دخول"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
