export function playMessageSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export function playFriendRequestSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    gain.gain.value = 0.12;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 900;
      gain2.gain.value = 0.12;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.12);
    }, 130);
  } catch {}
}
