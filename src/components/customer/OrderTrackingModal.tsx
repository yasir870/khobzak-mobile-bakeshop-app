import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح أيقونات Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Order {
  id: number;
  status: string;
  address: string;
  customer_phone: string;
  type: string;
  quantity: number;
  total_price: number;
  driver_id?: number;
  created_at: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customerLocation?: { lat: number; lng: number };
}

const OrderTrackingModal = ({ isOpen, onClose, order, customerLocation }: OrderTrackingModalProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const customerMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [distance, setDistance] = useState<string>('');

  // إنشاء أيقونة مخصصة للسائق
  const driverIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" width="32" height="32">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // إنشاء أيقونة مخصصة للعميل
  const customerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" width="32" height="32">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const calculateRoute = async (driverLat: number, driverLng: number, customerLat: number, customerLng: number) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${customerLng},${customerLat}?overview=full&geometries=geojson`
      );
      
      if (!response.ok) throw new Error('فشل في حساب المسار');
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        
        // رسم المسار على الخريطة
        if (routeLine.current) {
          map.current?.removeLayer(routeLine.current);
        }
        
        routeLine.current = L.polyline(coordinates, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.8
        });
        
        if (map.current) {
          routeLine.current.addTo(map.current);
        }
        
        // حساب المسافة والوقت المقدر
        const distanceKm = (route.distance / 1000).toFixed(1);
        const timeMinutes = Math.round(route.duration / 60);
        
        setDistance(`${distanceKm} كم`);
        setEstimatedTime(`${timeMinutes} دقيقة`);
      }
    } catch (error) {
      console.error('خطأ في حساب المسار:', error);
      // حساب المسافة المباشرة كبديل
      const directDistance = calculateDirectDistance(driverLat, driverLng, customerLat, customerLng);
      setDistance(`${directDistance.toFixed(1)} كم تقريباً`);
      setEstimatedTime('غير محدد');
    }
  };

  const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const updateDriverMarker = (location: DriverLocation) => {
    if (!map.current) return;

    if (driverMarker.current) {
      driverMarker.current.setLatLng([location.latitude, location.longitude]);
    } else {
      driverMarker.current = L.marker([location.latitude, location.longitude], { 
        icon: driverIcon 
      }).addTo(map.current);
      driverMarker.current.bindPopup(`
        <div style="text-align: center; font-family: 'Noto Sans Arabic', sans-serif;">
          <strong>السائق</strong><br/>
          <small>آخر تحديث: ${new Date(location.updated_at).toLocaleTimeString('ar-IQ')}</small>
        </div>
      `);
    }

    // تحديث المسار إذا كان موقع العميل متاح
    if (customerLocation) {
      calculateRoute(location.latitude, location.longitude, customerLocation.lat, customerLocation.lng);
    }
  };

  const initMap = async () => {
    try {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      if (mapContainer.current) {
        mapContainer.current.innerHTML = '';
      }

      setIsLoading(true);
      setMapError(null);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (!mapContainer.current) {
        setMapError('عنصر الخريطة غير موجود');
        setIsLoading(false);
        return;
      }

      // إنشاء الخريطة
      const mapInstance = L.map(mapContainer.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([33.3152, 44.3661], 12); // بغداد كمركز افتراضي

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: ''
      });

      let tilesLoaded = false;
      let loadingTimeout: NodeJS.Timeout;

      const handleTileLoad = () => {
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
        console.warn('خطأ في تحميل البلاط:', error);
        if (loadingTimeout) clearTimeout(loadingTimeout);
        setMapError('فشل في تحميل الخريطة');
        setIsLoading(false);
      };

      tileLayer.on('load', handleTileLoad);
      tileLayer.on('tileerror', handleTileError);

      loadingTimeout = setTimeout(() => {
        if (!tilesLoaded) {
          setMapError('انتهت مهلة تحميل الخريطة');
          setIsLoading(false);
        }
      }, 8000);

      tileLayer.addTo(mapInstance);
      map.current = mapInstance;

      // إضافة علامة العميل إذا كان الموقع متاح
      if (customerLocation) {
        customerMarker.current = L.marker([customerLocation.lat, customerLocation.lng], { 
          icon: customerIcon 
        }).addTo(mapInstance);
        customerMarker.current.bindPopup(`
          <div style="text-align: center; font-family: 'Noto Sans Arabic', sans-serif;">
            <strong>موقع التسليم</strong><br/>
            <small>${order.address}</small>
          </div>
        `);
      }

      // جلب موقع السائق الأولي
      if (order.driver_id) {
        await fetchDriverLocation();
      }

    } catch (error) {
      console.error('خطأ في إنشاء الخريطة:', error);
      setMapError('فشل في تحميل الخريطة');
      setIsLoading(false);
    }
  };

  const fetchDriverLocation = async () => {
    if (!order.driver_id) return;

    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', order.driver_id)
        .single();

      if (error) {
        console.error('خطأ في جلب موقع السائق:', error);
        return;
      }

      if (data) {
        setDriverLocation(data);
        updateDriverMarker(data);

        // تحديث مركز الخريطة لتشمل السائق والعميل
        if (map.current && customerLocation) {
          const bounds = L.latLngBounds([
            [data.latitude, data.longitude],
            [customerLocation.lat, customerLocation.lng]
          ]);
          map.current.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    } catch (error) {
      console.error('خطأ في جلب موقع السائق:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || !order.driver_id) return;

    initMap();

    // الاشتراك في التحديثات المباشرة
    const channel = supabase
      .channel('driver-location-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${order.driver_id}`
        },
        (payload) => {
          console.log('تحديث موقع السائق:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newLocation = payload.new as DriverLocation;
            setDriverLocation(newLocation);
            updateDriverMarker(newLocation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, order.driver_id, customerLocation]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'in_progress': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'confirmed': return 'مؤكد';
      case 'in_progress': return 'قيد التوصيل';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  if (!order.driver_id) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-right text-xl">تتبع الطلب #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
            <h3 className="text-xl font-bold mb-3 text-gray-800">لم يتم تعيين سائق بعد</h3>
            <div className="space-y-2 text-gray-600">
              <p className="text-base">طلبك رقم #{order.id} في انتظار تعيين سائق</p>
              <p className="text-sm">حالة الطلب: <span className="font-semibold text-yellow-600">{getStatusText(order.status)}</span></p>
              <p className="text-sm">سيتم إشعارك عند قبول السائق للطلب</p>
            </div>
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>ملاحظة:</strong> سيتم تفعيل خاصية التتبع بمجرد قبول السائق للطلب
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-right">تتبع الطلب #{order.id}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* معلومات الطلب */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(order.status)} text-white`}>
                  {getStatusText(order.status)}
                </Badge>
              </div>
              
              {distance && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">المسافة: {distance}</span>
                </div>
              )}
              
              {estimatedTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-sm">الوقت المقدر: {estimatedTime}</span>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4" />
                <span>عنوان التسليم: {order.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>رقم الهاتف: {order.customer_phone}</span>
              </div>
            </div>
          </div>

          {/* الخريطة */}
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-sm text-red-600">{mapError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={initMap}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            )}

            <div ref={mapContainer} className="w-full h-full min-h-[400px]" />

            {/* معلومات السائق */}
            {driverLocation && (
              <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">السائق في الطريق</p>
                      <p className="text-xs text-gray-500">
                        آخر تحديث: {new Date(driverLocation.updated_at).toLocaleTimeString('ar-IQ')}
                      </p>
                    </div>
                  </div>
                  
                  {driverLocation.speed && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">السرعة</p>
                      <p className="font-semibold">{Math.round(driverLocation.speed * 3.6)} كم/س</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTrackingModal;