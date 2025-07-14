import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Navigation, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LeafletLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const LeafletLocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation }: LeafletLocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const [addressText, setAddressText] = useState('');
  const { toast } = useToast();

  // Default location (Dohuk, Iraq)
  const defaultLocation = { lat: 36.8619, lng: 42.9788 };

  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    const initMap = () => {
      try {
        // Initialize map
        const mapInstance = L.map(mapContainer.current!).setView(
          [selectedLocation?.lat || defaultLocation.lat, selectedLocation?.lng || defaultLocation.lng], 
          16
        );

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstance);

        // Create custom marker icon
        const customIcon = L.divIcon({
          html: '<div style="background-color: #f97316; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; border: 3px solid white; transform: rotate(-45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          className: 'custom-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        // Add draggable marker
        const markerInstance = L.marker(
          [selectedLocation?.lat || defaultLocation.lat, selectedLocation?.lng || defaultLocation.lng],
          { 
            draggable: true,
            icon: customIcon
          }
        ).addTo(mapInstance);

        // Add map click handler
        mapInstance.on('click', (e) => {
          const location = {
            lat: e.latlng.lat,
            lng: e.latlng.lng
          };
          updateLocation(location, mapInstance, markerInstance);
        });

        // Add marker drag handler
        markerInstance.on('dragend', (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          const location = {
            lat: position.lat,
            lng: position.lng
          };
          updateLocation(location, mapInstance, markerInstance);
        });

        map.current = mapInstance;
        marker.current = markerInstance;
        setIsLoading(false);

        if (selectedLocation) {
          updateLocation(selectedLocation, mapInstance, markerInstance);
        }

      } catch (error) {
        console.error('Error loading map:', error);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: "تعذر تحميل الخريطة. يرجى المحاولة مرة أخرى.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen]);

  const updateLocation = async (location: Location, mapInstance: L.Map, markerInstance: L.Marker) => {
    try {
      // Update marker position
      markerInstance.setLatLng([location.lat, location.lng]);
      mapInstance.panTo([location.lat, location.lng]);

      // Reverse geocoding using Nominatim API
      try {
        const geocodingResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=ar&addressdetails=1`
        );
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          if (geocodingData.display_name) {
            const address = geocodingData.display_name;
            const locationWithAddress = { ...location, address };
            setSelectedLocation(locationWithAddress);
            setAddressText(address);
            return;
          }
        }
      } catch (geocodingError) {
        console.warn('Geocoding failed:', geocodingError);
      }
      
      // Fallback without address
      setSelectedLocation(location);
      setAddressText(`خط العرض: ${location.lat.toFixed(6)}, خط الطول: ${location.lng.toFixed(6)}`);
      
    } catch (error) {
      console.error('Error updating location:', error);
      setSelectedLocation(location);
      setAddressText(`خط العرض: ${location.lat.toFixed(6)}, خط الطول: ${location.lng.toFixed(6)}`);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "خطأ في الموقع",
        description: "متصفحك لا يدعم خدمة تحديد الموقع",
        variant: "destructive"
      });
      return;
    }

    setIsGettingCurrentLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        if (map.current && marker.current) {
          updateLocation(location, map.current, marker.current);
        }
        
        setIsGettingCurrentLocation(false);
        toast({
          title: "تم تحديد موقعك",
          description: "تم تحديد موقعك الحالي على الخريطة",
        });
      },
      (error) => {
        setIsGettingCurrentLocation(false);
        toast({
          title: "لم نتمكن من تحديد موقعك تلقائيًا",
          description: "يرجى تحديده يدويًا على الخريطة",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
      toast({
        title: "تم تأكيد الموقع",
        description: "تم حفظ موقعك بنجاح",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 m-0">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                يرجى تحديد موقع التوصيل
              </DialogTitle>
              <div className="w-10" /> {/* Spacer */}
            </div>
          </DialogHeader>

          {/* Map Container */}
          <div className="flex-1 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الخريطة...</p>
                </div>
              </div>
            ) : (
              <div ref={mapContainer} className="w-full h-full" />
            )}

            {/* Current Location Button */}
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingCurrentLocation}
              className="absolute bottom-32 right-4 h-12 w-12 rounded-full bg-white shadow-lg border border-gray-300 hover:bg-gray-50"
              variant="ghost"
              size="icon"
            >
              <Navigation className={`h-6 w-6 text-gray-700 ${isGettingCurrentLocation ? 'animate-pulse' : ''}`} />
            </Button>
          </div>

          {/* Location Info Tooltip */}
          {selectedLocation && addressText && (
            <div className="absolute top-20 left-4 right-4 z-10">
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm mx-auto">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">سيتم توصيل طلبك هنا</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="space-y-4">
              {/* Location Display */}
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mt-1">
                  <div className="h-2 w-2 rounded-full bg-gray-600"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {addressText || 'اختر موقعاً على الخريطة'}
                  </p>
                  {selectedLocation && (
                    <p className="text-sm text-gray-500 mt-1">
                      خط العرض: {selectedLocation.lat.toFixed(6)}, خط الطول: {selectedLocation.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={getCurrentLocation}
                  disabled={isGettingCurrentLocation}
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                >
                  {isGettingCurrentLocation ? 'جاري تحديد الموقع...' : 'تحديد موقعي الحالي'}
                </Button>
                
                <Button
                  onClick={handleConfirmLocation}
                  disabled={!selectedLocation}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg font-medium rounded-lg"
                >
                  تأكيد الموقع
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeafletLocationPicker;