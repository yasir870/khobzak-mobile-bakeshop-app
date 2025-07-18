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
  const [mapError, setMapError] = useState<string | null>(null);
  const { toast } = useToast();

  // Default location (Dohuk, Iraq)
  const defaultLocation = { lat: 36.8619, lng: 42.9788 };

  useEffect(() => {
    if (!isOpen) return;

    // Reset states when dialog opens
    setIsLoading(true);
    setMapError(null);

    const initMap = async () => {
      try {
        // Cleanup any existing map
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!mapContainer.current) {
          const error = 'عنصر الخريطة غير موجود';
          console.error('Map container not found');
          setMapError(error);
          setIsLoading(false);
          return;
        }

        console.log('Initializing Leaflet map...');

        // Initialize map
        const mapInstance = L.map(mapContainer.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true
        }).setView(
          [selectedLocation?.lat || defaultLocation.lat, selectedLocation?.lng || defaultLocation.lng], 
          16
        );

        console.log('Map instance created, adding tiles...');

        // Add OpenStreetMap tiles with better error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 1,
          crossOrigin: true
        });

        let tilesLoaded = false;
        let tileErrorCount = 0;

        tileLayer.on('loading', () => {
          console.log('Tiles loading...');
        });

        tileLayer.on('load', () => {
          console.log('Tiles loaded successfully');
          tilesLoaded = true;
          setTimeout(() => {
            if (tilesLoaded) {
              setIsLoading(false);
              setMapError(null);
            }
          }, 1000);
        });

        tileLayer.on('tileerror', (error) => {
          console.warn('Tile error:', error);
          tileErrorCount++;
          if (tileErrorCount > 5) {
            setMapError('فشل في تحميل بلاطات الخريطة. تحقق من اتصالك بالإنترنت.');
            setIsLoading(false);
          }
        });

        // Timeout for loading
        setTimeout(() => {
          if (!tilesLoaded) {
            setMapError('انتهت مهلة تحميل الخريطة. يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
          }
        }, 15000);

        tileLayer.addTo(mapInstance);

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

        if (selectedLocation) {
          updateLocation(selectedLocation, mapInstance, markerInstance);
        }

        console.log('Map initialization completed');

      } catch (error) {
        console.error('Error loading map:', error);
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف في تحميل الخريطة';
        setMapError(`خطأ في الخريطة: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map.current) {
        console.log('Cleaning up map...');
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
            <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
            {isLoading && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
                <div className="text-center p-6 max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">خطأ في تحميل الخريطة</h3>
                  <p className="text-red-600 mb-4">{mapError}</p>
                  <Button 
                    onClick={() => {
                      setMapError(null);
                      setIsLoading(true);
                      // Re-trigger map initialization
                      setTimeout(() => {
                        const event = new CustomEvent('retry-map');
                        window.dispatchEvent(event);
                      }, 100);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}

            {/* Control Buttons - Top Right with higher z-index */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              {/* Current Location Button */}
              <Button
                onClick={getCurrentLocation}
                disabled={isGettingCurrentLocation}
                className="h-12 w-12 rounded-full bg-white shadow-xl border-2 border-gray-300 hover:bg-gray-50 hover:shadow-2xl transition-all duration-200"
                variant="ghost"
                size="icon"
                title="تحديد موقعي الحالي"
                style={{ zIndex: 1001 }}
              >
                <Navigation className={`h-6 w-6 text-gray-700 ${isGettingCurrentLocation ? 'animate-pulse' : ''}`} />
              </Button>
              
              {/* Confirm Location Button */}
              <Button
                onClick={handleConfirmLocation}
                disabled={!selectedLocation}
                className="h-12 px-4 bg-orange-500 hover:bg-orange-600 text-white shadow-xl rounded-lg font-medium whitespace-nowrap hover:shadow-2xl transition-all duration-200"
                title="تأكيد الموقع"
                style={{ zIndex: 1001 }}
              >
                <MapPin className="h-5 w-5 ml-1" />
                تأكيد
              </Button>
            </div>

            {/* Instruction Text - Only show if no location selected */}
            {!selectedLocation && (
              <div className="absolute top-4 left-4 right-32 z-[999]">
                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">اختر موقعاً على الخريطة</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status Panel - Only show address, no confirmation message */}
            {selectedLocation && addressText && (
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 z-30">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center mt-1">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {addressText}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeafletLocationPicker;