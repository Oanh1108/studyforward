export interface InputDevice {
  deviceId: string;
  label: string;
}

// Software-defined inputs (vendor utilities, loopbacks). On some PCs the browser's implicit default
// resolves to one of these and delivers digital silence while the real microphone works fine.
const PSEUDO_DEVICE = /virtual|noise[\s-]?cancel|stereo mix|loopback|asus utility|voicemeeter|cable output/i;

/** Picks the real microphone to record from, or undefined to let the browser decide. */
export function chooseMicrophoneId(devices: InputDevice[]): string | undefined {
  const real = devices.filter((d) => d.label && !PSEUDO_DEVICE.test(d.label));
  return (real.find((d) => d.deviceId === 'default') ?? real[0])?.deviceId;
}

/** Browser only. Labels are empty until microphone permission was granted once. */
export async function pickMicrophone(): Promise<string | undefined> {
  const list = async () =>
    (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === 'audioinput')
      .map(({ deviceId, label }) => ({ deviceId, label }));

  let devices = await list();
  if (devices.length > 0 && devices.every((d) => !d.label)) {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
      devices = await list();
    } catch {
      return undefined;
    }
  }
  return chooseMicrophoneId(devices);
}
