import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload, ArrowLeft } from 'lucide-react';

interface Driver { id: number; name: string; email: string; phone: string; approved: boolean; }
interface Bakery { id: number; name: string; email: string | null; phone: string | null; address: string | null; logo_url: string | null; approved: boolean; owner_user_id: string | null; }

const empty = { name: '', email: '', password: '', phone: '', address: '', approved: true };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, session, isLoading } = useAuth();
  const activeUser = user ?? session?.user ?? null;
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [editing, setEditing] = useState<{ kind: 'driver' | 'bakery'; row?: any } | null>(null);
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (isLoading) return;
    if (!activeUser) { navigate('/'); return; }
    (async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', activeUser.id).eq('role', 'admin').maybeSingle();
      const ok = !!data;
      setIsAdmin(ok);
      if (ok) loadAll();
    })();
  }, [activeUser, isLoading]);

  const loadAll = async () => {
    const [d, b] = await Promise.all([
      supabase.functions.invoke('admin-manage-users', { body: { action: 'list', role: 'driver' } }),
      supabase.functions.invoke('admin-manage-users', { body: { action: 'list', role: 'bakery' } }),
    ]);
    if (d.data?.data) setDrivers(d.data.data);
    if (b.data?.data) setBakeries(b.data.data);
  };

  const openCreate = (kind: 'driver' | 'bakery') => { setEditing({ kind }); setForm(empty); };
  const openEdit = (kind: 'driver' | 'bakery', row: any) => { setEditing({ kind, row }); setForm({ ...empty, ...row, password: '' }); };

  const submit = async () => {
    if (!editing) return;
    const isCreate = !editing.row;
    const payload: any = {
      action: isCreate ? 'create' : 'update',
      role: editing.kind,
      user_id: editing.row?.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      approved: form.approved,
      ...(editing.kind === 'bakery' ? { address: form.address } : {}),
      ...(form.password ? { password: form.password } : {}),
    };
    const { data, error } = await supabase.functions.invoke('admin-manage-users', { body: payload });
    if (error || data?.error) {
      toast({ title: 'فشلت العملية', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    toast({ title: isCreate ? 'تم الإنشاء' : 'تم التحديث' });
    setEditing(null);
    loadAll();
  };

  const remove = async (kind: 'driver' | 'bakery', row: any) => {
    if (!confirm(`حذف ${kind === 'driver' ? 'السائق' : 'المخبز'} "${row.name}"؟`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'delete', role: kind, user_id: row.id, email: row.email },
    });
    if (error || data?.error) { toast({ title: 'فشل الحذف', description: error?.message || data?.error, variant: 'destructive' }); return; }
    toast({ title: 'تم الحذف' });
    loadAll();
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>, b: Bakery) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = f.name.split('.').pop();
    const path = `bakeries/${b.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, f, { upsert: true });
    if (error) { toast({ title: 'فشل رفع الصورة', description: error.message, variant: 'destructive' }); return; }
    const { data } = supabase.storage.from('photos').getPublicUrl(path);
    await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'update', role: 'bakery', user_id: b.id, logo_url: data.publicUrl },
    });
    loadAll();
  };

  if (isLoading || isAdmin === null) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" dir="rtl">
      <p className="text-lg">لا تملك صلاحية الوصول إلى لوحة التحكم.</p>
      <Button onClick={() => navigate('/')}>العودة</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة تحكم المدير</h1>
          <Button variant="outline" onClick={() => navigate('/')}><ArrowLeft className="ml-2 h-4 w-4" />الرئيسية</Button>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList>
            <TabsTrigger value="drivers">السائقون ({drivers.length})</TabsTrigger>
            <TabsTrigger value="bakeries">المخابز ({bakeries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قائمة السائقين</CardTitle>
                <Button onClick={() => openCreate('driver')}><Plus className="ml-2 h-4 w-4" />إضافة سائق</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {drivers.map(d => (
                  <div key={d.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <div className="font-semibold">{d.name}</div>
                      <div className="text-sm text-muted-foreground">{d.email} · {d.phone} · {d.approved ? 'معتمد' : 'غير معتمد'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit('driver', d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => remove('driver', d)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bakeries">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قائمة المخابز</CardTitle>
                <Button onClick={() => openCreate('bakery')}><Plus className="ml-2 h-4 w-4" />إضافة مخبز</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {bakeries.map(b => (
                  <div key={b.id} className="flex items-center justify-between border rounded-lg p-3 gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {b.logo_url ? <img src={b.logo_url} className="w-12 h-12 rounded-full object-cover" /> :
                        <div className="w-12 h-12 rounded-full bg-muted" />}
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-sm text-muted-foreground">{b.email} · {b.phone} · {b.approved ? 'معتمد' : 'غير معتمد'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild><span><Upload className="h-4 w-4" /></span></Button>
                        <input type="file" accept="image/*" hidden onChange={e => uploadLogo(e, b)} />
                      </label>
                      <Button variant="outline" size="sm" onClick={() => openEdit('bakery', b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => remove('bakery', b)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editing?.row ? 'تعديل' : 'إضافة'} {editing?.kind === 'driver' ? 'سائق' : 'مخبز'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>الاسم</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>البريد الإلكتروني</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              {editing?.kind === 'bakery' && (
                <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              )}
              <div><Label>{editing?.row ? 'كلمة سر جديدة (اختياري)' : 'كلمة المرور'}</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.approved} onChange={e => setForm({ ...form, approved: e.target.checked })} />
                <span>معتمد</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
              <Button onClick={submit}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
