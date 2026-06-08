import { useState, useEffect, useRef } from 'react';

const introVideo = "https://nebulaanimeblob.blob.core.windows.net/imgandvids/video_intro.mp4";

/**
 * SplashScreen
 * -----------
 * Fullscreen cinematic intro that plays video_intro.mp4 once per session.
 * After the video ends (or the user skips), it fades out and calls onDone().
 * Session flag is stored in sessionStorage so it only fires once per tab visit.
 */
export default function SplashScreen({ onDone, isStalled = false }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fading' | 'done' | 'stalled'
  const [progress, setProgress] = useState(0);

  const dismiss = () => {
    if (phase === 'done' || phase === 'fading') return;
    
    if (isStalled) {
      setPhase('stalled');
      return;
    }

    setPhase('fading');
    setTimeout(() => {
      setPhase('done');
      onDone();
    }, 700);
  };

  useEffect(() => {
    if (phase === 'stalled' && !isStalled) {
      dismiss();
    }
  }, [isStalled, phase]);

  // Auto-start & track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      // Autoplay blocked (shouldn't happen since muted) — skip immediately
      dismiss();
    });

    const onEnd = () => dismiss();
    const onTime = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('ended', onEnd);
    video.addEventListener('timeupdate', onTime);
    return () => {
      video.removeEventListener('ended', onEnd);
      video.removeEventListener('timeupdate', onTime);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      className={`splash-overlay ${phase === 'fading' ? 'splash-fade-out' : ''}`}
      aria-label="Intro splash screen"
    >
      {/* Background video */}
      <video
        ref={videoRef}
        className="splash-video"
        src={introVideo}
        playsInline
        preload="auto"
        autoPlay
        muted
      />

      {/* Dark gradient vignette */}
      <div className="splash-vignette" />


      {/* Bottom controls */}
      <div className="splash-controls">
        {/* Progress bar */}
        <div className="splash-progress-track">
          <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Loading indicator only shown when auth data is still fetching */}
        {phase === 'stalled' && (
          <div className="splash-stalled-text" style={{ fontSize: '13px', color: '#a78bfa', letterSpacing: '1px' }}>
            <span className="chat-typing-bubble" style={{background: 'transparent', padding: 0, minHeight: 'unset', display: 'inline-flex', marginRight: '6px'}}>
              <span className="chat-typing-dot"></span>
              <span className="chat-typing-dot"></span>
              <span className="chat-typing-dot"></span>
            </span>
            Loading User Profile...
          </div>
        )}
      </div>
    </div>
  );
}
