# Lofi DJ - Claude Guide

The controller for the lofi music + visuals ecosystem. Manages song playback, visual rendering, and crossfading.

**This repo owns the interface contracts.** Songs and visuals implement these interfaces to work with the DJ.

## Quick Start

```bash
cd ~/lofi-dj
npm start
# Server runs at http://localhost:3000
# Open http://localhost:3000/lofi-dj/ in browser
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           lofi-dj                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐     ┌──────────┐                                  │
│  │  Deck A  │     │  Deck B  │     Song Instances                │
│  │  (Song)  │     │  (Song)  │                                   │
│  └────┬─────┘     └────┬─────┘                                  │
│       └───────┬────────┘                                        │
│               ▼                                                  │
│       ┌───────────────┐                                         │
│       │  CrossFade    │     Tone.CrossFade node                 │
│       └───────┬───────┘                                         │
│               ▼                                                  │
│       ┌───────────────┐                                         │
│       │   Analyser    │     FFT + Waveform → visuals            │
│       └───────┬───────┘                                         │
│               ▼                                                  │
│       ┌───────────────┐                                         │
│       │    Master     │     → Tone.Destination (speakers)       │
│       └───────────────┘                                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Visual Stack                             │ │
│  │  Canvas layers with z-index, each running a visual module   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## The Ecosystem

```
~/
├── lofi-dj/                  # THIS REPO - Controller + Interface Contracts
├── lofi-demo-song/           # Song implementation
├── lofi-*-song/              # More songs...
├── visual-waveform/          # Visual implementation
├── visual-*/                 # More visuals...
├── lofi-development-docs/    # Deep Tone.js guides
└── lofi-visuals-docs/        # Deep Canvas guides
```

Songs and visuals are sibling directories. `npm start` serves from `~/` so all paths resolve.

---

## Interface Contracts

### Song Interface

Songs must implement these methods:

```javascript
class MySong {
  constructor() {
    this.name = 'my-song';
  }

  // Required
  async init()           // Initialize instruments and patterns
  async play()           // Start playback
  pause()                // Pause playback
  stop()                 // Stop and reset to beginning
  getState()             // Returns songState object (see below)
  getMasterOutput()      // Returns Tone.js node for audio routing
  dispose()              // Cleanup all resources

  // Events
  on(event, callback)    // Subscribe to events
  off(event, callback)   // Unsubscribe

  // Optional
  jumpToSection(name)    // Jump to named section
  muteTrack(name)        // Mute a track
  unmuteTrack(name)      // Unmute a track
  setTempo(bpm)          // Change tempo
}

// Events to emit:
// - 'sectionChange' (sectionName)
// - 'bar' (barNumber)
```

### Visual Interface

Visuals must implement these methods:

```javascript
class MyVisual {
  constructor() {
    this.name = 'my-visual';
    this.description = 'What this visual does';
  }

  // Required
  init(canvas)                      // Receive canvas, set up context
  render(audioData, songState)      // Called every frame (~60fps)
  dispose()                         // Cleanup

  // Optional
  onSectionChange(section)          // React to section changes
  setOption(key, value)             // Configure visual
  getOptions()                      // Return current options
}
```

### Data Shapes

```javascript
// audioData (passed to visual.render() each frame)
{
  frequencyData: Float32Array,  // 1024 FFT bins, -100 to 0 dB
  waveformData: Float32Array,   // 1024 samples, -1 to 1
  volume: number                // RMS level, 0 to 1
}

