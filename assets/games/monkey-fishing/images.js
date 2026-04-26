/**
 * images.js
 * Place this file in the SAME folder as your image assets:
 *   assets/games/monkey-fishing/images.js
 *
 * All require() calls must be static strings — no variables.
 * Import in your game: import IMG from '../assets/games/monkey-fishing/images';
 */

const IMG = {
  base:         require('./monkey-game-base-image.jpeg'),
  waveLower:    require('./monkey-image-wave-lower.jpeg'),
  waveUpper:    require('./monkey-game-wave-uper.jpeg'),
  waveUpperMax: require('./monkey-game-wave-uper-max.jpeg'),
  fishOut:      require('./monkey-game-fish-out.jpeg'),
  fishOutMax:   require('./monkey-image-fish-out-max.jpeg'),
};

export default IMG;
