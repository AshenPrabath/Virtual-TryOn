import React, { useState } from "react";
import { Upload, Shirt, Sparkles, Check, ChevronRight } from "lucide-react";

const CATALOG_ITEMS = [
  {
    id: "leather_jacket",
    title: "Classic Obsidian Moto Jacket",
    category: "Outerwear",
    description: "Premium heavy-grain black leather motorcycle jacket with metallic hardware detailing.",
    image: "/catalog/leather_jacket.png"
  },
  {
    id: "floral_dress",
    title: "Satin Flora Slip Dress",
    category: "Dresses",
    description: "Delicate light-cream silk satin dress featuring a hand-painted floral watercolor print.",
    image: "/catalog/floral_dress.png"
  },
  {
    id: "onyx_aviator",
    title: "Onyx Leather Aviator Jacket",
    category: "Outerwear",
    description: "Obsidian black heavy leather jacket with soft brown shearling collar and metallic brass hardware.",
    image: "/catalog/onyx_aviator.png"
  },
  {
    id: "emerald_blouse",
    title: "Emerald Silk Pleated Blouse",
    category: "Tops",
    description: "Sophisticated emerald green silk blouse featuring delicate pleats and a luxurious high-fashion sheen.",
    image: "/catalog/emerald_blouse.png"
  },
  {
    id: "trench_coat",
    title: "Couture Camel Trench Coat",
    category: "Outerwear",
    description: "Classic double-breasted camel-hair trench with structured lapels and a belted waist.",
    image: "/catalog/trench_coat.png"
  },
  {
    id: "designer_hoodie",
    title: "Minimalist Lavender Hoodie",
    category: "Tops",
    description: "Oversized organic cotton hoodie in a serene lavender hue with contemporary graphics.",
    image: "/catalog/designer_hoodie.png"
  },
  {
    id: "oxford_shirt",
    title: "Classic Oxford White Shirt",
    category: "Tops",
    description: "Crisp white long-sleeve button-down Oxford shirt in premium structured cotton canvas.",
    image: "/catalog/oxford_shirt.png"
  },
  {
    id: "crimson_gown",
    title: "Crimson Velvet Gala Gown",
    category: "Dresses",
    description: "Stunning off-shoulder evening gown in rich crimson red velvet with elegant structural velvet draping.",
    image: "/catalog/crimson_gown.png"
  }
];

const CATEGORIES = ["All", "Outerwear", "Dresses", "Tops"];

