// gestures.js
import { drawHand } from "./drawHand.js";

let net;
let lastGesture = "";
let lastGestureTime = 0;

export async function initGestures(onNext, onPrev, onClose) {
  // 1) Webcam preview
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.position = "fixed";
  video.style.bottom = "10px";
  video.style.right = "10px";
  video.style.width = "250px";
  video.style.height = "230px";
  video.style.opacity = "1";
  video.style.zIndex = "9999";
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  });
  video.srcObject = stream;

  // 2) Canvas overlay
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  canvas.style.position = "fixed";
  canvas.style.bottom = "10px";
  canvas.style.right = "10px";
  canvas.style.width = "250px";
  canvas.style.height = "230px";
  canvas.style.zIndex = "10000";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // 3) Load Handpose
  net = await handpose.load();

  // 4) Define gestures with Fingerpose
  const GE = new fp.GestureEstimator([
    fp.Gestures.ThumbsUpGesture,   // will map to onNext
    fp.Gestures.VictoryGesture     // will map to onPrev
  ]);

  async function loop() {
  if (video.readyState !== 4) {
    requestAnimationFrame(loop);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const predictions = await net.estimateHands(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (predictions.length > 0) {
    drawHand(predictions, ctx);

    const landmarks = predictions[0].landmarks;
    const estimates = GE.estimate(landmarks, 8);

    if (estimates.gestures && estimates.gestures.length > 0) {
      const now = performance.now();
      const best = estimates.gestures.reduce((p, c) =>
        p.confidence > c.confidence ? p : c
      );
      const gestureName = best.name;      // e.g. "thumbs_up", "victory", etc.
      const conf = best.confidence;       // 0–10

      console.log("Detected:", gestureName, "conf:", conf);

      // 1) ignore weak detections
      if (conf < 8) {
        requestAnimationFrame(loop);
        return;
      }

      // 2) debounce: same gesture for 1500 ms
      if (gestureName === lastGesture && now - lastGestureTime > 1500) {

        // === PER-GESTURE ACTIONS ===
        if (gestureName === "thumbs_up") {
          // NEXT SONG
          onNext();
        } else if (gestureName === "victory") {
          // PREVIOUS SONG
          onPrev();
        } else if (gestureName === "open_hand") {
          // CLOSE LYRICS / FULLSCREEN (adjust name after you see logs)
          onClose();
        }
        // ============================

        lastGestureTime = now;
      } else if (gestureName !== lastGesture) {
        lastGesture = gestureName;
        lastGestureTime = now;
      }
    }
  }

  requestAnimationFrame(loop);
}

  requestAnimationFrame(loop);
}
