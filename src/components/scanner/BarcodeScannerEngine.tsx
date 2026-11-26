import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '../ui/primitives';

interface BarcodeScannerEngineProps {
  onDetected: (barcode: string) => void;
  activeLabel?: string;
  compact?: boolean;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
];

export const BarcodeScannerEngine: React.FC<BarcodeScannerEngineProps> = ({
  onDetected,
  activeLabel = 'Align retail barcode inside the frame',
  compact = false,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const containerId = `suvita-qr-reader-${uniqueId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [isScanning, setIsScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = async () => {
    const inst = scannerRef.current;
    if (inst) {
      try {
        if (inst.isScanning) {
          await inst.stop();
        }
        inst.clear();
      } catch {
        // Ignore cleanup error
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const startScanner = async (targetCameraIndex?: number) => {
    setCameraError(null);
    setStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera access is unavailable in this browser or device. Use manual barcode entry or product name search below.'
        );
      }

      await stopScanner();

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error(
          'No camera device was detected. Please use manual barcode entry or search by product name.'
        );
      }

      setCameras(devices);
      // Prefer rear environment camera on mobile if not explicitly switching
      let chosenIdx = targetCameraIndex ?? cameraIdx;
      if (targetCameraIndex === undefined && devices.length > 1) {
        const backIdx = devices.findIndex((d) =>
          /back|rear|environment/i.test(d.label)
        );
        if (backIdx >= 0) chosenIdx = backIdx;
      }
      chosenIdx = chosenIdx % devices.length;
      setCameraIdx(chosenIdx);

      const html5Qr = new Html5Qrcode(containerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5Qr;

      await html5Qr.start(
        devices[chosenIdx].id,
        {
          fps: 10,
          qrbox: { width: compact ? 220 : 260, height: compact ? 130 : 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          const clean = decodedText.trim();
          const now = Date.now();
          // Prevent duplicate scans within 3.5 seconds
          if (
            clean === lastScanRef.current.code &&
            now - lastScanRef.current.ts < 3500
          ) {
            return;
          }
          lastScanRef.current = { code: clean, ts: now };
          onDetectedRef.current(clean);
        },
        () => {
          // Ignore per-frame decode misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      const rawMsg = String(err?.message || err || '');
      if (/NotAllowedError|Permission|denied/i.test(rawMsg)) {
        setCameraError(
          'Camera permission was denied. Enable camera access in your browser settings, or enter the barcode manually below.'
        );
      } else if (/NotFoundError|No camera/i.test(rawMsg)) {
        setCameraError(
          'No camera was found on this device. You can still scan any product using manual barcode entry or name search below.'
        );
      } else {
        setCameraError(
          rawMsg ||
            'Unable to start the camera scanner. Use manual barcode entry or search by name instead.'
        );
      }
      setIsScanning(false);
    } finally {
      setStarting(false);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length < 2) return;
    const nextIdx = (cameraIdx + 1) % cameras.length;
    void startScanner(nextIdx);
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#181F1C] overflow-hidden">
      <div
        className={`relative w-full ${
          compact ? 'min-h-[220px]' : 'min-h-[280px] sm:min-h-[320px]'
        } flex flex-col items-center justify-center bg-[#121715]`}
      >
        <div
          id={containerId}
          className={`w-full ${isScanning ? 'block' : 'hidden'}`}
        />

        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative h-40 w-64 rounded-lg border border-[#00FFAA]/60">
              <div className="absolute inset-x-2 top-2 h-0.5 bg-[#00FFAA] shadow-[0_0_12px_#00FFAA] animate-scan-beam" />
            </div>
            <p className="mt-3 rounded bg-black/70 px-3 py-1 text-xs text-white">
              {activeLabel}
            </p>
          </div>
        )}

        {!isScanning && (
          <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#202923] text-[#00FFAA]">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              Camera Barcode Scanner
            </h3>
            <p className="mt-1.5 max-w-sm text-xs text-[#A0AAA5] leading-relaxed">
              Supports EAN-13 (including Indian 890 retail barcodes), EAN-8, UPC-A, and UPC-E. Camera permission is requested only when you tap start.
            </p>
            <div className="mt-5">
              <Button
                type="button"
                onClick={() => void startScanner()}
                disabled={starting}
              >
                <Camera className="h-4 w-4" />
                {starting ? 'Requesting camera...' : 'Start Camera Scanner'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div
          role="alert"
          className="flex items-start gap-3 border-t border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed">{cameraError}</p>
        </div>
      )}

      {isScanning && (
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] bg-[#1C2421] px-4 py-3">
          <span className="text-xs text-[#A0AAA5]">
            Camera active · EAN-13 / UPC-A ready
          </span>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSwitchCamera}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Camera
              </Button>
            )}
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => void stopScanner()}
            >
              <CameraOff className="h-3.5 w-3.5" />
              Stop Camera
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
