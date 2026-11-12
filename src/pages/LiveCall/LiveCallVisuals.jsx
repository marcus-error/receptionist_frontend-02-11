import React from "react";

/**
 * Animated Neon Waveform Bars for Left (Cyan) and Right (Purple) flanks
 */
export function AudioWaveformBars({ color = "cyan", isLive = true }) {
  const bars = [
    { height: 8, delay: 0.1 },
    { height: 16, delay: 0.35 },
    { height: 28, delay: 0.15 },
    { height: 42, delay: 0.4 },
    { height: 22, delay: 0.2 },
    { height: 50, delay: 0.5 },
    { height: 35, delay: 0.25 },
    { height: 56, delay: 0.45 },
    { height: 40, delay: 0.1 },
    { height: 26, delay: 0.3 },
    { height: 48, delay: 0.55 },
    { height: 20, delay: 0.18 },
    { height: 12, delay: 0.42 },
  ];

  return (
    <div
      className={`audio-waveform-bars wave-${color} ${isLive ? "active" : "idle"}`}
      style={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className="waveform-bar"
          style={{
            "--base-h": `${bar.height}px`,
            animationDelay: `${bar.delay}s`,
            animationDuration: `${0.8 + (i % 5) * 0.15}s`
          }}
        />
      ))}
    </div>
  );
}

/**
 * Centerpiece Robot Face Avatar with Headset & Glowing Rings
 */
