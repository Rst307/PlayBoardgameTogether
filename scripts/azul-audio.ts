// Original short ceramic/chime sounds, installed through the existing media pipeline.
export function azulWav(key: string) {
  const rate = 24000;
  const duration = key === 'sound.finish' ? 1.25 : key === 'sound.score' ? 0.85 : 0.18;
  const samples = Math.floor(rate * duration), bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  const notes = key === 'sound.draft' ? [1100] : key === 'sound.score' ? [659.25, 830.61, 987.77, 1318.51] : [523.25, 659.25, 783.99, 1046.5, 1318.51];
  for (let i = 0; i < samples; i++) {
    const t = i / rate;
    let sample = 0;
    for (const [n, frequency] of notes.entries()) {
      const elapsed = t - n * (key === 'sound.finish' ? 0.13 : 0.065);
      if (elapsed < 0) continue;
      const envelope = Math.min(1, elapsed / 0.004) * Math.exp(-elapsed * 9);
      sample += (Math.sin(elapsed * frequency * Math.PI * 2) + 0.25 * Math.sin(elapsed * frequency * Math.PI * 5.4)) * envelope * 0.17;
    }
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 25000), 44 + i * 2);
  }
  return bytes;
}
