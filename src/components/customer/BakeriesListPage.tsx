import { useState } from 'react';
import { Star, Clock, Truck, ShoppingBag, User, MessageSquare, Bell, LogOut, MapPin } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProfilePage from './ProfilePage';
import ContactDialog from './ContactDialog';
import ActiveOrdersModal from './ActiveOrdersModal';
import OrderTrackingModal from './OrderTrackingModal';
import NotificationsPage from './NotificationsPage';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface Bakery {
  id: number;
  name: string;
  coverImage: string;
  rating: number;
  deliveryTime: string;
  deliveryPrice: number;
}

interface BakeriesListPageProps {
  onSelectBakery: (bakeryId: number) => void;
  onLogout: () => void;
}

const bakeries: Bakery[] = [
  {
    id: 1,
    name: 'مخبز خبزك الذهبي',
    coverImage: 'https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png',
    rating: 4.8,
    deliveryTime: '20-30',
    deliveryPrice: 1500,
  },
  {
    id: 2,
    name: 'مخبز السنابل',
    coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    rating: 4.5,
    deliveryTime: '25-40',
    deliveryPrice: 2000,
  },
  {
    id: 3,
    name: 'مخبز الفرات',
    coverImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=800&q=80',
    rating: 4.3,
    deliveryTime: '15-25',
    deliveryPrice: 1000,
  },
  {
    id: 4,
    name: 'مخبز بغداد',
    coverImage: 'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=800&q=80',
    rating: 4.6,
    deliveryTime: '30-45',
    deliveryPrice: 2500,
  },
];

type ActiveView = 'home' | 'notifications' | 'profile';

const BakeriesListPage = ({ onSelectBakery, onLogout }: BakeriesListPageProps) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [contactOpen, setContactOpen] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  // Sub-pages
  if (activeView === 'profile') {
    return <ProfilePage onBack={() => setActiveView('home' as ActiveView)} />;
  }
  if (activeView === 'notifications') {
    return <NotificationsPage onBack={() => setActiveView('home' as ActiveView)} />;
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
              className="w-10 h-10 rounded-full border-2 border-primary/30 shadow-sm"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">{t('appName')}</h1>
              <p className="text-[11px] text-muted-foreground">{t('appSlogan')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Section Title */}
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">المخابز القريبة منك</h2>
          </div>

          {/* Bakery Cards - Vertical List */}
          <div className="space-y-4">
            {bakeries.map((bakery) => (
              <button
                key={bakery.id}
                onClick={() => onSelectBakery(bakery.id)}
                className="w-full text-right bg-card rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {/* Cover Image */}
                <div className="w-full aspect-[16/9] overflow-hidden bg-secondary">
                  <img
                    src={bakery.coverImage}
                    alt={bakery.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Info Section */}
                <div className="p-3.5">
                  <h3 className="text-[15px] font-bold text-foreground mb-2">{bakery.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{bakery.rating}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{bakery.deliveryTime} د</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{bakery.deliveryPrice.toLocaleString()} د.ع</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          <NavItem
            icon={<MapPin className="h-5 w-5" />}
            label="الرئيسية"
            active={activeView === 'home'}
            onClick={() => setActiveView('home')}
          />
          <NavItem
            icon={<ShoppingBag className="h-5 w-5" />}
            label={t('myOrders')}
            active={false}
            onClick={() => setShowActiveOrders(true)}
          />
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
          <NavItem
            icon={<MessageSquare className="h-5 w-5" />}
            label={t('contactUs')}
            active={false}
            onClick={() => setContactOpen(true)}
          />
          <NavItem
            icon={<User className="h-5 w-5" />}
            label={t('profile')}
            active={false}
            onClick={() => setActiveView('profile')}
          />
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
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedOrderForTracking(null);
          }}
          order={selectedOrderForTracking}
          customerLocation={null}
        />
      )}
    </div>
  );
};

// Bottom nav item
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default BakeriesListPage;
