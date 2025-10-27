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
  if (status === "speaking") orbScale = 1.25 + amplitude * 0.2;
  else if (status === "listening" || status === "connected") orbScale = 1.05 + amplitude * 0.1;
  else orbScale = 0.9;

  const label = {
    idle: "Talk to VONAI",
    connecting: "Connecting...",
    listening: "Listening...",
    speaking: "Speaking...",
    connected: "Connected...",
  }[status];

  return (
    <div style={styles.wrapper}>
      {/* 💎 Glowing Inner Orb */}
      <div
        style={{
          ...styles.orb,
          transform: `scale(${orbScale})`,
          boxShadow: `
            inset 0 0 25px rgba(0,224,184,0.3),
            inset 0 0 80px rgba(108,99,255,0.2)
          `,
        }}
      ></div>

      {/* 🎙️ Button */}
      <button onClick={handleClick} style={styles.button}>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="#00E0B8"
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM12 19a9 9 0 0 0 9-9h-2a7 7 0 0 1-14 0H3a9 9 0 0 0 9 9z" />
          </svg>
        </span>
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100vh",
    width: "100vw",
    position: "relative",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible", // ✅ Orb can show outside
    fontFamily: "Poppins, sans-serif",
  },
  orb: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 40% 40%, rgba(108,99,255,0.25), rgba(0,224,184,0.08) 75%)",
    transition: "transform 0.15s ease-in-out",
    zIndex: 1,
  },
  button: {
    position: "relative",
    backgroundColor: "#141526",
    border: "none",
    borderRadius: "80px",
    padding: "24px 64px",
    fontSize: "26px",
    fontWeight: "600",
    color: "#00E0B8",
    letterSpacing: "0.5px",
    cursor: "pointer",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 0 20px rgba(0,224,184,0.4), 0 0 50px rgba(108,99,255,0.25), inset 0 0 30px rgba(0,224,184,0.3)",
    transition: "all 0.3s ease",
  },
};
