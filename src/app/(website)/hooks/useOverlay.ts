import { useState, useEffect } from 'react';

interface OverlayData {
  shouldShow: boolean;
  triggerType?: string;
  reason?: string;
  imageUrl?: string;
}

export const useOverlay = (isNewLogin: boolean = false) => {
  const [overlayData, setOverlayData] = useState<OverlayData>({ shouldShow: false });
  const [loading, setLoading] = useState(false); // Start with false for faster initial render

  // Generate session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('overlay_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('overlay_session_id', sessionId);
    }
    return sessionId;
  };

  const checkOverlay = async () => {
    try {
      setLoading(true);
      const sessionId = getSessionId();
      
      console.log('🚀 useOverlay: Making API call with:', { sessionId, isNewLogin });
      
      const response = await fetch('/api/overlay/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          isNewLogin
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ useOverlay: API response:', data);
        setOverlayData(data);
      } else {
        console.error('❌ useOverlay: Failed to check overlay:', response.statusText);
        setOverlayData({ shouldShow: false });
      }
    } catch (error) {
      console.error('❌ useOverlay: Error checking overlay:', error);
      setOverlayData({ shouldShow: false });
    } finally {
      setLoading(false);
    }
  };

  const dismissOverlay = async () => {
    if (!overlayData.triggerType) return;

    try {
      const sessionId = getSessionId();
      
      await fetch('/api/overlay/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          triggerType: overlayData.triggerType,
          sessionId
        })
      });

      setOverlayData({ shouldShow: false });
    } catch (error) {
      console.error('Error dismissing overlay:', error);
      // Still hide the overlay even if API call fails
      setOverlayData({ shouldShow: false });
    }
  };

  useEffect(() => {
    checkOverlay();
  }, [isNewLogin]);

  return {
    overlayData,
    loading,
    dismissOverlay,
    recheckOverlay: checkOverlay
  };
};
