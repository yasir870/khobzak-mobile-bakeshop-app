import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MapboxLocationPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  className?: string;
}

const MapboxLocationPicker = ({ onLocationSelect, initialLocation, className }: MapboxLocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  const { toast } = useToast();

  // Default location (Baghdad, Iraq)
  const defaultLocation = { lat: 33.3128, lng: 44.3615 };

  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapContainer.current) return;

        // Get Mapbox API key from Supabase Edge Function
        const response = await fetch(`https://lakvfrohnlinfcqfwkqq.supabase.co/functions/v1/get-mapbox-key`, {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxha3Zmcm9obmxpbmZjcWZ3a3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODQyNDcsImV4cCI6MjA2NTE2MDI0N30.Cohs36ZVp5vb-CfxsLkF51GyuMf_nhBDTjKqYKgi9b0`,
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to get Mapbox API key');
        }
        
        const { apiKey } = await response.json();
        
        if (!apiKey) {
          throw new Error('Mapbox API key not configured');
        }

        // Set Mapbox access token
        mapboxgl.accessToken = apiKey;

        // Initialize map
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [selectedLocation?.lng || defaultLocation.lng, selectedLocation?.lat || defaultLocation.lat],
          zoom: 15,
          language: 'ar'
        });

        // Create draggable marker
        const markerInstance = new mapboxgl.Marker({
          draggable: true,
          color: '#f97316'
        })
        .setLngLat([selectedLocation?.lng || defaultLocation.lng, selectedLocation?.lat || defaultLocation.lat])
        .addTo(mapInstance);

        // Add map click handler
        mapInstance.on('click', (e) => {
          const location = {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          };
          updateLocation(location, mapInstance, markerInstance);
        });

        // Add marker drag handler
        markerInstance.on('dragend', () => {
          const lngLat = markerInstance.getLngLat();
          const location = {
            lat: lngLat.lat,
            lng: lngLat.lng
          };
          updateLocation(location, mapInstance, markerInstance);
        });

        map.current = mapInstance;
        marker.current = markerInstance;
        setIsLoading(false);

        // If we have an initial location, use it
        if (selectedLocation) {
          updateLocation(selectedLocation, mapInstance, markerInstance);
        }

      } catch (error) {
        console.error('Error loading Mapbox:', error);
        toast({
          title: "خطأ في تحميل الخريطة",
          description: error.message === 'Mapbox API key not configured' 
            ? "مفتاح Mapbox غير مُعيّن. يرجى إضافة المفتاح في إعدادات المشروع."
            : "تعذر تحميل الخريطة. تأكد من إعداد مفتاح API بشكل صحيح.",
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
      }
    };
  }, []);

  const updateLocation = async (location: Location, mapInstance: mapboxgl.Map, markerInstance: mapboxgl.Marker) => {
    try {
      // Update marker position
      markerInstance.setLngLat([location.lng, location.lat]);
      mapInstance.panTo([location.lng, location.lat]);

      // Reverse geocoding to get address
      try {
        const geocodingResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${mapboxgl.accessToken}&language=ar`
        );
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          if (geocodingData.features && geocodingData.features.length > 0) {
            const address = geocodingData.features[0].place_name;
            const locationWithAddress = { ...location, address };
            setSelectedLocation(locationWithAddress);
            onLocationSelect(locationWithAddress);
            return;
          }
        }
      } catch (geocodingError) {
        console.warn('Geocoding failed:', geocodingError);
      }
      
      // Fallback without address
      setSelectedLocation(location);
      onLocationSelect(location);
      
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
          يرجى تحديد موقع التوصيل
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
              ref={mapContainer} 
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

export default MapboxLocationPicker;