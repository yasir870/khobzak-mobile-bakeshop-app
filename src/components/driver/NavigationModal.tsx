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
    if (!isOpen) {
      // Clean up when modal closes
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      return;
    }

    const initMap = async () => {
      try {
        // Cleanup existing map first
        if (map.current) {
          map.current.remove();
          map.current = null;
        }

        // Clear the container innerHTML to ensure clean state
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        setIsLoading(true);
        setMapError(null);

        // Wait for DOM to be ready and container to be cleared
        await new Promise(resolve => setTimeout(resolve, 100));

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
        let loadingTimeout: NodeJS.Timeout;

        const handleTileLoad = () => {
          console.log('Navigation map tiles loaded');
          tilesLoaded = true;
          if (loadingTimeout) clearTimeout(loadingTimeout);
          setTimeout(() => {
            if (tilesLoaded && map.current) {
              setIsLoading(false);
              setMapError(null);
            }
          }, 300);
        };

        const handleTileError = (error: any) => {
          console.warn('Navigation tile error:', error);
          if (loadingTimeout) clearTimeout(loadingTimeout);
          setMapError('فشل في تحميل الخريطة');
          setIsLoading(false);
        };

        tileLayer.on('load', handleTileLoad);
        tileLayer.on('tileerror', handleTileError);

        // Timeout for loading
        loadingTimeout = setTimeout(() => {
          if (!tilesLoaded) {
            setMapError('انتهت مهلة تحميل الخريطة');
            setIsLoading(false);
          }
        }, 8000);

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

    // Prevent multiple initializations
    let initializationTimeout: NodeJS.Timeout;
    
    if (isOpen) {
      initializationTimeout = setTimeout(initMap, 50);
    }

    return () => {
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      // Only remove map when component unmounts completely
      if (!isOpen && map.current) {
        try {
          map.current.remove();
          map.current = null;
        } catch (error) {
          console.warn('Error removing map:', error);
        }
      }
    };
  }, [isOpen, customerLocation.lat, customerLocation.lng]);

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
      // Use multiple route services as fallbacks
      const routeServices = [
        `https://router.project-osrm.org/route/v1/driving/${startLocation.lng},${startLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLocation.lng},${startLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full`
      ];
      
      let response;
      let data;
      
      for (const serviceUrl of routeServices) {
        try {
          console.log('Trying route service:', serviceUrl);
          response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            data = await response.json();
            if (data.routes && data.routes.length > 0) {
              console.log('Route calculated successfully');
              break;
            }
          }
        } catch (serviceError) {
          console.warn('Route service failed:', serviceError);
          continue;
        }
      }
      
      if (!data || !data.routes || data.routes.length === 0) {
        throw new Error('لم يتم العثور على مسار');
      }
      
      const route = data.routes[0];
      const steps = route.legs && route.legs[0] && route.legs[0].steps ? route.legs[0].steps : [];
      
      // Convert instructions to Arabic
      const arabicSteps = steps.map((step: any, index: number) => ({
        instruction: translateInstruction(step.maneuver?.type || 'straight', step.name || ''),
        distance: formatDistance(step.distance || 0),
        duration: formatDuration(step.duration || 0),
        type: step.maneuver?.type || 'straight'
      }));
      
      setNavigationSteps(arabicSteps);
      setRouteInfo({
        distance: formatDistance(route.distance || 0),
        duration: formatDuration(route.duration || 0)
      });
      
      // Draw route on map
      if (map.current && route.geometry) {
        try {
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
        } catch (mapError) {
          console.warn('Error drawing route on map:', mapError);
        }
      }
      
      toast({
        title: "تم حساب المسار",
        description: `${formatDistance(route.distance || 0)} - ${formatDuration(route.duration || 0)}`
      });
      
    } catch (error) {
      console.error('Route calculation error:', error);
      
      // Show fallback simple route if available
      if (currentLocation && map.current) {
        try {
          // Draw a simple straight line as fallback
          const straightLine = L.polyline([
            [currentLocation.lat, currentLocation.lng],
            [customerLocation.lat, customerLocation.lng]
          ], {
            color: '#dc2626',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            className: 'fallback-route'
          }).addTo(map.current);
          
          map.current.fitBounds(straightLine.getBounds().pad(0.1));
          
          // Calculate simple distance
          const distance = map.current.distance(
            [currentLocation.lat, currentLocation.lng],
            [customerLocation.lat, customerLocation.lng]
          );
          
          setRouteInfo({
            distance: formatDistance(distance),
            duration: 'غير محدد'
          });
          
          setNavigationSteps([{
            instruction: `توجه مباشرة إلى ${customerName}`,
            distance: formatDistance(distance),
            duration: 'غير محدد',
            type: 'straight'
          }]);
          
          toast({
            title: "تم عرض مسار تقريبي",
            description: "لم يتم الحصول على تعليمات مفصلة",
            variant: "default"
          });
        } catch (fallbackError) {
          console.error('Fallback route error:', fallbackError);
          toast({
            title: "خطأ في حساب المسار",
            description: "تعذر الحصول على أي معلومات للمسار",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "خطأ في حساب المسار",
          description: "تأكد من تفعيل الموقع وإعادة المحاولة",
          variant: "destructive"
        });
      }
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

  const getStepIcon = (type: string, index: number) => {
    const iconClass = "h-4 w-4";
    if (type === 'depart') return <Navigation className={iconClass} />;
    if (type === 'arrive') return <MapPin className={iconClass} />;
    if (type.includes('right')) return <span className="text-xs font-bold">↗</span>;
    if (type.includes('left')) return <span className="text-xs font-bold">↖</span>;
    if (type === 'roundabout-enter' || type === 'roundabout-exit') return <span className="text-xs font-bold">⟳</span>;
    return <span className="font-bold text-sm">{index + 1}</span>;
  };

  const getStepColor = (type: string, index: number, total: number) => {
    if (index === 0) return 'bg-emerald-500';
    if (index === total - 1) return 'bg-red-500';
    return 'bg-primary';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[100vh] w-full h-full p-0 m-0 overflow-hidden">
        <div className="relative w-full h-full flex flex-row-reverse">
          {/* Navigation Panel - Right Side for RTL */}
          <div className="w-[380px] bg-gradient-to-b from-card to-secondary/30 border-r border-border flex flex-col z-10 shadow-xl">
            {/* Header with gradient */}
            <DialogHeader className="border-b border-border bg-gradient-to-r from-primary to-primary/80 p-5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-primary-foreground flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Route className="h-5 w-5" />
                  </div>
                  التوجه إلى العميل
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="h-9 w-9 text-primary-foreground hover:bg-white/20 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>

            {/* Location Indicators */}
            <div className="p-5 border-b border-border bg-card">
              <div className="space-y-4">
                {/* Start Point */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-emerald-100 animate-pulse"></div>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-emerald-400 to-primary/60"></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">نقطة الانطلاق</p>
                    <p className="text-sm font-semibold text-foreground">موقعك الحالي</p>
                  </div>
                </div>
                
                {/* End Point */}
                <div className="flex items-center gap-4 pt-4">
                  <div className="w-4 h-4 bg-red-500 rounded-full ring-4 ring-red-100"></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">الوجهة</p>
                    <p className="text-sm font-semibold text-foreground">{customerName}</p>
                    {customerPhone && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Route Stats */}
              {routeInfo.distance && (
                <div className="flex items-center justify-center gap-6 mt-5 pt-5 border-t border-border">
                  <div className="flex items-center gap-2 bg-primary/10 px-4 py-2.5 rounded-xl">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-base font-bold text-primary">{routeInfo.distance}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/10 px-4 py-2.5 rounded-xl">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="text-base font-bold text-primary">{routeInfo.duration}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Steps */}
            <div className="flex-1 overflow-y-auto">
              {isCalculatingRoute ? (
                <div className="flex items-center justify-center p-10">
                  <div className="text-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                      <Navigation className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 font-medium">جاري حساب أفضل مسار...</p>
                  </div>
                </div>
              ) : navigationSteps.length > 0 ? (
                <div className="p-5">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    تعليمات التوجه
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mr-auto">
                      {navigationSteps.length} خطوات
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {navigationSteps.map((step, index) => (
                      <div 
                        key={index} 
                        className={`
                          flex items-start gap-4 p-4 rounded-xl transition-all duration-200
                          ${index === 0 
                            ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' 
                            : index === navigationSteps.length - 1 
                              ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800'
                              : 'bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border'
                          }
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md
                          ${getStepColor(step.type, index, navigationSteps.length)}
                        `}>
                          {getStepIcon(step.type, index)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`
                            text-sm font-medium mb-1
                            ${index === 0 ? 'text-emerald-700 dark:text-emerald-300' : 
                              index === navigationSteps.length - 1 ? 'text-red-700 dark:text-red-300' : 'text-foreground'}
                          `}>
                            {step.instruction}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="bg-background px-2 py-0.5 rounded-md">{step.distance}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-10">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Navigation className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {currentLocation ? 'جاري حساب المسار...' : 'امنح إذن الموقع لعرض التعليمات'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Info & Actions */}
            <div className="border-t border-border p-5 bg-card">
              {/* Order Summary */}
              <div className="bg-secondary/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">الطلب</span>
                  <span className="text-sm font-bold text-foreground">{orderInfo.type} × {orderInfo.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">المبلغ الإجمالي</span>
                  <span className="text-lg font-bold text-primary">{orderInfo.totalPrice.toLocaleString()} د.ع</span>
                </div>
              </div>
              
              {/* Call Button */}
              {customerPhone && (
                <Button 
                  onClick={() => window.open(`tel:${customerPhone}`, '_self')} 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:scale-[1.02]"
                  size="lg"
                >
                  <Phone className="h-5 w-5 ml-2" />
                  اتصل بالعميل
                </Button>
              )}
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-muted">
            <div ref={mapContainer} className="w-full h-full" />
            
            {isLoading && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <div className="text-center bg-card p-8 rounded-2xl shadow-xl">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
                    <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mt-4">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 z-20">
                <div className="text-center p-8 bg-card rounded-2xl shadow-xl max-w-sm mx-4">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-destructive font-bold mb-2">خطأ في الخريطة</p>
                  <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="bg-primary hover:bg-primary/90"
                  >
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