import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Upload, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

interface Bakery {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  approved: boolean;
}

interface BreadProduct {
  id: number;
  bakery_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
}

interface Props { onLogout: () => void }

const BakeryApp = ({ onLogout }: Props) => {
  const { user, session } = useAuth();
  const activeUser = user ?? session?.user ?? null;
  const { toast } = useToast();
  const [bakery, setBakery] = useState<Bakery | null>(null);
  const [products, setProducts] = useState<BreadProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '' });

  useEffect(() => { if (activeUser) load(); }, [activeUser?.id]);

  const load = async () => {
    setLoading(true);
    const { data: b } = await supabase
      .from('bakeries')
      .select('*')
      .eq('owner_user_id', activeUser!.id)
      .maybeSingle();
    setBakery(b as any);
    if (b) {
      const { data: p } = await supabase
        .from('bread_products')
        .select('*')
        .eq('bakery_id', b.id)
        .order('created_at', { ascending: false });
      setProducts((p as any) || []);
    }
    setLoading(false);
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fullPath = `${path}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(fullPath, file, { upsert: true });
    if (error) { toast({ title: 'فشل رفع الصورة', description: error.message, variant: 'destructive' }); return null; }
    const { data } = supabase.storage.from('photos').getPublicUrl(fullPath);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !bakery) return;
    setUploading(true);
    const url = await uploadImage(f, `bakeries/${bakery.id}/logo`);
    if (url) {
      await supabase.from('bakeries').update({ logo_url: url }).eq('id', bakery.id);
      setBakery({ ...bakery, logo_url: url });
      toast({ title: 'تم تحديث الشعار' });
    }
    setUploading(false);
  };

  const saveBakery = async () => {
    if (!bakery) return;
    const { error } = await supabase.from('bakeries')
      .update({ name: bakery.name, phone: bakery.phone, address: bakery.address })
      .eq('id', bakery.id);
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else toast({ title: 'تم الحفظ' });
  };

  const addProduct = async () => {
    if (!bakery || !newProduct.name) return;
    const { error } = await supabase.from('bread_products').insert({
      bakery_id: bakery.id,
      name: newProduct.name,
      description: newProduct.description || null,
      price: Number(newProduct.price) || 0,
    });
    if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    else { setNewProduct({ name: '', description: '', price: '' }); load(); }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('حذف المنتج؟')) return;
    await supabase.from('bread_products').delete().eq('id', id);
    load();
  };

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>, p: BreadProduct) => {
    const f = e.target.files?.[0]; if (!f || !bakery) return;
    const url = await uploadImage(f, `breads/${bakery.id}/${p.id}`);
    if (url) {
      await supabase.from('bread_products').update({ image_url: url }).eq('id', p.id);
      load();
    }
  };

  const toggleAvail = async (p: BreadProduct) => {
    await supabase.from('bread_products').update({ available: !p.available }).eq('id', p.id);
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

  if (!bakery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <p className="mb-4">لم يتم ربط حسابك بمخبز بعد. تواصل مع المدير.</p>
        <Button onClick={onLogout} variant="outline"><LogOut className="ml-2 h-4 w-4" />خروج</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">لوحة تحكم المخبز</h1>
          <div className="flex gap-2 items-center">
            {!bakery.approved && <Badge variant="destructive">بانتظار الموافقة</Badge>}
            <Button onClick={onLogout} variant="outline" size="sm"><LogOut className="ml-2 h-4 w-4" />خروج</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>معلومات المخبز</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {bakery.logo_url ? (
                <img src={bakery.logo_url} alt="logo" className="w-20 h-20 rounded-full border object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span><Upload className="ml-2 h-4 w-4" />{uploading ? 'جاري الرفع...' : 'تغيير الشعار'}</span>
                </Button>
                <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>اسم المخبز</Label><Input value={bakery.name} onChange={e => setBakery({ ...bakery, name: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input value={bakery.phone || ''} onChange={e => setBakery({ ...bakery, phone: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>العنوان</Label><Input value={bakery.address || ''} onChange={e => setBakery({ ...bakery, address: e.target.value })} /></div>
            </div>
            <Button onClick={saveBakery}>حفظ</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>إضافة منتج خبز جديد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
              <Input placeholder="السعر (د.ع)" type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
              <Input placeholder="الوصف" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
            </div>
            <Button onClick={addProduct}><Plus className="ml-2 h-4 w-4" />إضافة</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>المنتجات ({products.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-3 border rounded-lg p-3">
                {p.image_url ? <img src={p.image_url} className="w-16 h-16 rounded object-cover" /> :
                  <div className="w-16 h-16 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.price} د.ع · {p.available ? 'متاح' : 'غير متاح'}</div>
                </div>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild><span><Upload className="h-4 w-4" /></span></Button>
                  <input type="file" accept="image/*" hidden onChange={e => handleProductImage(e, p)} />
                </label>
                <Button variant="outline" size="sm" onClick={() => toggleAvail(p)}>{p.available ? 'إخفاء' : 'إظهار'}</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {products.length === 0 && <p className="text-muted-foreground text-center py-6">لا توجد منتجات بعد</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BakeryApp;
