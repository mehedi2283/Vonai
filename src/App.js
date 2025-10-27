import React, { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

export default function OrbButton() {
  const apiKey = "53212b7c-2aeb-4d15-a78b-1b5eff1f8a28";
  const assistantId = "b4352104-26c5-4f90-9931-be8944ad2ab5";

  const [status, setStatus] = useState("idle");
  const [amplitude, setAmplitude] = useState(1);
  const vapiRef = useRef(null);
  const audioAnalyser = useRef(null);
  const micSource = useRef(null);
  const audioCtx = useRef(null);
  const micStream = useRef(null);

  // 🧠 Initialize Vapi
  useEffect(() => {
    const vapi = new Vapi(apiKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setStatus("connected");
      setupMicAnalyser();
    });
    vapi.on("speech-start", () => setStatus("speaking"));
    vapi.on("speech-end", () => setStatus("listening"));
    vapi.on("call-end", handleReset);
    vapi.on("error", handleReset);

    return () => {
      handleReset();
      vapi.stop();
    };
  }, [apiKey]);

  const setupMicAnalyser = async () => {
    try {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      micStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      micSource.current = audioCtx.current.createMediaStreamSource(micStream.current);
      audioAnalyser.current = audioCtx.current.createAnalyser();
      audioAnalyser.current.fftSize = 256;
      micSource.current.connect(audioAnalyser.current);

      const dataArray = new Uint8Array(audioAnalyser.current.frequencyBinCount);
      const updateAmplitude = () => {
        if (!audioAnalyser.current) return;
        audioAnalyser.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128;
        setAmplitude(1 + avg * 0.6);
        requestAnimationFrame(updateAmplitude);
      };
      updateAmplitude();
    } catch (err) {
      console.error("Microphone access failed:", err);
    }
  };

  const handleReset = () => {
    stopMicAnalyser();
    setAmplitude(1);
    setStatus("idle");
  };

  const stopMicAnalyser = () => {
    try {
      if (micStream.current) micStream.current.getTracks().forEach((t) => t.stop());
      if (audioCtx.current && audioCtx.current.state !== "closed") audioCtx.current.close();
    } catch {}
    audioCtx.current = null;
    micSource.current = null;
    audioAnalyser.current = null;
    setAmplitude(1);
  };

  const handleClick = async () => {
    if (!vapiRef.current) return;
    if (status === "idle") {
      try {
        setStatus("connecting");
        await vapiRef.current.start(assistantId);
      } catch {
        handleReset();
      }
    } else {
      try {
        await vapiRef.current.stop();
      } catch {}
      handleReset();
    }
  };

  let orbScale = 1;
  if (status === "speaking") orbScale = 1.2 + amplitude * 0.15;
  else if (status === "listening" || status === "connected") orbScale = 1.05 + amplitude * 0.08;
  else orbScale = 0.85;

  const label = {
    idle: "Talk to VONAI",
    connecting: "Connecting...",
    listening: "Listening...",
    speaking: "Speaking...",
    connected: "Connected...",
  }[status];

  return (
    <div style={styles.wrapper}>
      {/* 💎 White Glowing Orb */}
      <div
        style={{
          ...styles.orb,
          transform: `scale(${orbScale})`,
        }}
      ></div>

      {/* 🎙️ Button */}
      <button onClick={handleClick} style={styles.button} className="vonai-btn">
        <span
          key={status}
          style={{
            opacity: 0,
            animation: "fadeIn 0.4s ease forwards",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {label}
          {/* 🧭 Proper Mic Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="#00E0B8"
            style={{
              filter: "drop-shadow(0 0 4px rgba(0,224,184,0.6))",
            }}
          >
            <path d="M12 14c1.657 0 3-1.343 3-3V7a3 3 0 0 0-6 0v4c0 1.657 1.343 3 3 3zM19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 18 0h-2zM12 19a9.003 9.003 0 0 0 8.944-8H19a7 7 0 0 1-14 0H3.056A9.003 9.003 0 0 0 12 19z" />
          </svg>
        </span>
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 💥 Deep Hover Glow */
        .vonai-btn:hover {
          box-shadow: 
            0 0 35px rgba(0,224,184,0.6),
            0 0 65px rgba(108,99,255,0.3),
            inset 0 0 30px rgba(0,224,184,0.35);
          transform: scale(1);
          transition: all 0.3s ease;
        }

        .vonai-btn:active {
          transform: scale(0.97);
          box-shadow:
            0 0 20px rgba(0,224,184,0.4),
            inset 0 0 20px rgba(0,224,184,0.3);
        }
      `}</style>
    </div>
  );
}

/* 🎨 Styles */
const styles = {
  wrapper: {
    height: "100vh",
    width: "100vw",
    position: "relative",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    fontFamily: "Poppins, sans-serif",
  },
  orb: {
    position: "absolute",
    width: 240, // smaller orb
    height: 240,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.5), rgba(255,255,255,0.05) 80%)",
    boxShadow:
      "inset 0 0 30px rgba(255,255,255,0.4), inset 0 0 80px rgba(255,255,255,0.2)",
    transition: "transform 0.15s ease-in-out",
    zIndex: 1,
  },
  button: {
    position: "relative",
    backgroundColor: "#1e1e2f",
    border: "1.5px solid #00E0B8",
    borderRadius: "60px",
    padding: "16px 48px",
    fontSize: "20px",
    fontWeight: "600",
    color: "#00E0B8",
    letterSpacing: "0.5px",
    cursor: "pointer",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow:
      "0 0 12px rgba(0,224,184,0.35), inset 0 0 20px rgba(0,224,184,0.25)",
    transition: "all 0.3s ease",
  },
};
