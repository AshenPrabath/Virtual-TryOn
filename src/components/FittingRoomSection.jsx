import React, { useState } from "react";
import { Sparkles, Play, RefreshCw, Shirt, User, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { analyzeUserAndCloth, performVirtualTryOn } from "../services/geminiService";

const POSE_META = {
  front:     { name: "Front View",           desc: "Same pose & background — only clothing changes" },
  street:    { name: "Street Style",         desc: "Golden hour city walk, natural pose" },
  editorial: { name: "Editorial Fashion",    desc: "High-fashion studio pose" },
  dramatic:  { name: "Dramatic Cinematic",   desc: "Moody side-lit atmosphere" }
};

export default function FittingRoomSection({
  userImages,
  selectedCloth,
  apiKey,
  apiModel,
  physicalProfile,
  setPhysicalProfile,
  onResultAvailable,
  onGenerationDone,
  onGenerationStart,
  onBack
}) {
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [completedPoses, setCompletedPoses] = useState(0);
  const [totalPoses, setTotalPoses] = useState(0);
  const [selectedPoses, setSelectedPoses] = useState({
    front: true,
    street: true,
    editorial: true,
    dramatic: true
  });
  const [error, setError] = useState("");

  const [detectedAspectRatio, setDetectedAspectRatio] = useState("3/4");

  React.useEffect(() => {
    if (userImages?.[0]) {
      const img = new Image();
      img.onload = () => {
        setDetectedAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
      };
      img.src = userImages[0];
    }
  }, [userImages]);

  const handleCheckboxChange = (pose) => {
    setSelectedPoses(prev => ({ ...prev, [pose]: !prev[pose] }));
  };

  const handleGenerate = async () => {
    const posesToGenerate = Object.keys(selectedPoses).filter(p => selectedPoses[p]);
    if (posesToGenerate.length === 0) {
      setError("Please select at least one pose.");
      return;
    }
    if (!apiKey) {
      setError("API key missing — configure it in Settings.");
      return;
    }

    // Signal App.jsx to set isGenerating=true BEFORE any awaits.
    // This keeps fittingSectionMounted=true so the component isn't unmounted mid-loop.
    onGenerationStart?.();

    setLoading(true);
    setError("");
    setCompletedPoses(0);
    setTotalPoses(posesToGenerate.length);
    setProgressPercent(5);
    setProgressMsg("Connecting to Gemini AI...");

    try {
      // ── Step 1: Analyze user + cloth ──────────────────────────────────
      setProgressPercent(10);
      setProgressMsg("Analyzing your photo and selected garment...");

      const analysis = await analyzeUserAndCloth(apiKey, userImages, selectedCloth.image, apiModel);

      setProgressPercent(25);
      setProgressMsg("Profile extracted. Starting try-on generation...");

      if (analysis.physicalProfile) {
        setPhysicalProfile(analysis.physicalProfile);
      }

      const userFrontPhoto = userImages[0];
      const clothingDesc = analysis.clothingDescription || selectedCloth.name;
      const personDesc = analysis.physicalProfile || "";

      // ── Step 2: Generate each pose, emit result after each one ──────
      // "front" pose always goes first regardless of checkbox order
      const ordered = [
        ...posesToGenerate.filter(p => p === "front"),
        ...posesToGenerate.filter(p => p !== "front")
      ];

      for (let i = 0; i < ordered.length; i++) {
        const pose = ordered[i];
        const isFirst = i === 0;
        const pct = 25 + Math.round(((i + 0.5) / ordered.length) * 70);
        setProgressPercent(pct);
        setProgressMsg(`Generating "${POSE_META[pose]?.name || pose}" (${i + 1}/${ordered.length})...`);

        const imageUrl = await performVirtualTryOn(
          apiKey,
          userFrontPhoto,
          selectedCloth.image,
          pose,
          clothingDesc,
          personDesc
        );

        const result = {
          pose,
          label: POSE_META[pose]?.name || pose,
          url: imageUrl,
          failed: !imageUrl,
          prompt: clothingDesc,
          personDesc
        };

        // Emit result immediately — caller transitions to results page on first result
        onResultAvailable?.(result, ordered.length);

        setCompletedPoses(i + 1);
      }

      setProgressPercent(100);
      setProgressMsg("All looks generated!");

      setTimeout(() => {
        setLoading(false);
        onGenerationDone?.();
      }, 600);

    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
      onGenerationDone?.();
    }
  };

  const userFrontPhoto = userImages[0];

  return (
    <div style={styles.container}>
      <div style={styles.workspaceGrid} className="responsive-workspace-grid">

        {/* Left: Composition Preview */}
        <div style={styles.compositionBlock} className="glass-card">
          <h3 style={styles.blockTitle} className="serif-title">Fitting Composition</h3>
          <p style={styles.blockDesc}>
            Gemini AI will replace the clothing in your photo while keeping your exact face, hair, body shape, and background.
          </p>

          <div style={styles.compositionStage}>
            <div style={{ ...styles.previewBox, aspectRatio: detectedAspectRatio }} className={loading ? "scanning-container" : ""}>
              {loading && <div className="scanner-line"></div>}
              <img src={userFrontPhoto} alt="Your Photo" style={styles.stageImg} />
              <div style={styles.badgeOverlay}>
                <User size={12} style={{ color: "#d4af37" }} />
                <span>Your Photo</span>
              </div>
            </div>

            <div style={styles.connector}>
              <div style={{ ...styles.pulseGlow, animation: loading ? "shimmer 1.5s infinite" : "none" }}>
                <Sparkles size={24} style={{ color: "#d4af37" }} />
              </div>
            </div>

            <div style={styles.previewBox} className={loading ? "scanning-container" : ""}>
              {loading && <div className="scanner-line"></div>}
              <img src={selectedCloth.image} alt="Garment" style={styles.stageImg} />
              <div style={styles.badgeOverlay}>
                <Shirt size={12} style={{ color: "#d4af37" }} />
                <span>Garment</span>
              </div>
            </div>
          </div>

          <div style={styles.howItWorks}>
            <Info size={14} style={{ color: "#d4af37", flexShrink: 0 }} />
            <span>
              Powered by <strong>Gemini 2.5 Flash Image (Nano Banana)</strong>. Results appear one by one as each pose finishes.
            </span>
          </div>

          {physicalProfile && (
            <div style={styles.profileSnippet}>
              <span style={styles.snippetLabel}>Identity Locked:</span>
              <p style={styles.snippetText}>{physicalProfile}</p>
            </div>
          )}
        </div>

        {/* Right: Controls or Loading */}
        <div style={styles.controlsBlock} className="glass-card">
          <h3 style={styles.blockTitle} className="serif-title">Fitting Details</h3>

          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.loaderCircle}>
                <RefreshCw size={36} className="shimmer" style={{ color: "#d4af37" }} />
              </div>
              <h4 style={styles.loadingTitle} className="serif-title">Generating Try-Ons...</h4>
              <p style={styles.loadingMsg}>{progressMsg}</p>

              {/* Progress bar */}
              <div style={styles.progressContainer}>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }}></div>
                </div>
                <span style={styles.progressPercentText}>{progressPercent}% Complete</span>
              </div>

              {/* Per-pose counter */}
              {totalPoses > 0 && (
                <div style={styles.poseCounter}>
                  {Array.from({ length: totalPoses }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.poseDot,
                        backgroundColor: i < completedPoses
                          ? "#10b981"
                          : i === completedPoses
                            ? "#d4af37"
                            : "rgba(255,255,255,0.1)"
                      }}
                    />
                  ))}
                  <span style={styles.poseCounterText}>
                    {completedPoses}/{totalPoses} looks ready
                  </span>
                </div>
              )}

              <p style={styles.loadingNote}>
                Results appear on the next screen as each look finishes. Front view always generates first.
              </p>
            </div>
          ) : (
            <div style={styles.configForm}>
              {/* Pose selector */}
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  <Sparkles size={14} style={{ color: "#d4af37" }} />
                  <span>Looks to Generate</span>
                </label>
                <div style={styles.poseChecklist}>
                  {Object.entries(POSE_META).map(([key, meta]) => (
                    <label key={key} style={styles.checklistLabel}>
                      <input
                        type="checkbox"
                        checked={selectedPoses[key]}
                        onChange={() => handleCheckboxChange(key)}
                        style={styles.checkbox}
                      />
                      <div style={styles.checkboxMeta}>
                        <span style={styles.poseName}>{meta.name}</span>
                        <span style={styles.poseDesc}>{meta.desc}</span>
                      </div>
                      {key === "front" && (
                        <span style={styles.recommendedBadge}>First</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.infoCard}>
                <CheckCircle size={14} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                <span style={styles.infoText}>
                  <strong>Front View</strong> appears immediately. Other poses load in the background while you browse.
                </span>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div style={styles.btnGroup}>
                <button onClick={onBack} style={styles.backBtn} className="luxury-button-secondary">
                  Change Wardrobe
                </button>
                <button onClick={handleGenerate} className="luxury-button" style={styles.generateBtn}>
                  <Play size={16} />
                  Render Fitting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "1rem 0" },
  workspaceGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "2rem",
    alignItems: "stretch"
  },
  compositionBlock: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem"
  },
  controlsBlock: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "500px"
  },
  blockTitle: { fontSize: "1.4rem", color: "#f5f5f7" },
  blockDesc: { fontSize: "0.9rem", color: "#9ea0a8", lineHeight: "1.5", margin: 0 },
  compositionStage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    margin: "1.5rem 0",
    position: "relative"
  },
  previewBox: {
    flex: 1,
    aspectRatio: "3/4",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "#101014"
  },
  stageImg: { width: "100%", height: "100%", objectFit: "cover" },
  badgeOverlay: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.4rem 0.75rem",
    backgroundColor: "rgba(6,6,8,0.75)",
    backdropFilter: "blur(6px)",
    borderRadius: "30px",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: "0.75rem",
    color: "#f5f5f7"
  },
  connector: { display: "flex", alignItems: "center", justifyContent: "center" },
  pulseGlow: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "rgba(212,175,55,0.05)",
    border: "1px solid rgba(212,175,55,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 15px rgba(212,175,55,0.1)"
  },
  howItWorks: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.85rem 1rem",
    backgroundColor: "rgba(212,175,55,0.03)",
    border: "1px solid rgba(212,175,55,0.1)",
    borderRadius: "10px",
    fontSize: "0.82rem",
    color: "#9ea0a8",
    lineHeight: "1.5"
  },
  profileSnippet: {
    padding: "1rem 1.25rem",
    backgroundColor: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.03)",
    borderRadius: "12px",
    fontSize: "0.85rem",
    lineHeight: "1.5"
  },
  snippetLabel: { color: "#d4af37", fontWeight: "600", display: "block", marginBottom: "0.25rem" },
  snippetText: { color: "#9ea0a8", fontStyle: "italic", margin: 0 },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "2rem 1rem",
    gap: "1rem"
  },
  loaderCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundColor: "rgba(212,175,55,0.05)",
    border: "1px solid rgba(212,175,55,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "0.5rem"
  },
  loadingTitle: { fontSize: "1.4rem", color: "#f5f5f7" },
  loadingMsg: { fontSize: "0.9rem", color: "#9ea0a8", lineHeight: "1.4", margin: 0, maxWidth: "280px" },
  loadingNote: { fontSize: "0.78rem", color: "#5e6066", lineHeight: "1.4", margin: 0, maxWidth: "260px", fontStyle: "italic" },
  progressContainer: { width: "100%", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "0.5rem" },
  progressBarBg: {
    width: "100%", height: "6px",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: "10px",
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#d4af37",
    borderRadius: "10px",
    transition: "width 0.4s ease-out",
    boxShadow: "0 0 10px rgba(212,175,55,0.5)"
  },
  progressPercentText: { fontSize: "0.8rem", color: "#5e6066", fontWeight: "500", alignSelf: "flex-end" },
  poseCounter: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.5rem"
  },
  poseDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    transition: "background-color 0.4s ease"
  },
  poseCounterText: { fontSize: "0.78rem", color: "#9ea0a8", marginLeft: "0.25rem" },
  configForm: { display: "flex", flexDirection: "column", gap: "1.75rem" },
  controlGroup: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  controlLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#9ea0a8",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  poseChecklist: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  checklistLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    backgroundColor: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.03)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "border-color 0.2s",
    position: "relative"
  },
  checkbox: { marginTop: "3px", accentColor: "#d4af37", cursor: "pointer", flexShrink: 0 },
  checkboxMeta: { display: "flex", flexDirection: "column", gap: "0.15rem", flex: 1 },
  poseName: { fontSize: "0.9rem", color: "#f5f5f7", fontWeight: "500" },
  poseDesc: { fontSize: "0.75rem", color: "#5e6066" },
  recommendedBadge: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#d4af37",
    backgroundColor: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: "20px",
    padding: "0.2rem 0.5rem",
    alignSelf: "flex-start",
    flexShrink: 0,
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  },
  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "0.85rem 1rem",
    backgroundColor: "rgba(16,185,129,0.03)",
    border: "1px solid rgba(16,185,129,0.1)",
    borderRadius: "10px",
    fontSize: "0.82rem",
    color: "#9ea0a8",
    lineHeight: "1.5"
  },
  infoText: { lineHeight: "1.5" },
  btnGroup: { display: "flex", gap: "1rem", marginTop: "0.5rem" },
  backBtn: { flex: 1, padding: "1rem", fontSize: "0.9rem" },
  generateBtn: { flex: 1, padding: "1rem", fontSize: "0.9rem" },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    padding: "0.85rem",
    backgroundColor: "rgba(239,68,68,0.05)",
    border: "1px solid rgba(239,68,68,0.15)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    color: "#ef4444",
    lineHeight: "1.4"
  }
};
