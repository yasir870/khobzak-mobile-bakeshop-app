import { useState, useEffect } from 'react';
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

const CREDENTIALS_KEY = "khobzak_customer_credentials"; // For remember me

const LoginForm = ({ role, onAuthSuccess, onBack }: LoginFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();

  // تحميل بيانات محفوظة إذا كان تذكرني مفعل
  useEffect(() => {
    if (role === "customer" && isLogin) {
      const creds = localStorage.getItem(CREDENTIALS_KEY);
      if (creds) {
        try {
          const parsed = JSON.parse(creds);
          setEmail(parsed.email ?? "");
          setPassword(parsed.password ?? "");
          setRememberMe(true);
        } catch {}
      }
    }
  }, [role, isLogin]);

  // دالة التحقق من رقم عراقي صحيح
  function isValidIraqiPhone(phone: string) {
    // يسمح 07XXXXXXXXX أو +9647XXXXXXXXX (يجب أن يتبعهم 8 أرقام)
    const regex = /^((07\d{9})|(\+9647\d{9}))$/;
    return regex.test(phone.trim());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (role === "customer") {
        if (isLogin) {
          // بحث حسب الإيميل أو الهاتف فقط
          const identifier = email.trim();
          if (!identifier || !password) {
            toast({
              title: "بيانات ناقصة",
              description: "يرجى إدخال البريد أو رقم الهاتف بالإضافة إلى كلمة المرور.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // جلب الزبون بناءً على الإيميل أو الهاتف فقط
          const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .or(`email.eq.${identifier},phone.eq.${identifier}`)
            .maybeSingle();

          if (!customer) {
            toast({
              title: "الحساب غير موجود",
              description: "لا يوجد حساب مرتبط بهذا البريد الإلكتروني أو رقم الهاتف.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // تحقق من كلمة المرور
          if (customer.password !== password) {
            toast({
              title: "كلمة المرور غير صحيحة",
              description: "الرجاء التحقق من كلمة المرور والمحاولة مرة أخرى.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // حفظ بيانات الدخول إذا تم اختيار "تذكرني"
          if (rememberMe) {
            localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email: identifier, password }));
          } else {
            localStorage.removeItem(CREDENTIALS_KEY);
          }

          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: `مرحباً ${customer.name}!`
          });
          onAuthSuccess(role);
          setIsLoading(false);
        } else {
          // sign up
          // إضافة تحقق جديد: يجب إدخال كلا من الإيميل والهاتف
          if (!email || !phone) {
            toast({
              title: "البيانات ناقصة",
              description: "يرجى إدخال كل من البريد الإلكتروني ورقم الهاتف معاً.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // تحقق أن الإيميل والهاتف غير مستخدمين
          const { data: exists } = await supabase
            .from('customers')
            .select('id')
            .or(`email.eq.${email},phone.eq.${phone}`)
            .maybeSingle();

          if (exists) {
            toast({
              title: "استخدام مسبق",
              description: "الإيميل أو الهاتف مستخدم مسبقًا.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // الاسم إلزامي أثناء sign up
          const nameEl = (document.getElementById("customer-signup-name") as HTMLInputElement);
          const name = nameEl?.value.trim();
          if (!name) {
            toast({
              title: "الاسم مطلوب",
              description: "يرجى إدخال الاسم الكامل.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // تحقق من صحة رقم الهاتف (عراقي)
          if (!isValidIraqiPhone(phone)) {
            toast({
              title: "رقم غير صحيح",
              description: "الرجاء إدخال رقم عراقي يبدأ بـ 07 أو +9647 ويتألف من 11 رقم.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // التحقق من صحة البريد الإلكتروني
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            toast({
              title: "بريد إلكتروني غير صالح",
              description: "يرجى إدخال بريد إلكتروني صحيح.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // الإضافة
          const { error } = await supabase
            .from("customers")
            .insert([{ email, password, phone, name }]);

          if (error) {
            toast({
              title: "خطأ",
              description: "فشل إنشاء الحساب، جرب لاحقًا.",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // auto-login بعد التسجيل
          if (rememberMe) {
            localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ email, password }));
          }
          toast({ title: "تم إنشاء الحساب!", description: "يمكنك الآن تسجيل الدخول" });
          setIsLogin(true);
          setIsLoading(false);
        }
        return; // نهاية منطق الزبون
      }

      // تسجيل دخول السائق: البريد أو الهاتف + كلمة سر مطابقة
      if (role === 'driver') {
        const identifier = email.trim();
        if (!identifier || !password) {
          toast({
            title: "بيانات ناقصة",
            description: "يرجى إدخال البريد أو رقم الهاتف بالإضافة إلى كلمة المرور.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        const { data: driver, error } = await supabase
          .from('drivers')
          .select('*')
          .or(`email.eq.${identifier},phone.eq.${identifier}`)
          .maybeSingle();

        if (!driver) {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: "السائق غير موجود في النظام. يرجى التواصل مع الإدارة.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (!driver.password || driver.password !== password) {
          toast({
            title: "كلمة المرور غير صحيحة",
            description: "يرجى التحقق من كلمة المرور والمحاولة مرة أخرى.",
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

        setTimeout(() => {
          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: `مرحباً ${driver.name}!`
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
              {/* اسم المستخدم فقط عند الإنشاء */}
              {role === "customer" && !isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="customer-signup-name" className="flex items-center text-amber-700">
                    الاسم الكامل
                  </Label>
                  <Input
                    id="customer-signup-name"
                    type="text"
                    placeholder="أدخل الاسم الكامل"
                    className="border-amber-200 focus:border-amber-500"
                  />
                </div>
              )}

              {/* خانة واحدة في login لكلا الدورين، في signup تبقى كما كانت */}
              {isLogin ? (
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="flex items-center text-amber-700">
                    <Mail className="mr-2 h-4 w-4" />
                    البريد الإلكتروني أو رقم الهاتف
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل البريد الإلكتروني أو رقم الهاتف"
                    className="border-amber-200 focus:border-amber-500"
                    required
                  />
                </div>
              ) : (
                <>
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
                      required={role === "customer"}
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
                  {role === "customer" && !isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center text-amber-700">
                        <Phone className="mr-2 h-4 w-4" />
                        رقم الهاتف
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07XXXXXXXXX أو +9647XXXXXXXXX"
                        className="border-amber-200 focus:border-amber-500"
                        required
                      />
                    </div>
                  )}
                </>
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

              {/* خيار تذكرني للعملاء فقط */}
              {role === "customer" && (
                <div className="flex items-center space-x-2 mb-[-0.5rem] rtl:space-x-reverse">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-amber-400 mr-2 size-4"
                  />
                  <Label htmlFor="rememberMe" className="text-amber-700 cursor-pointer select-none">
                    تذكرني
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={
                  isLoading ||
                  (!email && !phone) ||
                  (role === "customer" && !password) ||
                  (role === "driver" && !password)
                }
              >
                {isLoading
                  ? (isLogin ? 'جاري التحقق...' : "جاري الإنشاء...")
                  : `${isLogin ? 'تسجيل دخول' : 'إنشاء حساب'} كـ${role === 'customer' ? 'زبون' : 'سائق'}`}
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
