"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

export interface UserMenuProps {
  session: Session | null;
  isMobile: boolean | null;
}

export function UserMenu({ session, isMobile }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  if (!session?.user) return null;

  const { name, email, image } = session.user;
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: isMobile ? "6px 10px" : "6px 12px",
          borderRadius: 24,
          border: "1px solid #2d4a2d",
          background: open ? "#2d4a2d" : "transparent",
          cursor: "pointer",
          fontFamily: "Georgia, serif",
          transition: "all 0.2s",
        }}
      >
        {image ? (
          <img
            src={image}
            alt={name || "User"}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#4a7c59",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: "bold",
              color: "white",
            }}
          >
            {initials}
          </div>
        )}
        {!isMobile && (
          <span
            style={{
              fontSize: 13,
              color: "#c8e6c9",
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name || email}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#6a9c6a" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 200,
              background: "#1a2e1a",
              border: "1px solid #2d4a2d",
              borderRadius: 12,
              padding: 16,
              minWidth: 220,
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #2d4a2d",
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: "bold", color: "#c8e6c9" }}
              >
                {name}
              </div>
              <div style={{ fontSize: 11, color: "#6a9c6a", marginTop: 2 }}>
                {email}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #7f1d1d",
                background: "transparent",
                color: "#f87171",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