// songState (passed to visual.render() each frame)
{
  section: string,    // "intro" | "verse" | "climax" | "outro"
  bar: number,        // Current bar number
  beat: number,       // Beat within bar (0-3)
  bpm: number,        // Tempo (typically 70-85 for lofi)
  isPlaying: boolean
}
```

---

## Creating a New Song

1. **Create repo**: `mkdir ~/lofi-my-song && cd ~/lofi-my-song && git init`
2. **Copy structure** from `~/lofi-demo-song/`:
   ```
   lofi-my-song/
   ├── index.js        # Song class (default export)
   └── manifest.json   # Metadata
   ```
3. **Implement Song interface** (see above)
4. **Test**: Update `config.json` → `"song": "/lofi-my-song/index.js"`
5. **Reference**: `~/lofi-development-docs/` for Tone.js patterns and lofi theory

### Song Checklist
- [ ] Exports default class implementing Song interface
- [ ] `getState()` returns correct shape
- [ ] `getMasterOutput()` returns Tone.js node
- [ ] Emits `sectionChange` event when section changes
- [ ] `dispose()` cleans up all Tone.js objects

---

## Creating a New Visual

1. **Create repo**: `mkdir ~/visual-my-visual && cd ~/visual-my-visual && git init`
2. **Copy structure** from `~/visual-template/`:
   ```
   visual-my-visual/
   ├── index.js        # Visual class (default export)
   ├── manifest.json   # Metadata
   └── demo.html       # Standalone test (optional)
   ```
3. **Implement Visual interface** (see above)
4. **Test**: Update `config.json` → `"visual": "/visual-my-visual/index.js"`
5. **Reference**: `~/lofi-visuals-docs/` for Canvas patterns and audio-reactive techniques

### Visual Checklist
- [ ] Exports default class implementing Visual interface
- [ ] `render()` accepts `(audioData, songState)`
- [ ] Handles missing/empty audio data gracefully
- [ ] `dispose()` cleans up canvas references
- [ ] Responds to different sections (optional but recommended)

---

## File Structure

```
lofi-dj/
├── index.html          # Main UI shell
├── config.json         # Default song/visual, display settings
├── styles.css          # UI styling
├── src/
│   ├── controller.js   # DJController class - main orchestrator
│   ├── audio-chain.js  # Tone.js audio routing
│   └── event-bus.js    # Event communication
└── package.json        # npm start serves from parent dir
```

## config.json

```json
{
  "server": { "port": 3000 },
  "defaults": {
    "song": "/lofi-demo-song/index.js",
    "visual": "/visual-waveform/index.js",
    "autoPlay": false
  },
  "display": {
    "showControls": true,
    "showStatus": true
  }
}
```

## DJController API

```javascript
// Load content
await controller.loadSong('/lofi-demo-song/index.js', 'A');
await controller.loadVisual('/visual-waveform/index.js', 0);

// Transport
await controller.play();
controller.pause();
controller.stop();

// Crossfade (4 second transition to other deck)
await controller.startCrossfade(4);
controller.switchDeck();  // Instant switch

// Song control (forwards to active deck)
controller.jumpToSection('climax');
controller.muteTrack('drums');
controller.unmuteTrack('drums');
controller.setTempo(85);

// State
controller.getState();  // { activeDeck, deckA, deckB, visuals, isPlaying }
```

## Event Bus

```javascript
import { bus } from './src/event-bus.js';

// Listen
bus.on('songLoaded', ({ deck, song }) => { });
bus.on('sectionChange', ({ deck, section }) => { });
bus.on('bar', ({ deck, bar }) => { });
bus.on('play', ({ deck }) => { });
bus.on('pause', ({ deck }) => { });
bus.on('stop', ({ deck }) => { });
bus.on('crossfadeStart', ({ from, to, duration }) => { });
bus.on('crossfadeComplete', ({ activeDeck }) => { });
bus.on('visualLoaded', ({ name, layer }) => { });

// Emit
bus.emit('eventName', data);
```

## Development

```bash
# Start server
npm start

# Test in browser
open http://localhost:3000/lofi-dj/

# Check console for logs:
# [DJ] Config loaded
# [DJ] Controller initialized
# [DJ] Auto-loaded song
# [DJ] Auto-loaded visual
```

## Related Repos

- `~/lofi-development-docs/` - Deep Tone.js guides + lofi music theory
- `~/lofi-visuals-docs/` - Deep Canvas guides + audio-reactive techniques
