import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, User, Phone, Navigation, RefreshCw, Locate } from 'lucide-react';
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

interface DriverInfo {
  name: string;
  phone: string;
}

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customerLocation?: { lat: number; lng: number };
}

// استخراج إحداثيات GPS من العنوان
const extractCoordsFromAddress = (address: string): { lat: number; lng: number } | null => {
  const gpsMatch = address.match(/GPS[^:]*:\s*([\d.]+)[,\s]+([\d.]+)/i);
  if (gpsMatch) {
    const lat = parseFloat(gpsMatch[1]);
    const lng = parseFloat(gpsMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  // محاولة استخراج أي أرقام تبدو كإحداثيات
  const coordsMatch = address.match(/([\d]{1,2}\.[\d]{4,})[,\s]+([\d]{1,2}\.[\d]{4,})/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
};

const OrderTrackingModal = ({ isOpen, onClose, order, customerLocation: propCustomerLocation }: OrderTrackingModalProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const customerMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // استخدام الإحداثيات من العنوان إذا لم تُمرر
  const customerLocation = propCustomerLocation || extractCoordsFromAddress(order.address);

  // إنشاء أيقونة السائق (سيارة خضراء متحركة)
  const createDriverIcon = (heading?: number) => {
    const rotation = heading || 0;
    return new L.DivIcon({
      className: 'driver-marker-icon',
      html: `
        <div style="
          width: 48px;
          height: 48px;
          position: relative;
          transform: rotate(${rotation}deg);
          transition: transform 0.5s ease;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            animation: pulse 2s infinite;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H15V3H9v2H6.5c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 12px solid #10B981;
          "></div>
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56],
    });
  };

  // إنشاء أيقونة موقع العميل
  const customerIcon = new L.DivIcon({
    className: 'customer-marker-icon',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
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
        
        // إزالة المسار القديم
        if (routeLine.current && map.current) {
          map.current.removeLayer(routeLine.current);
        }
        
        // رسم المسار الجديد بتأثير متحرك
        routeLine.current = L.polyline(coordinates, {
          color: '#3B82F6',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10',
          lineCap: 'round',
          lineJoin: 'round'
        });
        
        if (map.current) {
          routeLine.current.addTo(map.current);
        }
        
        // حساب المسافة والوقت
        const distanceKm = (route.distance / 1000).toFixed(1);
        const timeMinutes = Math.round(route.duration / 60);
        
        setDistance(`${distanceKm} كم`);
        setEstimatedTime(`${timeMinutes} دقيقة`);
      }
    } catch (error) {
      console.error('خطأ في حساب المسار:', error);
      const directDistance = calculateDirectDistance(driverLat, driverLng, customerLat, customerLng);
      setDistance(`${directDistance.toFixed(1)} كم`);
      setEstimatedTime('~' + Math.round(directDistance * 3) + ' دقيقة');
    }
  };

  const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
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

    const newIcon = createDriverIcon(location.heading ?? undefined);

    if (driverMarker.current) {
      driverMarker.current.setLatLng([location.latitude, location.longitude]);
      driverMarker.current.setIcon(newIcon);
    } else {
      driverMarker.current = L.marker([location.latitude, location.longitude], { 
        icon: newIcon,
        zIndexOffset: 1000
      }).addTo(map.current);
    }

    // تحديث popup
    const speedText = location.speed ? `السرعة: ${Math.round(location.speed)} كم/س` : '';
    const timeText = `آخر تحديث: ${new Date(location.updated_at).toLocaleTimeString('ar-IQ')}`;
    
    driverMarker.current.bindPopup(`
      <div style="text-align: center; font-family: 'Noto Sans Arabic', sans-serif; min-width: 120px;">
        <strong style="color: #10B981;">🚗 السائق</strong>
        ${driverInfo ? `<br/><span style="font-size: 12px;">${driverInfo.name}</span>` : ''}
        <br/><small style="color: #6B7280;">${speedText}</small>
        <br/><small style="color: #9CA3AF;">${timeText}</small>
      </div>
    `);

    // تحديث المسار
    if (customerLocation) {
      calculateRoute(location.latitude, location.longitude, customerLocation.lat, customerLocation.lng);
    }
  };

  const fetchDriverInfo = async () => {
    if (!order.driver_id) return;
    
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('name, phone')
        .eq('id', order.driver_id)
        .single();
      
      if (error) throw error;
      if (data) {
        setDriverInfo(data);
      }
    } catch (error) {
      console.error('خطأ في جلب معلومات السائق:', error);
    }
  };

  const fetchDriverLocation = async () => {
    if (!order.driver_id) return;

    try {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*')
        .eq('driver_id', order.driver_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('خطأ في جلب موقع السائق:', error);
        setMapError('لا يمكن الوصول لموقع السائق. قد يكون السائق لم يبدأ التتبع بعد.');
        setIsLoading(false);
        return;
      }

      if (data) {
        setDriverLocation(data);
        setMapError(null);
        updateDriverMarker(data);

        // تحديث حدود الخريطة
        if (map.current && customerLocation) {
          const bounds = L.latLngBounds([
            [data.latitude, data.longitude],
            [customerLocation.lat, customerLocation.lng]
          ]);
          map.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else {
        setMapError('موقع السائق غير متاح حالياً. السائق لم يبدأ التتبع بعد.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('خطأ في جلب موقع السائق:', error);
      setMapError('فشل الاتصال بخدمة التتبع');
      setIsLoading(false);
    }
  };

  const refreshLocation = async () => {
    setIsRefreshing(true);
    await fetchDriverLocation();
    setTimeout(() => setIsRefreshing(false), 1000);
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
      const defaultCenter = customerLocation || { lat: 36.855699, lng: 42.842631 };
      const mapInstance = L.map(mapContainer.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([defaultCenter.lat, defaultCenter.lng], 14);

      // إضافة طبقة خريطة جميلة
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: ''
      });

      tileLayer.on('load', () => {
        setIsLoading(false);
      });

      tileLayer.on('tileerror', () => {
        // محاولة خريطة بديلة
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(mapInstance);
        setIsLoading(false);
      });

      tileLayer.addTo(mapInstance);
      map.current = mapInstance;

      // إضافة علامة العميل
      if (customerLocation) {
        customerMarker.current = L.marker([customerLocation.lat, customerLocation.lng], { 
          icon: customerIcon 
        }).addTo(mapInstance);
        customerMarker.current.bindPopup(`
          <div style="text-align: center; font-family: 'Noto Sans Arabic', sans-serif; min-width: 120px;">
            <strong style="color: #EF4444;">📍 موقع التسليم</strong>
            <br/><small style="color: #6B7280;">${order.address.split('\n')[0]}</small>
          </div>
        `);
      }

      // جلب موقع السائق
      if (order.driver_id) {
        await fetchDriverInfo();
        await fetchDriverLocation();
      }

    } catch (error) {
      console.error('خطأ في إنشاء الخريطة:', error);
      setMapError('فشل في تحميل الخريطة');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!order.driver_id) {
      setMapError('لم يتم تعيين سائق لهذا الطلب بعد.');
      setIsLoading(false);
      return;
    }

    initMap();

    // الاشتراك في التحديثات المباشرة
    const channel = supabase
      .channel(`driver-location-${order.driver_id}`)
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
            setMapError(null);
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
  }, [isOpen, order.driver_id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'accepted': return 'bg-cyan-500';
      case 'on_the_way': 
      case 'in-transit': return 'bg-blue-500';
      case 'delivered':
      case 'received': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'accepted': return 'تم القبول';
      case 'on_the_way':
      case 'in-transit': return 'في الطريق';
      case 'delivered':
      case 'received': return 'تم التسليم';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  // عدم عرض modal إذا لم يكن هناك سائق
  if (!order.driver_id) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-right text-xl">تتبع الطلب #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Clock className="mx-auto mb-4 h-16 w-16 text-yellow-500 animate-pulse" />
            <h3 className="text-xl font-bold mb-3 text-gray-800">لم يتم تعيين سائق بعد</h3>
            <p className="text-gray-600">سيتم تفعيل التتبع عند قبول السائق للطلب</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">تتبع الطلب #{order.id}</h2>
              <p className="text-blue-100 text-sm">{order.type}</p>
            </div>
            <Badge className={`${getStatusColor(order.status)} text-white border-0`}>
              {getStatusText(order.status)}
            </Badge>
          </div>
          
          {/* معلومات المسافة والوقت */}
          {(distance || estimatedTime) && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/20">
              {distance && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{distance}</span>
                </div>
              )}
              {estimatedTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">الوصول خلال: {estimatedTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 h-[calc(85vh-180px)]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="text-gray-600 font-medium">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}

          {mapError && !isLoading && (
            <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center z-20">
              <div className="text-center p-6 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">الموقع غير متاح</h3>
                <p className="text-gray-600 text-sm mb-4">{mapError}</p>
                <Button onClick={refreshLocation} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          )}

          <div ref={mapContainer} className="w-full h-full" />

          {/* زر التحديث */}
          <Button
            onClick={refreshLocation}
            disabled={isRefreshing}
            size="icon"
            className="absolute top-4 right-4 z-10 bg-white text-gray-700 hover:bg-gray-100 shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* زر التركيز على السائق */}
          {driverLocation && (
            <Button
              onClick={() => {
                if (map.current && driverLocation) {
                  map.current.flyTo([driverLocation.latitude, driverLocation.longitude], 16, { duration: 1 });
                }
              }}
              size="icon"
              className="absolute top-16 right-4 z-10 bg-green-500 text-white hover:bg-green-600 shadow-lg"
            >
              <Locate className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Driver Info Panel */}
        {driverLocation && (
          <div className="p-4 bg-white border-t shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{driverInfo?.name || 'السائق'}</p>
                  <p className="text-xs text-gray-500">
                    آخر تحديث: {new Date(driverLocation.updated_at).toLocaleTimeString('ar-IQ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {driverLocation.speed && driverLocation.speed > 0 && (
                  <div className="bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-blue-700">
                      {Math.round(driverLocation.speed)} كم/س
                    </span>
                  </div>
                )}
                
                {driverInfo?.phone && (
                  <a href={`tel:${driverInfo.phone}`}>
                    <Button size="icon" className="bg-green-500 hover:bg-green-600">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CSS للأنيميشن */}
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          }
          .driver-marker-icon {
            background: transparent !important;
            border: none !important;
          }
          .customer-marker-icon {
            background: transparent !important;
            border: none !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTrackingModal;