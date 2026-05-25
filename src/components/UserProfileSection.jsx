import React, { useState } from "react";
import { Upload, User, UserCheck, AlertCircle, RefreshCw, Sparkles, Image as ImageIcon } from "lucide-react";
import { analyzeUserProfile } from "../services/geminiService";

export default function UserProfileSection({ 
  userImages, 
  setUserImages, 
  physicalProfile, 
  setPhysicalProfile,
  apiKey,
  apiModel,
  onNext
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState({ front: false, side: false });

  // Handle local file selection
  const handleFileChange = (e, position) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, position);
    }
  };

  const processFile = (file, position) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...userImages];
      if (position === "front") {
        updated[0] = reader.result;
      } else {
        updated[1] = reader.result;
      }
      setUserImages(updated.filter(Boolean));
      setError("");
      setPhysicalProfile(""); // Reset profile when images change
    };
    reader.readAsDataURL(file);
  };

  // Drag over handlers
  const handleDrag = (e, position, activeState) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [position]: activeState }));
  };

  const handleDrop = (e, position) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [position]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, position);
    }
  };

  // Load the pre-generated high-quality demo model
  const handleUseDemoModel = async () => {
    setError("");
    setAnalyzing(true);
    try {
      const response = await fetch("/catalog/demo_user.png");
      if (!response.ok) throw new Error("Could not load demo model asset.");
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImages([reader.result]);
        setPhysicalProfile("An elegant individual with refined features, clean styling, and balanced proportions, positioned against a solid, studio neutral-gray background.");
        setAnalyzing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError("Failed to load the demo model. Please upload a photo manually.");
      setAnalyzing(false);
    }
  };

  const handleAnalyzeProfile = async () => {
    if (!apiKey) {
      setError("Please configure your Google Gemini API Key in 'API Settings' first.");
      return;
    }
    if (userImages.length === 0) {
      setError("Please upload a front-view photo or load the demo model.");
      return;
    }

    setAnalyzing(true);
    setError("");
    try {
      // Call the centralized analyzeUserProfile service with dynamic model support!
      const profileText = await analyzeUserProfile(apiKey, userImages, apiModel);
      setPhysicalProfile(profileText);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze profile image. Make sure your API key and model selection are valid.");
    } finally {
      setAnalyzing(false);
    }
  };

  const frontImage = userImages[0];
  const sideImage = userImages[1];

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Upload Columns */}
        <div style={styles.uploadsCard} className="glass-card">
          <h3 style={styles.cardTitle} className="serif-title">1. Reference Photographs</h3>
          <p style={styles.cardDesc}>Upload a clear portrait photo. Adding a side/back angle helps the AI maintain consistency.</p>

          <div style={styles.uploadRow}>
            {/* Front Photo */}
            <div style={styles.uploadColumn}>
              <span style={styles.photoLabel}>Front View (Required)</span>
              
              {frontImage ? (
                <div style={styles.previewContainer} className="scanning-container">
                  {analyzing && <div className="scanner-line"></div>}
                  <img src={frontImage} alt="User Front View" style={styles.previewImage} />
                  <button 
                    style={styles.removeBtn} 
                    onClick={() => {
                      const updated = [...userImages];
                      updated[0] = null;
                      setUserImages(updated.filter(Boolean));
                      setPhysicalProfile("");
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div 
                  className={`upload-zone ${dragActive.front ? "active" : ""}`}
                  onDragOver={(e) => handleDrag(e, "front", true)}
                  onDragLeave={(e) => handleDrag(e, "front", false)}
                  onDrop={(e) => handleDrop(e, "front")}
                  onClick={() => document.getElementById("front-file-input").click()}
                  style={styles.zone}
                >
                  <Upload size={32} style={styles.uploadIcon} />
                  <span style={styles.zoneText}>Drag & Drop or Click</span>
                  <span style={styles.zoneSubtext}>Portrait / Front shot (3:4 ratio optimal)</span>
                  <input
                    type="file"
                    id="front-file-input"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "front")}
                    style={{ display: "none" }}
                  />
                </div>
              )}
            </div>

            {/* Side Photo */}
            <div style={styles.uploadColumn}>
              <span style={styles.photoLabel}>Side/Back View (Optional)</span>
              
              {sideImage ? (
                <div style={styles.previewContainer}>
                  <img src={sideImage} alt="User Side View" style={styles.previewImage} />
                  <button 
                    style={styles.removeBtn} 
                    onClick={() => {
                      const updated = [...userImages];
                      updated[1] = null;
                      setUserImages(updated.filter(Boolean));
                      setPhysicalProfile("");
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div 
                  className={`upload-zone ${dragActive.side ? "active" : ""}`}
                  onDragOver={(e) => handleDrag(e, "side", true)}
                  onDragLeave={(e) => handleDrag(e, "side", false)}
                  onDrop={(e) => handleDrop(e, "side")}
                  onClick={() => document.getElementById("side-file-input").click()}
                  style={styles.zone}
                >
                  <Upload size={32} style={styles.uploadIcon} />
                  <span style={styles.zoneText}>Drag & Drop or Click</span>
                  <span style={styles.zoneSubtext}>Alternate angle photo</span>
                  <input
                    type="file"
                    id="side-file-input"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "side")}
                    style={{ display: "none" }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={styles.demoBlock}>
            <span style={styles.demoText}>Don't have a photo ready?</span>
            <button 
              onClick={handleUseDemoModel} 
              style={styles.demoBtn} 
              disabled={analyzing}
              className="luxury-button-secondary"
            >
              <UserCheck size={16} />
              Use Professional Demo Model
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div style={styles.profileCard} className="glass-card">
          <h3 style={styles.cardTitle} className="serif-title">2. Digital Twin Profile</h3>
          <p style={styles.cardDesc}>Gemini will analyze your photos to extract physical traits, ensuring high identity fidelity in the final garment fits.</p>

          <div style={styles.profileContent}>
            {physicalProfile ? (
              <div style={styles.profileTextBox}>
                <div style={styles.sparkleTitle}>
                  <Sparkles size={16} style={{ color: "#d4af37" }} />
                  <span style={styles.sparkleText}>AI Extracted Style Characteristics</span>
                </div>
                <p style={styles.profileText}>{physicalProfile}</p>
                <div style={styles.profileStatus}>
                  <UserCheck size={16} style={{ color: "#10b981" }} />
                  <span style={{ color: "#10b981", fontWeight: 500 }}>Fidelity Profile Locked</span>
                </div>
              </div>
            ) : (
              <div style={styles.emptyProfile}>
                <User size={48} style={styles.emptyIcon} />
                {userImages.length > 0 ? (
                  <>
                    <p style={styles.emptyProfileText}>Photos uploaded. Click "Analyze Profile" to lock in your modeling characteristics.</p>
                    <button 
                      onClick={handleAnalyzeProfile} 
                      disabled={analyzing}
                      className="luxury-button"
                      style={styles.actionBtn}
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="shimmer" size={16} />
                          Extracting Features...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Analyze Profile & Characteristics
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <p style={styles.emptyProfileText}>Upload a front-view photograph or load the demo model to generate your AI fashion twin.</p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.footer}>
            <button 
              onClick={onNext} 
              disabled={userImages.length === 0 || !physicalProfile}
              className="luxury-button"
              style={styles.nextBtn}
            >
              Proceed to Wardrobe Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "1rem 0"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "2rem",
    alignItems: "stretch",
    "@media (max-width: 968px)": {
      gridTemplateColumns: "1fr"
    }
  },
  uploadsCard: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem"
  },
  profileCard: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1.25rem"
  },
  cardTitle: {
    fontSize: "1.4rem",
    color: "#f5f5f7"
  },
  cardDesc: {
    fontSize: "0.9rem",
    color: "#9ea0a8",
    lineHeight: "1.4"
  },
  uploadRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.25rem",
    margin: "1rem 0",
    "@media (max-width: 600px)": {
      gridTemplateColumns: "1fr"
    }
  },
  uploadColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  photoLabel: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#9ea0a8",
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  },
  zone: {
    height: "220px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  uploadIcon: {
    color: "#d4af37",
    marginBottom: "1rem"
  },
  zoneText: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "#f5f5f7",
    marginBottom: "0.25rem"
  },
  zoneSubtext: {
    fontSize: "0.75rem",
    color: "#5e6066"
  },
  previewContainer: {
    height: "220px",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(255, 255, 255, 0.08)"
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  removeBtn: {
    position: "absolute",
    bottom: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0.4rem 1rem",
    backgroundColor: "rgba(6, 6, 8, 0.75)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "30px",
    color: "#f5f5f7",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      backgroundColor: "rgba(6, 6, 8, 0.9)"
    }
  },
  demoBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    border: "1px solid rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.005)",
    marginTop: "auto"
  },
  demoText: {
    fontSize: "0.9rem",
    color: "#9ea0a8"
  },
  demoBtn: {
    fontSize: "0.85rem",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  profileContent: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    margin: "1rem 0"
  },
  emptyProfile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    textAlign: "center",
    border: "1px dashed rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.1)"
  },
  emptyIcon: {
    color: "#5e6066",
    marginBottom: "1rem"
  },
  emptyProfileText: {
    fontSize: "0.9rem",
    color: "#9ea0a8",
    lineHeight: "1.5",
    marginBottom: "1.25rem"
  },
  actionBtn: {
    padding: "0.75rem 1.25rem",
    fontSize: "0.85rem",
    textTransform: "none"
  },
  profileTextBox: {
    padding: "1.5rem",
    backgroundColor: "rgba(212, 175, 55, 0.02)",
    border: "1px solid rgba(212, 175, 55, 0.1)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  sparkleTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  sparkleText: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#d4af37",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  profileText: {
    fontSize: "0.95rem",
    lineHeight: "1.6",
    color: "#f5f5f7",
    fontStyle: "italic",
    margin: 0
  },
  profileStatus: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    marginTop: "0.5rem"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "#ef4444"
  },
  footer: {
    marginTop: "auto",
    paddingTop: "1rem"
  },
  nextBtn: {
    width: "100%",
    padding: "1rem",
    fontSize: "0.95rem",
    textTransform: "none"
  }
};