export function CenterpieceAvatar({ isLive = true, phase = "idle" }) {
  return (
    <div className={`centerpiece-avatar-container ${isLive ? "is-live" : ""} phase-${phase}`}>
      {/* Outer ambient glow */}
      <div className="centerpiece-outer-glow" />

      {/* Rotating gradient ring */}
      <div className="centerpiece-gradient-ring" />

      {/* Secondary inner ring */}
      <div className="centerpiece-inner-ring" />

      {/* Main core circle */}
      <div className="centerpiece-core">
        <svg
          viewBox="0 0 100 100"
          className="centerpiece-robot-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Headset Arc */}
          <path
            d="M 22 52 C 22 28 34 16 50 16 C 66 16 78 28 78 52"
            stroke="url(#centerpieceHeadsetGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Left Earpiece */}
          <rect
            x="17"
            y="44"
            width="8"
            height="18"
            rx="4"
            fill="#13B8FF"
            filter="url(#centerpieceGlow)"
          />

          {/* Right Earpiece */}
          <rect
            x="75"
            y="44"
            width="8"
            height="18"
            rx="4"
            fill="#873CFF"
            filter="url(#centerpieceGlow)"
          />

          {/* Microphone boom */}
          <path
            d="M 21 58 Q 24 74 42 74"
            stroke="#13B8FF"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Mic tip */}
          <circle cx="43" cy="74" r="3.5" fill="#38BDF8" filter="url(#centerpieceGlow)" />

          {/* Robot Head Body */}
          <rect
            x="29"
            y="32"
            width="42"
            height="34"
            rx="14"
            fill="#FFFFFF"
            filter="url(#robotHeadShadow)"
          />

          {/* Robot Screen/Face Plate */}
          <rect
            x="33"
            y="36"
            width="34"
            height="26"
            rx="10"
            fill="#0B132B"
          />

          {/* Smiling Eyes */}
          <circle cx="43" cy="47" r="3.2" fill="#13B8FF" filter="url(#centerpieceGlow)" />
          <circle cx="57" cy="47" r="3.2" fill="#13B8FF" filter="url(#centerpieceGlow)" />
          
          {/* Friendly Smile */}
          <path
            d="M 45 54 Q 50 58 55 54"
            stroke="#13B8FF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cheerful blush dots */}
          <circle cx="39" cy="53" r="1.5" fill="#873CFF" opacity="0.7" />
          <circle cx="61" cy="53" r="1.5" fill="#873CFF" opacity="0.7" />

          <defs>
            <linearGradient id="centerpieceHeadsetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#13B8FF" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#873CFF" />
            </linearGradient>

            <filter id="centerpieceGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="robotHeadShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/**
 * Futuristic Glowing AI Humanoid Head Profile (For Live AI Analysis Card)
 */
export function AiHeadProfileSvg() {
  return (
    <div className="ai-head-profile-container">
      <svg
        viewBox="0 0 160 160"
        className="ai-head-profile-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="headNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#873CFF" />
            <stop offset="100%" stopColor="#13B8FF" />
          </linearGradient>

          <linearGradient id="glowGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#873CFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#13B8FF" stopOpacity="0.0" />
          </linearGradient>

          <filter id="cyberGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Back Glow */}
        <ellipse cx="95" cy="75" rx="45" ry="55" fill="url(#glowGlow)" filter="blur(15px)" />

        {/* Profile Silhouette Outline (facing left) */}
        <path
          d="M 130 145 C 120 130 115 110 112 95 C 110 75 118 45 105 25 C 92 8 68 8 50 18 C 36 26 30 40 32 55 C 33 60 30 65 24 70 C 20 73 21 78 26 80 C 31 82 34 85 34 90 C 34 96 26 102 32 108 C 38 114 46 114 55 125 C 65 137 75 145 95 150"
          stroke="url(#headNeonGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#cyberGlow)"
        />

        {/* Cybernetic Neural Mesh Lines */}
        <path
          d="M 52 28 Q 75 42 85 70 T 95 120"
          stroke="#873CFF"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.75"
        />
        <path
          d="M 40 50 Q 60 55 80 62 T 110 85"
          stroke="#13B8FF"
          strokeWidth="1.2"
          strokeDasharray="2 3"
          opacity="0.8"
        />
        <path
          d="M 68 18 Q 85 32 98 52 T 106 100"
          stroke="#C084FC"
          strokeWidth="1"
          opacity="0.6"
        />
        <path
          d="M 35 90 Q 55 92 78 98 T 100 135"
          stroke="#38BDF8"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          opacity="0.7"
        />

        {/* Glowing Neural Dots */}
        <circle cx="50" cy="18" r="2.5" fill="#C084FC" filter="url(#cyberGlow)" />
        <circle cx="32" cy="55" r="2.2" fill="#13B8FF" filter="url(#cyberGlow)" />
        <circle cx="75" cy="42" r="2" fill="#FFFFFF" />
        <circle cx="85" cy="70" r="2.8" fill="#13B8FF" filter="url(#cyberGlow)" />
        <circle cx="60" cy="55" r="2.2" fill="#873CFF" />
        <circle cx="105" cy="25" r="2.5" fill="#873CFF" filter="url(#cyberGlow)" />
        <circle cx="98" cy="52" r="2" fill="#38BDF8" />
        <circle cx="112" cy="95" r="2.5" fill="#13B8FF" />
        <circle cx="78" cy="98" r="2.2" fill="#C084FC" />
        <circle cx="55" cy="125" r="2.5" fill="#38BDF8" filter="url(#cyberGlow)" />
        
        {/* Glowing cybernetic eye dot & beam */}
        <circle cx="42" cy="62" r="3" fill="#13B8FF" filter="url(#cyberGlow)" />
        <line x1="42" y1="62" x2="15" y2="62" stroke="#13B8FF" strokeWidth="1.5" opacity="0.6" strokeDasharray="3 3" />

        {/* Ear tech module rings */}
        <circle cx="82" cy="78" r="9" stroke="#873CFF" strokeWidth="1.8" opacity="0.8" />
        <circle cx="82" cy="78" r="5" fill="#873CFF" opacity="0.4" />
        <circle cx="82" cy="78" r="2" fill="#FFFFFF" filter="url(#cyberGlow)" />
      </svg>
    </div>
  );
}

/**
 * 3D Cute Friendly AI Receptionist Robot with Headset & "AI" Chest Badge
 * (For Receptionist State Card)
 */
export function AiRobotAssistantSvg() {
  return (
    <div className="ai-robot-assistant-container">
      <svg
        viewBox="0 0 160 170"
        className="ai-robot-assistant-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="robotBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="robotVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="robotHeadsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13B8FF" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="aiBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <filter id="robotShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.45" />
          </filter>

          <filter id="neonEyeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="80" cy="158" rx="42" ry="7" fill="#000000" opacity="0.35" filter="blur(5px)" />

        {/* Floating Robot Main Group with hover animation */}
        <g className="robot-floating-group">
          {/* Headset Arc */}
          <path
            d="M 38 46 C 36 18 56 12 80 12 C 104 12 124 18 122 46"
            stroke="url(#robotHeadsetGrad)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Left Earpiece / Headphone Cup */}
          <rect
            x="30"
            y="36"
            width="12"
            height="26"
            rx="6"
            fill="url(#robotHeadsetGrad)"
            filter="url(#robotShadow)"
          />
          <circle cx="36" cy="49" r="3" fill="#38BDF8" filter="url(#neonEyeGlow)" />

          {/* Right Earpiece / Headphone Cup */}
          <rect
            x="118"
            y="36"
            width="12"
            height="26"
            rx="6"
            fill="url(#robotHeadsetGrad)"
            filter="url(#robotShadow)"
          />
          <circle cx="124" cy="49" r="3" fill="#38BDF8" filter="url(#neonEyeGlow)" />

          {/* Curved Microphone Boom */}
          <path
            d="M 36 56 Q 42 78 64 78"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {/* Microphone Tip */}
          <rect x="62" y="73" width="9" height="10" rx="4" fill="#38BDF8" filter="url(#neonEyeGlow)" />

          {/* Arms */}
          {/* Left Arm */}
          <ellipse
            cx="32"
            cy="104"
            rx="8"
            ry="16"
            transform="rotate(-15 32 104)"
            fill="url(#robotBodyGrad)"
            filter="url(#robotShadow)"
          />
          {/* Left Hand Pad */}
          <circle cx="28" cy="116" r="4.5" fill="#38BDF8" />

          {/* Right Arm */}
          <ellipse
            cx="128"
            cy="104"
            rx="8"
            ry="16"
            transform="rotate(15 128 104)"
            fill="url(#robotBodyGrad)"
            filter="url(#robotShadow)"
          />
          {/* Right Hand Pad */}
          <circle cx="132" cy="116" r="4.5" fill="#38BDF8" />

          {/* Robot Torso / Body */}
          <path
            d="M 52 82 C 52 80 108 80 108 82 C 114 96 116 118 106 136 C 98 148 62 148 54 136 C 44 118 46 96 52 82 Z"
            fill="url(#robotBodyGrad)"
            filter="url(#robotShadow)"
          />

          {/* Body Highlight / Contour */}
          <path
            d="M 58 86 C 66 84 94 84 102 86 C 105 98 104 114 98 128 C 92 136 68 136 62 128 C 56 114 55 98 58 86 Z"
            fill="#FFFFFF"
            opacity="0.3"
          />

          {/* Circular Chest Display with "AI" */}
          <circle cx="80" cy="110" r="14" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
          <circle cx="80" cy="110" r="12" fill="url(#aiBadgeGrad)" filter="url(#softGlow)" opacity="0.3" />
          <circle cx="80" cy="110" r="10" fill="#0B132B" />
          <text
            x="80"
            y="114"
            textAnchor="middle"
            fill="#38BDF8"
            fontSize="9"
            fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif"
            filter="url(#neonEyeGlow)"
            letterSpacing="0.05em"
          >
            AI
          </text>

          {/* Neck Joint */}
          <ellipse cx="80" cy="80" rx="14" ry="4" fill="#64748B" />

          {/* Robot Head */}
          <rect
            x="44"
            y="24"
            width="72"
            height="54"
            rx="24"
            fill="url(#robotBodyGrad)"
            filter="url(#robotShadow)"
          />

          {/* Glossy Top Head Highlight */}
          <ellipse cx="80" cy="30" rx="22" ry="4" fill="#FFFFFF" opacity="0.8" />

          {/* Head Visor / Face Screen */}
          <rect
            x="50"
            y="30"
            width="60"
            height="40"
            rx="18"
            fill="url(#robotVisorGrad)"
          />

          {/* Glowing Eyes */}
          {/* Left Eye */}
          <ellipse cx="66" cy="48" rx="6" ry="7" fill="#13B8FF" filter="url(#neonEyeGlow)" />
          <circle cx="67.5" cy="46" r="2.2" fill="#FFFFFF" />

          {/* Right Eye */}
          <ellipse cx="94" cy="48" rx="6" ry="7" fill="#13B8FF" filter="url(#neonEyeGlow)" />
          <circle cx="95.5" cy="46" r="2.2" fill="#FFFFFF" />

          {/* Happy Curved Smile */}
          <path
            d="M 73 57 Q 80 63 87 57"
            stroke="#13B8FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            filter="url(#neonEyeGlow)"
          />
        </g>
      </svg>
    </div>
  );
}

