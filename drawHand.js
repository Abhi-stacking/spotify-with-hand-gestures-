const fingerJoints = {
  thumb:  [0, 1, 2, 3, 4],
  index:  [0, 5, 6, 7, 8],
  middle: [0, 9, 10, 11, 12],
  ring:   [0, 13, 14, 15, 16],
  pinky:  [0, 17, 18, 19, 20]
};

export function drawHand(predictions, ctx) {
  predictions.forEach(prediction => {
    const landmarks = prediction.landmarks;

    // 1) draw joints (dots)
    ctx.fillStyle = "red";
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = landmarks[i];
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 2) draw skeleton (lines between joints)
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;

    for (const finger in fingerJoints) {
      const points = fingerJoints[finger];
      ctx.beginPath();
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = landmarks[points[i]];
        const [x2, y2] = landmarks[points[i + 1]];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
  });
}
