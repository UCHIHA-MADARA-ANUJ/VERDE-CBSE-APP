"use client";

import { useVerde } from "./VerdeProvider";
import { AnalysisView, Card, Terminal } from "./ui";

export default function PlantDoctor() {
  const {
    currentImage,
    flip,
    setFlip,
    photoTime,
    flashLive,
    analysis,
    triggerCamCapture,
    useCamPhoto,
    uploadPhoto,
    activity,
    latestScan,
    setPage,
  } = useVerde();

  const isCam = currentImage?.source === "cam";

  return (
    <div className="page-body">
      <div className="grid">
        <Card
          title={
            <>
              🌿 Plant Doctor — analyse photo
              <span className={`badge ${isCam ? "b-cam" : "b-user"}`}>
                {currentImage ? (isCam ? "SOURCE: CAM" : "SOURCE: USER UPLOAD") : "SOURCE: CAM"}
              </span>
            </>
          }
        >
          <div className="imgbox">
            {currentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImage.src}
                alt={currentImage.name}
                style={{ transform: flip ? "rotate(180deg)" : "none" }}
              />
            ) : (
              <div className="ph">No image yet.<br />Use CAM capture or upload your own.</div>
            )}
            {flashLive && <span className="live-flag">● LIVE</span>}
          </div>

          <div className="row-inline">
            <div className="mono small muted">
              {currentImage ? `Current image: ${currentImage.name} (${isCam ? "CAM" : "USER UPLOAD"})` : "Current image: none"}
              {photoTime && <> · captured {photoTime}</>}
            </div>
            <button className="btn ghost" onClick={() => setFlip(!flip)} disabled={!currentImage}>
              ⟳ Rotate 180°
            </button>
          </div>

          <div className="btn-row">
            <button className="btn red" onClick={() => void triggerCamCapture()}>📸 Capture photo now</button>
            <button className="btn purple" onClick={useCamPhoto}>📷 Analyse CAM photo</button>
            <button className="btn" onClick={uploadPhoto}>🖼️ Analyse my photo</button>
            <button className="btn ghost" onClick={() => setPage("ai")}>🧠 Ask Gemini</button>
          </div>

          <div className="panel">
            <div className="panel-t">Last identification <span className="muted">· Crop.health</span></div>
            <AnalysisView a={analysis.src === currentImage?.src || analysis.status === "idle" ? analysis : { ...analysis, status: "idle" }} />
          </div>

          <div className="mono small muted">CAM feed: {latestScan.imageUrl ? "photo available in /latest_scan" : "no photo in /latest_scan yet"}</div>
          <div className="section-label">Activity</div>
          <Terminal lines={activity} height={130} />
        </Card>
      </div>
    </div>
  );
}
