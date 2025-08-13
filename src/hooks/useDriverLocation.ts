import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface UseDriverLocationProps {
  driverId: string;
  orderId?: string;
  isActive?: boolean;
}

export const useDriverLocation = ({ driverId, orderId, isActive = false }: UseDriverLocationProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

  const updateLocation = async (position: GeolocationPosition) => {
    try {
      const now = Date.now();
      // تحديث الموقع كل 5 ثواني فقط لتوفير البيانات
      if (now - lastUpdateTime.current < 5000) return;

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        accuracy: position.coords.accuracy || undefined,
      };

      // البحث عن سجل موجود للسائق
      const { data: existingLocation } = await supabase
        .from('driver_locations')
        .select('id')
        .eq('driver_id', driverId)
        .single();

      if (existingLocation) {
        // تحديث الموقع الموجود
        const { error: updateError } = await supabase
          .from('driver_locations')
          .update({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            heading: locationData.heading,
            speed: locationData.speed,
            accuracy: locationData.accuracy,
            order_id: orderId,
            updated_at: new Date().toISOString()
          })
          .eq('driver_id', driverId);

        if (updateError) throw updateError;
      } else {
        // إنشاء سجل جديد
        const { error: insertError } = await supabase
          .from('driver_locations')
          .insert({
            driver_id: driverId,
            order_id: orderId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            heading: locationData.heading,
            speed: locationData.speed,
            accuracy: locationData.accuracy
          });

        if (insertError) throw insertError;
      }

      lastUpdateTime.current = now;
      setError(null);
      console.log('تم تحديث موقع السائق:', locationData);
    } catch (err) {
      console.error('خطأ في تحديث الموقع:', err);
      setError('فشل في تحديث الموقع');
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('خدمة تحديد الموقع غير متاحة');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error('خطأ في تحديد الموقع:', error);
        setError('فشل في الحصول على الموقع');
      },
      options
    );

    setIsTracking(true);
    console.log('بدء تتبع موقع السائق');
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    console.log('توقف تتبع موقع السائق');
  };

  useEffect(() => {
    if (isActive) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive, driverId, orderId]);

  return {
    isTracking,
    error,
    startTracking,
    stopTracking
  };
};