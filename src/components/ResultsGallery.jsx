import React, { useState, useRef, useEffect, useCallback } from "react";
import { Download, Sparkles, RefreshCw, ChevronLeft, ChevronRight, User, AlertTriangle, CheckCircle, Camera, Shirt, Move, Sliders } from "lucide-react";

export default function ResultsGallery({
  results,
  expectedCount,
  isGenerating,
  userImages,
  selectedCloth,
  onReset
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("tryon"); // 'tryon' | 'mirror'
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliding, setIsSliding] = useState(false);
  const sliderRef = useRef(null);

  // Precision Mirror Fit states
  const [garmentScale, setGarmentScale] = useState(75);
  const [garmentX, setGarmentX] = useState(0);
  const [garmentY, setGarmentY] = useState(60);
  const [garmentRotation, setGarmentRotation] = useState(0);
  const [garmentOpacity, setGarmentOpacity] = useState(90);
  const [blendMode, setBlendMode] = useState("multiply");
  const [isDraggingGarment, setIsDraggingGarment] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const garmentStartPos = useRef({ x: 0, y: 0 });

  const originalUserImage = userImages[0];
  const successfulResults = results.filter(r => !r.failed && r.url);

  const [detectedAspectRatio, setDetectedAspectRatio] = useState("3/4");

  useEffect(() => {
    if (originalUserImage) {
      const img = new Image();
      img.onload = () => {
        setDetectedAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
      };
      img.src = originalUserImage;
    }
  }, [originalUserImage]);
  const activeResult = successfulResults[activeIdx] || successfulResults[0] || results[0];
  const allFailed = results.length > 0 && results.every(r => r.failed || !r.url);
  const pendingCount = Math.max(0, (expectedCount || 0) - results.length);

  // Auto-select last received result when not manually browsing
  useEffect(() => {
    if (successfulResults.length > 0 && activeIdx >= successfulResults.length) {
      setActiveIdx(successfulResults.length - 1);
    }
  }, [successfulResults.length]);

  // Switch to mirror tab automatically if all AI generations failed
  useEffect(() => {
    if (allFailed && !isGenerating) {
      setActiveTab("mirror");
    }
  }, [allFailed, isGenerating]);

  // Compare slider logic
  const handleMove = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseMove = (e) => {
    if (!isSliding) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isSliding || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
  };

  // Garment drag logic
  const handleGarmentMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingGarment(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    garmentStartPos.current = { x: garmentX, y: garmentY };
  };

  const handleGarmentMouseMove = (e) => {
    if (!isDraggingGarment) return;
    setGarmentX(garmentStartPos.current.x + (e.clientX - dragStartPos.current.x));
    setGarmentY(garmentStartPos.current.y + (e.clientY - dragStartPos.current.y));
  };

  useEffect(() => {
    const up = () => { setIsSliding(false); setIsDraggingGarment(false); };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
  }, []);

  const handleDownload = () => {
    const src = activeTab === "mirror" ? originalUserImage : (activeResult?.url || originalUserImage);
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `Velour_${selectedCloth?.id || "tryon"}_${activeResult?.pose || "look"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const poseLabels = {
    front: "Front View",
    street: "Street Style",
    editorial: "Editorial",
    dramatic: "Dramatic"
  };

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Sparkles size={22} style={{ color: "#d4af37" }} />
          <div>
            <h2 style={styles.title} className="serif-title">Your Virtual Try-On Results</h2>
            <p style={styles.subtitle}>
              {isGenerating
                ? <>✦ Generating look {results.length} of {expectedCount || "?"}… first result shown below</>  
                : <>{successfulResults.length} look{successfulResults.length !== 1 ? "s" : ""} generated with Gemini Nano Banana</>}
            </p>
          </div>
        </div>
      </div>

      {/* Failed banner — if some failed */}
      {allFailed && (
        <div style={styles.failedBanner} className="glass-card">
          <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div style={styles.failedBannerText}>
            <strong>Gemini image generation wasn't available for your API key.</strong>
            <span> The image editing feature (responseModalities: IMAGE) requires Gemini 2.0 Flash or newer. You can still use the <strong>Precision Fit</strong> tab to manually overlay the garment on your photo.</span>
          </div>
        </div>
      )}

      {successfulResults.length > 0 && !allFailed && (
        <div style={styles.successBanner} className="glass-card">
          {isGenerating ? (
            <RefreshCw size={16} style={{ color: "#d4af37", flexShrink: 0 }} className="shimmer" />
          ) : (
            <CheckCircle size={16} style={{ color: "#10b981", flexShrink: 0 }} />
          )}
          <span style={styles.successText}>
            {isGenerating
              ? <><strong>Generating in background…</strong> You can browse ready looks. More appearing shortly.…</>
              : <><strong>Real AI Try-On complete.</strong> These are actual AI-generated images of <em>you</em> wearing <strong>{selectedCloth?.name}</strong>.</>
            }
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div style={styles.tabBar} className="glass-card">
        <button
          onClick={() => setActiveTab("tryon")}
          style={{
            ...styles.tabBtn,
            color: activeTab === "tryon" ? "var(--color-gold)" : "var(--text-secondary)",
            backgroundColor: activeTab === "tryon" ? "rgba(212, 175, 55, 0.05)" : "transparent",
            borderColor: activeTab === "tryon" ? "var(--color-gold)" : "transparent",
            opacity: allFailed ? 0.4 : 1
          }}
          disabled={allFailed}
        >
          <Camera size={16} />
          <span>AI Try-On Results</span>
          {successfulResults.length > 0 && (
            <span style={styles.tabBadge}>{successfulResults.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("mirror")}
          style={{
            ...styles.tabBtn,
            color: activeTab === "mirror" ? "var(--color-gold)" : "var(--text-secondary)",
            backgroundColor: activeTab === "mirror" ? "rgba(212, 175, 55, 0.05)" : "transparent",
            borderColor: activeTab === "mirror" ? "var(--color-gold)" : "transparent"
          }}
        >
          <User size={16} />
          <span>Precision Fit (Manual)</span>
        </button>
      </div>

      {activeTab === "tryon" && successfulResults.length > 0 ? (
        /* AI Try-On Results */
        <div style={styles.workspace}>
          {/* Main comparison slider */}
          <div style={styles.mainPanel}>
            <div
              ref={sliderRef}
              className="compare-container"
              onMouseDown={() => setIsSliding(true)}
              onTouchStart={() => setIsSliding(true)}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              style={{ ...styles.sliderBox, aspectRatio: detectedAspectRatio }}
            >
              {/* Background: AI try-on result */}
              <img
                src={activeResult.url}
                alt="AI Try-On Result"
                className="compare-image"
              />

              {/* Foreground: original user image */}
              <div
                className="compare-overlay"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={originalUserImage}
                  alt="Original"
                  style={{
                    ...styles.compareOverlayImg,
                    width: sliderRef.current ? sliderRef.current.getBoundingClientRect().width : "100%"
                  }}
                />
              </div>

              {/* Handle */}
              <div className="compare-handle" style={{ left: `${sliderPosition}%` }}>
                <div className="compare-handle-button">
                  <ChevronLeft size={14} style={{ color: "#d4af37", marginRight: "-4px" }} />
                  <ChevronRight size={14} style={{ color: "#d4af37" }} />
                </div>
              </div>

              {/* Labels */}
              <div style={styles.sliderBadgeLeft}>Original</div>
              <div style={styles.sliderBadgeRight}>
                {(poseLabels[activeResult.pose] || activeResult.pose).toUpperCase()}
              </div>
            </div>

            {/* Prompt used */}
            <div style={styles.promptBox}>
              <span style={styles.promptLabel}>Scene Instruction:</span>
              <p style={styles.promptText}>{activeResult.prompt}</p>
            </div>
          </div>

          {/* Sidebar: thumbnails + actions */}
          <div style={styles.sidebar} className="glass-card">
            <h3 style={styles.sidebarTitle} className="serif-title">Generated Looks</h3>

            <div style={styles.thumbsGrid}>
              {/* Thumb: original (always shown) */}
              <div
                style={{ ...styles.thumbCard, borderColor: "rgba(255,255,255,0.04)" }}
                title="Original photo for reference"
              >
                <div style={styles.thumbImageWrapper}>
                  <img src={originalUserImage} alt="Original" style={styles.thumbImage} />
                </div>
                <div style={styles.thumbMeta}>
                  <span style={styles.thumbPose}>ORIGINAL</span>
                  <span style={{ ...styles.thumbStatus, color: "#9ea0a8" }}>Your Photo</span>
                </div>
              </div>

              {/* Thumbs: each successful result */}
              {successfulResults.map((res, index) => {
                const isActive = index === activeIdx;
                return (
                  <div
                    key={res.pose}
                    style={{
                      ...styles.thumbCard,
                      borderColor: isActive ? "var(--color-gold)" : "rgba(255,255,255,0.04)",
                      background: isActive ? "rgba(212,175,55,0.02)" : "rgba(0,0,0,0.15)"
                    }}
                    onClick={() => setActiveIdx(index)}
                  >
                    <div style={styles.thumbImageWrapper}>
                      <img src={res.url} alt={res.pose} style={styles.thumbImage} />
                    </div>
                    <div style={styles.thumbMeta}>
                      <span style={styles.thumbPose}>{(poseLabels[res.pose] || res.pose).toUpperCase()}</span>
                      <span style={{ ...styles.thumbStatus, color: "#10b981" }}>✓ Ready</span>
                    </div>
                  </div>
                );
              })}

              {/* Skeleton placeholders for poses still generating */}
              {isGenerating && Array.from({ length: pendingCount }).map((_, i) => (
                <div key={`skeleton-${i}`} style={styles.thumbCardSkeleton}>
                  <div style={styles.thumbImageWrapperSkeleton} className="shimmer" />
                  <div style={styles.thumbMeta}>
                    <span style={{ ...styles.thumbPose, color: "#5e6066" }}>GENERATING</span>
                    <span style={{ ...styles.thumbStatus, color: "#d4af37" }}>⏳ In progress</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.actionsBox}>
              <button onClick={handleDownload} className="luxury-button" style={styles.downloadBtn}>
                <Download size={16} />
                Download Look
              </button>
              <button onClick={onReset} className="luxury-button-secondary" style={styles.resetBtn}>
                <RefreshCw size={16} />
                Try Another Fit
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "tryon" && allFailed ? (
        /* Empty state — all failed */
        <div style={styles.emptyState} className="glass-card">
          <AlertTriangle size={40} style={{ color: "#f59e0b" }} />
          <h3 style={styles.emptyTitle} className="serif-title">Image Generation Not Available</h3>
          <p style={styles.emptyDesc}>
            Your Gemini API key doesn't have access to the image generation capability required for AI try-on (model: <code>gemini-2.0-flash-exp</code> with <code>responseModalities: IMAGE</code>). This feature is available in Google AI Studio or with certain API tiers.
          </p>
          <p style={styles.emptyDesc}>
            Use the <strong>Precision Fit</strong> tab to manually overlay the garment onto your photo, or upgrade your API access.
          </p>
          <button onClick={() => setActiveTab("mirror")} className="luxury-button" style={{ marginTop: "1rem" }}>
            <User size={16} />
            Open Precision Fit
          </button>
        </div>
      ) : (
        /* Precision Mirror Fit tab */
        <div style={styles.workspace}>
          <div style={styles.mirrorCanvasContainer}>
            <div
              style={{ ...styles.mirrorCanvas, aspectRatio: detectedAspectRatio }}
              onMouseMove={handleGarmentMouseMove}
              className="scanning-container"
            >
              <img
                src={originalUserImage}
                alt="Your photo"
                style={styles.mirrorBaseImg}
              />
              <div
                onMouseDown={handleGarmentMouseDown}
                style={{
                  ...styles.mirrorGarmentWrapper,
                  left: `calc(50% + ${garmentX}px)`,
                  top: `${garmentY}px`,
                  transform: `translate(-50%, -50%) scale(${garmentScale / 100}) rotate(${garmentRotation}deg)`,
                  opacity: garmentOpacity / 100,
                  mixBlendMode: blendMode,
                  cursor: isDraggingGarment ? "grabbing" : "grab"
                }}
              >
                <img src={selectedCloth?.image} alt="Garment" style={styles.mirrorGarmentImg} />
                <div style={styles.dragTooltip}>
                  <Move size={11} />
                  <span>Drag to Fit</span>
                </div>
              </div>
              <div style={styles.mirrorBadge}>Your Photo — Identity Preserved</div>
            </div>
          </div>

          {/* Mirror controls */}
          <div style={styles.sidebar} className="glass-card">
            <h3 style={styles.sidebarTitle} className="serif-title">Fitting Desk Controls</h3>
            <p style={styles.desc}>
              Manually overlay the garment onto your photo. Drag the garment to position it perfectly.
            </p>

            <div style={styles.controlsForm}>
              {[
                { label: "Garment Scale", value: garmentScale, setter: setGarmentScale, min: 20, max: 200, unit: "%" },
                { label: "Vertical Position", value: garmentY, setter: setGarmentY, min: -100, max: 400, unit: "px" },
                { label: "Horizontal Position", value: garmentX, setter: setGarmentX, min: -200, max: 200, unit: "px" },
                { label: "Rotation", value: garmentRotation, setter: setGarmentRotation, min: -45, max: 45, unit: "°" },
                { label: "Opacity", value: garmentOpacity, setter: setGarmentOpacity, min: 10, max: 100, unit: "%" }
              ].map(ctrl => (
                <div key={ctrl.label} style={styles.sliderGroup}>
                  <div style={styles.sliderHeading}>
                    <label style={styles.sliderLabel}>{ctrl.label}</label>
                    <span style={styles.sliderVal}>{ctrl.value}{ctrl.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    value={ctrl.value}
                    onChange={(e) => ctrl.setter(Number(e.target.value))}
                    style={styles.sliderRange}
                  />
                </div>
              ))}

              <div style={styles.sliderGroup}>
                <label style={styles.sliderLabel}>Blend Mode</label>
                <select
                  value={blendMode}
                  onChange={(e) => setBlendMode(e.target.value)}
                  style={styles.blendSelect}
                  className="luxury-input"
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply (removes white bg)</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Soft Overlay</option>
                </select>
              </div>
            </div>

            <div style={styles.actionsBox}>
              <button onClick={handleDownload} className="luxury-button" style={styles.downloadBtn}>
                <Download size={16} />
                Download Fit Look
              </button>
              <button onClick={onReset} className="luxury-button-secondary" style={styles.resetBtn}>
                <RefreshCw size={16} />
                Try Another Fit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "1rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "1.75rem"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem"
  },
  title: {
    fontSize: "1.8rem",
    color: "#f5f5f7",
    margin: 0
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#9ea0a8",
    margin: "0.25rem 0 0 0"
  },
  successBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1rem 1.5rem",
    backgroundColor: "rgba(16, 185, 129, 0.03)",
    borderColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: "14px"
  },
  successText: {
    fontSize: "0.9rem",
    color: "#9ea0a8",
    lineHeight: "1.5"
  },
  failedBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1rem 1.5rem",
    backgroundColor: "rgba(245, 158, 11, 0.03)",
    borderColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: "14px"
  },
  failedBannerText: {
    fontSize: "0.9rem",
    color: "#9ea0a8",
    lineHeight: "1.5",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem"
  },
  tabBar: {
    display: "flex",
    justifyContent: "center",
    padding: "0.5rem",
    gap: "0.5rem",
    alignSelf: "center",
    width: "fit-content"
  },
  tabBtn: {
    padding: "0.65rem 1.25rem",
    border: "1px solid transparent",
    borderRadius: "10px",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: "0.9rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "all 0.25s ease"
  },
  tabBadge: {
    fontSize: "0.7rem",
    fontWeight: "700",
    backgroundColor: "#d4af37",
    color: "#060608",
    borderRadius: "10px",
    padding: "0.1rem 0.45rem"
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "2rem",
    alignItems: "stretch"
  },
  mainPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  },
  sliderBox: {
    cursor: "ew-resize"
  },
  compareOverlayImg: {
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    userSelect: "none"
  },
  sliderBadgeLeft: {
    position: "absolute",
    bottom: "20px",
    left: "20px",
    padding: "0.4rem 0.85rem",
    backgroundColor: "rgba(6, 6, 8, 0.7)",
    backdropFilter: "blur(4px)",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#9ea0a8",
    zIndex: 10,
    border: "1px solid rgba(255,255,255,0.05)"
  },
  sliderBadgeRight: {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    padding: "0.4rem 0.85rem",
    backgroundColor: "rgba(212, 175, 55, 0.85)",
    backdropFilter: "blur(4px)",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#060608",
    zIndex: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
  },
  promptBox: {
    padding: "0.85rem 1rem",
    backgroundColor: "rgba(255,255,255,0.005)",
    border: "1px solid rgba(255,255,255,0.03)",
    borderRadius: "10px",
    fontSize: "0.8rem",
    lineHeight: "1.5"
  },
  promptLabel: {
    color: "#d4af37",
    fontWeight: "600",
    display: "block",
    marginBottom: "0.25rem"
  },
  promptText: {
    color: "#9ea0a8",
    fontStyle: "italic",
    margin: 0
  },
  sidebar: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem"
  },
  sidebarTitle: {
    fontSize: "1.3rem",
    color: "#f5f5f7",
    margin: 0
  },
  desc: {
    fontSize: "0.88rem",
    color: "#9ea0a8",
    lineHeight: "1.5",
    margin: 0
  },
  thumbsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem"
  },
  thumbCard: {
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    transition: "border-color 0.2s"
  },
  thumbImageWrapper: {
    width: "44px",
    height: "58px",
    borderRadius: "6px",
    overflow: "hidden",
    backgroundColor: "#101014",
    flexShrink: 0
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  thumbMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem"
  },
  thumbPose: {
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "#f5f5f7"
  },
  thumbStatus: {
    fontSize: "0.68rem",
    fontWeight: "500"
  },
  thumbCardSkeleton: {
    padding: "0.5rem",
    borderRadius: "12px",
    border: "1px solid rgba(212,175,55,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    background: "rgba(212,175,55,0.02)"
  },
  thumbImageWrapperSkeleton: {
    width: "44px",
    height: "58px",
    borderRadius: "6px",
    backgroundColor: "rgba(212,175,55,0.08)",
    flexShrink: 0
  },
  actionsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginTop: "auto"
  },
  downloadBtn: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "0.9rem"
  },
  resetBtn: {
    width: "100%",
    padding: "0.9rem",
    fontSize: "0.9rem"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "4rem 3rem",
    gap: "1rem",
    borderRadius: "20px"
  },
  emptyTitle: {
    fontSize: "1.6rem",
    color: "#f5f5f7"
  },
  emptyDesc: {
    fontSize: "0.95rem",
    color: "#9ea0a8",
    lineHeight: "1.6",
    maxWidth: "520px",
    margin: 0
  },
  // Mirror Fit styles
  mirrorCanvasContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101014",
    borderRadius: "16px",
    padding: "1rem",
    border: "1px solid rgba(255,255,255,0.05)"
  },
  mirrorCanvas: {
    position: "relative",
    width: "100%",
    maxWidth: "360px",
    aspectRatio: "3/4",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  mirrorBaseImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    userSelect: "none"
  },
  mirrorGarmentWrapper: {
    position: "absolute",
    width: "100%",
    zIndex: 10,
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  mirrorGarmentImg: {
    width: "100%",
    pointerEvents: "none"
  },
  dragTooltip: {
    position: "absolute",
    bottom: "-24px",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.2rem 0.5rem",
    backgroundColor: "rgba(6, 6, 8, 0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    fontSize: "0.62rem",
    color: "#d4af37",
    pointerEvents: "none",
    whiteSpace: "nowrap"
  },
  mirrorBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    padding: "0.35rem 0.75rem",
    backgroundColor: "rgba(212, 175, 55, 0.8)",
    borderRadius: "30px",
    fontSize: "0.7rem",
    color: "#060608",
    fontWeight: "700",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    zIndex: 20
  },
  controlsForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
    flex: 1
  },
  sliderGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem"
  },
  sliderHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sliderLabel: {
    fontSize: "0.82rem",
    fontWeight: "600",
    color: "#9ea0a8"
  },
  sliderVal: {
    fontSize: "0.82rem",
    color: "#d4af37",
    fontWeight: "600"
  },
  sliderRange: {
    width: "100%",
    height: "4px",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    outline: "none",
    accentColor: "#d4af37",
    cursor: "pointer"
  },
  blendSelect: {
    cursor: "pointer",
    background: "rgba(0,0,0,0.5)",
    padding: "0.65rem"
  }
};
