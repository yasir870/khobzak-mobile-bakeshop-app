
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface GoogleMapPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  className?: string;
}

const GoogleMapPicker = ({ onLocationSelect, initialLocation, className }: GoogleMapPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const { toast } = useToast();

  // Default location (Baghdad, Iraq)
  const defaultLocation = { lat: 33.3128, lng: 44.3615 };

  useEffect(() => {
    const initMap = async () => {
      try {
        // Get API key from environment or use a placeholder
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
        
        if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
          console.error('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your environment.');
          toast({
            title: "خطأ في إعداد الخريطة",
            description: "مفتاح Google Maps غير مُعيّن. يرجى إضافة المفتاح في إعدادات المشروع.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
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
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        // Create marker
        const markerInstance = new google.maps.Marker({
          position: selectedLocation || defaultLocation,
          map: mapInstance,
          draggable: true,
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

        // If we have an initial location, use it
        if (selectedLocation) {
          updateLocation(selectedLocation, mapInstance, markerInstance);
        }

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: "تعذر تحميل خريطة Google. تأكد من إعداد مفتاح API بشكل صحيح.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  const updateLocation = async (location: Location, mapInstance: google.maps.Map, markerInstance: google.maps.Marker) => {
    try {
      // Update marker position
      markerInstance.setPosition(location);
      mapInstance.panTo(location);

      // Try to get address from coordinates (reverse geocoding)
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          const locationWithAddress = { ...location, address };
          setSelectedLocation(locationWithAddress);
          onLocationSelect(locationWithAddress);
        } else {
          setSelectedLocation(location);
          onLocationSelect(location);
        }
      });
    } catch (error) {
      console.error('Error updating location:', error);
      setSelectedLocation(location);
      onLocationSelect(location);
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
        let errorMessage = "حدث خطأ في تحديد الموقع";
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن الوصول للموقع";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "معلومات الموقع غير متوفرة";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب تحديد الموقع";
            break;
        }
        
        toast({
          title: "تعذر تحديد الموقع",
          description: errorMessage,
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-amber-800 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          حدد موقع التوصيل على الخريطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-amber-600" />
              <p className="text-sm text-gray-600">جاري تحميل الخريطة...</p>
            </div>
          </div>
        ) : (
          <>
            <div 
              ref={mapRef} 
              className="h-80 w-full rounded-lg border border-amber-200"
              style={{ minHeight: '320px' }}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={getCurrentLocation}
                disabled={isGettingCurrentLocation}
                variant="outline"
                size="sm"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Navigation className={`h-4 w-4 ml-2 ${isGettingCurrentLocation ? 'animate-pulse' : ''}`} />
                {isGettingCurrentLocation ? 'جاري التحديد...' : 'موقعي الحالي'}
              </Button>
            </div>
            
            {selectedLocation && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">الموقع المحدد:</span>
                </div>
                {selectedLocation.address ? (
                  <p className="text-sm text-green-600">{selectedLocation.address}</p>
                ) : (
                  <p className="text-sm text-green-600">
                    خط العرض: {selectedLocation.lat.toFixed(6)}, خط الطول: {selectedLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-amber-600">
              💡 انقر على الخريطة أو اسحب العلامة لتحديد الموقع بدقة
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleMapPicker;
