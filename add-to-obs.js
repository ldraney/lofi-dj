#!/usr/bin/env node
/**
 * Add DJ Overlay to OBS as a browser source
 * Positions on left side of screen (480px wide column)
 *
 * Usage: node add-to-obs.js [create|show|hide|refresh]
 */

const OBSWebSocket = require('obs-websocket-js').default;
const path = require('path');
require('dotenv').config({ path: path.join(process.env.HOME || process.env.USERPROFILE, 'obs-twitch', '.env') });

const obs = new OBSWebSocket();

const OVERLAY_NAME = 'Lofi DJ Overlay';
const OVERLAY_WIDTH = 480;

async function main() {
  const action = process.argv[2] || 'create';

  try {
    // Connect to OBS WebSocket
    const port = process.env.OBS_WEBSOCKET_PORT || 4455;
    const password = process.env.OBS_WEBSOCKET_PASSWORD;

    await obs.connect(`ws://localhost:${port}`, password);
    console.log('Connected to OBS WebSocket');

    // Get current scene
    const { currentProgramSceneName: currentScene } = await obs.call('GetCurrentProgramScene');
    console.log(`Current scene: ${currentScene}`);

    // Get scene items
    const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: currentScene });

    // Find existing overlay
    let overlay = sceneItems.find(i => i.sourceName === OVERLAY_NAME);

    if (action === 'create') {
      if (overlay) {
        console.log('DJ Overlay already exists. Use "refresh" to reload.');
        await obs.disconnect();
        return;
      }

      // Get video settings for positioning
      const video = await obs.call('GetVideoSettings');
      const baseHeight = video.baseHeight;

      // Build file URL
      const overlayPath = path.resolve(__dirname, 'index.html');
      const fileUrl = `file:///${overlayPath.replace(/\\/g, '/')}`;

      console.log(`Creating browser source: ${fileUrl}`);

      // Create browser source
      const result = await obs.call('CreateInput', {
        sceneName: currentScene,
        inputName: OVERLAY_NAME,
        inputKind: 'browser_source',
        inputSettings: {
          url: fileUrl,
          width: OVERLAY_WIDTH,
          height: baseHeight,
          css: '',
          shutdown: false,
          restart_when_active: false
        }
      });

      // Position on left side
      await obs.call('SetSceneItemTransform', {
        sceneName: currentScene,
        sceneItemId: result.sceneItemId,
        sceneItemTransform: {
          positionX: 0,
          positionY: 0,
          boundsType: 'OBS_BOUNDS_NONE',
          scaleX: 1,
          scaleY: 1
        }
      });

      console.log(`Created "${OVERLAY_NAME}" (${OVERLAY_WIDTH}x${baseHeight})`);
      console.log('Position: Left side (0,0)');
      console.log('\nClick "Start Lofi Session" in OBS to begin!');

    } else if (action === 'show') {
      if (!overlay) throw new Error(`${OVERLAY_NAME} not found. Run: node add-to-obs.js create`);
      await obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: true
      });
      console.log('DJ Overlay shown');

    } else if (action === 'hide') {
      if (!overlay) throw new Error(`${OVERLAY_NAME} not found`);
      await obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: false
      });
      console.log('DJ Overlay hidden');

    } else if (action === 'refresh') {
      if (!overlay) throw new Error(`${OVERLAY_NAME} not found`);
      await obs.call('PressInputPropertiesButton', {
        inputName: OVERLAY_NAME,
        propertyName: 'refreshnocache'
      });
      console.log('DJ Overlay refreshed');

    } else if (action === 'remove') {
      if (!overlay) throw new Error(`${OVERLAY_NAME} not found`);
      await obs.call('RemoveInput', { inputName: OVERLAY_NAME });
      console.log('DJ Overlay removed');

    } else {
      console.log('Usage: node add-to-obs.js [create|show|hide|refresh|remove]');
    }

    await obs.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