export default function WardrobeSection({ 
  selectedCloth, 
  setSelectedCloth, 
  onNext,
  onBack 
}) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [customCloth, setCustomCloth] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processCustomFile(file);
    }
  };

  const processCustomFile = (file) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const customItem = {
        id: "custom",
        title: "Your Custom Garment",
        category: "Custom",
        description: "User-uploaded clothing item for virtual try-on.",
        image: reader.result
      };
      setCustomCloth(customItem);
      setSelectedCloth(customItem);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e, activeState) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(activeState);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processCustomFile(file);
    }
  };

  const filteredItems = activeCategory === "All"
    ? CATALOG_ITEMS
    : CATALOG_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div style={styles.container}>
      {/* Category Bar */}
      <div style={styles.filterBar}>
        <div style={styles.badges}>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                // If custom is active, we don't automatically deselect
              }}
              className={`category-badge ${activeCategory === category ? "active" : ""}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* Wardrobe Catalog */}
        <div style={styles.catalogBlock}>
          <h3 style={styles.sectionTitle} className="serif-title">Curated Wardrobe</h3>
          
          <div className="luxury-grid">
            {filteredItems.map(item => {
              const isSelected = selectedCloth && selectedCloth.id === item.id;
              return (
                <div 
                  key={item.id} 
                  style={{
                    ...styles.itemCard,
                    borderColor: isSelected ? "var(--color-gold)" : "rgba(255, 255, 255, 0.04)",
                    background: isSelected ? "rgba(212, 175, 55, 0.02)" : "rgba(16, 16, 20, 0.5)"
                  }}
                  className="glass-card"
                  onClick={() => setSelectedCloth(item)}
                >
                  <div style={styles.imageWrapper}>
                    <img src={item.image} alt={item.title} style={styles.itemImage} />
                    {isSelected && (
                      <div style={styles.selectedIndicator}>
                        <Check size={14} style={{ color: "#060608" }} />
                      </div>
                    )}
                  </div>
                  <div style={styles.itemMeta}>
                    <span style={styles.itemCategory}>{item.category}</span>
                    <h4 style={styles.itemTitle}>{item.title}</h4>
                    <p style={styles.itemDesc}>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Upload Column */}
        <div style={styles.customBlock} className="glass-card">
          <h3 style={styles.sectionTitle} className="serif-title">Custom Apparel</h3>
          <p style={styles.customDesc}>Have a specific outfit in mind? Upload a photo of any shirt, coat, or dress to fit it onto your reference profile.</p>

          {customCloth ? (
            <div 
              style={{
                ...styles.itemCard,
                ...styles.customCard,
                borderColor: selectedCloth && selectedCloth.id === "custom" ? "var(--color-gold)" : "rgba(255, 255, 255, 0.08)",
                background: selectedCloth && selectedCloth.id === "custom" ? "rgba(212, 175, 55, 0.02)" : "rgba(0, 0, 0, 0.2)"
              }}
              onClick={() => setSelectedCloth(customCloth)}
            >
              <div style={styles.imageWrapper}>
                <img src={customCloth.image} alt={customCloth.title} style={styles.itemImage} />
                {selectedCloth && selectedCloth.id === "custom" && (
                  <div style={styles.selectedIndicator}>
                    <Check size={14} style={{ color: "#060608" }} />
                  </div>
                )}
              </div>
              <div style={styles.itemMeta}>
                <span style={styles.itemCategory}>User Custom Upload</span>
                <h4 style={styles.itemTitle}>{customCloth.title}</h4>
                <button 
                  style={styles.replaceBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomCloth(null);
                    if (selectedCloth?.id === "custom") {
                      setSelectedCloth(null);
                    }
                  }}
                >
                  Remove Garment
                </button>
              </div>
            </div>
          ) : (
            <div 
              className={`upload-zone ${dragActive ? "active" : ""}`}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("cloth-file-input").click()}
              style={styles.customZone}
            >
              <Upload size={28} style={styles.uploadIcon} />
              <span style={styles.zoneText}>Upload Custom Piece</span>
              <span style={styles.zoneSubtext}>Drag and drop garment image</span>
              <input
                type="file"
                id="cloth-file-input"
                accept="image/*"
                onChange={handleCustomUpload}
                style={{ display: "none" }}
              />
            </div>
          )}

          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      </div>

      {/* Selected Item Summary Footer */}
      {selectedCloth && (
        <div style={styles.actionFooter} className="glass-card">
          <div style={styles.selectionSummary}>
            <div style={styles.summaryThumbWrapper}>
              <img src={selectedCloth.image} alt={selectedCloth.title} style={styles.summaryThumb} />
            </div>
            <div>
              <span style={styles.summaryLabel}>Selected Apparel</span>
              <h4 style={styles.summaryTitle} className="serif-title">{selectedCloth.title}</h4>
            </div>
          </div>
          
          <div style={styles.btnGroup}>
            <button onClick={onBack} style={styles.backBtn} className="luxury-button-secondary">
              Back
            </button>
            <button onClick={onNext} style={styles.nextBtn} className="luxury-button">
              Enter Fitting Room
              <ChevronRight size={16} />
            </button>
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
    gap: "2rem"
  },
  filterBar: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "0.5rem"
  },
  badges: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 0.7fr",
    gap: "2rem",
    alignItems: "stretch",
    "@media (max-width: 968px)": {
      gridTemplateColumns: "1fr"
    }
  },
  catalogBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem"
  },
  customBlock: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    height: "fit-content"
  },
  sectionTitle: {
    fontSize: "1.25rem",
    color: "#f5f5f7",
    marginBottom: "0.25rem"
  },
  customDesc: {
    fontSize: "0.85rem",
    color: "#9ea0a8",
    lineHeight: "1.5"
  },
  itemCard: {
    cursor: "pointer",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s"
  },
  customCard: {
    cursor: "default"
  },
  imageWrapper: {
    position: "relative",
    aspectRatio: "3/4",
    backgroundColor: "#16161a",
    overflow: "hidden"
  },
  itemImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.5s ease"
  },
  selectedIndicator: {
    position: "absolute",
    top: "12px",
    right: "12px",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#d4af37",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
    zIndex: 10
  },
  itemMeta: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    flexGrow: 1
  },
  itemCategory: {
    fontSize: "0.7rem",
    fontWeight: "600",
    color: "#d4af37",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  itemTitle: {
    fontSize: "0.95rem",
    color: "#f5f5f7",
    fontWeight: "500",
    margin: 0
  },
  itemDesc: {
    fontSize: "0.8rem",
    color: "#9ea0a8",
    lineHeight: "1.4",
    margin: 0,
    marginTop: "0.25rem"
  },
  customZone: {
    height: "250px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem"
  },
  uploadIcon: {
    color: "#d4af37",
    marginBottom: "0.5rem"
  },
  zoneText: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "#f5f5f7"
  },
  zoneSubtext: {
    fontSize: "0.75rem",
    color: "#5e6066"
  },
  replaceBtn: {
    marginTop: "0.75rem",
    padding: "0.5rem",
    fontSize: "0.8rem",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    borderRadius: "6px",
    color: "#ef4444",
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      backgroundColor: "rgba(239, 68, 68, 0.1)"
    }
  },
  errorText: {
    color: "#ef4444",
    fontSize: "0.8rem",
    margin: 0
  },
  actionFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 2rem",
    backgroundColor: "rgba(10, 10, 12, 0.9)",
    position: "sticky",
    bottom: "20px",
    zIndex: 80,
    marginTop: "1rem",
    "@media (max-width: 640px)": {
      flexDirection: "column",
      gap: "1.25rem",
      alignItems: "stretch",
      textAlign: "center"
    }
  },
  selectionSummary: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    "@media (max-width: 640px)": {
      justifyContent: "center"
    }
  },
  summaryThumbWrapper: {
    width: "48px",
    height: "64px",
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)"
  },
  summaryThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  summaryLabel: {
    fontSize: "0.75rem",
    color: "#d4af37",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600"
  },
  summaryTitle: {
    fontSize: "1.15rem",
    margin: 0,
    color: "#f5f5f7"
  },
  btnGroup: {
    display: "flex",
    gap: "1rem",
    "@media (max-width: 640px)": {
      justifyContent: "center"
    }
  },
  backBtn: {
    padding: "0.75rem 1.5rem"
  },
  nextBtn: {
    padding: "0.75rem 1.75rem"
  }
};
