import { Star, Clock, Truck } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

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

const BakeriesListPage = ({ onSelectBakery }: BakeriesListPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm border-b border-amber-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img
            src="https://lakvfrohnlinfcqfwkqq.supabase.co/storage/v1/object/public/photos//A_logo_on_a_grid-patterned_beige_background_featur.png"
            alt="Logo"
            className="w-10 h-10 rounded-full border-2 border-amber-300 shadow"
          />
          <div>
            <h1 className="text-xl font-bold text-amber-900">{t('appName')}</h1>
            <p className="text-xs text-amber-600">{t('appSlogan')}</p>
          </div>
        </div>
      </header>

      {/* Bakeries List */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-8">
        <h2 className="text-lg font-bold text-amber-900">المخابز القريبة منك</h2>

        {bakeries.map((bakery) => (
          <button
            key={bakery.id}
            onClick={() => onSelectBakery(bakery.id)}
            className="w-full text-right bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] overflow-hidden border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {/* Cover Image */}
            <div className="w-full h-44 sm:h-52 overflow-hidden">
              <img
                src={bakery.coverImage}
                alt={bakery.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <div className="p-4 space-y-2">
              <h3 className="text-lg font-bold text-foreground">{bakery.name}</h3>

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {/* Rating */}
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-amber-800">{bakery.rating}</span>
                </span>

                {/* Delivery Time */}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>{bakery.deliveryTime} د</span>
                </span>

                {/* Delivery Price */}
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4 text-amber-600" />
                  <span>{bakery.deliveryPrice.toLocaleString()} د.ع</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
};

export default BakeriesListPage;
