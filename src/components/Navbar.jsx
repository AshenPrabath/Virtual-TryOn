import React from "react";
import { Sparkles, Key, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Navbar({ apiKey, onOpenSettings }) {
  const isConnected = !!apiKey;

  return (
    <header style={styles.header}>
      <div className="container" style={styles.container}>
        <div style={styles.brandGroup}>
          <div style={styles.logoCircle}>
            <Sparkles size={20} style={styles.logoIcon} />
          </div>
          <div>
            <h1 style={styles.logoText} className="serif-title">VELOUR</h1>
            <span style={styles.subText}>AI VIRTUAL FITTING STUDIO</span>
          </div>
        </div>

        <div style={styles.navActions}>
          <div 
            style={{
              ...styles.statusBadge,
              backgroundColor: isConnected ? "rgba(16, 185, 129, 0.05)" : "rgba(245, 158, 11, 0.05)",
              borderColor: isConnected ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
              color: isConnected ? "#10b981" : "#f59e0b"
            }}
          >
            {isConnected ? (
              <>
                <CheckCircle2 size={14} />
                <span style={styles.statusText}>Gemini Connected</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                <span style={styles.statusText}>API Key Required</span>
              </>
            )}
          </div>

          <button 
            style={styles.settingsBtn} 
            onClick={onOpenSettings}
            className="luxury-button-secondary"
          >
            <Key size={16} />
            <span style={styles.btnText}>API Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(6, 6, 8, 0.8)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 90,
    width: "100%"
  },
  container: {
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem"
  },
  brandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "1rem"
  },
  logoCircle: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #d4af37 0%, #8a2be2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(212, 175, 55, 0.2)"
  },
  logoIcon: {
    color: "#060608"
  },
  logoText: {
    fontSize: "1.75rem",
    fontWeight: "700",
    letterSpacing: "0.15em",
    lineHeight: "1",
    margin: 0,
    background: "linear-gradient(180deg, #ffffff 0%, #a3a3a3 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  subText: {
    fontSize: "0.65rem",
    letterSpacing: "0.2em",
    color: "#d4af37",
    fontWeight: "600",
    display: "block",
    marginTop: "2px"
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem"
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.85rem",
    borderRadius: "30px",
    border: "1px solid",
    fontSize: "0.85rem",
    fontWeight: "500"
  },
  statusText: {
    "@media (max-width: 640px)": {
      display: "none"
    }
  },
  settingsBtn: {
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  btnText: {
    "@media (max-width: 640px)": {
      display: "none"
    }
  }
};
