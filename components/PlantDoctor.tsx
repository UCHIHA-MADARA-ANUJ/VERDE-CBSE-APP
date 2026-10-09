"use client";

import { useVerde } from "./VerdeProvider";
import { AnalysisView, Badge, Card, Icon, Terminal } from "./ui";

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
    openAnalysis,
  } = useVerde();

  const isCam = currentImage?.source === "cam";
  const busy = analysis.status === "loading";
  const current = currentImage && analysis.src === currentImage.src ? analysis : null;

  return (
    <div className="page-body">
      <div className="dash-grid">
        <div className="c-7">
          <Card
            title="Plant viewer"
            icon="leaf"
            right={currentImage ? <Badge tone={isCam ? "info" : "idle"}>{isCam ? "CAM" : "User upload"}</Badge> : <Badge>no image</Badge>}
          >
            <div className={`viewer ${busy ? "scanning" : ""}`}>
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentImage.src} alt={currentImage.name} style={{ transform: flip ? "rotate(180deg)" : "none" }} />
              ) : (
                <div className="viewer-empty">
                  <Icon name="camera" size={34} />
                  <div>No image yet</div>
                  <div className="muted small">Capture from the CAM or upload a photo of your plant.</div>
                </div>
              )}
              <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
              {busy && <span className="scanline" />}
              {flashLive && <span className="live-flag">● LIVE</span>}
            </div>

            <div className="viewer-meta">
              <span className="mono small muted">
                {currentImage ? `${currentImage.name}` : "—"}
                {photoTime && ` · captured ${photoTime}`}
              </span>
              <button className="btn ghost sm" onClick={() => setFlip(!flip)} disabled={!currentImage}>
                <Icon name="rotate" size={14} /> Rotate 180°
              </button>
            </div>

            <div className="btn-row">
              <button className="btn red" onClick={() => void triggerCamCapture()}><Icon name="camera" size={15} /> Capture now</button>
              <button className="btn purple" onClick={useCamPhoto}><Icon name="leaf" size={15} /> Analyse CAM photo</button>
              <button className="btn" onClick={uploadPhoto}><Icon name="send" size={15} /> Upload my photo</button>
              {currentImage && <button className="btn ghost" onClick={() => openAnalysis(currentImage)}>Open analysis</button>}
            </div>
          </Card>
        </div>

        <div className="c-5 stack">
          <Card title="Crop.health result" icon="pulse" right={current && current.status === "ok" ? <Badge tone="ok">identified</Badge> : null}>
            <AnalysisView a={current ?? { src: null, status: "idle", crops: [], diseases: [] }} />
            {current?.status === "ok" && (
              <button className="btn ghost sm" onClick={() => setPage("ai")}>Ask Gemini about this plant →</button>
            )}
          </Card>

          <Card title="Source" icon="camera">
            <div className="kv">
              <div><span>CAM feed</span><b className="mono">{latestScan.imageUrl ? "photo available" : "no photo yet"}</b></div>
              <div><span>Last CAM frame</span><b className="mono">{latestScan.captured_at ? new Date(latestScan.captured_at).toLocaleTimeString("en-GB") : "--"}</b></div>
            </div>
          </Card>

          <Card title="Activity" icon="terminal">
            <Terminal lines={activity} height={200} />
          </Card>
        </div>
      </div>
    </div>
  );
}
