import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Navigation, MapPin, ExternalLink, Copy, Share2, Phone, Car } from 'lucide-react';
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
interface DriverMapModalProps {
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
const DriverMapModal = ({
  isOpen,
  onClose,
  customerLocation,
  customerName,
  customerPhone,
  orderInfo
}: DriverMapModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [routeDuration, setRouteDuration] = useState<string>('');
  const { toast } = useToast();
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
        }).setView([customerLocation.lat, customerLocation.lng], 16);

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

        // Customer marker (red)
        const customerIcon = L.divIcon({
          html: '<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; border: 3px solid white; transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
          className: 'customer-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
        
        L.marker([customerLocation.lat, customerLocation.lng], {
          icon: customerIcon
        }).addTo(mapInstance).bindPopup(`
            <div style="text-align: center; font-family: Arial; padding: 8px;">
              <strong style="color: #1f2937;">${customerName}</strong><br/>
              <div style="margin: 4px 0; color: #6b7280;">
                ${orderInfo.type} × ${orderInfo.quantity}<br/>
                المبلغ: ${orderInfo.totalPrice} د.ع
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
                ${orderInfo.address.replace(/GPS:.*/, '').trim()}
              </div>
            </div>
          `);

        map.current = mapInstance;
        setIsLoading(false);
        setMapError(null);

        // Try to get driver's current location
        getCurrentDriverLocation();

      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('خطأ في تحميل الخريطة');
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    setMapError(null);
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
    navigator.geolocation.getCurrentPosition(position => {
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
          iconAnchor: [14, 14]
        });
        L.marker([driverLoc.lat, driverLoc.lng], {
          icon: driverIcon
        }).addTo(map.current).bindPopup('<div style="text-align: center;"><strong>موقعك الحالي</strong></div>');

        // Add route line
        const routeLine = L.polyline([[driverLoc.lat, driverLoc.lng], [customerLocation.lat, customerLocation.lng]], {
          color: '#f97316',
          weight: 4,
          opacity: 0.8,
          dashArray: '10, 10'
        }).addTo(map.current);

        // Fit map to show both markers
        const group = new L.FeatureGroup([L.marker([driverLoc.lat, driverLoc.lng]), L.marker([customerLocation.lat, customerLocation.lng])]);
        map.current.fitBounds(group.getBounds().pad(0.1));
      }
    }, error => {
      console.warn('Could not get driver location:', error);
    });
  };
  const openInGoogleMaps = () => {
    if (currentLocation) {
      // إذا كان موقع السائق متوفراً، أضف نقطة البداية
      const url = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${customerLocation.lat},${customerLocation.lng}`;
      window.open(url, '_blank');
    } else {
      // إذا لم يكن موقع السائق متوفراً، فقط الوجهة
      const url = `https://www.google.com/maps/dir/?api=1&destination=${customerLocation.lat},${customerLocation.lng}`;
      window.open(url, '_blank');
    }
    toast({
      title: "تم فتح خرائط جوجل",
      description: "سيتم توجيهك إلى العميل عبر خرائط جوجل"
    });
  };
  const openInOpenStreetMap = () => {
    if (currentLocation) {
      const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentLocation.lat}%2C${currentLocation.lng}%3B${customerLocation.lat}%2C${customerLocation.lng}#map=15/${customerLocation.lat}/${customerLocation.lng}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.openstreetmap.org/directions?from=&to=${customerLocation.lat}%2C${customerLocation.lng}#map=16/${customerLocation.lat}/${customerLocation.lng}`;
      window.open(url, '_blank');
    }
    toast({
      title: "تم فتح OpenStreetMap",
      description: "سيتم توجيهك إلى العميل عبر خريطة الشارع المفتوحة"
    });
  };
  const copyCoordinates = () => {
    const coordinates = `${customerLocation.lat}, ${customerLocation.lng}`;
    navigator.clipboard.writeText(coordinates).then(() => {
      toast({
        title: "تم نسخ الإحداثيات",
        description: `${coordinates} - يمكنك استخدامها في أي تطبيق خرائط`
      });
    });
  };
  const shareLocation = () => {
    if (navigator.share) {
      navigator.share({
        title: `موقع العميل - طلب #${orderInfo.id}`,
        text: `${customerName} - ${orderInfo.address}`,
        url: `https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`
      });
    } else {
      copyCoordinates();
    }
  };

  // الحصول على تعليمات التوجه من OpenStreetMap
  const startInAppNavigation = async () => {
    if (!currentLocation) {
      toast({
        title: "موقعك غير متوفر",
        description: "يرجى السماح بالوصول إلى موقعك لبدء التوجه",
        variant: "destructive"
      });
      return;
    }

    setIsNavigating(true);
    
    try {
      // استخدام OSRM API للحصول على المسار والتعليمات
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${customerLocation.lng},${customerLocation.lat}?steps=true&geometries=geojson&overview=full`
      );
      
      if (!response.ok) {
        throw new Error('فشل في الحصول على بيانات المسار');
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const instructions = route.legs[0].steps;
        
        // تحويل التعليمات إلى العربية
        const arabicInstructions = instructions.map((step: any, index: number) => ({
          instruction: translateInstruction(step.maneuver.type, step.name || ''),
          distance: formatDistance(step.distance),
          duration: formatDuration(step.duration)
        }));
        
        setRouteInstructions(arabicInstructions);
        setRouteDistance(formatDistance(route.distance));
        setRouteDuration(formatDuration(route.duration));
        
        // رسم المسار على الخريطة
        if (map.current) {
          const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
          
          // إزالة المسار القديم إن وجد
          map.current.eachLayer((layer) => {
            if (layer instanceof L.Polyline && layer.options.className === 'navigation-route') {
              map.current?.removeLayer(layer);
            }
          });
          
          // إضافة المسار الجديد
          const routeLine = L.polyline(coordinates, {
            color: '#2563eb',
            weight: 6,
            opacity: 0.8,
            className: 'navigation-route'
          }).addTo(map.current);
          
          // تركيز الخريطة على المسار
          map.current.fitBounds(routeLine.getBounds().pad(0.1));
        }
        
        toast({
          title: "تم بدء التوجه",
          description: `المسافة: ${formatDistance(route.distance)} - الوقت: ${formatDuration(route.duration)}`
        });
      }
      
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "خطأ في التوجه",
        description: "فشل في الحصول على تعليمات التوجه",
        variant: "destructive"
      });
    } finally {
      setIsNavigating(false);
    }
  };

  // ترجمة تعليمات التوجه
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
      'roundabout-enter': `ادخل إلى الدوار${streetName ? ` متجهاً إلى ${streetName}` : ''}`
    };
    
    return translations[type] || `${type}${streetName ? ` - ${streetName}` : ''}`;
  };

  // تنسيق المسافة
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} متر`;
    } else {
      return `${(meters / 1000).toFixed(1)} كم`;
    }
  };

  // تنسيق الوقت
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
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full p-0">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <DialogHeader className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                خريطة التوجه - طلب #{orderInfo.id}
              </DialogTitle>
              <div className="w-10" />
            </div>
          </DialogHeader>

          {/* Map Container */}
          <div className="flex-1 relative" style={{
          height: '500px'
        }}>
            <div ref={mapContainer} className="w-full h-full" />
            
            {isLoading && !mapError && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الخريطة...</p>
                </div>
              </div>}

            {mapError && <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
                <div className="text-center p-6">
                  <X className="h-16 w-16 mx-auto mb-4 text-red-600" />
                  <p className="text-red-600 mb-4">{mapError}</p>
                  <Button onClick={() => window.location.reload()}>
                    إعادة المحاولة
                  </Button>
                </div>
              </div>}

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              {/* زر توسيط الخريطة */}
              <Button onClick={() => {
              if (map.current) {
                if (currentLocation) {
                  // إذا كان موقع السائق متوفراً، اعرض كلا الموقعين
                  const group = new L.FeatureGroup([L.marker([currentLocation.lat, currentLocation.lng]), L.marker([customerLocation.lat, customerLocation.lng])]);
                  map.current.fitBounds(group.getBounds().pad(0.15));
                } else {
                  // إذا لم يكن موقع السائق متوفراً، ركز على موقع العميل فقط
                  map.current.setView([customerLocation.lat, customerLocation.lng], 16);
                }
                toast({
                  title: currentLocation ? "تم عرض المسار كاملاً" : "تم التركيز على موقع العميل",
                  description: currentLocation ? "يمكنك رؤية موقعك وموقع العميل" : "امنح إذن الموقع لرؤية المسار كاملاً"
                });
              }
            }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium" size="sm">
                <Navigation className="h-4 w-4 ml-1" />
                {currentLocation ? "عرض المسار كاملاً" : "التركيز على العميل"}
              </Button>

              {/* زر التوجه المدمج */}
              <Button 
                onClick={startInAppNavigation} 
                disabled={!currentLocation || isNavigating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium" 
                size="sm"
              >
                <Car className="h-4 w-4 ml-1" />
                {isNavigating ? "جاري التحضير..." : "توجه مدمج"}
              </Button>

              <Button onClick={openInGoogleMaps} variant="outline" className="bg-white/90 hover:bg-white border-green-600 text-green-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium" size="sm">
                <ExternalLink className="h-4 w-4 ml-1" />
                جوجل ماب خارجي
              </Button>
              
              <Button onClick={openInOpenStreetMap} variant="outline" className="bg-white/90 hover:bg-white border-blue-600 text-blue-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium" size="sm">
                <ExternalLink className="h-4 w-4 ml-1" />
                خريطة خارجية
              </Button>

              <Button onClick={copyCoordinates} variant="outline" className="bg-white/90 hover:bg-white border-gray-600 text-gray-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium" size="sm">
                <Copy className="h-4 w-4 ml-1" />
                نسخ الإحداثيات
              </Button>

              {customerPhone && <Button onClick={() => window.open(`tel:${customerPhone}`, '_self')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium" size="sm">
                  <Phone className="h-4 w-4 ml-1" />
                  اتصل بالعميل
                </Button>}
            </div>

            {/* Legend */}
            

            {/* Customer Info Panel */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 z-30 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="font-medium text-gray-900 text-sm">معلومات العميل</div>
              </div>
              <div className="text-xs space-y-1">
                <div><strong>الاسم:</strong> {customerName}</div>
                <div><strong>الطلب:</strong> {orderInfo.type} × {orderInfo.quantity}</div>
                <div><strong>المبلغ:</strong> {orderInfo.totalPrice} د.ع</div>
                {customerPhone && <div><strong>الهاتف:</strong> {customerPhone}</div>}
              </div>
            </div>

            {/* Navigation Instructions Panel */}
            {routeInstructions.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 z-30 max-h-40 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="h-4 w-4 text-blue-600" />
                  <div className="font-medium text-gray-900 text-sm">تعليمات التوجه</div>
                  <div className="text-xs text-gray-600 ml-auto">
                    {routeDistance} - {routeDuration}
                  </div>
                </div>
                <div className="space-y-2">
                  {routeInstructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium text-[10px] mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-gray-900 font-medium">{instruction.instruction}</div>
                        <div className="text-gray-500">{instruction.distance}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default DriverMapModal;