import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * VideoPlayer
 * -----------
 * Cinematic glassmorphic video player for HLS (.m3u8) streams.
 * Uses hls.js for Chromium/Firefox and native playback for Safari.
 *
 * Props:
 *   streamUrl   — the resolved .m3u8 URL from the backend
 *   referer     — optional Referer header (passed as CORS hint)
 *   episodeTitle — display label shown above the player
 *   animeTitle  — anime name for the player header
 *   posterUrl   — blurred background poster image
 *   onClose     — callback to dismiss the player
 */
export default function VideoPlayer({
  streamUrl,
  isHls = true,
  episodeTitle,
  animeTitle,
  posterUrl,
  animeId,
  episodeNumber,
  user,
  authToken,
  backendBaseUrl,
  onClose,
}) {
  const videoRef   = useRef(null);
  const hlsRef     = useRef(null);
  const [ready, setReady]   = useState(false);
  const [error, setError]   = useState(null);

  const lastSyncTimeRef = useRef(0);

  const syncProgress = (currentTime) => {
    if (!user || !authToken || !backendBaseUrl || !animeId) return;
    fetch(`${backendBaseUrl}/api/anime/history/add`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}` 
      },
      body: JSON.stringify({ 
        anime_id: animeId, 
        anime_title: animeTitle, 
        episode_number: episodeNumber,
        progress_seconds: Math.floor(currentTime)
      }),
    }).catch(() => {});
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      if (currentTime - lastSyncTimeRef.current >= 15) {
        lastSyncTimeRef.current = currentTime;
        syncProgress(currentTime);
      }
    };

    const handlePause = () => {
      syncProgress(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);

    return () => {
      syncProgress(video.currentTime);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
    };
  }, [user, authToken, backendBaseUrl, animeId, animeTitle, episodeNumber]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Destroy any previous hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setReady(false);
    setError(null);

    if (!isHls) {
      // Direct MP4 / native video playback
      video.src = streamUrl;
      
      const handleLoadedMetadata = () => {
        setReady(true);
        video.play().catch(() => {});
      };
      const handleError = () => {
        setError('A streaming error occurred. Please try a different episode or try again later.');
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setReady(true);
        video.play().catch(() => {/* user gesture required */});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error — could not load stream segments. The source may be geo-blocked or expired.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('A fatal streaming error occurred. Please try a different episode or try again later.');
              hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — native HLS support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setReady(true);
        video.play().catch(() => {});
      });
    } else {
      setError('Your browser does not support HLS streaming. Please use Chrome, Firefox, or Safari.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  return (
    <div className="vp-overlay" onClick={onClose}>
      <div className="vp-container" onClick={(e) => e.stopPropagation()}>

        {/* Blurred poster background */}
        {posterUrl && (
          <div
            className="vp-bg-blur"
            style={{ backgroundImage: `url(${posterUrl})` }}
          />
        )}
        <div className="vp-bg-darken" />

        {/* Header */}
        <div className="vp-header">
          <div className="vp-header-text">
            <p className="vp-anime-name">{animeTitle}</p>
            <p className="vp-ep-name">{episodeTitle}</p>
          </div>
          <button className="vp-close-btn" onClick={onClose} aria-label="Close player">
            <X size={20} />
          </button>
        </div>

        {/* Video stage */}
        <div className="vp-stage">
          {/* Loading state */}
          {!ready && !error && (
            <div className="vp-loading">
              <Loader2 size={42} className="vp-spinner" />
              <p className="vp-loading-text">Buffering stream…</p>
              <p className="vp-loading-sub">This may take a few seconds</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="vp-error">
              <AlertTriangle size={38} className="vp-error-icon" />
              <p className="vp-error-title">Stream Unavailable</p>
              <p className="vp-error-text">{error}</p>
              <button className="btn-primary vp-retry-btn" onClick={onClose}>
                ← Back to Episodes
              </button>
            </div>
          )}

          {/* The actual video element — always in DOM so hls.js can attach */}
          <video
            ref={videoRef}
            className={`vp-video ${ready ? 'vp-video-visible' : ''}`}
            controls
            playsInline
            poster={posterUrl}
          />
        </div>
      </div>
    </div>
  );
}
