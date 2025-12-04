import { useEffect, useRef, useState } from "react";
import './splash.css';

type Props = {
  onFinish: () => void;
  duration?: number;
};

export default function SplashScreen({ onFinish, duration = 6000 }: Props) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // start main timer that initiates exit animation
    timerRef.current = window.setTimeout(() => initiateExit(), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  function initiateExit() {
    setExiting(true);
    // wait for exit animation to complete before calling onFinish
    window.setTimeout(() => onFinish(), 650);
  }

  function handleEnterClick() {
    // immediately start exit animation
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    initiateExit();
  }

  return (
    <div className={`splash-root ${exiting ? 'exiting' : ''}`} role="dialog" aria-label="Chào mừng">
      <div className="splash-card">
        <div className="splash-logo" aria-hidden>
          <svg viewBox="0 0 120 120" className="splash-logo-svg">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#7c3aed" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="48" fill="url(#g)" opacity="0.12" />
            <g transform="translate(20,20)">
              <rect x="10" y="6" width="80" height="60" rx="10" fill="#fff" opacity="0.06" />
              <path d="M14 16h52v6H14zM14 30h36v6H14zM14 44h24v6H14z" fill="url(#g)" opacity="0.95" />
            </g>
            <g className="ring" transform="translate(60,60)">
              <circle r="46" className="ring-outer" fill="none" stroke="url(#g)" strokeWidth="3" strokeOpacity="0.22" />
            </g>
          </svg>
        </div>

        <h1 className="splash-title">Chào mừng đến với QQ E‑commerce</h1>
        <p className="splash-sub">Trải nghiệm mua sắm nhanh, an toàn và đáng tin cậy</p>

        <div className="splash-progress" aria-hidden>
          <div className="bar" style={{ animationDuration: `${duration}ms` }} />
        </div>

        <div className="splash-actions">
          <button className="splash-enter" onClick={handleEnterClick} aria-label="Vào trang">
            Vào trang
          </button>
        </div>

        <div className="splash-copyright">© {new Date().getFullYear()} QQ E‑commerce</div>
      </div>
    </div>
  );
}
