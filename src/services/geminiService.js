/**
 * VELOUR Studio - Gemini API Service
 * All image operations use /generateContent (no Imagen 3 needed).
 * Image generation uses gemini-2.5-flash-image (Nano Banana).
 */

/** Converts any image (base64 data URI or URL) to { mimeType, base64Data }. */
async function parseImageInput(imageInput) {
  if (!imageInput) return null;
  let dataUri = imageInput;

  if (!imageInput.startsWith("data:")) {
    try {
      const res = await fetch(imageInput);
      if (!res.ok) throw new Error(`Fetch failed: ${imageInput}`);
      const blob = await res.blob();
      dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("parseImageInput error:", e);
      return null;
    }
  }

  const m = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64Data: m[2] };
}

/** Helper to get width and height of an image from its data URI / URL. */
function getImageDimensions(imageUri) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = imageUri;
  });
}

/** Maps a width/height to the closest standard Gemini aspect ratio. */
function getClosestAspectRatio(width, height) {
  if (!width || !height) return "1:1";
  const ratio = width / height;
  const options = [
    { name: "21:9", value: 21 / 9 },
    { name: "16:9", value: 16 / 9 },
    { name: "3:2", value: 3 / 2 },
    { name: "4:3", value: 4 / 3 },
    { name: "5:4", value: 5 / 4 },
    { name: "1:1", value: 1 / 1 },
    { name: "4:5", value: 4 / 5 },
    { name: "3:4", value: 3 / 4 },
    { name: "2:3", value: 2 / 3 },
    { name: "9:16", value: 9 / 16 }
  ];
  let closest = options[0];
  let minDiff = Math.abs(ratio - closest.value);
  for (let i = 1; i < options.length; i++) {
    const diff = Math.abs(ratio - options[i].value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = options[i];
    }
  }
  return closest.name;
}

