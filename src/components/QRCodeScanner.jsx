import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRCodeScanner = ({ onScan, onError }) => {
  const qrCodeRegionId = "qr-reader";
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        html5QrCode.start(
          cameras[0].id,
          {
            fps: 10,
            qrbox: 250,
          },
          (decodedText) => {
            onScan(decodedText);
            html5QrCode.stop(); // stop after successful scan
          },
          onError || (() => {})
        );
      }
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
        });
      }
    };
  }, []);

  return <div id={qrCodeRegionId} style={{ width: "100%" }} />;
};

export default QRCodeScanner;
