/**
 * Utility functions for client-side video processing:
 * 1. Auto-detect video duration (mm:ss or hh:mm:ss)
 * 2. Auto-extract video dimensions (e.g. 1920 × 1080)
 * 3. Smart auto-capture of non-black thumbnail frame via HTML5 Canvas
 *    - Offscreen DOM attachment to activate hardware/software decoder
 *    - Waiting for decoded frame render (requestVideoFrameCallback / rAF)
 *    - Multi-point candidate probing with black-frame / luminance detection
 *    - Fallback branded stage canvas if video track is blank or undecodable
 * 4. Support for sampling frames at custom timestamps
 */

/**
 * Format raw seconds into a clean human-readable duration string.
 * Examples: 64 -> "01:04", 204 -> "03:24", 3665 -> "01:01:05"
 */
export function formatVideoDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Sample pixels across the canvas to evaluate frame luminance and dynamic range.
 * Returns quality score and whether the frame is deemed a black/blank intro screen.
 */
function evaluateFrameQuality(ctx, width, height) {
  try {
    const sampleW = Math.min(width, 160);
    const sampleH = Math.min(height, 90);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    let totalLuma = 0;
    let minLuma = 255;
    let maxLuma = 0;
    let samples = 0;

    // Sample every 16th pixel for high speed
    const step = 4 * 16;
    for (let i = 0; i < data.length; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;
      if (luma < minLuma) minLuma = luma;
      if (luma > maxLuma) maxLuma = luma;
      samples++;
    }

    const avgLuma = samples > 0 ? totalLuma / samples : 0;
    const dynamicRange = maxLuma - minLuma;

    // Consider black if average luminance < 18 or color variation is almost zero
    const isBlack = avgLuma < 18 || dynamicRange < 12;

    return {
      avgLuma,
      dynamicRange,
      isBlack,
      score: avgLuma + dynamicRange * 0.4,
    };
  } catch (err) {
    console.warn("Frame quality evaluation error:", err);
    return { avgLuma: 50, dynamicRange: 50, isBlack: false, score: 50 };
  }
}

/**
 * Creates an aesthetic TalentHire branded fallback thumbnail if the video track
 * is blank or format is audio-only/undecodable in the current browser.
 */
