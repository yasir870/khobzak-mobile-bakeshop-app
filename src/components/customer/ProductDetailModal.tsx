
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { BreadProduct } from './CustomerDashboard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useTranslation } from '@/context/LanguageContext';

interface ProductDetailModalProps {
  product: BreadProduct;
  onClose: () => void;
  onAddToCart: (quantity: number) => void;
}

const ProductDetailModal = ({
  product,
  onClose,
  onAddToCart
}: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const { t } = useTranslation();

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(quantity);
  };

  // هل النص رابط صورة؟
  const isImageUrl = (str: string) => str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[90vh]">
        {/* زر الإغلاق الثابت */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="fixed right-6 top-6 z-50 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-full w-10 h-10 p-0 shadow-lg border"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <Card className="w-full h-full overflow-y-auto bg-white shadow-2xl border">
          <CardHeader className="pt-16 pb-4">
            {/* صور المنتج كسلايدر حديث */}
            <div className="text-center mb-4">
              <Carousel>
                <CarouselContent>
                  {product.images.map((img, i) => (
                    <CarouselItem key={i}>
                      <div className="flex flex-col items-center">
                        {isImageUrl(img) ? (
                          <img 
                            src={img} 
                            alt={product.name} 
                            className="h-44 w-44 object-cover rounded-xl mb-2 border shadow-lg" 
                          />
                        ) : (
                          <div className="text-6xl mb-2">{img}</div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {product.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 border hover:bg-gray-50" />
                    <CarouselNext className="right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 border hover:bg-gray-50" />
                  </>
                )}
              </Carousel>
              <div className="flex justify-center gap-2 mt-3">
                {product.images.map((_, idx) => (
                  <span key={idx} className="block w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                ))}
              </div>
            </div>

            <CardTitle className="text-2xl text-gray-800 text-center font-bold">{product.name}</CardTitle>
            <p className="text-gray-600 font-medium text-center text-lg">{product.nameAr}</p>
            <div className="text-center">
              <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                {product.category}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-6">
            {/* الوصف التفصيلي */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-lg">{t('description')}</h3>
              <p className="text-gray-700 leading-relaxed">{product.detailedDescription}</p>
            </div>

            {/* السعر */}
            <div className="text-center bg-blue-50 rounded-xl p-4">
              <span className="text-3xl font-bold text-blue-600">{product.price} IQD</span>
            </div>

            {/* اختيار الكمية */}
            <div className="flex items-center justify-center space-x-4 bg-gray-50 rounded-xl p-4">
              <span className="font-semibold text-gray-800 text-lg">{t('quantity')}:</span>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuantityChange(-1)} 
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-full border-gray-300 hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center font-bold text-xl text-gray-800 bg-white rounded-lg py-2 border">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuantityChange(1)}
                  className="h-10 w-10 rounded-full border-gray-300 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* السعر الإجمالي */}
            <div className="text-center bg-green-50 rounded-xl p-4">
              <p className="text-gray-700">
                {t('total')}: <span className="font-bold text-2xl text-green-600">{product.price * quantity} IQD</span>
              </p>
            </div>

            {/* زر إضافة للسلة */}
            <Button 
              onClick={handleAddToCart} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
              size="lg"
            >
              {t('addQuantityToCart', { quantity })}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetailModal;
