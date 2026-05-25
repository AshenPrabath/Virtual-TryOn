import React, { useState } from "react";
import { X, Key, ShieldCheck, RefreshCw, AlertCircle, Cpu } from "lucide-react";
import { testApiKeyConnection } from "../services/geminiService";

const MODELS = [
  { value: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Recommended)", description: "Ultra-fast analysis model for profile extraction" },
  { value: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Stable fast analysis model" },
  { value: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Deep reasoning, best for complex analysis" }
];

export default function ApiKeyModal({ isOpen, onClose, apiKey, apiModel, useSandbox, onSaveKey }) {
  const [inputKey, setInputKey] = useState(apiKey || "");
  const [selectedModel, setSelectedModel] = useState(apiModel || "gemini-2.5-flash");
  const [sandboxToggled, setSandboxToggled] = useState(useSandbox);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputKey.trim()) {
      setTestResult("error");
      setErrorMessage("Please enter an API key first.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setErrorMessage("");
    try {
      const isConnected = await testApiKeyConnection(inputKey.trim(), selectedModel);
      if (isConnected) {
        setTestResult("success");
      } else {
        setTestResult("error");
        setErrorMessage("Unexpected API response. Check key permissions.");
      }
    } catch (err) {
      setTestResult("error");
      setErrorMessage(err.message || "Failed to connect to Google API.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveKey(inputKey.trim(), selectedModel, sandboxToggled);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="glass-card">
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Key style={styles.titleIcon} size={20} />
            <h3 style={styles.title} className="serif-title">Google Gemini Developer Settings</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.infoText}>
            Configure your <strong>Google Gemini API Key</strong>. The analysis model below is used to 
            extract your physical profile. Virtual try-on images are generated using <strong>Gemini 2.5 Flash Image (Nano Banana)</strong> automatically — no extra configuration needed.
          </p>

          <div style={styles.securityNote}>
            <ShieldCheck size={18} style={styles.securityIcon} />
            <span>Your credentials are stored securely in browser `localStorage` and never exit to outside servers.</span>
          </div>


          {/* Model Selection Dropdown */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Cpu size={12} style={{ color: "#d4af37", marginRight: "4px" }} />
              Active AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setTestResult(null);
              }}
              style={styles.select}
              className="luxury-input"
            >
              {MODELS.map(model => (
                <option key={model.value} value={model.value} style={styles.option}>
                  {model.name}
                </option>
              ))}
            </select>
            <span style={styles.modelHelper}>
              {MODELS.find(m => m.value === selectedModel)?.description}
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Gemini API Key</label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestResult(null);
              }}
              style={{
                ...styles.input,
                borderColor: testResult === 'success' ? '#10b981' : testResult === 'error' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'
              }}
              className="luxury-input"
            />
          </div>

          {testResult === 'success' && (
            <div style={styles.successBox}>
              <ShieldCheck size={18} style={{ color: "#10b981" }} />
              <span>Connection Successful! Model `{selectedModel}` is responsive.</span>
            </div>
          )}

          {testResult === 'error' && (
            <div style={styles.errorBox}>
              <AlertCircle size={18} style={{ color: "#ef4444" }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button 
            onClick={handleTest} 
            disabled={testing}
            style={styles.testBtn}
            className="luxury-button-secondary"
          >
            {testing ? <RefreshCw className="shimmer" size={16} /> : "Test Connection"}
          </button>
          
          <button 
            onClick={handleSave} 
            disabled={!inputKey.trim()}
            style={styles.saveBtn}
            className="luxury-button"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem"
  },
  modal: {
    width: "100%",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  header: {
    padding: "1.5rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem"
  },
  titleIcon: {
    color: "#d4af37"
  },
  title: {
    fontSize: "1.25rem",
    margin: 0,
    color: "#f5f5f7"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ea0a8",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.2s"
  },
  body: {
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem"
  },
  infoText: {
    fontSize: "0.95rem",
    lineHeight: "1.5",
    color: "#9ea0a8",
    margin: 0
  },
  securityNote: {
    display: "flex",
    gap: "0.75rem",
    padding: "0.85rem",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "#5e6066",
    lineHeight: "1.4"
  },
  securityIcon: {
    color: "#5e6066",
    flexShrink: 0
  },
  sandboxToggleBox: {
    display: "flex",
    gap: "1rem",
    padding: "1rem",
    border: "1px solid",
    borderRadius: "10px",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.2s"
  },
  toggleMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem"
  },
  toggleTitle: {
    fontSize: "0.9rem",
    color: "#f5f5f7",
    fontWeight: "600"
  },
  toggleDesc: {
    fontSize: "0.75rem",
    color: "#9ea0a8",
    lineHeight: "1.4"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "#9ea0a8",
    display: "flex",
    alignItems: "center"
  },
  select: {
    cursor: "pointer",
    background: "rgba(0, 0, 0, 0.5)",
    padding: "0.75rem"
  },
  option: {
    background: "#101014",
    color: "#f5f5f7"
  },
  modelHelper: {
    fontSize: "0.75rem",
    color: "#5e6066",
    fontStyle: "italic",
    marginTop: "2px"
  },
  input: {
    fontSize: "0.95rem",
    letterSpacing: "0.05em"
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    color: "#10b981"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    color: "#ef4444"
  },
  footer: {
    padding: "1.25rem 1.5rem",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    backgroundColor: "rgba(0, 0, 0, 0.15)"
  },
  testBtn: {
    padding: "0.75rem 1.25rem",
    fontSize: "0.9rem"
  },
  saveBtn: {
    padding: "0.75rem 1.25rem",
    fontSize: "0.9rem",
    textTransform: "none"
  }
};