/** Tests the API key against a Gemini text model. */
export async function testApiKeyConnection(apiKey, model = "gemini-2.5-flash") {
  if (!apiKey) throw new Error("API Key is required.");
  const response = await fetch(
    `/api-google/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello! Respond with a single word 'Success'." }] }]
      })
    }
  );
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text && text.toLowerCase().includes("success");
}

/** Analyzes user photo(s) to produce a physical style profile. */
export async function analyzeUserProfile(apiKey, userImageUris, model = "gemini-2.5-flash") {
  if (!apiKey) throw new Error("API Key is required.");
  if (!userImageUris?.length) throw new Error("At least one user image is required.");

  const parsed = (await Promise.all(userImageUris.map(parseImageInput))).filter(Boolean);
  if (!parsed.length) throw new Error("Invalid user image format.");

  const parts = [
    { text: "Analyze this portrait. Produce exactly two evocative sentences describing the person's build, hair style/color, skin tone, and key facial features in sophisticated catalog language. Output only those two sentences." },
    ...parsed.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64Data } }))
  ];

  const res = await fetch(
    `/api-google/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No analysis returned.");
  return text.trim();
}

/**
 * Analyzes user + clothing image to produce:
 *  - physicalProfile: rich person description for identity consistency
 *  - clothingDescription: vivid garment description
 */
export async function analyzeUserAndCloth(apiKey, userImageUris, clothImageUri, model = "gemini-2.5-flash") {
  if (!apiKey) throw new Error("API Key is required.");
  if (!userImageUris?.length) throw new Error("At least one user image is required.");
  if (!clothImageUri) throw new Error("Clothing image is required.");

  const parsedUsers = (await Promise.all(userImageUris.map(parseImageInput))).filter(Boolean);
  const parsedCloth = await parseImageInput(clothImageUri);
  if (!parsedUsers.length) throw new Error("Invalid user image format.");
  if (!parsedCloth) throw new Error("Invalid clothing image format.");

  const promptText = `You are a fashion consultant AI. Analyze the images.
Image 1+ = photos of a person. Last image = clothing item to try on.

Output ONLY a valid JSON object (no markdown) with exactly these fields:
{
  "physicalProfile": "Two evocative sentences describing: hair (color, style, length), skin tone, facial features, body build and proportions. Be precise enough for identity matching.",
  "clothingDescription": "One sentence: describe the garment type, color, material, cut, sleeve length, hem length, and any key design features."
}`;

  const parts = [
    { text: promptText },
    ...parsedUsers.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64Data } })),
    { inlineData: { mimeType: parsedCloth.mimeType, data: parsedCloth.base64Data } }
  ];

  const res = await fetch(
    `/api-google/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } })
    }
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No analysis response.");

  text = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
  const result = JSON.parse(text);
  if (!result.physicalProfile || !result.clothingDescription) {
    throw new Error("Incomplete analysis response.");
  }
  return result;
}

/**
 * CORE: Virtual Try-On with pose-specific prompts.
 *
 * pose="front"  → strict in-place swap: same framing/background/pose, only clothing changes.
 * pose=other    → recreate person in a new scene/pose wearing the new garment.
 *
 * Critical for both: explicitly REMOVE original clothing before applying new garment.
 */
export async function performVirtualTryOn(apiKey, userImageUri, clothImageUri, pose, clothingDesc, personDesc) {
  if (!apiKey) throw new Error("API Key is required.");
  if (!userImageUri) throw new Error("User image is required.");
  if (!clothImageUri) throw new Error("Clothing image is required.");

  // Detect original image dimensions to preserve aspect ratio
  let detectedRatio = "1:1";
  try {
    const dims = await getImageDimensions(userImageUri);
    if (dims) {
      detectedRatio = getClosestAspectRatio(dims.width, dims.height);
      console.info(`[TryOn] Detected user image aspect ratio: ${dims.width}x${dims.height} -> mapped to standard Gemini ratio: ${detectedRatio}`);
    }
  } catch (err) {
    console.warn("[TryOn] Failed to detect user image aspect ratio, defaulting to 1:1:", err);
  }

  const parsedUser = await parseImageInput(userImageUri);
  const parsedCloth = await parseImageInput(clothImageUri);
  if (!parsedUser) throw new Error("Failed to process user image.");
  if (!parsedCloth) throw new Error("Failed to process clothing image.");

  const garment = clothingDesc || "the clothing item in Image 2";
  const identity = personDesc || "the person in Image 1";

  // Classify the garment category to enable context-preserving and category-aware try-ons
  const garmentCategory = (() => {
    const desc = garment.toLowerCase();
    const fullBodyKeywords = ["dress", "frock", "gown", "jumpsuit", "suit", "set", "robe", "kimono", "onesie"];
    const lowerBodyKeywords = ["pants", "trousers", "jeans", "skirt", "shorts", "leggings", "bottoms", "slacks", "chinos", "sweatpants"];
    if (fullBodyKeywords.some(kw => desc.includes(kw))) return "FULL_BODY";
    if (lowerBodyKeywords.some(kw => desc.includes(kw))) return "LOWER_BODY";
    return "UPPER_BODY"; // Default to upper body (jackets, hoodies, t-shirts, etc.)
  })();
  console.info(`[TryOn] Classified garment category: ${garmentCategory} for item description: "${garment}"`);

  let instruction;
  let systemInstructionText = "";

  if (pose === "front") {
    // ──────────────────────────────────────────────────────────────────────
    // FRONT VIEW — In-place edit. Identical photo, but with clothing category-aware swap.
    // ──────────────────────────────────────────────────────────────────────
    let categoryPrompts = "";
    if (garmentCategory === "UPPER_BODY") {
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in upper-body clothing try-ons (tops, jackets, coats, hoodies).
CRITICAL RULES (MUST NEVER VIOLATE):
1. ZERO LAYERING/OVERLAYING: Do NOT layer the new jacket or top OVER the original top/sweater/collar. You MUST completely erase, replace, and remove the original upper-body clothing, original sleeves, original collars, original necklines, and fabrics from Image 1. The new garment from Image 2 must sit DIRECTLY on the person's skin or look like it is worn directly.
2. PRESERVE LOWER-BODY CLOTHING: You MUST preserve the original trousers, pants, jeans, skirts, or shorts worn by the person in Image 1 EXACTLY as they are. Do NOT erase, modify, or shorten the original pants. The trousers must remain fully intact, at their original length, and styled exactly as in the original photo.
3. GENERALIZED ARM & SLEEVE ERASURE MANDATE (CRITICAL): If the new garment is sleeveless, strapless, off-shoulder, short-sleeved, or has shorter sleeves than the original clothing in Image 1, you MUST completely erase the original sleeves from the shoulder joints all the way down to the hands. Do NOT leave original sleeves, buttons, cuffs, or fabric showing on the biceps, forearms, or wrists. You MUST dynamically paint and generate realistic bare skin and arms (shoulders, biceps, elbows, forearms, wrists, and hands) with matching skin tone, completely replacing the original sleeve length. The entire arm from the shoulder joint downwards must become bare skin.
4. SLEEVELESS/STRAPLESS/OFF-SHOULDER BARE SKIN RULE: If the new upper-body garment is sleeveless, strapless, off-shoulder, low-cut, or halter-neck, and the original person in Image 1 is wearing a high-coverage top (like a long-sleeve sweater, a high-neck shirt, or a crewneck), you MUST completely erase the original sweater's sleeves, shoulders, and collar/neckline fabric. You MUST dynamically paint and generate realistic bare skin (shoulders, collarbones, neck, chest, and arms) matching the person's skin tone in place of the sweater. Under no circumstances should the original long sleeves or neckline remain visible underneath or stick out.`;

      categoryPrompts = `━━━ STEP 1 — ERASE ORIGINAL UPPER CLOTHING ━━━
- Completely remove the original upper-body clothing (the original sweater, top, shirt, collar, neckline, and sleeves). Erase them fully.
- If the new garment has shorter sleeves, is sleeveless, or is strapless/off-shoulder, you MUST completely erase the original long sleeves from the shoulder joints ALL the way down to the wrists/hands. Leave no buttons, cuffs, or fabrics on their arms.
- Do NOT layer the new garment OVER the original top/sweater. The original top/sweater must be 100% gone.
- Keep the original pants/jeans/trousers/skirt EXACTLY as they are in Image 1. Do NOT alter, shorten, or erase them. They must remain fully intact and styled exactly as in the original photo.

━━━ STEP 2 — APPLY THE NEW UPPER GARMENT ━━━
- Dress the person in the new item: ${garment}
- If the new item is short-sleeved, sleeveless, or strapless/off-shoulder, you MUST paint realistic bare skin (shoulders, collarbones, neck, chest, and arms from shoulder joint down to hands) matching the person's skin tone in place of the original long sleeves and collar. Never show the original long sleeves or collar underneath.
- Ensure the new item drapes naturally on the shoulders and torso.`;
    } else if (garmentCategory === "LOWER_BODY") {
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in lower-body clothing try-ons (pants, jeans, skirts, shorts).
CRITICAL RULES (MUST NEVER VIOLATE):
1. REPLACE LOWER-BODY CLOTHING: You MUST completely erase, replace, and remove the original trousers, pants, jeans, skirts, or shorts from Image 1. 
2. PRESERVE UPPER-BODY CLOTHING: You MUST preserve the original upper-body clothing (jacket, hoodie, sweater, shirt, collar) worn by the person in Image 1 EXACTLY as it is. Do NOT erase or alter the original top.
3. DYNAMIC BARE LEG GENERATION: If the new garment is shorter than the original trousers (e.g. a short skirt or shorts), you MUST dynamically generate and paint realistic, anatomically correct bare legs (shins, ankles, feet) matching the person's skin tone in place of the trousers. Under no circumstances should the original trousers remain underneath.`;

      categoryPrompts = `━━━ STEP 1 — ERASE ORIGINAL LOWER CLOTHING ━━━
- Completely remove the original pants/jeans/trousers/skirt. Erase them fully.
- Keep the original upper-body clothing (sweater, shirt, jacket, collar) EXACTLY as they are in Image 1. Do NOT alter or erase them.

━━━ STEP 2 — APPLY THE NEW LOWER GARMENT ━━━
- Dress the person in the new item: ${garment}
- If the new item is short or a skirt, paint realistic bare legs/skin matching the person's skin tone in place of the original long pants.
- Ensure the new item fits naturally around the waist and hips.`;
    } else {
      // FULL_BODY
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in full-body clothing try-ons (dresses, frocks, gowns, jumpsuits).
CRITICAL RULES (MUST NEVER VIOLATE):
1. TOTAL OUTFIT REPLACEMENT: A dress, frock, or gown is a SINGLE CONTINUOUS full-body garment. You MUST completely erase, replace, and remove ALL original clothing worn by the person in Image 1. This includes completely erasing any original tops (shirts, t-shirts, sweaters, tanks, camisoles, jackets) and any original bottoms (pants, trousers, jeans, skirts, leggings, shorts).
2. ZERO COEXISTENCE/LAYERING: Do NOT layer the new dress or gown OVER any original clothing. Do NOT allow any original undergarments, tops, sleeves, pants, or skirts to remain visible or peak out underneath or around the new dress/gown. The entire original outfit must be 100% erased and completely replaced by the new single continuous dress/gown.
3. GENERALIZED ARM & SLEEVE ERASURE MANDATE (CRITICAL): If the new dress/gown is sleeveless, strapless, halter-neck, off-shoulder, short-sleeved, or has shorter sleeves than the original clothing in Image 1, you MUST completely erase the original sleeves from the shoulder joints all the way down to the hands. Do NOT leave any part of the original sleeves, buttons, cuffs, or fabric showing on the shoulders, biceps, forearms, or wrists. You MUST dynamically paint and generate realistic, anatomically correct bare skin and arms (shoulders, biceps, elbows, forearms, wrists, and hands) with matching skin tone, completely replacing the original sleeve length. The entire arm from the shoulder joint downwards must become beautiful, realistic bare skin.
4. SLEEVELESS/STRAPLESS/OFF-SHOULDER BARE SKIN RULE: If the new dress/gown is sleeveless, strapless, off-shoulder, low-cut, or halter-neck, and the original person in Image 1 is wearing high-coverage clothing (such as a long-sleeve shirt/sweater, a high-neck top, or a crewneck), you MUST completely erase all original sleeve, shoulder, neck, and chest fabric. You MUST dynamically paint and generate realistic bare skin (shoulders, collarbones, neck, chest, and arms) matching the person's skin tone. Under no circumstances should the original long sleeves or neckline remain visible underneath or stick out from the new dress. The shoulders, arms, and chest MUST be rendered as bare skin.
5. CORRECT DRESS DRAPING: The new dress/gown must drape continuously from the shoulders and torso down to its natural hemline (fully covering the hips, thighs, and legs), completely replacing all original clothing.
6. DYNAMIC BARE SKIN: If the dress is short or medium length, show bare legs matching the user's skin tone. If it is a long gown, it should cover the lower body correctly down to the ankles/feet.`;

      categoryPrompts = `━━━ STEP 1 — ERASE ALL ORIGINAL CLOTHING ━━━
- Completely remove both the original upper-body clothing (shirts, sweaters, jackets, sleeves) and the original lower-body clothing (pants, jeans, trousers, skirts, shorts). Erase them fully.
- If the new dress/gown has shorter sleeves, is sleeveless, or is strapless/off-shoulder, you MUST completely erase the original sleeves from the shoulder joint ALL the way down to the wrists/hands. Leave no buttons, cuffs, or fabrics on the arms.
- Under no circumstances layer the new dress/gown over any original clothing. Do NOT keep any part of the original shirt, sweater, sleeves, or pants/skirt. All of them must be 100% gone.
- The person's body torso, arms, and legs must be cleared of original clothing before applying the new dress/gown.

━━━ STEP 2 — APPLY THE NEW FULL-BODY DRESS/GOWN ━━━
- Dress the person in the new item: ${garment}
- If the new dress/gown is sleeveless, strapless, or off-shoulder, you MUST paint realistic bare skin (arms from the shoulder joint down to hands, shoulders, collarbones, neck, and chest) matching the person's skin tone. Never show the original long sleeves or high collar underneath.
- The new dress/gown must cover the torso and extend downwards as a single continuous dress, completely replacing the original outfit.
- Ensure the new dress/gown is worn directly on the person's skin, draping it beautifully and naturally down their body.`;
    }

    instruction = `VIRTUAL CLOTHING TRY-ON — IN-PLACE SWAP (FRONT VIEW)

You have two images:
• Image 1: A photo of a person.
• Image 2: A clothing item to be worn.

YOUR TASK: Produce Image 1 again, but with the clothing swapped.

${categoryPrompts}

━━━ STEP 3 — PRESERVE EVERYTHING ELSE EXACTLY ━━━
- Face: exact same face, expression, and gaze direction
- Hair: exact same hair color, style, and length
- Skin tone: unchanged
- Body position and pose: identical — same standing/sitting/angle
- Camera framing: EXACT same crop, zoom, and composition — person in same position in frame
- Background: pixel-accurate recreation of the same environment, same depth
- Lighting: same light direction, intensity, and shadows
- Accessories: same glasses/jewellery/bag if present in Image 1

Output: one photorealistic image — Image 1 with new clothing only.`;

  } else {
    // ──────────────────────────────────────────────────────────────────────
    // POSE VARIATION — Recreate the person in a new scene wearing the garment.
    // ──────────────────────────────────────────────────────────────────────
    const poseScenes = {
      street: {
        name: "Urban Street Style",
        desc: `Place the person on an elegant European city street. Golden hour warm sunlight from the side. Natural, relaxed walking pose, slight 3/4 angle toward camera. Shallow depth of field — background buildings softly blurred. Candid, confident street photography feel. Medium full-body shot.`
      },
      editorial: {
        name: "High-Fashion Editorial",
        desc: `Place the person in a sophisticated indoor editorial setting (marble floor, minimalist white studio, or loft space with large windows). Fashion-forward pose: standing tall with one hand on hip, slight body rotation, direct confident gaze. Soft diffused key lighting, clean shadows. Magazine-quality composition — 3/4 body shot.`
      },
      dramatic: {
        name: "Dramatic Cinematic",
        desc: `Cinematic portrait. Strong directional side lighting (chiaroscuro: one side lit, opposite side in deep shadow). Dark, moody atmospheric background — black or deep charcoal. Medium shot framing to highlight the garment's silhouette and fabric textures. The person has a powerful, intense expression. Artistic and high-impact.`
      }
    };

    const scene = poseScenes[pose] || { name: "Fashion Portrait", desc: "A well-lit fashion photograph in a neutral elegant setting." };

    let categoryPosePrompts = "";
    if (garmentCategory === "UPPER_BODY") {
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in upper-body clothing try-ons (tops, jackets, coats, hoodies) in outdoor/editorial scenes.
CRITICAL RULES (MUST NEVER VIOLATE):
1. ERASURE OF OLD TOP: You must completely remove the original sweater/top and its sleeves/collars. Do not layer over it.
2. DYNAMIC OUTFIT COMPLETION: Since this is an upper-body item, you MUST pair it with a stylish, complementary lower-body garment (such as a premium pair of jeans or tailored dark trousers) to complete a realistic, fashionable outfit. Never leave the lower body bare or in underwear.`;

      categoryPosePrompts = `━━━ STEP 2 — CLOTHING — UPPER GARMENT + MATCHING BOTTOMS ━━━
- Dress the person in the new item from Image 2: ${garment}
- Do NOT layer this over any original clothing.
- Completing the Outfit: Since this is an upper-body item, you MUST pair it with a stylish, complementary lower-body garment (such as a premium pair of dark-blue jeans, tailored trousers, or a clean black skirt) to complete a realistic, fashionable outfit. Do NOT leave the person without pants or in undergarments.`;
    } else if (garmentCategory === "LOWER_BODY") {
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in lower-body clothing try-ons (pants, jeans, skirts, shorts) in outdoor/editorial scenes.
CRITICAL RULES (MUST NEVER VIOLATE):
1. DYNAMIC LEG GENERATION: If the garment is short (skirt/shorts), you must dynamically generate realistic bare legs matching the person's skin tone.
2. DYNAMIC OUTFIT COMPLETION: Since this is a lower-body item, you MUST pair it with a simple, complementary upper-body garment (such as a white t-shirt or black top) to complete a realistic, fashionable outfit.`;

      categoryPosePrompts = `━━━ STEP 2 — CLOTHING — LOWER GARMENT + MATCHING TOP ━━━
- Dress the person in the new item from Image 2: ${garment}
- If the garment is short (skirt, shorts), show realistic bare legs/skin matching the person's skin tone.
- Completing the Outfit: Since this is a lower-body item, you MUST pair it with a simple, complementary upper-body garment (such as a clean, minimalist white t-shirt, a premium black knit top, or a classic silk blouse) to complete a realistic, fashionable outfit.`;
    } else {
      // FULL_BODY
      systemInstructionText = `You are a professional luxury fashion image synthesis AI specializing in full-body clothing try-ons (dresses, frocks, gowns, jumpsuits) in outdoor/editorial scenes.
CRITICAL RULES (MUST NEVER VIOLATE):
1. FULL OUTFIT REPLACEMENT: Dress the person in the new full-body garment from Image 2. No original clothing (including any shirts, sweaters, jackets, original sleeves, or original trousers/skirts/shorts) carries over or remains visible.
2. GENERALIZED ARM & SLEEVE ERASURE MANDATE (CRITICAL): If the new dress/gown is sleeveless, strapless, off-shoulder, halter-neck, or short-sleeved, you MUST completely erase the original sleeves from the shoulder joints all the way down to the hands. You MUST dynamically paint and generate realistic bare skin and arms with matching skin tone.
3. DYNAMIC LEG GENERATION: If the dress is shorter than the original pants/trousers, you must dynamically generate realistic bare legs matching the person's skin tone. Never show original trousers or under-layers.`;

      categoryPosePrompts = `━━━ STEP 2 — CLOTHING — FULL-BODY GARMENT ━━━
- Dress the person in the new full-body item: ${garment}
- Under no circumstances layer this over any original clothing. If it is a short dress or frock, show beautiful bare legs and arms matching the person's skin tone. If the dress is sleeveless or strapless, completely erase any original sleeves/straps and render beautiful bare skin.`;
    }

    instruction = `VIRTUAL CLOTHING TRY-ON — ${scene.name.toUpperCase()}

You have two images:
• Image 1: A person reference photo.
• Image 2: A clothing item to be worn.

━━━ STEP 1 — IDENTITY (from Image 1) ━━━
Recreate this EXACT person. Match precisely:
- Face: same facial features, bone structure, expression style
- Hair: same color, length, and style
- Skin tone: unchanged
- Body build and proportions: same height, frame, and body type
${identity ? `Reference description: ${identity}` : ""}

${categoryPosePrompts}

━━━ STEP 3 — NEW SCENE ━━━
${scene.desc}

Output: one photorealistic fashion photograph of this specific person, wearing this specific garment, in this specific scene.`;
  }

  const requestBody = {
    contents: [
      {
        parts: [
          { text: instruction },
          { inlineData: { mimeType: parsedUser.mimeType, data: parsedUser.base64Data } },
          { inlineData: { mimeType: parsedCloth.mimeType, data: parsedCloth.base64Data } }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstructionText }
      ]
    },
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 1,
      topP: 0.95,
      imageConfig: {
        aspectRatio: detectedRatio
      }
    }
  };

  // Confirmed image-capable models for this API key
  const modelsToTry = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "nano-banana-pro-preview"
  ];

  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `/api-google/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        console.warn(`[TryOn] ${model} / ${pose} failed: ${e.error?.message || res.status}`);
        continue;
      }
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          console.info(`[TryOn] ✓ ${pose} generated with ${model}`);
          return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }
      console.warn(`[TryOn] ${model} / ${pose}: no image in response.`);
    } catch (err) {
      console.warn(`[TryOn] ${model} / ${pose} error:`, err.message);
    }
  }

  return null;
}
