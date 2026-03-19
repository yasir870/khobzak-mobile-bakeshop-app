import { useState, useEffect } from 'react';
import { Star, Clock, Truck, ShoppingBag, User, MessageSquare, Bell, LogOut, MapPin, Search, Tag } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import ProfilePage from './ProfilePage';
import ContactDialog from './ContactDialog';
import ActiveOrdersModal from './ActiveOrdersModal';
import OrderTrackingModal from './OrderTrackingModal';
import NotificationsPage from './NotificationsPage';
import { supabase } from '@/integrations/supabase/client';

interface Bakery {
  id: number;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  deliveryPrice: number;
  isClosed?: boolean;
  badge?: string;
  offers?: string[];
}

interface BakeriesListPageProps {
  onSelectBakery: (bakeryId: number) => void;
  onLogout: () => void;
}

const bakeries: Bakery[] = [
  {
    id: 1,
    name: 'مخبز خبزك الذهبي',
    image: 'https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png',
    rating: 4.8,
    deliveryTime: '20-30',
    deliveryPrice: 1500,
    badge: 'مميز',
    offers: ['خصم 1500 د.ع'],
  },
  {
    id: 2,
    name: 'مخبز السنابل',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    rating: 4.5,
    deliveryTime: '25-40',
    deliveryPrice: 2000,
    offers: ['توصيل مجاني للطلبات فوق 10,000'],
  },
  {
    id: 3,
    name: 'مخبز الفرات',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=400&q=80',
    rating: 4.3,
    deliveryTime: '15-25',
    deliveryPrice: 1000,
    isClosed: true,
  },
  {
    id: 4,
    name: 'مخبز بغداد',
    image: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=400&q=80',
    rating: 4.6,
    deliveryTime: '30-45',
    deliveryPrice: 2500,
    badge: 'جديد',
    offers: ['خصم 2000 د.ع على أول طلب'],
  },
];

type FilterType = 'all' | 'top_rated' | 'free_delivery' | 'fastest';
type ActiveView = 'home' | 'notifications' | 'profile';

const BakeriesListPage = ({ onSelectBakery, onLogout }: BakeriesListPageProps) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      setUnreadNotifications(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel('notif-count-main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'top_rated', label: 'الأعلى تقييماً' },
    { key: 'free_delivery', label: 'توصيل مجاني' },
    { key: 'fastest', label: 'الأسرع' },
  ];

  const filteredBakeries = bakeries
    .filter((b) => b.name.includes(searchQuery))
    .sort((a, b) => {
      if (activeFilter === 'top_rated') return b.rating - a.rating;
      if (activeFilter === 'fastest') return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
      if (activeFilter === 'free_delivery') return a.deliveryPrice - b.deliveryPrice;
      return 0;
    });

  if (activeView === 'profile') {
    return <ProfilePage onBack={() => setActiveView('home')} />;
  }
  if (activeView === 'notifications') {
    return <NotificationsPage onBack={() => setActiveView('home')} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md shadow-sm border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png"
              alt="Logo"
              className="w-9 h-9 rounded-full border-2 border-primary/20"
            />
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">{t('appName')}</h1>
              <p className="text-[10px] text-muted-foreground">{t('appSlogan')}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="sticky top-[57px] z-40 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مخبز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-sm rounded-full bg-secondary/50 border-border focus-visible:ring-primary/30"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bakery List */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto">
          {filteredBakeries.map((bakery, index) => (
            <div key={bakery.id}>
              <button
                onClick={() => !bakery.isClosed && onSelectBakery(bakery.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-right transition-colors hover:bg-secondary/40 active:bg-secondary/60 ${
                  bakery.isClosed ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                disabled={bakery.isClosed}
              >
                {/* Thumbnail */}
                <div className="relative shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={bakery.image}
                    alt={bakery.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {bakery.isClosed && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">مغلق</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Name + Badge */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground truncate">{bakery.name}</h3>
                    {bakery.badge && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
                        {bakery.badge}
                      </span>
                    )}
                  </div>

                  {/* Rating, Time, Price */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{bakery.rating}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{bakery.deliveryTime} د</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Truck className="h-3 w-3" />
                      <span>{bakery.deliveryPrice.toLocaleString()} د.ع</span>
                    </span>
                  </div>

                  {/* Offers */}
                  {bakery.offers && bakery.offers.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bakery.offers.map((offer, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {offer}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {index < filteredBakeries.length - 1 && (
                <Separator className="mx-4" />
              )}
            </div>
          ))}

          {filteredBakeries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">لا توجد نتائج</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          <NavItem icon={<MapPin className="h-5 w-5" />} label="الرئيسية" active={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavItem icon={<ShoppingBag className="h-5 w-5" />} label={t('myOrders')} active={false} onClick={() => setShowActiveOrders(true)} />
          <NavItem
            icon={
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </div>
            }
            label="الإشعارات"
            active={false}
            onClick={() => setActiveView('notifications')}
          />
          <NavItem icon={<MessageSquare className="h-5 w-5" />} label={t('contactUs')} active={false} onClick={() => setContactOpen(true)} />
          <NavItem icon={<User className="h-5 w-5" />} label={t('profile')} active={false} onClick={() => setActiveView('profile')} />
        </div>
      </nav>

      {/* Modals */}
      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <ActiveOrdersModal
        isOpen={showActiveOrders}
        onClose={() => setShowActiveOrders(false)}
        onTrackOrder={(order) => {
          setSelectedOrderForTracking(order);
          setShowTrackingModal(true);
        }}
      />
      {selectedOrderForTracking && (
        <OrderTrackingModal
          isOpen={showTrackingModal}
          onClose={() => { setShowTrackingModal(false); setSelectedOrderForTracking(null); }}
          order={selectedOrderForTracking}
          customerLocation={null}
        />
      )}
    </div>
  );
};

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default BakeriesListPage;
