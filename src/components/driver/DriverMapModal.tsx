import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Navigation, MapPin, ExternalLink } from 'lucide-react';
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

interface DriverMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerLocation: Location;
  customerName: string;
  orderInfo: {
    id: number;
    type: string;
    quantity: number;
    address: string;
  };
}

const DriverMapModal = ({ isOpen, onClose, customerLocation, customerName, orderInfo }: DriverMapModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setMapError(null);

    const initMap = async () => {
      try {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        if (!mapContainer.current) {
          setMapError('عنصر الخريطة غير موجود');
          setIsLoading(false);
          return;
        }

        // Initialize map centered on customer location
        const mapInstance = L.map(mapContainer.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true
        }).setView([customerLocation.lat, customerLocation.lng], 15);

        // Add OpenStreetMap tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 1,
          crossOrigin: true
        });

        tileLayer.on('load', () => {
          setIsLoading(false);
          setMapError(null);
        });

        tileLayer.on('tileerror', () => {
          setMapError('فشل في تحميل الخريطة');
          setIsLoading(false);
        });

        tileLayer.addTo(mapInstance);

        // Customer marker (red)
        const customerIcon = L.divIcon({
          html: '<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; border: 3px solid white; transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
          className: 'customer-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
          .addTo(mapInstance)
          .bindPopup(`
            <div style="text-align: center; font-family: Arial;">
              <strong>${customerName}</strong><br/>
              <small>${orderInfo.type} × ${orderInfo.quantity}</small><br/>
              <small>${orderInfo.address}</small>
            </div>
          `);

        map.current = mapInstance;

        // Try to get driver's current location
        getCurrentDriverLocation();

      } catch (error) {
        console.error('Error loading map:', error);
        setMapError('خطأ في تحميل الخريطة');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, customerLocation]);

  const getCurrentDriverLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const driverLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(driverLoc);

        if (map.current) {
          // Driver marker (blue)
          const driverIcon = L.divIcon({
            html: '<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><div style="background: white; width: 8px; height: 8px; border-radius: 50%;"></div></div>',
            className: 'driver-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker([driverLoc.lat, driverLoc.lng], { icon: driverIcon })
            .addTo(map.current)
            .bindPopup('<div style="text-align: center;"><strong>موقعك الحالي</strong></div>');

          // Add route line
          const routeLine = L.polyline([
            [driverLoc.lat, driverLoc.lng],
            [customerLocation.lat, customerLocation.lng]
          ], {
            color: '#f97316',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10'
          }).addTo(map.current);

          // Fit map to show both markers
          const group = new L.FeatureGroup([
            L.marker([driverLoc.lat, driverLoc.lng]),
            L.marker([customerLocation.lat, customerLocation.lng])
          ]);
          map.current.fitBounds(group.getBounds().pad(0.1));
        }
      },
      (error) => {
        console.warn('Could not get driver location:', error);
      }
    );
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${customerLocation.lat},${customerLocation.lng}`;
    window.open(url, '_blank');
  };

  const openInOpenStreetMap = () => {
    const url = `https://www.openstreetmap.org/directions?from=&to=${customerLocation.lat}%2C${customerLocation.lng}#map=16/${customerLocation.lat}/${customerLocation.lng}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full p-0">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <DialogHeader className="bg-white border-b border-gray-200 p-4">
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
                خريطة التوجه - طلب #{orderInfo.id}
              </DialogTitle>
              <div className="w-10" />
            </div>
          </DialogHeader>

          {/* Map Container */}
          <div className="flex-1 relative" style={{ height: '500px' }}>
            <div ref={mapContainer} className="w-full h-full" />
            
            {isLoading && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
                <div className="text-center p-6">
                  <X className="h-16 w-16 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600 mb-4">{mapError}</p>
                  <Button onClick={() => window.location.reload()}>
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              <Button
                onClick={openInGoogleMaps}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 ml-1" />
                فتح في خرائط جوجل
              </Button>
              
              <Button
                onClick={openInOpenStreetMap}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 ml-1" />
                فتح في OpenStreetMap
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 z-30">
              <div className="text-sm font-medium text-gray-900 mb-2">دليل الخريطة:</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  <span>موقع العميل</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                  <span>موقعك الحالي</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 6px, transparent 6px, transparent 12px)' }}></div>
                  <span>المسار المقترح</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverMapModal;