
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { BreadProduct } from './CustomerDashboard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useTranslation } from '@/context/LanguageContext';
import { Separator } from '@/components/ui/separator';

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

  const isImageUrl = (str: string) => str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Image */}
          <div className="px-4 pt-4 pb-2">
            <Carousel>
              <CarouselContent>
                {product.images.map((img, i) => (
                  <CarouselItem key={i}>
                    <div className="flex justify-center">
                      {isImageUrl(img) ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="h-40 w-40 object-cover rounded-2xl border border-border shadow-sm"
                        />
                      ) : (
                        <div className="text-6xl">{img}</div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {product.images.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 bg-card/90 border-border h-7 w-7" />
                  <CarouselNext className="right-2 bg-card/90 border-border h-7 w-7" />
                </>
              )}
            </Carousel>
            {product.images.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {product.images.map((_, idx) => (
                  <span key={idx} className="block w-1.5 h-1.5 rounded-full bg-primary" />
                ))}
              </div>
            )}
          </div>

          {/* Title & Category */}
          <div className="px-4 pb-3 text-center space-y-1">
            <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground">
              {product.category}
            </span>
          </div>

          <Separator className="mx-4" />

          {/* Description */}
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">{t('description')}</h4>
            <p className="text-sm text-foreground leading-relaxed">{product.detailedDescription}</p>
          </div>

          <Separator className="mx-4" />

          {/* Info rows */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">السعر</span>
              <span className="text-sm font-bold text-primary">{product.price} د.ع</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">الكمية</span>
              <span className="text-sm font-medium text-foreground">{product.pieces} {product.pieces === 1 ? "قطعة" : "قطع"}</span>
            </div>
            {product.notes && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">ملاحظات</span>
                <span className="text-sm text-muted-foreground">{product.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom: quantity + add to cart */}
        <div className="border-t border-border bg-card px-4 py-3 space-y-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t('quantity')}</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="h-8 w-8 rounded-full border-border"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center font-bold text-foreground">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                className="h-8 w-8 rounded-full border-border"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            className="w-full h-11 rounded-xl font-semibold text-sm gap-2"
            size="lg"
          >
            <ShoppingBag className="h-4 w-4" />
            {t('addQuantityToCart', { quantity })} — {product.price * quantity} د.ع
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
