import { chatService } from './chatService.ts';

interface ActiveTrack {
  channelId: string;
  messageId: string;
  watchId?: number;
  intervalId?: any;
  liveUntil?: number;
  isAllTime?: boolean;
}

class LiveLocationTracker {
  private activeTracks: Map<string, ActiveTrack> = new Map();

  startTracking(channelId: string, messageId: string, liveUntil?: number, isAllTime?: boolean) {
    // If already tracking this message, clean it up first
    this.stopTracking(channelId, messageId, false);

    if (!isAllTime && liveUntil && Date.now() >= liveUntil) return;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported for live tracking');
      return;
    }

    let lastSent = 0;

    const sendPositionUpdate = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (!isAllTime && liveUntil && now > liveUntil) {
        this.stopTracking(channelId, messageId, true);
        return;
      }

      // Throttle updates to at least 6 seconds to avoid hammering Firestore
      if (now - lastSent < 6000) return;
      lastSent = now;

      chatService.updateLiveLocation(channelId, messageId, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy)
      });
    };

    // Watch position
    let watchId: number | undefined;
    try {
      watchId = navigator.geolocation.watchPosition(
        sendPositionUpdate,
        (err) => console.warn('Live location watch error:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
      );
    } catch (e) {
      console.warn('watchPosition failed, fallback to interval', e);
    }

    // Interval backup (poll every 10s if watchPosition didn't trigger)
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (!isAllTime && liveUntil && now > liveUntil) {
        this.stopTracking(channelId, messageId, true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        sendPositionUpdate,
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      );
    }, 10000);

    this.activeTracks.set(messageId, {
      channelId,
      messageId,
      watchId,
      intervalId,
      liveUntil,
      isAllTime
    });
  }

  stopTracking(channelId: string, messageId: string, notifyServer: boolean = true) {
    const track = this.activeTracks.get(messageId);
    if (track) {
      if (track.watchId !== undefined && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(track.watchId);
      }
      if (track.intervalId) {
        clearInterval(track.intervalId);
      }
      this.activeTracks.delete(messageId);
    }

    if (notifyServer) {
      chatService.stopLiveLocation(channelId, messageId);
    }
  }

  isTracking(messageId: string): boolean {
    return this.activeTracks.has(messageId);
  }
}

export const liveLocationTracker = new LiveLocationTracker();