function createFallbackThumbnailCanvas(width = 1280, height = 720, title = "Performance Video") {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(640, width);
  canvas.height = Math.max(360, height);
  const ctx = canvas.getContext("2d");

  // Deep dark gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#191515");
  grad.addColorStop(0.5, "#251815");
  grad.addColorStop(1, "#121214");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle warm orange radial glow
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radial = ctx.createRadialGradient(cx, cy, 20, cx, cy, canvas.width * 0.45);
  radial.addColorStop(0, "rgba(255, 87, 34, 0.28)");
  radial.addColorStop(0.6, "rgba(255, 87, 34, 0.06)");
  radial.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center Play button badge
  const radius = Math.min(canvas.width, canvas.height) * 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy - 20, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#FF5722";
  ctx.shadowColor = "rgba(255, 87, 34, 0.5)";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Play triangle
  ctx.beginPath();
  const triSize = radius * 0.52;
  ctx.moveTo(cx - triSize * 0.35, cy - 20 - triSize * 0.65);
  ctx.lineTo(cx + triSize * 0.7, cy - 20);
  ctx.lineTo(cx - triSize * 0.35, cy - 20 + triSize * 0.65);
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Video title or placeholder
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.max(18, Math.round(canvas.width * 0.032))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(title || "Performance Video", cx, cy + radius + 32);

  // Brand tag
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = `600 ${Math.max(12, Math.round(canvas.width * 0.016))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("TALENTHIRE PORTFOLIO", cx, cy + radius + 60);

  return canvas;
}

/**
 * Waits for the video decoder to actually paint the sought frame.
 * Uses requestVideoFrameCallback when supported, with rAF/setTimeout fallbacks.
 */
function waitForVideoFrame(video, timeoutMs = 400) {
  return new Promise((resolve) => {
    let resolved = false;

    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    if (typeof video.requestVideoFrameCallback === "function") {
      try {
        video.requestVideoFrameCallback(() => done());
      } catch {
        // fallback
      }
    }

    requestAnimationFrame(() => {
      setTimeout(done, 80);
    });

    setTimeout(done, timeoutMs);
  });
}

/**
 * Helper to perform a single seek and grab a frame onto canvas.
 */
async function captureCanvasAtTime(video, targetTime) {
  return new Promise((resolve) => {
    let seekCompleted = false;

    const onSeeked = async () => {
      if (seekCompleted) return;
      seekCompleted = true;
      video.removeEventListener("seeked", onSeeked);

      // Wait for decoder to actually paint frame
      await waitForVideoFrame(video, 350);

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      const canvas = document.createElement("canvas");
      const maxDimension = 1280;
      let targetW = width;
      let targetH = height;

      if (targetW > maxDimension) {
        targetH = Math.round((targetH * maxDimension) / targetW);
        targetW = maxDimension;
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext("2d");
      try {
        ctx.drawImage(video, 0, 0, targetW, targetH);
        const quality = evaluateFrameQuality(ctx, targetW, targetH);
        resolve({ canvas, quality, width, height, time: targetTime });
      } catch (err) {
        console.warn("drawImage failed at time", targetTime, err);
        resolve(null);
      }
    };

    video.addEventListener("seeked", onSeeked, { once: true });

    try {
      video.currentTime = targetTime;
    } catch {
      resolve(null);
    }

    // Safety timeout in case seeked doesn't fire
    setTimeout(() => {
      if (!seekCompleted) {
        seekCompleted = true;
        video.removeEventListener("seeked", onSeeked);
        resolve(null);
      }
    }, 1200);
  });
}

/**
 * Extracts duration, dimensions, and captures a vibrant, non-black thumbnail frame.
 * Returns a Promise resolving to:
 * {
 *   duration: string ("03:24"),
 *   durationSeconds: number,
 *   dimensions: string ("1920 × 1080"),
 *   thumbnailFile: File | null,
 *   thumbnailBlob: Blob | null,
 *   previewUrl: string | null,
 *   candidateTimes: number[]
 * }
 */
export function extractVideoMetadataAndThumbnail(file, customSeekTime = null) {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob)) {
      resolve({
        duration: "",
        durationSeconds: 0,
        dimensions: "",
        thumbnailFile: null,
        thumbnailBlob: null,
        previewUrl: null,
        candidateTimes: [],
      });
      return;
    }

    const video = document.createElement("video");
    // Important: 'auto' preload ensures browser decodes and buffers video frames
    video.preload = "auto";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.crossOrigin = "anonymous";

    // Attach off-screen to DOM so Chromium initializes video surface & hardware decoder
    video.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:160px;height:90px;opacity:0.001;pointer-events:none;z-index:-9999;";
    if (typeof document !== "undefined" && document.body) {
      document.body.appendChild(video);
    }

    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      if (video.parentNode) video.parentNode.removeChild(video);
      resolve({
        duration: "",
        durationSeconds: 0,
        dimensions: "",
        thumbnailFile: null,
        thumbnailBlob: null,
        previewUrl: null,
        candidateTimes: [],
      });
      return;
    }

    video.src = objectUrl;

    let finished = false;

    const cleanup = () => {
      try {
        video.pause();
      } catch {
        // ignore
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
      video.removeAttribute("src");
      video.load();
    };

    const finish = (result) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    // Timeout safety net (max 8 seconds total extraction)
    const safetyTimer = setTimeout(() => {
      if (!finished) {
        console.warn("Video metadata extraction timed out. Using fallback.");
        const fallbackCanvas = createFallbackThumbnailCanvas(
          1280,
          720,
          file.name ? file.name.replace(/\.[^/.]+$/, "") : "Video"
        );
        fallbackCanvas.toBlob(
          (blob) => {
            const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "video";
            const thumbFileName = `${baseName}_thumbnail.jpg`;
            const thumbnailFile = blob ? new File([blob], thumbFileName, { type: "image/jpeg" }) : null;
            const previewUrl = blob ? URL.createObjectURL(blob) : null;
            finish({
              duration: video.duration ? formatVideoDuration(video.duration) : "00:00",
              durationSeconds: video.duration || 0,
              dimensions: video.videoWidth ? `${video.videoWidth} × ${video.videoHeight}` : "1920 × 1080",
              thumbnailFile,
              thumbnailBlob: blob,
              previewUrl,
              candidateTimes: [],
            });
          },
          "image/jpeg",
          0.85
        );
      }
    }, 8500);

    video.onerror = () => {
      clearTimeout(safetyTimer);
      finish({
        duration: "",
        durationSeconds: 0,
        dimensions: "",
        thumbnailFile: null,
        thumbnailBlob: null,
        previewUrl: null,
        candidateTimes: [],
      });
    };

    const onReadyToExtract = async () => {
      video.removeEventListener("loadedmetadata", onReadyToExtract);
      video.removeEventListener("canplay", onReadyToExtract);

      try {
        // Awaken video engine in Chromium
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              video.pause();
            })
            .catch(() => {
              // autoplay restriction, safe to ignore for muted offscreen
            });
        }
      } catch {
        // ignore
      }

      // Small delay to allow headers and first packets to parse
      await new Promise((r) => setTimeout(r, 100));

      const durationSeconds = video.duration && !isNaN(video.duration) ? video.duration : 0;
      const durationFormatted = formatVideoDuration(durationSeconds);
      const dimensions =
        video.videoWidth && video.videoHeight
          ? `${video.videoWidth} × ${video.videoHeight}`
          : "1920 × 1080";

      // Formulate multi-point candidate timestamps to bypass black intro frames
      let candidates = [];
      if (customSeekTime !== null && !isNaN(customSeekTime)) {
        candidates.push(Math.max(0.1, Number(customSeekTime)));
      }

      if (durationSeconds > 0) {
        if (durationSeconds <= 3) {
          candidates.push(Math.max(0.2, durationSeconds * 0.35));
          candidates.push(Math.max(0.5, durationSeconds * 0.65));
        } else if (durationSeconds <= 10) {
          candidates.push(1.5);
          candidates.push(Math.min(durationSeconds * 0.4, 4.0));
          candidates.push(Math.min(durationSeconds * 0.7, 7.0));
        } else {
          // Standard video: probe 15%, 35%, 55%, 8% and 75%
          candidates.push(Math.max(1.8, Math.min(durationSeconds * 0.15, 6.0)));
          candidates.push(Math.max(3.0, Math.min(durationSeconds * 0.35, 12.0)));
          candidates.push(Math.max(5.0, Math.min(durationSeconds * 0.55, 20.0)));
          candidates.push(Math.max(0.8, Math.min(durationSeconds * 0.08, 2.5)));
          candidates.push(Math.max(6.0, Math.min(durationSeconds * 0.75, 30.0)));
        }
      } else {
        candidates = [1.0, 2.5, 4.0];
      }

      // Deduplicate candidates
      candidates = Array.from(new Set(candidates.map((c) => Math.round(c * 10) / 10)));

      let chosenCanvas = null;
      let bestCanvas = null;
      let bestScore = -1;

      // Sequential probing
      for (const targetTime of candidates) {
        const result = await captureCanvasAtTime(video, targetTime);
        if (!result || !result.canvas) continue;

        if (result.quality.score > bestScore) {
          bestScore = result.quality.score;
          bestCanvas = result.canvas;
        }

        // If the frame is NOT black (bright, clear, good variance), we found our thumbnail!
        if (!result.quality.isBlack) {
          chosenCanvas = result.canvas;
          break;
        }
      }

      // If all probed frames were dark, use the highest scoring candidate if score >= 12
      if (!chosenCanvas && bestCanvas && bestScore >= 12) {
        chosenCanvas = bestCanvas;
      }

      // If still no non-black frame could be captured, generate the aesthetic branded fallback
      if (!chosenCanvas) {
        const title = file.name ? file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ") : "Video";
        chosenCanvas = createFallbackThumbnailCanvas(
          video.videoWidth || 1280,
          video.videoHeight || 720,
          title
        );
      }

      clearTimeout(safetyTimer);

      chosenCanvas.toBlob(
        (blob) => {
          if (!blob) {
            finish({
              duration: durationFormatted,
              durationSeconds,
              dimensions,
              thumbnailFile: null,
              thumbnailBlob: null,
              previewUrl: null,
              candidateTimes: candidates,
            });
            return;
          }

          const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "video";
          const thumbFileName = `${baseName}_thumbnail.jpg`;
          const thumbnailFile = new File([blob], thumbFileName, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);

          finish({
            duration: durationFormatted,
            durationSeconds,
            dimensions,
            thumbnailFile,
            thumbnailBlob: blob,
            previewUrl,
            candidateTimes: candidates,
          });
        },
        "image/jpeg",
        0.88
      );
    };

    video.addEventListener("loadedmetadata", onReadyToExtract, { once: true });
    video.addEventListener("canplay", onReadyToExtract, { once: true });
  });
}
