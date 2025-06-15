
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
  const {
    t
  } = useTranslation();

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

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[90vh]">
        {/* زر الإغلاق الثابت */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="fixed right-6 top-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full w-10 h-10 p-0 shadow-warm-lg border border-primary/20"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <Card className="w-full h-full overflow-y-auto bg-card/98 backdrop-blur-sm shadow-warm-lg border border-primary/20">
          <CardHeader className="pt-16 pb-4">
            {/* صور المنتج كسلايدر حديث */}
            <div className="text-center mb-4">
              <Carousel>
                <CarouselContent>
                  {product.images.map((img, i) => <CarouselItem key={i}>
                      <div className="flex flex-col items-center">
                        {isImageUrl(img) ? <img src={img} alt={product.name} className="h-44 w-44 object-cover rounded-xl mb-2 border-2 border-primary/20 shadow-warm" /> : <div className="text-6xl mb-2">{img}</div>}
                      </div>
                    </CarouselItem>)}
                </CarouselContent>
                {product.images.length > 1 && <>
                    <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 z-10 bg-card/90 border-primary/30 hover:bg-primary/10" />
                    <CarouselNext className="right-2 top-1/2 -translate-y-1/2 z-10 bg-card/90 border-primary/30 hover:bg-primary/10" />
                  </>}
              </Carousel>
              <div className="flex justify-center gap-2 mt-3">
                {product.images.map((_, idx) => <span key={idx} className="block w-2.5 h-2.5 rounded-full bg-primary/60 shadow-sm" />)}
              </div>
            </div>

            <CardTitle className="text-2xl text-primary text-center font-bold">{product.name}</CardTitle>
            <p className="text-primary/80 font-medium text-center text-lg">{product.nameAr}</p>
            <div className="text-center">
              <span className="inline-block bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                {product.category}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-6">
            {/* الوصف التفصيلي */}
            <div className="bg-muted/50 rounded-xl p-4">
              <h3 className="font-semibold text-primary mb-3 text-lg">{t('description')}</h3>
              <p className="text-foreground/80 leading-relaxed">{product.detailedDescription}</p>
            </div>

            {/* السعر */}
            <div className="text-center bg-accent/30 rounded-xl p-4">
              <span className="text-3xl font-bold text-primary">{product.price} IQD</span>
            </div>

            {/* اختيار الكمية */}
            <div className="flex items-center justify-center space-x-4 bg-muted/30 rounded-xl p-4">
              <span className="font-semibold text-primary text-lg">{t('quantity')}:</span>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuantityChange(-1)} 
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-full border-primary/30 hover:bg-primary/10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center font-bold text-xl text-primary bg-card rounded-lg py-2 border border-primary/20">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuantityChange(1)}
                  className="h-10 w-10 rounded-full border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* السعر الإجمالي */}
            <div className="text-center bg-primary/5 rounded-xl p-4">
              <p className="text-primary/80">
                {t('total')}: <span className="font-bold text-2xl text-primary">{product.price * quantity} IQD</span>
              </p>
            </div>

            {/* زر إضافة للسلة */}
            <Button 
              onClick={handleAddToCart} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg py-6 rounded-xl shadow-warm hover:shadow-warm-lg transition-all duration-200 hover:scale-[1.02]" 
              size="lg"
            >
              {t('addQuantityToCart', {
              quantity
            })}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>;
};

export default ProductDetailModal;
