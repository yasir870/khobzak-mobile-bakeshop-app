import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface LocationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAllowLocation: () => void;
  onDenyLocation: () => void;
}

const LocationPermissionDialog = ({ 
  isOpen, 
  onClose, 
  onAllowLocation, 
  onDenyLocation 
}: LocationPermissionDialogProps) => {
  const { t } = useTranslation();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleAllowLocation = async () => {
    setIsGettingLocation(true);
    await onAllowLocation();
    setIsGettingLocation(false);
    onClose();
  };

  const handleDenyLocation = () => {
    onDenyLocation();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white/95 backdrop-blur-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t('locationPermissionTitle')}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2 leading-relaxed">
            {t('locationPermissionMessage')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Benefits of allowing location */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Navigation className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">توصيل دقيق وسريع</h4>
                <p className="text-sm text-green-700">
                  سيتمكن السائق من الوصول إليك بسهولة وتوصيل طلبك في أسرع وقت
                </p>
              </div>
            </div>
          </div>

          {/* Warning for denying */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 mb-1">بدون موقع GPS</h4>
                <p className="text-sm text-orange-700">
                  ستحتاج لإدخال العنوان يدوياً وقد يستغرق التوصيل وقتاً أطول
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAllowLocation}
              disabled={isGettingLocation}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 rounded-lg transition-all duration-200"
            >
              <Navigation className={`h-4 w-4 ml-2 ${isGettingLocation ? 'animate-spin' : ''}`} />
              {isGettingLocation ? t('gettingLocation') : t('allowLocationAccess')}
            </Button>
            <Button
              onClick={handleDenyLocation}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg"
            >
              إدخال العنوان يدوياً
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
          يمكنك تغيير إعدادات الموقع لاحقاً من إعدادات المتصفح
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionDialog;