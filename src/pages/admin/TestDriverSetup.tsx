import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createTestDriverAccounts, getTestDriverCredentials } from '@/utils/createTestDrivers';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Eye, EyeOff, Users, Key, UserPlus } from 'lucide-react';
import { useEffect } from 'react';

interface TestCredential {
  email: string;
  password: string;
  user_type: string;
  phone: string;
  name: string;
}

const TestDriverSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] = useState<TestCredential[]>([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [creationResults, setCreationResults] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    const testCreds = await getTestDriverCredentials();
    setCredentials(testCreds);
  };

  const handleCreateDrivers = async () => {
    setIsCreating(true);
    try {
      console.log('Calling create-test-drivers edge function...');
      
      const { data, error } = await supabase.functions.invoke('create-test-drivers', {
        body: {}
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "خطأ في إنشاء الحسابات",
          description: `فشل في استدعاء الوظيفة: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Edge function response:', data);
      
      const results = data?.results || [];
      setCreationResults(results);
      
      const successful = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;
      
      toast({
        title: "إنشاء حسابات السائقين",
        description: `تم إنشاء ${successful} حساب بنجاح${failed > 0 ? `، فشل ${failed} حساب` : ''}`,
        variant: successful > 0 ? "default" : "destructive"
      });
      
      await loadCredentials();
    } catch (error) {
      console.error('Error creating test drivers:', error);
      toast({
        title: "خطأ في إنشاء الحسابات",
        description: "حدث خطأ أثناء إنشاء حسابات السائقين التجريبية",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} إلى الحافظة`,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-right">إعداد السائقين التجريبيين</h1>
        <p className="text-muted-foreground text-right">
          إنشاء وإدارة حسابات السائقين للاختبار
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6 justify-end">
        <Button
          onClick={() => setShowPasswords(!showPasswords)}
          variant="outline"
          className="flex items-center gap-2"
        >
          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPasswords ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}
        </Button>
        
        <Button
          onClick={handleCreateDrivers}
          disabled={isCreating}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {isCreating ? 'جاري الإنشاء...' : 'إنشاء حسابات السائقين'}
        </Button>
      </div>

      {/* Creation Results */}
      {creationResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <Users className="h-5 w-5" />
              نتائج إنشاء الحسابات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {creationResults.map((result, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded border">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "نجح" : "فشل"}
                  </Badge>
                  <div className="text-right">
                    <p className="font-medium">{result.email}</p>
                    {!result.success && result.error && (
                      <p className="text-sm text-destructive">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Key className="h-5 w-5" />
            بيانات تسجيل الدخول للسائقين التجريبيين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لم يتم إنشاء حسابات تجريبية بعد</p>
              <p className="text-sm">اضغط على "إنشاء حسابات السائقين" لبدء الإعداد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((cred, index) => (
                <Card key={index} className="border border-muted">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cred.email, 'البريد الإلكتروني')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</p>
                            <p className="font-mono">{cred.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cred.phone, 'رقم الهاتف')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">رقم الهاتف</p>
                            <p className="font-mono">{cred.phone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cred.password, 'كلمة المرور')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">كلمة المرور</p>
                            <p className="font-mono">
                              {showPasswords ? cred.password : '••••••••••'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-muted-foreground">الاسم</p>
                          <p>{cred.name}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="mt-6 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-yellow-800 mb-2 text-right">تنبيه أمني</h3>
          <p className="text-sm text-yellow-700 text-right">
            هذه الحسابات مخصصة للاختبار فقط. يُنصح بشدة بحذف هذه الحسابات وتغيير كلمات المرور في البيئة الإنتاجية.
            تذكر أن عرض كلمات المرور في الجداول يشكل مخاطرة أمنية ويجب تجنبه في التطبيقات الفعلية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDriverSetup;