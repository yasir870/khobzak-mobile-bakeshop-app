
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { BreadProduct } from './CustomerDashboard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ProductDetailModalProps {
  product: BreadProduct;
  onClose: () => void;
  onAddToCart: (quantity: number) => void;
}

const ProductDetailModal = ({ product, onClose, onAddToCart }: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);

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
  const isImageUrl = (str: string) =>
    str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
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
                          className="h-40 w-40 object-cover rounded-lg mb-2 border shadow"
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
                  <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2 z-10" />
                  <CarouselNext className="right-1 top-1/2 -translate-y-1/2 z-10" />
                </>
              )}
            </Carousel>
            <div className="flex justify-center gap-1 mt-2">
              {product.images.map((_, idx) => (
                <span key={idx} className="block w-2 h-2 rounded-full bg-amber-200" />
              ))}
            </div>
          </div>

          <CardTitle className="text-xl text-amber-800 text-center">{product.name}</CardTitle>
          <p className="text-amber-600 font-medium text-center">{product.nameAr}</p>
          <div className="text-center">
            <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
              {product.category}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* الوصف التفصيلي */}
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.detailedDescription}</p>
          </div>

          {/* السعر */}
          <div className="text-center">
            <span className="text-2xl font-bold text-amber-700">{product.price} IQD</span>
          </div>

          {/* اختيار الكمية */}
          <div className="flex items-center justify-center space-x-4">
            <span className="font-medium text-amber-800">Quantity:</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* السعر الإجمالي */}
          <div className="text-center">
            <p className="text-amber-600">
              Total: <span className="font-bold text-lg">{product.price * quantity} IQD</span>
            </p>
          </div>

          {/* زر إضافة للسلة */}
          <Button
            onClick={handleAddToCart}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
            size="lg"
          >
            Add {quantity} to Cart
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetailModal;
