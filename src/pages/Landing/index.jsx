import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";
import FloatingAssistant from "../../components/assistant/FloatingAssistant.jsx";

export default function Landing() {
  // Boot Loader & Scroll Progress State
  const [bootProgress, setBootProgress] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Canvas & Visual Refs
  const canvasRef = useRef(null);
  const waveRef = useRef(null);
  const micWrapRef = useRef(null);

  // Simulator State
  const [activeTab, setActiveTab] = useState("dental");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Live Telephony Status (Public Demo API)
  const [telephonyStatus, setTelephonyStatus] = useState({
    status: "online",
    system_online: true,
    sip_registered: false,
    active_calls: 0
  });

  useEffect(() => {
    let mounted = true;
    const fetchTelephonyStatus = async () => {
      try {
        const res = await fetch("/api/v1/telephony/demo-status");
        if (res.ok) {
          const data = await res.json();
          if (mounted) setTelephonyStatus(data);
        }
      } catch (err) {
        // graceful fallback
      }
    };
    fetchTelephonyStatus();
    const interval = setInterval(fetchTelephonyStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Browser Speech Synthesis for interactive demo preview
  const toggleLiveAudio = () => {
    if (isPlayingAudio) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsPlayingAudio(true);
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingAudio(true);

    const turns = industryDemos[activeTab]?.transcript || [];
    let idx = 0;

    const speakTurn = () => {
      if (idx >= turns.length) {
        setIsPlayingAudio(false);
        return;
      }
      const item = turns[idx];
      const utter = new SpeechSynthesisUtterance(item.text);
      utter.rate = 1.0;
      utter.pitch = item.role === "user" ? 1.05 : 0.95;

      utter.onend = () => {
        idx++;
        setTimeout(speakTurn, 400);
      };
      utter.onerror = () => {
        idx++;
        if (idx < turns.length) {
          setTimeout(speakTurn, 250);
        } else {
          setIsPlayingAudio(false);
        }
      };

      window.speechSynthesis.speak(utter);
    };

    speakTurn();
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ROI Calculator State
  const [monthlyCalls, setMonthlyCalls] = useState(450);
  const [hourlyRate, setHourlyRate] = useState(24);

  // Pricing Toggle State
  const [isAnnual, setIsAnnual] = useState(true);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Boot animation effect
  useEffect(() => {
    let n = 0;
    const loader = setInterval(() => {
      n = Math.min(1, n + 0.05);
      setBootProgress(n);
      if (n >= 1) {
        clearInterval(loader);
        setTimeout(() => setBootDone(true), 300);
      }
    }, 35);
    return () => clearInterval(loader);
  }, []);

  // Starfield & Wave Animation Canvas loop
  useEffect(() => {
    const handleScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const prog = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
      setScrollProgress(prog);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const stars = [];
    for (let j = 0; j < 110; j++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        s: 0.4 + Math.random() * 1.4,
      });
    }

    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * d;
      canvas.height = window.innerHeight * d;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const startTime = Date.now();

    const render = () => {
      const t = Date.now() - startTime;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentProg = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;

      // Draw space starfield
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.49;

      for (let k = 0; k < stars.length; k++) {
        const st = stars[k];
        const drift = (currentProg - 0.5) * 0.08;
        const x = st.x * window.innerWidth + (st.x - 0.5) * drift * window.innerWidth;
        const y = st.y * window.innerHeight + (st.y - 0.5) * drift * window.innerHeight;
        const pulse = 0.45 + 0.35 * Math.sin(t * 0.001 * st.s + k);
        ctx.fillStyle = `rgba(220,240,245,${0.12 + st.z * 0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, st.s * (0.4 + st.z), 0, Math.PI * 2);
        ctx.fill();
      }

      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(window.innerWidth, window.innerHeight) * 0.46);
      g.addColorStop(0, "rgba(92,225,255,.055)");
      g.addColorStop(0.55, "rgba(183,255,92,.018)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Pulse microphone wrapper
      if (micWrapRef.current) {
        const pulse = 1 + Math.sin(t * 0.003) * 0.018;
        micWrapRef.current.style.transform = `translate(-50%, -50%) scale(${pulse})`;
      }

      // Animate wave SVG paths
      if (waveRef.current) {
        const paths = waveRef.current.querySelectorAll("path");
        const seaPhase = t * 0.0009;
        const bases = [270, 300, 330, 245];
        paths.forEach((p, q) => {
          const base = bases[q] || 270;
          const lift = Math.sin(seaPhase + q * 0.9) * 16 + Math.sin(t * 0.0014 + q * 1.7) * 7;
          const sway = Math.sin(seaPhase * 0.72 + q * 0.55) * 22;
          const d = `M-30 ${base + lift} C ${90 + sway} ${base - 65 - lift * 0.35}, ${165 - sway} ${base + 70 + lift * 0.4}, 290 ${base + lift * 0.1} S ${500 + sway * 0.5} ${base - 65 + lift * 0.25}, 620 ${base + lift * 0.25} S ${830 - sway * 0.5} ${base + 70 - lift * 0.3}, 1030 ${base - 20 + lift * 0.15}`;
          p.setAttribute("d", d);
          p.style.opacity = `${(0.52 + 0.22 * Math.sin(seaPhase + q)) * (0.7 + 0.3 * Math.sin(currentProg * Math.PI))}`;
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Industry Demos Data
  const industryDemos = {
    dental: {
      name: "Dental Clinic",
      caller: "Sarah M. (New Patient)",
      transcript: [
        { role: "user", text: "Hi, I have a severe toothache and need to book an emergency appointment for tomorrow morning." },
        { role: "ai", text: "I'm sorry to hear you're in pain! I can get you scheduled with Dr. Smith tomorrow at 9:30 AM or 11:00 AM. Which time works best for you?" },
        { role: "user", text: "9:30 AM is perfect. Do you accept Delta Dental insurance?" },
        { role: "ai", text: "Yes, we are in-network with Delta Dental PPO! I've reserved 9:30 AM for you and sent an SMS confirmation link to fill out your new patient intake." }
      ]
    },
    legal: {
      name: "Law Firm",
      caller: "Marcus T. (Legal Consultation)",
      transcript: [
        { role: "user", text: "Hello, I was involved in a car collision yesterday and need to speak with a personal injury attorney." },
        { role: "ai", text: "I understand how stressful this is. Our senior attorney handles personal injury cases. Can I ask a few quick questions to qualify your case?" },
        { role: "user", text: "Sure, go ahead." },
        { role: "ai", text: "Thank you. Were there any injuries reported, and was a police report filed at the scene?" },
        { role: "user", text: "Yes, police filed a report and I went to urgent care." },
        { role: "ai", text: "Got it. Your case qualifies for a free 30-minute consultation. I can book you with Attorney Davis today at 3:00 PM." }
      ]
    },
    realestate: {
      name: "Real Estate",
      caller: "David R. (Property Buyer)",
      transcript: [
        { role: "user", text: "Hi, I'm calling about the property listed on 742 Evergreen Terrace. Is it still available for a walkthrough?" },
        { role: "ai", text: "Hello David! Yes, 742 Evergreen Terrace is available. It's a 4-bed, 3-bath home listed at $685,000. Would you like to schedule an in-person showing this weekend?" },
        { role: "user", text: "Can we view it Saturday afternoon around 2 PM?" },
        { role: "ai", text: "Saturday at 2:00 PM is open! I've sent the calendar invite and gate code instructions to your phone." }
      ]
    },
    medical: {
      name: "Medical Practice",
      caller: "Elena R. (Prescription Renewal)",
      transcript: [
        { role: "user", text: "Hi, I need to request a refill for my blood pressure medication at CVS pharmacy." },
        { role: "ai", text: "Hello Elena! I can route your prescription refill request directly to Dr. Peterson's triage team. Can you confirm your date of birth?" },
        { role: "user", text: "March 14th, 1982." },
        { role: "ai", text: "Verified. I've sent the refill request to Dr. Peterson and selected CVS on Main St. You'll receive a confirmation text once approved!" }
      ]
    },
    autorepair: {
      name: "Auto Repair",
      caller: "James K. (Brake Inspection)",
      transcript: [
        { role: "user", text: "Hey, my Honda Civic is making a squeaking noise when braking. How much is a brake inspection?" },
        { role: "ai", text: "Hi James! Our comprehensive brake inspection is $49, which is waived if you proceed with any recommended service. We have an opening today at 4 PM." },
        { role: "user", text: "Put me down for 4 PM." },
        { role: "ai", text: "You're all set for 4:00 PM today with Shop Foreman Mike. Drive safe!" }
      ]
    }
  };

  // ROI Math
  const minutesPerCall = 4.5;
  const hoursSavedMonthly = Math.round((monthlyCalls * minutesPerCall) / 60);
  const monthlyHumanCost = Math.round(hoursSavedMonthly * hourlyRate);
  const monthlyAiCost = 149;
  const monthlySavings = Math.max(0, monthlyHumanCost - monthlyAiCost);
  const annualSavings = monthlySavings * 12;

  // FAQs Data
  const faqs = [
    {
      q: "Does the AI Receptionist sound like a real human?",
      a: "Yes! Powered by advanced ultra-low latency voice neural models, Callzenza speaks naturally with realistic pauses, proper intonation, and human-like clarity under 500ms latency."
    },
    {
      q: "Can the AI receptionist schedule appointments on my calendar?",
      a: "Absolutely. Callzenza integrates bidirectionally with Google Calendar, Outlook, Calendly, and private practice management systems to detect conflicts and book appointments instantly."
    },
    {
      q: "How does the AI answer specific questions about my business?",
      a: "You can upload your website link, PDF pricing guides, intake forms, or service manuals into our Knowledge Base (RAG engine). The AI ingests your exact business guidelines and answers caller questions accurately."
    },
    {
      q: "What happens if a call requires human escalation?",
      a: "When a call requires emergency assistance or complex legal/medical handling, the AI gracefully transfers the live call directly to your designated staff mobile or office line."
    },
    {
      q: "Can I use my existing business phone number?",
      a: "Yes! You can either port your existing number or simply enable conditional call forwarding (forwarding busy/unanswered calls to your Callzenza phone number)."
    }
  ];

  return (
    <div className="landing-container">
      {/* Boot Loader Overlay */}
      <div className={`boot${bootDone ? " done" : ""}`} id="boot">
        <div className="bar">
          <i style={{ transform: `scaleX(${bootProgress})` }} />
        </div>
        <p>INITIALIZING VOICE {Math.round(bootProgress * 100)}%</p>
      </div>

      {/* 3D Stage Background */}
      <div className="stage" aria-hidden="true">
        <canvas ref={canvasRef} id="space" />
        <div className="mic-wrap" ref={micWrapRef} id="micWrap">
          <div className="wave" ref={waveRef} id="wave">
            <svg viewBox="0 0 1000 520" preserveAspectRatio="none">
              <path className="sea-a" d="M-30 270 C 90 205, 165 340, 290 270 S 500 205, 620 270 S 830 340, 1030 250" />
              <path className="sea-b" d="M-30 300 C 95 245, 170 355, 300 300 S 510 245, 640 300 S 850 355, 1030 285" />
              <path className="sea-c" d="M-30 330 C 110 285, 185 370, 320 325 S 520 275, 665 325 S 855 375, 1030 315" />
              <path className="sea-d" d="M-30 245 C 105 180, 180 315, 305 245 S 505 185, 640 245 S 845 315, 1030 225" />
            </svg>
          </div>
          <div className="ring" />
          <div className="mic" />
          <div className="landing-floating-badge">
            <strong>LIVE VOICE</strong>
            <br />
            8kHz · STREAMING
          </div>
        </div>
        <div className="glow" />
        <div className="grain" />
      </div>

      {/* Top Scroll Meter */}
      <div className="meter" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* Header Chrome Navigation */}
      <header className="chrome">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          Callzenza
        </Link>
        <nav className="nav">
          <a href="#features">Platform</a>
          <a href="#flow">How it works</a>
          <a href="#demo">Live Demo</a>
          <a href="#roi">ROI Calculator</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link to="/signup/company" className="pill pill-outline">
            Start Free Trial
          </Link>
          <Link to="/login" className="pill">
            Sign In
          </Link>
        </nav>
      </header>

      {/* Main Page Content */}
      <main className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="lp-wrapper">
            <div className="eyebrow">
              <span className="status">
                <i style={telephonyStatus.sip_registered ? { background: "#22c55e" } : undefined} />
                {telephonyStatus.sip_registered ? "SIP Telephony Registered" : "Voice system online"}
              </span>
              <span>·</span>
              <span>{telephonyStatus.active_calls > 0 ? `${telephonyStatus.active_calls} Active Inbound Call(s)` : "Enterprise AI Reception"}</span>
            </div>

            <div className="hero-pill">
              <span className="pulse-dot" /> Next-Gen Autonomous AI Voice Agent 2.0
            </div>

            <h1 className="hero-title">
              Never Miss a Client Call Again. <br />
              <span className="text-gradient">24/7 Intelligent AI Receptionist.</span>
            </h1>

            <p className="hero-subtitle">
              Answer phone calls instantly under 500ms latency, schedule appointments on your calendar, answer complex customer FAQs, and sync records into your CRM.
            </p>

            <div className="hero-ctas">
              <Link to="/signup/company" className="btn-primary-lp btn-hero-lg">
                Get Started Free <span>→</span>
              </Link>
              <a href="#demo" className="btn-secondary-lp btn-hero-lg">
                Try Live Voice Demo 🎧
              </a>
            </div>

            {/* Key Metric Badges */}
            <div className="hero-stats-row">
              <div className="stat-item">
                <h4 className="text-gradient-cyan">&lt; 500ms</h4>
                <p>Ultra-Low Voice Latency</p>
              </div>
              <div className="stat-item">
                <h4 className="text-gradient">99.9%</h4>
                <p>Uptime & Reliability</p>
              </div>
              <div className="stat-item">
                <h4 className="text-gradient-emerald">100%</h4>
                <p>Automated Calendar Sync</p>
              </div>
              <div className="stat-item">
                <h4 className="text-gradient">50+</h4>
                <p>Supported Languages</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Voice Agent Simulator Section */}
        <section id="demo" className="lp-wrapper demo-section">
          <div className="demo-widget-container">
            <div className="eyebrow center-eyebrow">
              <span className="status">
                <i style={telephonyStatus.sip_registered ? { background: "#22c55e" } : undefined} /> 
                {telephonyStatus.sip_registered ? "Telephony Trunk Connected" : "Live Pipeline"}
              </span>
              <span>·</span>
              <span>Real-Time Voice Stream</span>
            </div>

            <div className="demo-widget-header">
              <div className="demo-widget-title">
                <h3>
                  <span>⚡</span> Live Voice Agent Simulator
                </h3>
                <p>Select your industry below to preview how Callzenza handles incoming calls in real time.</p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <Link
                  to="/demo/live-calls"
                  className="btn-secondary-lp"
                  style={{ fontSize: "13px", padding: "8px 18px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>👁️</span> Open Live Call Observer →
                </Link>
                <button
                  className="btn-primary-lp"
                  onClick={toggleLiveAudio}
                  style={{ fontSize: "13px", padding: "8px 18px" }}
                >
                  {isPlayingAudio ? "⏸ Pause Audio Demo" : "▶ Listen Live Audio"}
                </button>
              </div>
            </div>

            {/* Industry Selector Tabs */}
            <div className="industry-tabs">
              {Object.keys(industryDemos).map((key) => (
                <button
                  key={key}
                  className={`tab-btn ${activeTab === key ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(key);
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                    setIsPlayingAudio(false);
                  }}
                >
                  {industryDemos[key].name}
                </button>
              ))}
            </div>

            {/* Simulator Display Box */}
            <div className="simulator-box">
              <div className="simulator-left">
                <div className="caller-info-card">
                  <div className="caller-header">
                    <div className="avatar-call">📞</div>
                    <div className="caller-details">
                      <h5>{industryDemos[activeTab].caller}</h5>
                      <p>Incoming Call • Inbound Telephony</p>
                    </div>
                  </div>

                  {isPlayingAudio && (
                    <div className="audio-waveform-visualizer">
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                      <div className="bar" />
                    </div>
                  )}
                </div>

                <div className="status-box">
                  <div className="status-row">
                    <span>AI Agent Status:</span>
                    <span className="status-active">Active (Synthesizing Voice)</span>
                  </div>
                  <div className="status-row">
                    <span>Calendar Integration:</span>
                    <span className="status-value">Google Calendar Sync</span>
                  </div>
                </div>
              </div>

              {/* Conversation Transcript Stream */}
              <div className="simulator-right">
                {industryDemos[activeTab].transcript.map((item, idx) => (
                  <div key={idx} className={`chat-bubble ${item.role === "user" ? "chat-user" : "chat-ai"}`}>
                    <div className="chat-role">
                      {item.role === "user" ? "CALLER" : "AI RECEPTIONIST"}
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Capabilities / Features Grid */}
        <section id="features" className="features-section">
          <div className="lp-wrapper">
            <div className="section-header">
              <div className="eyebrow center-eyebrow">
                <span>Platform Capabilities</span>
              </div>
              <span className="section-badge">Platform Capabilities</span>
              <h2>Everything You Need To Automate Your Front Desk</h2>
              <p>Designed for dental clinics, law firms, medical practices, real estate agencies, and home service providers.</p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon-wrapper">📞</div>
                <h3>24/7 Instant Answering</h3>
                <p>Zero hold times or missed calls. Greet callers instantly day, night, weekends, or during peak business hours.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">📅</div>
                <h3>Calendar Auto-Booking</h3>
                <p>Direct integration with Google Calendar, Outlook, and practice management software with conflict detection.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">🧠</div>
                <h3>RAG Knowledge Base</h3>
                <p>Upload business PDFs, FAQ documents, or website URLs. The AI answers customer inquiries with 100% accuracy.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">🎙️</div>
                <h3>Custom Voice & Tone</h3>
                <p>Choose from 40+ natural neural voice tones or clone your front-desk manager's voice with custom prompt instructions.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">💬</div>
                <h3>Multi-Channel Followups</h3>
                <p>Automatically send SMS & WhatsApp appointment confirmations, directions, and pre-visit instructions immediately after calls.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">📊</div>
                <h3>Analytics & Sentiment</h3>
                <p>Track call volume, caller intent classification, sentiment trends, and audio recordings in your unified dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Savings Calculator */}
        <section id="roi" className="roi-section">
          <div className="lp-wrapper">
            <div className="section-header">
              <div className="eyebrow center-eyebrow">
                <span>Cost & Time Efficiency</span>
              </div>
              <span className="section-badge">Cost & Time Efficiency</span>
              <h2>Calculate Your Projected ROI & Savings</h2>
              <p>See how much time and money your business saves by letting AI handle routine intake calls.</p>
            </div>

            <div className="roi-card-box">
              <div className="roi-controls">
                <div className="slider-group">
                  <label>
                    <span>Monthly Incoming Calls:</span>
                    <span className="slider-val">{monthlyCalls} calls</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="25"
                    value={monthlyCalls}
                    onChange={(e) => setMonthlyCalls(Number(e.target.value))}
                    className="lp-slider"
                  />
                </div>

                <div className="slider-group">
                  <label>
                    <span>Average Receptionist Wage ($/hr):</span>
                    <span className="slider-val">${hourlyRate}/hr</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="1"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="lp-slider"
                  />
                </div>

                <div className="roi-note">
                  💡 Based on an average call duration of {minutesPerCall} minutes. Replacing manual phone answering frees up your front desk staff for high-value in-person client care.
                </div>
              </div>

              {/* Results Display */}
              <div className="roi-results-card">
                <span className="roi-results-label">
                  Projected Annual Savings
                </span>
                <div className="roi-savings-amount">${annualSavings.toLocaleString()}</div>
                <div className="roi-savings-sub">Estimated net financial savings per year</div>

                <div className="roi-metrics-grid">
                  <div className="roi-metric-item">
                    <h6>{hoursSavedMonthly} hrs</h6>
                    <p>Staff Hours Saved / Mo</p>
                  </div>
                  <div className="roi-metric-item">
                    <h6>${monthlyHumanCost.toLocaleString()}</h6>
                    <p>Equivalent Human Labor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Steps */}
        <section id="flow" className="how-section">
          <div className="lp-wrapper">
            <div className="section-header">
              <div className="eyebrow center-eyebrow">
                <span>Simple 3-Step Setup</span>
              </div>
              <span className="section-badge">Simple 3-Step Setup</span>
              <h2>Get Up & Running In Under 10 Minutes</h2>
              <p>No coding required. Connect your phone line and let AI start taking calls immediately.</p>
            </div>

            <div className="steps-timeline">
              <div className="step-card">
                <div className="step-num">01</div>
                <h3>Connect Your Phone Line</h3>
                <p>Forward busy/unanswered calls to your dedicated Callzenza phone number or port your business line.</p>
              </div>

              <div className="step-card">
                <div className="step-num">02</div>
                <h3>Upload FAQs & Calendar</h3>
                <p>Connect Google/Outlook Calendar and upload your service menu or FAQ documents into the Knowledge Base.</p>
              </div>

              <div className="step-card">
                <div className="step-num">03</div>
                <h3>Automate 100% of Calls</h3>
                <p>Sit back as your AI receptionist greets callers, answers questions, and books appointments 24/7.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="pricing-section">
          <div className="lp-wrapper">
            <div className="section-header">
              <div className="eyebrow center-eyebrow">
                <span>Flexible Pricing</span>
              </div>
              <span className="section-badge">Flexible Pricing</span>
              <h2>Simple Tiers Built For Growing Businesses</h2>
              <p>Choose the plan that fits your call volume. No long-term contracts, cancel anytime.</p>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="pricing-toggle-wrap">
              <span style={{ color: !isAnnual ? "#fff" : "var(--faint)", fontWeight: 600 }}>Monthly</span>
              <div
                className={`toggle-switch ${isAnnual ? "active" : ""}`}
                onClick={() => setIsAnnual(!isAnnual)}
              >
                <div className="toggle-knob" />
              </div>
              <span style={{ color: isAnnual ? "#fff" : "var(--faint)", fontWeight: 600 }}>Annual</span>
              <span className="discount-badge">Save 20%</span>
            </div>

            {/* Pricing Grid */}
            <div className="pricing-grid">
              <div className="pricing-card">
                <div>
                  <div className="plan-name">Starter</div>
                  <div className="plan-desc">Perfect for small solo practices & local businesses.</div>
                  <div className="plan-price">
                    ${isAnnual ? "39" : "49"}<span>/mo</span>
                  </div>
                  <ul className="plan-features">
                    <li><span>✓</span> 500 Call Minutes / month</li>
                    <li><span>✓</span> 1 Dedicated AI Receptionist</li>
                    <li><span>✓</span> Google & Outlook Calendar Sync</li>
                    <li><span>✓</span> Standard Call Transcripts</li>
                    <li><span>✓</span> Email Support</li>
                  </ul>
                </div>
                <Link to="/signup/company" className="btn-secondary-lp" style={{ textAlign: "center", display: "block" }}>
                  Start 14-Day Free Trial
                </Link>
              </div>

              <div className="pricing-card popular">
                <div className="popular-badge">Most Popular</div>
                <div>
                  <div className="plan-name">Professional</div>
                  <div className="plan-desc">For active clinics, agencies & service firms.</div>
                  <div className="plan-price">
                    ${isAnnual ? "119" : "149"}<span>/mo</span>
                  </div>
                  <ul className="plan-features">
                    <li><span>✓</span> 2,500 Call Minutes / month</li>
                    <li><span>✓</span> RAG Custom Knowledge Base</li>
                    <li><span>✓</span> Multi-Channel SMS & WhatsApp</li>
                    <li><span>✓</span> Custom Voice & Personality</li>
                    <li><span>✓</span> Real-Time Live Call Monitoring</li>
                    <li><span>✓</span> Priority 24/7 Support</li>
                  </ul>
                </div>
                <Link to="/signup/company" className="btn-primary-lp" style={{ justifyContent: "center" }}>
                  Start Free Trial <span>→</span>
                </Link>
              </div>

              <div className="pricing-card">
                <div>
                  <div className="plan-name">Enterprise</div>
                  <div className="plan-desc">For multi-location clinics & large organizations.</div>
                  <div className="plan-price">
                    Custom<span></span>
                  </div>
                  <ul className="plan-features">
                    <li><span>✓</span> Unlimited Call Minutes</li>
                    <li><span>✓</span> Dedicated Custom Voice Cloning</li>
                    <li><span>✓</span> Custom CRM & EHR Integrations</li>
                    <li><span>✓</span> HIPAA & SOC2 Compliance SLA</li>
                    <li><span>✓</span> Dedicated Account Manager</li>
                  </ul>
                </div>
                <Link to="/signup/company" className="btn-secondary-lp" style={{ textAlign: "center", display: "block" }}>
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="faq-section">
          <div className="lp-wrapper">
            <div className="section-header">
              <div className="eyebrow center-eyebrow">
                <span>Got Questions?</span>
              </div>
              <span className="section-badge">Got Questions?</span>
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about setting up your AI Receptionist.</p>
            </div>

            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                  <div
                    className="faq-question"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: "20px", color: "var(--accent)" }}>
                      {openFaq === index ? "−" : "+"}
                    </span>
                  </div>
                  {openFaq === index && (
                    <div className="faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-wrapper">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="brand">
                <span className="brand-dot" />
                AI Receptionist
              </Link>
              <p>Autonomous AI Receptionist & Voice Intelligence platform for modern service businesses.</p>
            </div>

            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#demo">Live Demo</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link to="/login">Dashboard</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Solutions</h5>
              <ul>
                <li><a href="#demo">Dental Clinics</a></li>
                <li><a href="#demo">Law Firms</a></li>
                <li><a href="#demo">Real Estate</a></li>
                <li><a href="#demo">Medical Practices</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Legal & Trust</h5>
              <ul>
                <li><a href="#faq">Privacy Policy</a></li>
                <li><a href="#faq">Terms of Service</a></li>
                <li><a href="#faq">HIPAA Compliance</a></li>
                <li><a href="#faq">SOC2 Type II</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            © {new Date().getFullYear()} Callzenza AI Receptionist. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Status Bar */}
      <footer className="foot">
        REAL-TIME VOICE · RAG KNOWLEDGE · CALENDAR SYNC · WHATSAPP + EMAIL REMINDERS
      </footer>

      {/* Floating AI Voice & Chat Receptionist Assistant */}
      <FloatingAssistant />
    </div>
  );
}
