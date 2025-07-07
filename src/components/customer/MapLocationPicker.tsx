
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Search, Navigation, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const MapLocationPicker = ({ isOpen, onClose, onLocationSelect, initialLocation }: MapLocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const [addressText, setAddressText] = useState('');
  const { toast } = useToast();

  // Default location (Dohuk, Iraq)
  const defaultLocation = { lat: 36.8619, lng: 42.9788 };

  useEffect(() => {
    if (!isOpen) return;

    const initMap = async () => {
      try {
        // Get API key from Supabase Edge Function
        const response = await fetch(`https://lakvfrohnlinfcqfwkqq.supabase.co/functions/v1/get-google-maps-key`, {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxha3Zmcm9obmxpbmZjcWZ3a3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODQyNDcsImV4cCI6MjA2NTE2MDI0N30.Cohs36ZVp5vb-CfxsLkF51GyuMf_nhBDTjKqYKgi9b0`,
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to get Google Maps API key');
        }
        
        const { apiKey } = await response.json();
        
        if (!apiKey) {
          throw new Error('Google Maps API key not configured');
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: selectedLocation || defaultLocation,
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER
          },
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        // Create custom marker
        const markerInstance = new google.maps.Marker({
          position: selectedLocation || defaultLocation,
          map: mapInstance,
          draggable: true,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 30 20 30s20-15 20-30C40 8.954 31.046 0 20 0z" fill="#FF4500"/>
                <circle cx="20" cy="20" r="8" fill="white"/>
                <circle cx="20" cy="20" r="4" fill="#FF4500"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50)
          },
          title: 'اسحب لتحديد الموقع'
        });

        // Add click listener to map
        mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const location = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            updateLocation(location, mapInstance, markerInstance);
          }
        });

        // Add drag listener to marker
        markerInstance.addListener('dragend', () => {
          const position = markerInstance.getPosition();
          if (position) {
            const location = {
              lat: position.lat(),
              lng: position.lng()
            };
            updateLocation(location, mapInstance, markerInstance);
          }
        });

        setMap(mapInstance);
        setMarker(markerInstance);
        setIsLoading(false);

        if (selectedLocation) {
          updateLocation(selectedLocation, mapInstance, markerInstance);
        }

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: error.message === 'Google Maps API key not configured' 
            ? "مفتاح Google Maps غير مُعيّن. يرجى إضافة المفتاح في إعدادات المشروع."
            : "تعذر تحميل خريطة Google. تأكد من إعداد مفتاح API بشكل صحيح.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initMap();
  }, [isOpen]);

  const updateLocation = async (location: Location, mapInstance: google.maps.Map, markerInstance: google.maps.Marker) => {
    try {
      markerInstance.setPosition(location);
      mapInstance.panTo(location);

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          const locationWithAddress = { ...location, address };
          setSelectedLocation(locationWithAddress);
          setAddressText(address);
        } else {
          setSelectedLocation(location);
          setAddressText(`خط العرض: ${location.lat.toFixed(6)}, خط الطول: ${location.lng.toFixed(6)}`);
        }
      });
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
        
        if (map && marker) {
          updateLocation(location, map, marker);
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
          title: "تعذر تحديد الموقع",
          description: "تعذر الوصول إلى موقعك الحالي",
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
                عنوان التوصيل
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
              >
                <Search className="h-5 w-5" />
              </Button>
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
              <div ref={mapRef} className="w-full h-full" />
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

              {/* Confirm Button */}
              <Button
                onClick={handleConfirmLocation}
                disabled={!selectedLocation}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg font-medium rounded-lg"
              >
                تأكيد موقع الدبوس
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapLocationPicker;
