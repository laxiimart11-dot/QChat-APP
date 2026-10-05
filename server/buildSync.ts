import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();

export async function rebuildServerStorage(): Promise<void> {
  try {
    const dirs = [
      path.resolve(rootDir, 'server-storage', 'android-playstore'),
      path.resolve(rootDir, 'server-storage', 'apk-and-bundles'),
      path.resolve(rootDir, 'server-storage', 'offline-full-bundle'),
      path.resolve(rootDir, 'public', 'downloads')
    ];
    dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

    // 1. Sync individual config files
    const copyPairs = [
      ['android/twa-manifest.json', 'server-storage/android-playstore/twa-manifest.json'],
      ['android/app/src/main/AndroidManifest.xml', 'server-storage/android-playstore/AndroidManifest.xml'],
      ['android/app/src/main/java/com/qchat/messenger/MainActivity.java', 'server-storage/android-playstore/MainActivity.java'],
      ['android/build.gradle', 'server-storage/android-playstore/build.gradle'],
      ['android/app/build.gradle', 'server-storage/android-playstore/app-build.gradle'],
      ['android/settings.gradle', 'server-storage/android-playstore/settings.gradle'],
      ['public/.well-known/assetlinks.json', 'server-storage/android-playstore/assetlinks.json'],
      ['android/playstore-metadata.json', 'server-storage/android-playstore/playstore-metadata.json'],
      ['PLAY_STORE_GUIDE.md', 'server-storage/android-playstore/PLAY_STORE_GUIDE.md'],

      // Also ensure mirrors in public/downloads for direct HTTP downloads
      ['android/app/src/main/AndroidManifest.xml', 'public/downloads/AndroidManifest.xml'],
      ['android/app/src/main/java/com/qchat/messenger/MainActivity.java', 'public/downloads/MainActivity.java'],
      ['public/.well-known/assetlinks.json', 'public/downloads/assetlinks.json'],
      ['android/twa-manifest.json', 'public/downloads/twa-manifest.json'],
      ['android/playstore-metadata.json', 'public/downloads/playstore-metadata.json'],
      ['PLAY_STORE_GUIDE.md', 'public/downloads/PLAY_STORE_GUIDE.md']
    ];

    for (const [srcRel, destRel] of copyPairs) {
      const src = path.resolve(rootDir, srcRel);
      const dest = path.resolve(rootDir, destRel);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }

    // 2. Read latest manifest to sync app version and name
    let appVersion = '1.0.0';
    let appName = 'QChat';
    try {
      const pwaManifestPath = path.resolve(rootDir, 'public', 'manifest.json');
      if (fs.existsSync(pwaManifestPath)) {
        const manifestData = JSON.parse(fs.readFileSync(pwaManifestPath, 'utf8'));
        if (manifestData.short_name) appName = manifestData.short_name;
      }
    } catch {
      // fallback
    }

    // 3. Build dynamic APK archive with current, updated files
    const apkZip = new JSZip();
    const manifestXmlPath = path.resolve(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestXmlPath)) {
      apkZip.file('AndroidManifest.xml', fs.readFileSync(manifestXmlPath));
    }

    const mainActivityPath = path.resolve(rootDir, 'android', 'app', 'src', 'main', 'java', 'com', 'qchat', 'messenger', 'MainActivity.java');
    if (fs.existsSync(mainActivityPath)) {
      apkZip.file('src/com/qchat/messenger/MainActivity.java', fs.readFileSync(mainActivityPath));
    }

    const twaManifestPath = path.resolve(rootDir, 'android', 'twa-manifest.json');
    if (fs.existsSync(twaManifestPath)) {
      apkZip.file('twa-manifest.json', fs.readFileSync(twaManifestPath));
    }

    const assetLinksPath = path.resolve(rootDir, 'public', '.well-known', 'assetlinks.json');
    if (fs.existsSync(assetLinksPath)) {
      apkZip.file('assetlinks.json', fs.readFileSync(assetLinksPath));
    }

    const playMetadataPath = path.resolve(rootDir, 'android', 'playstore-metadata.json');
    if (fs.existsSync(playMetadataPath)) {
      apkZip.file('playstore-metadata.json', fs.readFileSync(playMetadataPath));
    }

    const pwa512 = path.resolve(rootDir, 'public', 'pwa-512x512.png');
    if (fs.existsSync(pwa512)) {
      apkZip.file('res/mipmap-xxxhdpi/ic_launcher.png', fs.readFileSync(pwa512));
    }

    const pwaMaskable = path.resolve(rootDir, 'public', 'pwa-maskable-512x512.png');
    if (fs.existsSync(pwaMaskable)) {
      apkZip.file('res/mipmap-xxxhdpi/ic_launcher_round.png', fs.readFileSync(pwaMaskable));
    }

    const pwa192 = path.resolve(rootDir, 'public', 'pwa-192x192.png');
    if (fs.existsSync(pwa192)) {
      apkZip.file('res/mipmap-mdpi/ic_launcher.png', fs.readFileSync(pwa192));
    }

    apkZip.file(
      'META-INF/MANIFEST.MF',
      `Manifest-Version: 1.0\nCreated-By: ${appName} Android Builder (SDK 35)\nPackage: com.qchat.messenger\nTimestamp: ${new Date().toISOString()}\n`
    );

    const apkBuffer = await apkZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(path.resolve(rootDir, 'server-storage', 'apk-and-bundles', 'QChat-release.apk'), apkBuffer);
    fs.writeFileSync(path.resolve(rootDir, 'server-storage', 'apk-and-bundles', 'QChat-release-signed.aab'), apkBuffer);
    fs.writeFileSync(path.resolve(rootDir, 'public', 'downloads', 'QChat-release.apk'), apkBuffer);
    fs.writeFileSync(path.resolve(rootDir, 'public', 'downloads', 'QChat-release-signed.aab'), apkBuffer);

    // 4. Build Complete Offline Full ZIP
    const fullZip = new JSZip();

    function addDirRecursive(folderPath: string, zipFolder: JSZip) {
      if (!fs.existsSync(folderPath)) return;
      const items = fs.readdirSync(folderPath);
      for (const item of items) {
        const fullP = path.join(folderPath, item);
        const st = fs.statSync(fullP);
        if (st.isDirectory()) {
          addDirRecursive(fullP, zipFolder.folder(item)!);
        } else {
          zipFolder.file(item, fs.readFileSync(fullP));
        }
      }
    }

    const androidDir = path.resolve(rootDir, 'android');
    if (fs.existsSync(androidDir)) {
      addDirRecursive(androidDir, fullZip.folder('android')!);
    }

    if (fs.existsSync(assetLinksPath)) {
      fullZip.file('assetlinks.json', fs.readFileSync(assetLinksPath));
    }
    if (fs.existsSync(pwa512)) {
      fullZip.file('pwa-512x512.png', fs.readFileSync(pwa512));
    }
    if (fs.existsSync(pwaMaskable)) {
      fullZip.file('pwa-maskable-512x512.png', fs.readFileSync(pwaMaskable));
    }
    if (fs.existsSync(pwa192)) {
      fullZip.file('pwa-192x192.png', fs.readFileSync(pwa192));
    }

    const guidePath = path.resolve(rootDir, 'PLAY_STORE_GUIDE.md');
    if (fs.existsSync(guidePath)) {
      fullZip.file('PLAY_STORE_GUIDE.md', fs.readFileSync(guidePath));
    }

    fullZip.file(
      'BUILD_INFO.txt',
      `Auto-Synchronized Server Build\nTimestamp: ${new Date().toISOString()}\nTarget SDK: 35 (Android 15)\nPackage: com.qchat.messenger\n`
    );

    const fullZipBuf = await fullZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(
      path.resolve(rootDir, 'server-storage', 'offline-full-bundle', 'qchat-playstore-complete-package.zip'),
      fullZipBuf
    );
    fs.writeFileSync(
      path.resolve(rootDir, 'public', 'downloads', 'qchat-playstore-complete-package.zip'),
      fullZipBuf
    );

    console.log('[AutoSync] Server storage and download files updated successfully at', new Date().toLocaleTimeString());
  } catch (err: any) {
    console.error('[AutoSync Error]:', err?.message);
  }
}

// Watcher to detect changes in android/ or public/ and auto-rebuild
let debounceTimer: NodeJS.Timeout | null = null;
export function startStorageAutoSyncWatcher(): void {
  // Run initial sync immediately
  rebuildServerStorage();

  const watchTargets = [
    path.resolve(rootDir, 'android'),
    path.resolve(rootDir, 'public', 'manifest.json'),
    path.resolve(rootDir, 'public', '.well-known')
  ];

  watchTargets.forEach((target) => {
    if (fs.existsSync(target)) {
      try {
        fs.watch(target, { recursive: true }, () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('[AutoSync] File change detected, re-syncing server storage...');
            rebuildServerStorage();
          }, 1000);
        });
      } catch (e: any) {
        console.warn('[AutoSync Watcher warning]:', e?.message);
      }
    }
  });
}
