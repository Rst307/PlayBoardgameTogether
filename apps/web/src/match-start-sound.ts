// Legacy entry points delegate to the single application audio service.
import { audioManager } from './assets/audio-manager.js';
export function prepareMatchStartSound() { void audioManager.unlock(); }
export function playMatchStartSound() { void audioManager.test(); }
