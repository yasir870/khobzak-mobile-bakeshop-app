import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Navigation, MapPin, Clock, Route, Phone, Settings, Locate } from 'lucide-react';
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
  const [tripStarted, setTripStarted] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      // Reset state when closing
      setTripStarted(false);
      setLocationReady(false);
      setNavigationSteps([]);
      setRouteInfo({ distance: '', duration: '' });
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

        tileLayer.addTo(mapInstance);

        // Mark loading done when map is ready - don't wait for all tiles
        mapInstance.whenReady(() => {
          console.log('Navigation map is ready');
          setIsLoading(false);
          setMapError(null);
        });

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

        // Only get current location and show markers - don't calculate route yet
        getDriverLocation();

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

  const getDriverLocation = () => {
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
        setLocationReady(true);

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

          // Fit map to show both markers
          const group = new L.FeatureGroup([
            L.marker([driverLoc.lat, driverLoc.lng]),
            L.marker([customerLocation.lat, customerLocation.lng])
          ]);
          map.current.fitBounds(group.getBounds().pad(0.2));
        }
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

  const startTrip = () => {
    if (!currentLocation) {
      toast({
        title: "الموقع غير متاح",
        description: "يرجى السماح بالوصول لموقعك أولاً",
        variant: "destructive"
      });
      return;
    }
    setTripStarted(true);
    calculateRoute(currentLocation);
  };

  const calculateRoute = async (startLocation: Location) => {
    setIsCalculatingRoute(true);
    
    try {
      // Use multiple route services - race them for fastest response
      const routeServices = [
        `https://router.project-osrm.org/route/v1/driving/${startLocation.lng},${startLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLocation.lng},${startLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full`
      ];
      
      let data;
      
      // Race both services - use whichever responds first
      const fetchWithTimeout = (url: string, timeoutMs: number) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { signal: controller.signal })
          .then(async (res) => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Not OK');
            const json = await res.json();
            if (!json.routes || json.routes.length === 0) throw new Error('No routes');
            return json;
          });
      };
      
      
      try {
        // Use Promise.any - resolves as soon as first one succeeds (much faster)
        const results = await Promise.allSettled(
          routeServices.map(url => fetchWithTimeout(url, 6000))
        );
        const fulfilled = results.find(r => r.status === 'fulfilled');
        if (fulfilled && fulfilled.status === 'fulfilled') {
          data = (fulfilled as PromiseFulfilledResult<any>).value;
        }
        console.log('Route calculated successfully');
      } catch (e) {
        console.warn('All route services failed:', e);
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
      {/* Desktop: full screen side-by-side | Mobile: scrollable vertical */}
      <DialogContent className="max-w-full sm:max-h-[100vh] sm:h-full w-full p-0 m-0 max-h-[95vh] overflow-y-auto sm:overflow-hidden">
        <div className="relative w-full h-full flex flex-col-reverse sm:flex-row-reverse">
          {/* Navigation Panel */}
          <div className="w-full sm:w-[380px] sm:max-h-none bg-gradient-to-b from-card to-secondary/30 border-t sm:border-t-0 sm:border-b-0 sm:border-r border-border flex flex-col z-10 shadow-xl overflow-y-auto flex-shrink-0">
            {/* Header with gradient */}
            <DialogHeader className="border-b border-border bg-gradient-to-r from-primary to-primary/80 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base sm:text-lg font-bold text-primary-foreground flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Route className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  التوجه إلى العميل
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose} 
                  className="h-8 w-8 sm:h-9 sm:w-9 text-primary-foreground hover:bg-white/20 rounded-lg"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </DialogHeader>

            {/* Location Indicators - compact on mobile */}
            <div className="p-3 sm:p-5 border-b border-border bg-card">
              <div className="flex items-center gap-3 sm:gap-4 sm:flex-col sm:items-stretch">
                {/* Mobile: horizontal layout | Desktop: vertical */}
                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full ring-2 sm:ring-4 ring-emerald-100 animate-pulse flex-shrink-0"></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">نقطة الانطلاق</p>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">موقعك الحالي</p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="hidden sm:block">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-primary/60 mx-auto"></div>
                </div>
                <div className="sm:hidden text-muted-foreground">→</div>
                
                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full ring-2 sm:ring-4 ring-red-100 flex-shrink-0"></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">الوجهة</p>
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{customerName}</p>
                    {customerPhone && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">{customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Route Stats */}
              {routeInfo.distance && (
                <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-5 pt-3 sm:pt-5 border-t border-border">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="text-sm sm:text-base font-bold text-primary">{routeInfo.distance}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="text-sm sm:text-base font-bold text-primary">{routeInfo.duration}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Start Trip / Navigation Steps - compact on mobile */}
            <div className="overflow-y-auto flex-shrink-0 sm:flex-1">
              {isCalculatingRoute ? (
                <div className="flex items-center justify-center p-6 sm:p-10">
                  <div className="text-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                      <Navigation className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4 font-medium">جاري حساب أفضل مسار...</p>
                  </div>
                </div>
              ) : navigationSteps.length > 0 ? (
                <div className="p-3 sm:p-5">
                  {/* Mobile: only show start and arrive steps + distance */}
                  <div className="sm:hidden space-y-2">
                    {/* Start step */}
                    {navigationSteps.length > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-emerald-500 shadow-md flex-shrink-0">
                          <Navigation className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">ابدأ الرحلة</p>
                          <p className="text-xs text-muted-foreground">{routeInfo.distance}</p>
                        </div>
                      </div>
                    )}
                    {/* Arrive step */}
                    {navigationSteps.length > 1 && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-red-500 shadow-md flex-shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300">وصلت إلى الوجهة</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop: show all steps */}
                  <div className="hidden sm:block">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-base">
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
                </div>
              ) : !tripStarted ? (
                <div className="flex items-center justify-center p-4 sm:p-8">
                  <div className="text-center w-full">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-5">
                      <Navigation className="h-7 w-7 sm:h-10 sm:w-10 text-emerald-600" />
                    </div>
                    {locationReady ? (
                      <>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">تم تحديد موقعك وموقع العميل</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-5">اضغط لرسم المسار وبدء التوجه</p>
                        <Button 
                          onClick={startTrip}
                          className="w-full h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:scale-[1.02]"
                          size="lg"
                        >
                          <Navigation className="h-5 w-5 sm:h-6 sm:w-6 ml-2" />
                          ابدأ الرحلة
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-2 border-emerald-200 border-t-emerald-600 mx-auto mb-2 sm:mb-3"></div>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">جاري تحديد موقعك...</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">يرجى السماح بالوصول للموقع</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 sm:p-10">
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Navigation className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">جاري حساب المسار...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Info & Actions - compact on mobile */}
            <div className="border-t border-border p-3 sm:p-5 bg-card flex-shrink-0">
              {/* Order Summary */}
              <div className="bg-secondary/50 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">الطلب</span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">{orderInfo.type} × {orderInfo.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">المبلغ الإجمالي</span>
                  <span className="text-base sm:text-lg font-bold text-primary">{orderInfo.totalPrice.toLocaleString()} د.ع</span>
                </div>
              </div>
              
              {/* Call Button */}
              {customerPhone && (
                <Button 
                  onClick={() => window.open(`tel:${customerPhone}`, '_self')} 
                  className="w-full h-10 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:scale-[1.02] text-sm sm:text-base"
                  size="lg"
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  اتصل بالعميل
                </Button>
              )}
            </div>
          </div>

          {/* Map Container - fixed height on mobile, flex on desktop */}
          <div className="relative bg-muted h-[300px] sm:h-auto sm:flex-1 flex-shrink-0">
            <div ref={mapContainer} className="w-full h-full" />
            
            {/* My Location Button */}
            {!mapError && (
              <button
                onClick={() => {
                  if (currentLocation && map.current) {
                    map.current.flyTo([currentLocation.lat, currentLocation.lng], 17);
                  } else {
                    navigator.geolocation?.getCurrentPosition(
                      (pos) => {
                        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setCurrentLocation(loc);
                        map.current?.flyTo([loc.lat, loc.lng], 17);
                      },
                      () => toast({ title: "تعذر تحديد موقعك", variant: "destructive" })
                    );
                  }
                }}
                disabled={isLoading}
                aria-label="موقعي الحالي"
                className="absolute left-4 z-[1200] h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-border bg-background text-primary shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                title="موقعي الحالي"
              >
                <Locate className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {isLoading && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <div className="text-center bg-card p-6 sm:p-8 rounded-2xl shadow-xl">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
                    <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mt-3 sm:mt-4 text-sm sm:text-base">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/5 z-20">
                <div className="text-center p-6 sm:p-8 bg-card rounded-2xl shadow-xl max-w-sm mx-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <X className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
                  </div>
                  <p className="text-destructive font-bold mb-2 text-sm sm:text-base">خطأ في الخريطة</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{mapError}</p>
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