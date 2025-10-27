import React, { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

export default function VonaiOrb() {
  const apiKey = "53212b7c-2aeb-4d15-a78b-1b5eff1f8a28";
  const assistantId = "b4352104-26c5-4f90-9931-be8944ad2ab5";

  const [status, setStatus] = useState("idle");
  const [displayText, setDisplayText] = useState("Beszélj Vonai-Val");
  const [fade, setFade] = useState(true);
  const [amplitude, setAmplitude] = useState(1);
  const vapiRef = useRef(null);
  const audioAnalyser = useRef(null);
  const micSource = useRef(null);
  const audioCtx = useRef(null);
  const micStream = useRef(null);
  const stopRequested = useRef(false);

  /* 🧠 INIT VAPI */
  useEffect(() => {
    const vapi = new Vapi(apiKey);
    vapiRef.current = vapi;
    vapi.on("call-start", () => {
      stopRequested.current = false;
      setStatus("connected");
      setupMicAnalyser();
    });
    vapi.on("speech-start", () => !stopRequested.current && setStatus("speaking"));
    vapi.on("speech-end", () => !stopRequested.current && setStatus("listening"));
    vapi.on("call-end", () => handleReset(true));
    vapi.on("error", () => handleReset(true));
    return () => {
      handleReset(true);
      vapi.stop();
    };
  }, [apiKey]);

  /* 🎚 Fade Text */
  useEffect(() => {
    setFade(false);
    const t = setTimeout(() => {
      const map = {
        connecting: "Kapcsolódás…",
        speaking: "Beszél…",
        listening: "Figyel…",
        idle: "Beszélj Vonai-Val",
      };
      setDisplayText(map[status] || "Beszélj Vonai-Val");
      setFade(true);
    }, 180);
    return () => clearTimeout(t);
  }, [status]);

  /* 🎤 Mic */
  const setupMicAnalyser = async () => {
    try {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      micSource.current = audioCtx.current.createMediaStreamSource(micStream.current);
      audioAnalyser.current = audioCtx.current.createAnalyser();
      audioAnalyser.current.fftSize = 256;
      micSource.current.connect(audioAnalyser.current);
      const data = new Uint8Array(audioAnalyser.current.frequencyBinCount);
      const loop = () => {
        if (!audioAnalyser.current || stopRequested.current) return;
        audioAnalyser.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 128;
        setAmplitude(1 + avg * 0.8);
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      console.error("Mic error:", e);
    }
  };
  const stopMicAnalyser = () => {
    try {
      micStream.current?.getTracks().forEach((t) => t.stop());
      audioCtx.current?.state !== "closed" && audioCtx.current?.close();
    } catch {}
    audioCtx.current = micSource.current = audioAnalyser.current = null;
    setAmplitude(1);
  };
  const handleReset = (instant = false) => {
    stopRequested.current = true;
    stopMicAnalyser();
    setAmplitude(1);
    setStatus("idle");
    instant && vapiRef.current?.stop();
  };

  /* 🎬 Start / Stop */
  const handleClick = async () => {
    if (!vapiRef.current) return;
    if (status === "idle") {
      try {
        setStatus("connecting");
        stopRequested.current = false;
        await vapiRef.current.start(assistantId);
      } catch {
        handleReset(true);
      }
    } else {
      stopRequested.current = true;
      try {
        await vapiRef.current.stop();
      } catch {}
      handleReset(true);
    }
  };

  /* 🔮 Orb Pulse */
  let orbScale = 1;
  if (status === "speaking") orbScale = 1.25 + amplitude * 0.25;
  else if (["listening", "connected"].includes(status)) orbScale = 1.05 + amplitude * 0.1;

  const micColor = "#00E0B8";

  return (
    <div style={s.container}>
      {/* ORB */}
      <div style={{ ...s.orb, transform: `scale(${orbScale})` }} />
      {/* BUTTON */}
      <button onClick={handleClick} style={s.button}>
        <span style={{ ...s.text, opacity: fade ? 1 : 0, transition: "opacity .4s ease" }}>
          {displayText}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width="28"
          height="28"
          fill="none"
          style={{
            marginLeft: 8,
            transition: "transform .3s ease",
            transform:
              status === "speaking"
                ? "scale(1.15)"
                : status === "listening"
                ? "scale(1.05)"
                : "scale(1)",
          }}
        >
          <rect x="26" y="14" width="12" height="24" rx="6" fill={micColor} />
          <path d="M32 42V50" stroke={micColor} strokeWidth="3" strokeLinecap="round" />
          <path
            d="M22 30V32C22 37.5 26.5 42 32 42C37.5 42 42 37.5 42 32V30"
            stroke={micColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M16 26V36M48 26V36"
            stroke={micColor}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </button>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0% {transform:scale(1);opacity:.85;}
          50%{transform:scale(1.07);opacity:1;}
          100%{transform:scale(1);opacity:.85;}
        }
        button:hover{
          transform:scale(1.03);
          box-shadow:
            inset 0 0 25px rgba(0,224,184,0.4),
            0 0 50px rgba(0,224,184,0.2),
            0 0 80px rgba(108,99,255,0.15);
        }
      `}</style>
    </div>
  );
}

/* 🎨 Styles */
const s = {
  container: {
    position: "relative",
    width: "100%",
    height: 400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 40% 40%, rgba(108,99,255,0.18), rgba(0,224,184,0.08) 70%)",
    boxShadow:
      "0 0 90px rgba(108,99,255,0.25), 0 0 160px rgba(0,224,184,0.15)",
    transition: "transform .2s ease-out",
    zIndex: 1,
  },
  button: {
    position: "relative",
    zIndex: 10,
    width: 340,
    height: 82,
    border: "none",
    borderRadius: 60,
    cursor: "pointer",
    background: "#1B1B2F",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    fontFamily: "Poppins, sans-serif",
    fontWeight: 700,
    fontSize: 26,
    color: "#00E0B8",
    letterSpacing: "0.3px",
    transition: "all .25s ease",
    /* ✨ EXACT BOX-SHADOW LAYERS */
    boxShadow: `
      inset 0 0 20px rgba(0,224,184,0.35),
      inset 0 0 60px rgba(0,224,184,0.12),
      0 0 20px rgba(0,224,184,0.15),
      0 0 40px rgba(0,224,184,0.1)
    `,
  },
  text: { userSelect: "none" },
};
