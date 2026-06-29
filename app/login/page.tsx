"use client";

import { signIn } from "next-auth/react";
import { useState, type MouseEvent } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1a0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Georgia, serif",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#1a2e1a",
        border: "1px solid #2d4a2d",
        borderRadius: 20,
        padding: "48px 40px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 56, marginBottom: 16 }}>🍄</div>
        <h1 style={{
          fontSize: 26,
          fontWeight: "bold",
          color: "#c8e6c9",
          margin: "0 0 8px",
        }}>
          Miru Mushrooms
        </h1>
        <p style={{
          fontSize: 13,
          color: "#6a9c6a",
          letterSpacing: 2,
          textTransform: "uppercase",
          margin: "0 0 40px",
        }}>
          Booking Manager
        </p>

        {/* Divider */}
        <div style={{
          height: 1,
          background: "#2d4a2d",
          marginBottom: 32,
        }} />

        <p style={{ fontSize: 14, color: "#9ab89a", marginBottom: 24 }}>
          Sign in to access your dashboard
        </p>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "1px solid #2d4a2d",
            background: loading ? "#1a2e1a" : "#0f1a0f",
            color: loading ? "#4a7c59" : "#e8dcc8",
            fontSize: 15,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Georgia, serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => { if (!loading) e.currentTarget.style.borderColor = "#4a7c59"; }}
          onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#2d4a2d"; }}
        >
          {loading ? (
            <>
              <span style={{ fontSize: 18 }}>⏳</span>
              Signing in...
            </>
          ) : (
            <>
              {/* Google logo SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p style={{
          fontSize: 11,
          color: "#4a7c59",
          marginTop: 24,
          lineHeight: 1.6,
        }}>
          By signing in, you agree to keep booking data confidential and use this system responsibly.
        </p>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
