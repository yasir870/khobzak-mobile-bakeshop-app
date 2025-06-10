
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Minus } from 'lucide-react';
import { BreadProduct } from './CustomerDashboard';

interface ProductDetailModalProps {
  product: BreadProduct;
  onClose: () => void;
  onAddToCart: (quantity: number) => void;
}

const ProductDetailModal = ({ product, onClose, onAddToCart }: ProductDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(quantity);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

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
          
          {/* Product Images Carousel */}
          <div className="text-center mb-4">
            <div className="relative">
              <div className="text-6xl mb-4">{product.images[currentImageIndex]}</div>
              {product.images.length > 1 && (
                <div className="flex justify-center space-x-2 mb-4">
                  <Button variant="outline" size="sm" onClick={prevImage}>
                    ‹
                  </Button>
                  <span className="text-sm text-gray-500 px-4 py-2">
                    {currentImageIndex + 1} / {product.images.length}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextImage}>
                    ›
                  </Button>
                </div>
              )}
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
          {/* Detailed Description */}
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.detailedDescription}</p>
          </div>

          {/* Price */}
          <div className="text-center">
            <span className="text-2xl font-bold text-amber-700">{product.price} SAR</span>
          </div>

          {/* Quantity Selector */}
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

          {/* Total Price */}
          <div className="text-center">
            <p className="text-amber-600">
              Total: <span className="font-bold text-lg">{product.price * quantity} SAR</span>
            </p>
          </div>

          {/* Add to Cart Button */}
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
