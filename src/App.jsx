import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import ApiKeyModal from "./components/ApiKeyModal";
import UserProfileSection from "./components/UserProfileSection";
import WardrobeSection from "./components/WardrobeSection";
import FittingRoomSection from "./components/FittingRoomSection";
import ResultsGallery from "./components/ResultsGallery";
import { AlertCircle, ArrowRight, HelpCircle } from "lucide-react";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("velour_gemini_api_key") || "");
  const [apiModel, setApiModel] = useState(() => localStorage.getItem("velour_gemini_api_model") || "gemini-2.5-flash");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState("profile"); // 'profile' | 'wardrobe' | 'fitting' | 'results'

  // Core state
  const [userImages, setUserImages] = useState([]);
  const [physicalProfile, setPhysicalProfile] = useState("");
  const [selectedCloth, setSelectedCloth] = useState(null);

  // Results — filled progressively as each pose completes
  const [results, setResults] = useState([]);
  const [expectedResultCount, setExpectedResultCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Keep FittingRoomSection mounted while generating so background loop continues
  // We hide it visually but don't unmount it
  const fittingSectionMounted = activeStep === "fitting" || (isGenerating && activeStep === "results");

  useEffect(() => {
    if (!apiKey) {
      setTimeout(() => setIsSettingsOpen(true), 800);
    }
  }, [apiKey]);

  const handleSaveKey = (key, model) => {
    setApiKey(key);
    setApiModel(model);
    localStorage.setItem("velour_gemini_api_key", key);
    localStorage.setItem("velour_gemini_api_model", model);
  };

  /**
   * Called after each individual pose completes.
   * First call triggers the page transition to results.
   */
  const handleResultAvailable = (result, total) => {
    setResults(prev => {
      const updated = [...prev, result];
      if (updated.length === 1) {
        // First result ready — switch to results page immediately
        setActiveStep("results");
        setExpectedResultCount(total);
      }
      return updated;
    });
  };

  /** Called when generation loop finishes (all poses done or error). */
  const handleGenerationDone = () => {
    setIsGenerating(false);
  };

  /** Called when user clicks "Render Fitting" */
  const handleGenerationStart = () => {
    setResults([]);
    setExpectedResultCount(0);
    setIsGenerating(true);
  };

  const handleReset = () => {
    setResults([]);
    setExpectedResultCount(0);
    setIsGenerating(false);
    setSelectedCloth(null);
    setActiveStep("wardrobe");
  };

  return (
    <>
      <Navbar apiKey={apiKey} onOpenSettings={() => setIsSettingsOpen(true)} />

      <main style={styles.mainContent}>
        <div className="container">

          {/* API key alert */}
          {!apiKey && (
            <div style={styles.keyAlert} className="glass-card">
              <div style={styles.alertContent}>
                <AlertCircle size={18} style={{ color: "#d4af37" }} />
                <span>
                  <strong>Configuration Required:</strong> Click <strong>API Settings</strong> to enter your Google Gemini API key.
                </span>
              </div>
              <button onClick={() => setIsSettingsOpen(true)} style={styles.alertActionBtn} className="luxury-button">
                Configure Now
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Wizard header */}
          <div className="wizard-header">
            <button
              onClick={() => { if (userImages.length > 0) setActiveStep("profile"); }}
              disabled={userImages.length === 0}
              className={`wizard-step-tab ${activeStep === "profile" ? "active" : ""} ${userImages.length > 0 ? "completed" : ""}`}
            >
              <div className="wizard-step-number">1</div>
              <span>Identity Profile</span>
            </button>

            <button
              onClick={() => { if (userImages.length > 0 && physicalProfile) setActiveStep("wardrobe"); }}
              disabled={!userImages.length || !physicalProfile}
              className={`wizard-step-tab ${activeStep === "wardrobe" ? "active" : ""} ${selectedCloth ? "completed" : ""}`}
            >
              <div className="wizard-step-number">2</div>
              <span>Selected Apparel</span>
            </button>

            <button
              onClick={() => {
                if (userImages.length > 0 && physicalProfile && selectedCloth) {
                  setActiveStep("fitting");
                }
              }}
              disabled={!userImages.length || !physicalProfile || !selectedCloth}
              className={`wizard-step-tab ${activeStep === "fitting" ? "active" : ""} ${results.length > 0 ? "completed" : ""}`}
            >
              <div className="wizard-step-number">3</div>
              <span>Synthesis Fitting</span>
            </button>

            {results.length > 0 && (
              <button
                onClick={() => setActiveStep("results")}
                className={`wizard-step-tab ${activeStep === "results" ? "active" : ""} completed`}
              >
                <div className="wizard-step-number">4</div>
                <span>
                  Showroom
                  {isGenerating && expectedResultCount > 0 && (
                    <span style={styles.loadingIndicator}> {results.length}/{expectedResultCount}</span>
                  )}
                </span>
              </button>
            )}
          </div>

          {/* Step views */}
          {activeStep === "profile" && (
            <UserProfileSection
              userImages={userImages}
              setUserImages={setUserImages}
              physicalProfile={physicalProfile}
              setPhysicalProfile={setPhysicalProfile}
              apiKey={apiKey}
              apiModel={apiModel}
              onNext={() => setActiveStep("wardrobe")}
            />
          )}

          {activeStep === "wardrobe" && (
            <WardrobeSection
              selectedCloth={selectedCloth}
              setSelectedCloth={setSelectedCloth}
              onNext={() => setActiveStep("fitting")}
              onBack={() => setActiveStep("profile")}
            />
          )}

          {/* FittingRoomSection stays mounted while generating (even on results page) */}
          <div style={{ display: fittingSectionMounted ? "block" : "none" }}>
            {(activeStep === "fitting" || fittingSectionMounted) && userImages.length > 0 && selectedCloth && (
              <FittingRoomSection
                userImages={userImages}
                selectedCloth={selectedCloth}
                apiKey={apiKey}
                apiModel={apiModel}
                physicalProfile={physicalProfile}
                setPhysicalProfile={setPhysicalProfile}
                onResultAvailable={handleResultAvailable}
                onGenerationDone={handleGenerationDone}
                onBack={() => setActiveStep("wardrobe")}
                onGenerationStart={handleGenerationStart}
              />
            )}
          </div>

          {activeStep === "results" && (
            <ResultsGallery
              results={results}
              expectedCount={expectedResultCount}
              isGenerating={isGenerating}
              userImages={userImages}
              selectedCloth={selectedCloth}
              onReset={handleReset}
            />
          )}

        </div>
      </main>

      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        apiModel={apiModel}
        useSandbox={false}
        onSaveKey={handleSaveKey}
      />

      <footer style={styles.footer}>
        <div className="container" style={styles.footerContainer}>
          <p style={styles.footerText}>VELOUR STUDIO © 2026. POWERED BY GEMINI AI.</p>
          <div style={styles.footerLinks}>
            <HelpCircle size={14} style={{ color: "#5e6066" }} />
            <a href="https://ai.google.dev/gemini-api/docs" target="_blank" rel="noreferrer" style={styles.footerLink}>
              Gemini API Docs
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

const styles = {
  mainContent: {
    flexGrow: 1,
    padding: "3rem 0 5rem 0",
    minHeight: "calc(100vh - 160px)"
  },
  keyAlert: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 2rem",
    backgroundColor: "rgba(212,175,55,0.03)",
    borderColor: "rgba(212,175,55,0.15)",
    borderRadius: "16px",
    marginBottom: "2.5rem"
  },
  alertContent: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    fontSize: "0.95rem",
    color: "#d4af37",
    lineHeight: "1.5"
  },
  alertActionBtn: {
    fontSize: "0.85rem",
    padding: "0.6rem 1.25rem",
    textTransform: "none",
    flexShrink: 0
  },
  loadingIndicator: {
    fontSize: "0.75rem",
    color: "#d4af37",
    fontWeight: "700"
  },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.03)",
    backgroundColor: "rgba(6,6,8,0.95)",
    padding: "1.5rem 0"
  },
  footerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerText: {
    fontSize: "0.75rem",
    color: "#5e6066",
    letterSpacing: "0.05em",
    fontWeight: "500"
  },
  footerLinks: { display: "flex", alignItems: "center", gap: "0.5rem" },
  footerLink: { fontSize: "0.75rem", color: "#5e6066", textDecoration: "none" }
};
