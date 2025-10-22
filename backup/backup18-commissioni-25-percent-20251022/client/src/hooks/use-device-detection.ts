import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  userAgent: string;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        screenWidth: 1024,
        userAgent: ''
      };
    }

    const width = window.innerWidth;
    const userAgent = navigator.userAgent;
    
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTabletUA = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent) && width >= 768;
    
    const isMobile = width < 768 || (isMobileUA && width < 768);
    const isTablet = (width >= 768 && width < 1024) || isTabletUA;
    const isDesktop = width >= 1024 && !isMobileUA;
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      screenWidth: width,
      userAgent
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTabletUA = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent) && width >= 768;
      
      const isMobile = width < 768 || (isMobileUA && width < 768);
      const isTablet = (width >= 768 && width < 1024) || isTabletUA;
      const isDesktop = width >= 1024 && !isMobileUA;
      
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (isMobile) deviceType = 'mobile';
      else if (isTablet) deviceType = 'tablet';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        screenWidth: width,
        userAgent
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Chiama immediatamente per aggiornare

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}