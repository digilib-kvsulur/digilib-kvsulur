import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

declare const __BUILD_TIME__: string;

const GITHUB_OWNER = 'digilib-kvsulur';
const GITHUB_REPO  = 'digilib-kvsulur';
const APK_ASSET_NAME = 'PM.SHRI.KV.SULUR.DLMS.apk';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string; // ISO date — we compare this against the app's build time
  assets: Array<{ name: string; browser_download_url: string }>;
}

export async function checkForAndroidUpdate(): Promise<void> {
  const platform = (window as any).Capacitor?.getPlatform?.();
  if (platform !== 'android') return;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return;

    const release: GitHubRelease = await res.json();

    const releaseDate = new Date(release.published_at).getTime();
    const buildDate   = new Date(__BUILD_TIME__).getTime();

    // Only prompt if GitHub release is newer than this installed build
    if (releaseDate <= buildDate) return;

    const apkAsset = release.assets.find((a) => a.name === APK_ASSET_NAME);
    if (!apkAsset) return;

    const label = release.tag_name || 'a newer version';

    toast.info(`🚀 Update available! (${label})`, {
      description: 'Tap "Update Now" to download and install instantly.',
      duration: Infinity,
      action: {
        label: 'Update Now',
        onClick: () => downloadAndInstall(apkAsset.browser_download_url, label),
      },
    });
  } catch {
    // Silently ignore — no internet, API error, etc.
  }
}

async function downloadAndInstall(downloadUrl: string, label: string): Promise<void> {
  const toastId = 'apk-download-progress';

  try {
    toast.loading('Starting download…', { id: toastId, description: '0%' });

    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) throw new Error('Download failed');

    const contentLength = Number(response.headers.get('Content-Length') || 0);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    // Stream with progress
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (contentLength > 0) {
        const pct = Math.round((loaded / contentLength) * 100);
        toast.loading(`Downloading… ${pct}%`, { id: toastId });
      }
    }

    toast.loading('Saving to device…', { id: toastId });

    // Merge Uint8Array chunks → Blob → base64
    const blob   = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
    const base64 = await blobToBase64(blob);
    const fileName = `KVSULUR-DLMS-update.apk`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.External,
    });

    const { uri } = await Filesystem.getUri({
      path: fileName,
      directory: Directory.External,
    });

    toast.dismiss(toastId);
    toast.success('Download complete! Opening installer…', { duration: 3000 });

    // Trigger Android system install dialog — user taps one "Install" button
    const { FileOpener } = await import('@capacitor-community/file-opener');
    await FileOpener.open({
      filePath: uri,
      contentType: 'application/vnd.android.package-archive',
      openWithDefault: true,
    });
  } catch (err) {
    toast.dismiss(toastId);
    toast.error('Update failed', {
      description: 'Please visit the website to download manually.',
    });
    console.error('[APK Updater]', err);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
