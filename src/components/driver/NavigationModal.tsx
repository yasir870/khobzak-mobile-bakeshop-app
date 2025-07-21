import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Navigation, MapPin, Clock, Route, Phone, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  duration: string;
  type: string;
}

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerLocation: Location;
  customerName: string;
  customerPhone?: string;
  orderInfo: {
    id: number;
    type: string;
    quantity: number;
    address: string;
    totalPrice: number;
  };
}

const NavigationModal = ({
  isOpen,
  onClose,
  customerLocation,
  customerName,
  customerPhone,
  orderInfo
}: NavigationModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '' });
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const initMap = async () => {
      try {
        // Cleanup existing map
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        setIsLoading(true);
        setMapError(null);

        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 300));

        if (!mapContainer.current) {
          setMapError('عنصر الخريطة غير موجود');
          setIsLoading(false);
          return;
        }

        console.log('Initializing navigation map...');

        // Initialize map
        const mapInstance = L.map(mapContainer.current, {
          zoomControl: false,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true
        }).setView([customerLocation.lat, customerLocation.lng], 16);

        // Add custom zoom control
        L.control.zoom({
          position: 'bottomright'
        }).addTo(mapInstance);

        // Add OpenStreetMap tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 1
        });

        let tilesLoaded = false;

        tileLayer.on('load', () => {
          console.log('Navigation map tiles loaded');
          tilesLoaded = true;
          setTimeout(() => {
            if (tilesLoaded) {
              setIsLoading(false);
              setMapError(null);
            }
          }, 500);
        });

        tileLayer.on('tileerror', (error) => {
          console.warn('Navigation tile error:', error);
          setMapError('فشل في تحميل الخريطة');
          setIsLoading(false);
        });

        // Timeout for loading
        setTimeout(() => {
          if (!tilesLoaded) {
            setMapError('انتهت مهلة تحميل الخريطة');
            setIsLoading(false);
          }
        }, 10000);

        tileLayer.addTo(mapInstance);

        // Customer marker (destination)
        const destinationIcon = L.divIcon({
          html: `<div style="
            background-color: #dc2626; 
            width: 20px; 
            height: 20px; 
            border-radius: 50% 50% 50% 0; 
            border: 2px solid white; 
            transform: rotate(-45deg); 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
          "></div>`,
          className: 'destination-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 20]
        });

        L.marker([customerLocation.lat, customerLocation.lng], {
          icon: destinationIcon
        }).addTo(mapInstance).bindPopup(`
          <div style="text-align: right; font-family: Arial; padding: 8px; direction: rtl;">
            <strong style="color: #1f2937;">${customerName}</strong><br/>
            <div style="margin: 4px 0; color: #6b7280; font-size: 12px;">
              ${orderInfo.type} × ${orderInfo.quantity}<br/>
              ${orderInfo.totalPrice} د.ع
            </div>
          </div>
        `);

        map.current = mapInstance;

        // Get current location and calculate route
        getCurrentLocationAndCalculateRoute();

      } catch (error) {
        console.error('Error initializing navigation map:', error);
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

  const getCurrentLocationAndCalculateRoute = () => {
    if (!navigator.geolocation) {
      toast({
        title: "الموقع غير مدعوم",
        description: "متصفحك لا يدعم خدمات الموقع",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const driverLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(driverLoc);

        if (map.current) {
          // Driver marker (start point)
          const startIcon = L.divIcon({
            html: `<div style="
              background-color: #16a34a; 
              width: 16px; 
              height: 16px; 
              border-radius: 50%; 
              border: 2px solid white; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'start-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          L.marker([driverLoc.lat, driverLoc.lng], {
            icon: startIcon
          }).addTo(map.current).bindPopup(`
            <div style="text-align: center; font-family: Arial;">
              <strong>موقعك الحالي</strong>
            </div>
          `);
        }

        // Calculate route
        calculateRoute(driverLoc);
      },
      (error) => {
        console.warn('Could not get current location:', error);
        toast({
          title: "لم يتم العثور على موقعك",
          description: "سيتم عرض الوجهة فقط",
          variant: "destructive"
        });
      }
    );
  };

  const calculateRoute = async (startLocation: Location) => {
    setIsCalculatingRoute(true);
    
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLocation.lng},${startLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full&language=ar`
      );
      
      if (!response.ok) {
        throw new Error('فشل في حساب المسار');
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const steps = route.legs[0].steps;
        
        // Convert instructions to Arabic
        const arabicSteps = steps.map((step: any, index: number) => ({
          instruction: translateInstruction(step.maneuver.type, step.name || ''),
          distance: formatDistance(step.distance),
          duration: formatDuration(step.duration),
          type: step.maneuver.type
        }));
        
        setNavigationSteps(arabicSteps);
        setRouteInfo({
          distance: formatDistance(route.distance),
          duration: formatDuration(route.duration)
        });
        
        // Draw route on map
        if (map.current) {
          const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          
          // Remove existing route
          map.current.eachLayer((layer) => {
            if (layer instanceof L.Polyline && layer.options.className === 'navigation-route') {
              map.current?.removeLayer(layer);
            }
          });
          
          // Add new route
          const routeLine = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 6,
            opacity: 0.8,
            className: 'navigation-route'
          }).addTo(map.current);
          
          // Fit map to show route
          map.current.fitBounds(routeLine.getBounds().pad(0.1));
        }
        
        toast({
          title: "تم حساب المسار",
          description: `${formatDistance(route.distance)} - ${formatDuration(route.duration)}`
        });
      }
      
    } catch (error) {
      console.error('Route calculation error:', error);
      toast({
        title: "خطأ في حساب المسار",
        description: "فشل في الحصول على تعليمات التوجه",
        variant: "destructive"
      });
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const translateInstruction = (type: string, streetName: string): string => {
    const translations: { [key: string]: string } = {
      'depart': `ابدأ الرحلة${streetName ? ` على ${streetName}` : ''}`,
      'turn-right': `انعطف يميناً${streetName ? ` إلى ${streetName}` : ''}`,
      'turn-left': `انعطف يساراً${streetName ? ` إلى ${streetName}` : ''}`,
      'turn-slight-right': `انعطف قليلاً يميناً${streetName ? ` إلى ${streetName}` : ''}`,
      'turn-slight-left': `انعطف قليلاً يساراً${streetName ? ` إلى ${streetName}` : ''}`,
      'turn-sharp-right': `انعطف بحدة يميناً${streetName ? ` إلى ${streetName}` : ''}`,
      'turn-sharp-left': `انعطف بحدة يساراً${streetName ? ` إلى ${streetName}` : ''}`,
      'straight': `استمر مباشرة${streetName ? ` على ${streetName}` : ''}`,
      'arrive': 'وصلت إلى الوجهة',
      'merge': `اندمج${streetName ? ` مع ${streetName}` : ''}`,
      'roundabout-enter': `ادخل إلى الدوار${streetName ? ` متجهاً إلى ${streetName}` : ''}`,
      'roundabout-exit': `اخرج من الدوار${streetName ? ` إلى ${streetName}` : ''}`
    };
    
    return translations[type] || `${type}${streetName ? ` - ${streetName}` : ''}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} متر`;
    } else {
      return `${(meters / 1000).toFixed(1)} كم`;
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} ساعة${remainingMinutes > 0 ? ` و ${remainingMinutes} دقيقة` : ''}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[100vh] w-full h-full p-0 m-0">
        <div className="relative w-full h-full flex">
          {/* Navigation Panel */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-10">
            {/* Header */}
            <DialogHeader className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Route className="h-5 w-5 text-blue-600" />
                  التوجه إلى العميل
                </DialogTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            {/* Route Info */}
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">من موقعك الحالي</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full transform rotate-45"></div>
                <span className="text-sm text-gray-900 font-medium">{customerName}</span>
              </div>
              
              {routeInfo.distance && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">{routeInfo.distance}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">{routeInfo.duration}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Steps */}
            <div className="flex-1 overflow-y-auto">
              {isCalculatingRoute ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">جاري حساب المسار...</p>
                  </div>
                </div>
              ) : navigationSteps.length > 0 ? (
                <div className="p-4 space-y-3">
                  <h3 className="font-medium text-gray-900 mb-3">تعليمات التوجه</h3>
                  {navigationSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium text-xs flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium mb-1">
                          {step.instruction}
                        </div>
                        <div className="text-xs text-gray-500">
                          {step.distance}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      {currentLocation ? 'جاري حساب المسار...' : 'امنح إذن الموقع لعرض التعليمات'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Info & Actions */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-sm space-y-2">
                <div><strong>الطلب:</strong> {orderInfo.type} × {orderInfo.quantity}</div>
                <div><strong>المبلغ:</strong> {orderInfo.totalPrice} د.ع</div>
                {customerPhone && (
                  <Button 
                    onClick={() => window.open(`tel:${customerPhone}`, '_self')} 
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Phone className="h-4 w-4 ml-1" />
                    اتصل بالعميل
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationModal;