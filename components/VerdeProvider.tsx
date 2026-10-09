"use client";

// All app state and actions live here. Components read them via useVerde().
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { api, errMsg } from "@/lib/api";
import {
  CAM_HOLD_MS,
  EXPECT_PHOTO_MS,
  HISTORY_KEYS,
  HISTORY_LEN,
  MAX_UPLOAD_BYTES,
  POLL_MS,
  WEATHER_CITY,
  WEATHER_INTERVAL_MS,
  type HistoryKey,
} from "@/lib/config";
import {
  isRainId,
  loadTankCal,
  pct,
  predictActuators,
  saveTankCal,
  tankPercent,
  transcript,
  type Prediction,
  type TankCal,
} from "@/lib/logic";
import type {
  Analysis,
  AppImage,
  ChatLine,
  ChatMessage,
  ChatRole,
  Controls,
  ForecastDay,
  LatestScan,
  PlantIdResponse,
  PlantResult,
  RootDoc,
  Sensors,
  WeatherCurrent,
} from "@/lib/types";

export type PageId = "dashboard" | "weather" | "doctor" | "ai";
export type ToastKind = "ok" | "info" | "warn" | "err" | "rain";
export type Toast = { id: number; text: string; kind: ToastKind };
export type PollState = "connecting" | "live" | "offline";
export type WeatherView = {
  current: WeatherCurrent | null;
  forecast: ForecastDay[];
  rain: boolean;
  lastCheck: string | null;
  error: string | null;
  loading: boolean;
  nextCheckAt: number | null;
};
export type ModalState = { open: boolean; image: AppImage | null; chat: ChatLine[]; busy: boolean };
export type HoverState = { key: HistoryKey; x: number; y: number } | null;
export type StatusLine = { ok: boolean; text: string } | null;
export type History = Record<HistoryKey, number[]>;

type StatusKey = "weather" | "router" | "db" | "gemini";

export interface VerdeCtx {
  // navigation + shell
  page: PageId;
  setPage: (p: PageId) => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  startedAt: number;
  toggleFullscreen: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  toasts: Toast[];
  toast: (text: string, kind?: ToastKind) => void;
  activity: string[];

  // live data
  pollState: PollState;
  sensors: Sensors;
  controls: Controls;
  latestScan: LatestScan;
  history: History;
  tankCal: TankCal;
  tankPct: number | null;
  rain: boolean;
  prediction: Prediction;
  calTank: (mode: "empty" | "full" | "reset") => void;
  setCtrl: (key: keyof Controls, value: boolean | number) => Promise<boolean>;

  // hover + expanded graphs
  hover: HoverState;
  setHover: (h: HoverState) => void;
  graphKey: HistoryKey | null;
  setGraphKey: (k: HistoryKey | null) => void;

  // weather
  weather: WeatherView;
  checkWeather: (manual: boolean) => Promise<void>;

  // plant doctor
  currentImage: AppImage | null;
  flip: boolean;
  setFlip: (v: boolean) => void;
  photoTime: string | null;
  flashLive: boolean;
  analysis: Analysis;
  plantResult: PlantResult | null;
  triggerCamCapture: () => Promise<void>;
  useCamPhoto: () => void;
  uploadPhoto: () => void;
  onUserFile: (file: File) => void;

  // chat + analysis modal
  aiLines: ChatLine[];
  aiBusy: boolean;
  sendGemini: (question: string) => Promise<void>;
  orLines: ChatLine[];
  orBusy: boolean;
  sendOpenRouter: (question: string) => Promise<void>;
  orQuick: (question: string) => void;
  modal: ModalState;
  openAnalysis: (img: AppImage, capturedAt?: string | number) => void;
  closeModal: () => void;
  sendModalGemini: (question: string) => Promise<void>;

  // diagnostics
  status: Record<StatusKey, StatusLine>;
  testWeather: () => Promise<void>;
  testRouter: () => Promise<void>;
  testGemini: () => Promise<void>;
  pingDB: () => Promise<void>;
}

const Ctx = createContext<VerdeCtx | null>(null);

export function useVerde(): VerdeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVerde must be used inside <VerdeProvider>");
  return v;
}

// ---------- module helpers ----------
let seq = 0;
const makeLine = (role: ChatRole, text: string): ChatLine => ({ id: ++seq, role, text });
const tail = <T,>(arr: T[], n: number): T[] => (arr.length > n ? arr.slice(arr.length - n) : arr);
const stamp = () => new Date().toLocaleTimeString("en-GB");

const INTRO_AI: ChatLine[] = [
  makeLine("sys", "VERDE AI TERMINAL ONLINE."),
  makeLine("sys", "Current image: none. Ask anything — I can see the analysed photo and answer follow-ups."),
];
const INTRO_OR: ChatLine[] = [
  makeLine("sys", "OPENROUTER TERMINAL ONLINE."),
  makeLine("sys", "I can see your live sensors + controls from Firebase."),
  makeLine("sys", 'Ask: "what is the moisture?", "should I water?", "is the tank safe?"…'),
];
const IDLE: Analysis = { src: null, status: "idle", crops: [], diseases: [] };
const EMPTY_HISTORY: History = {
  moisture: [],
  temperature: [],
  humidity: [],
  tank_level: [],
  lux: [],
  voltage_sag: [],
};

function pushSample(prev: History, sample: Partial<Record<HistoryKey, number | undefined>>): History {
  const next = { ...prev };
  for (const k of HISTORY_KEYS) {
    const v = sample[k];
    if (typeof v === "number" && Number.isFinite(v)) next[k] = tail([...prev[k], v], HISTORY_LEN);
  }
  return next;
}

function parseIdentification(j: PlantIdResponse, src: string): Analysis {
  const crops = j.result?.crop?.suggestions ?? [];
  const diseases = j.result?.disease?.suggestions ?? [];
  if (crops.length === 0 && diseases.length === 0) {
    return { src, status: "err", crops, diseases, message: "No suggestions — is this a clear plant photo?" };
  }
  return { src, status: "ok", crops, diseases };
}

export function VerdeProvider({ children }: { children: ReactNode }) {
  // ----- shell state -----
  const [page, setPage] = useState<PageId>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activity, setActivity] = useState<string[]>(["// Plant Doctor ready."]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----- live data -----
  const [pollState, setPollState] = useState<PollState>("connecting");
  const [sensors, setSensors] = useState<Sensors>({});
  const [controls, setControls] = useState<Controls>({});
  const [latestScan, setLatestScan] = useState<LatestScan>({});
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [tankCal, setTankCalState] = useState<TankCal>({ empty: null, full: null });

  // ----- plant doctor -----
  const [currentImage, setCurrentImage] = useState<AppImage | null>(null);
  const [flip, setFlip] = useState(false);
  const [photoTime, setPhotoTime] = useState<string | null>(null);
  const [flashLive, setFlashLive] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>(IDLE);
  const [plantResult, setPlantResult] = useState<PlantResult | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false, image: null, chat: [], busy: false });

  // ----- chat -----
  const [aiLines, setAiLines] = useState<ChatLine[]>(INTRO_AI);
  const [aiBusy, setAiBusy] = useState(false);
  const [orLines, setOrLines] = useState<ChatLine[]>(INTRO_OR);
  const [orBusy, setOrBusy] = useState(false);

  // ----- weather -----
  const [weather, setWeather] = useState<WeatherView>({
    current: null,
    forecast: [],
    rain: false,
    lastCheck: null,
    error: null,
    loading: false,
    nextCheckAt: null,
  });
  const [status, setStatus] = useState<Record<StatusKey, StatusLine>>({ weather: null, router: null, db: null, gemini: null });

  // ----- hover / graph -----
  const [hover, setHover] = useState<HoverState>(null);
  const [graphKey, setGraphKey] = useState<HistoryKey | null>(null);

  // ----- refs (read inside timers / effects without stale closures) -----
  const sensorsRef = useRef<Sensors>({});
  const controlsRef = useRef<Controls>({});
  const latestRef = useRef<LatestScan>({});
  const tankCalRef = useRef<TankCal>({ empty: null, full: null });
  const expectUntilRef = useRef(0);
  // Ignore stale poll values briefly after a control write; rollback only the latest failed write.
  const pendingRef = useRef<Partial<Record<keyof Controls, number>>>({});
  const writeTokenRef = useRef<Partial<Record<keyof Controls, number>>>({});
  const flashTimer = useRef<number | null>(null);
  const weatherBusy = useRef(false);

  // ---------- derived ----------
  const tankPct = useMemo(() => tankPercent(sensors.tank_level, tankCal), [sensors.tank_level, tankCal]);
  const rain = controls.weather_override === 1;
  const prediction = useMemo(
    () => predictActuators(sensors, controls, tankPct, rain),
    [sensors, controls, tankPct, rain],
  );

  // ---------- stable helpers ----------
  const toast = useCallback((text: string, kind: ToastKind = "ok") => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const logActivity = useCallback((text: string) => {
    setActivity((a) => tail([...a, `[${stamp()}] ${text}`], 200));
  }, []);

  const pushAi = useCallback((role: ChatRole, text: string) => {
    setAiLines((a) => tail([...a, makeLine(role, text)], 200));
  }, []);

  const pushOr = useCallback((role: ChatRole, text: string) => {
    setOrLines((a) => tail([...a, makeLine(role, text)], 200));
  }, []);

  const pushModal = useCallback((role: ChatRole, text: string) => {
    setModal((m) => ({ ...m, chat: tail([...m.chat, makeLine(role, text)], 200) }));
  }, []);

  const writeControl = useCallback(
    async (key: keyof Controls, value: boolean | number): Promise<boolean> => {
      const previous = controlsRef.current[key];
      const token = ++seq;
      const patch = { [key]: value } as Partial<Controls>;
      writeTokenRef.current[key] = token;
      pendingRef.current[key] = Date.now() + 15_000;
      controlsRef.current = { ...controlsRef.current, ...patch };
      setControls(controlsRef.current); // optimistic while Firebase responds
      try {
        await api.patch("/controls", patch);
        if (writeTokenRef.current[key] === token) pendingRef.current[key] = Date.now() + 2_000;
        logActivity(`controls.${key} = ${value}`);
        return true;
      } catch (e) {
        const msg = errMsg(e);
        if (writeTokenRef.current[key] === token) {
          delete pendingRef.current[key];
          const reverted = { ...controlsRef.current, [key]: previous } as Controls;
          controlsRef.current = reverted;
          setControls(reverted);
        }
        logActivity(`set FAILED (${key}): ${msg}`);
        toast(`Could not update ${key}: ${msg}`, "err");
        return false;
      }
    },
    [logActivity, toast],
  );

  const showImage = useCallback(
    (img: AppImage, capturedAt?: string | number) => {
      setCurrentImage(img);
      setFlip(img.source === "cam"); // CAM camera is mounted upside-down
      setPhotoTime(img.source === "cam" && capturedAt ? new Date(capturedAt).toLocaleTimeString("en-GB") : null);
      const tag = img.source === "cam" ? "SOURCE: CAM" : "SOURCE: USER UPLOAD";
      pushAi("sys", `>> IMAGE SET: ${img.name} (${tag})`);
    },
    [pushAi],
  );

  const analyse = useCallback(
    async (img: AppImage) => {
      setAnalysis({ src: img.src, status: "loading", crops: [], diseases: [] });
      logActivity(`Analysing ${img.name} with Crop.health…`);
      try {
        const j = await api.plantId(img.src);
        const a = parseIdentification(j, img.src);
        setAnalysis(a);
        const top = a.crops[0];
        if (a.status === "ok" && top) {
          const prob = pct(top.probability);
          const common = top.details?.common_names?.[0];
          setPlantResult({ name: top.name, prob, common });
          logActivity(`Crop: ${top.name}${common ? ` (${common})` : ""} ${prob}%`);
          pushAi("sys", `>> CROP: ${top.name}${common ? ` (${common})` : ""} (${prob}%)`);
        }
        const d = a.diseases[0];
        if (a.status === "ok" && d) {
          const dp = pct(d.probability);
          logActivity(`Disease: ${d.name} ${dp}%`);
          pushAi("sys", `>> DISEASE: ${d.name} (${dp}%)`);
        }
        if (a.status === "err") logActivity(`Crop.health: ${a.message}`);
      } catch (e) {
        const msg = errMsg(e);
        setAnalysis({ src: img.src, status: "err", crops: [], diseases: [], message: msg });
        logActivity(`Crop.health error: ${msg}`);
      }
    },
    [logActivity, pushAi],
  );

  // ---------- Firebase poll (normal cadence with bounded offline backoff) ----------
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let timer: number | undefined;
    let retryDelay = POLL_MS;

    const schedule = (delay: number) => {
      if (!alive) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        void tick();
      }, delay);
    };

    const tick = async () => {
      if (!alive || inFlight) return;
      inFlight = true;
      try {
        const j: RootDoc = await api.root();
        if (!alive) return;

        const s: Sensors = { ...sensorsRef.current, ...(j.sensors ?? {}) };
        const c: Controls = { ...controlsRef.current, ...(j.controls ?? {}) };
        const now = Date.now();
        for (const k of Object.keys(pendingRef.current) as (keyof Controls)[]) {
          const pendingUntil = pendingRef.current[k] ?? 0;
          if (pendingUntil > now) (c as Record<string, unknown>)[k] = controlsRef.current[k];
          else delete pendingRef.current[k];
        }
        sensorsRef.current = s;
        controlsRef.current = c;
        setSensors(s);
        setControls(c);

        const pctNow = tankPercent(s.tank_level, tankCalRef.current);
        setHistory((h) =>
          pushSample(h, {
            moisture: s.moisture,
            temperature: s.temperature,
            humidity: s.humidity,
            tank_level: pctNow ?? undefined,
            lux: s.lux,
            voltage_sag: s.voltage_sag,
          }),
        );

        // New CAM frame detection: URL changed, capture time changed, or we just asked for one.
        const ls = j.latest_scan;
        if (ls) {
          const prev = latestRef.current;
          const newUrl = ls.imageUrl ?? "";
          const urlChanged = !!newUrl && newUrl !== (prev.imageUrl ?? "");
          const timeChanged = !!ls.captured_at && ls.captured_at !== prev.captured_at;
          const expecting = Date.now() < expectUntilRef.current;
          const isNew = !!newUrl && (expecting || urlChanged || timeChanged);
          const merged: LatestScan = { ...prev, ...ls };
          latestRef.current = merged;
          setLatestScan(merged);

          if (isNew) {
            expectUntilRef.current = 0;
            showImage({ src: newUrl, source: "cam", name: "cam-capture" }, ls.captured_at);
            setFlashLive(true);
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
            flashTimer.current = window.setTimeout(() => setFlashLive(false), 4000);
            logActivity("📸 NEW CAM photo detected — frame updated!");
            toast("📸 New CAM photo captured!", "info");
          }
        }
        setPollState("live");
        retryDelay = POLL_MS;
        schedule(POLL_MS);
      } catch {
        if (alive) {
          setPollState("offline");
          schedule(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    return () => {
      alive = false;
      if (timer !== undefined) window.clearTimeout(timer);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, [showImage, logActivity, toast]);

  // Load tank calibration from this browser (SSR-safe: read after mount).
  useEffect(() => {
    const cal = loadTankCal();
    tankCalRef.current = cal;
    setTankCalState(cal);
  }, []);

  // ---------- weather: check now + auto every 10 min, drives rain override ----------
  const checkWeather = useCallback(
    async (manual: boolean) => {
      if (weatherBusy.current) return;
      weatherBusy.current = true;
      setWeather((w) => ({ ...w, loading: true }));
      try {
        const data = await api.weather();
        const cur = data.current;
        const rainNow = isRainId(cur.id);
        const lastCheck = stamp();
        setWeather({
          current: cur,
          forecast: data.forecast,
          rain: rainNow,
          lastCheck,
          error: null,
          loading: false,
          nextCheckAt: Date.now() + WEATHER_INTERVAL_MS,
        });
        logActivity(`weather: ${cur.city} ${cur.temp}°C, ${cur.description}`);

        try {
          await api.patch("/weather", {
            city: cur.city || WEATHER_CITY,
            temp: cur.temp,
            condition: cur.condition,
            description: cur.description,
            humidity: cur.humidity,
            wind_speed: cur.wind_speed,
            rain_expected: rainNow,
            status: "live",
            synced_at: Date.now(),
          });
          logActivity(`Weather written to Firebase /weather (temp=${cur.temp}°C)`);
        } catch (e) {
          logActivity(`Weather write to Firebase failed: ${errMsg(e)}`);
        }

        await writeControl("weather_override", rainNow ? 1 : 0);

        if (rainNow) toast(`☔ Rain detected (${cur.description}) — watering suspended!`, "rain");
        else if (manual) toast(`✅ No rain expected (${cur.description}) — watering allowed`, "ok");
        setStatus((s) => ({
          ...s,
          weather: { ok: true, text: `✅ checked ${cur.city} ${cur.temp}°C ${cur.description}` },
        }));
      } catch (e) {
        const msg = errMsg(e);
        setWeather((w) => ({ ...w, loading: false, error: msg, nextCheckAt: Date.now() + WEATHER_INTERVAL_MS }));
        setStatus((s) => ({ ...s, weather: { ok: false, text: `❌ ${msg}` } }));
        if (manual) toast(`Weather check failed: ${msg}`, "err");
      } finally {
        weatherBusy.current = false;
      }
    },
    [logActivity, toast, writeControl],
  );

  useEffect(() => {
    void checkWeather(false);
    const id = window.setInterval(() => void checkWeather(false), WEATHER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [checkWeather]);

  // ---------- actions ----------
  const setCtrl = useCallback((key: keyof Controls, value: boolean | number) => writeControl(key, value), [writeControl]);

  const applyCal = (cal: TankCal) => {
    tankCalRef.current = cal;
    setTankCalState(cal);
    saveTankCal(cal);
  };

  const calTank = (mode: "empty" | "full" | "reset") => {
    if (mode === "reset") {
      applyCal({ empty: null, full: null });
      toast("Tank calibration reset", "info");
      return;
    }
    const raw = sensorsRef.current.tank_level;
    if (raw === undefined) {
      toast("No tank reading yet", "warn");
      return;
    }
    const cal: TankCal =
      mode === "empty" ? { ...tankCalRef.current, empty: raw } : { ...tankCalRef.current, full: raw };
    if (cal.empty !== null && cal.full !== null && cal.empty === cal.full) {
      toast("Empty and full readings are identical — empty/fill the tank first", "warn");
      return;
    }
    applyCal(cal);
    toast(`Tank ${mode.toUpperCase()} set at raw ${raw}%`, "ok");
  };

  const triggerCamCapture = async () => {
    expectUntilRef.current = Date.now() + EXPECT_PHOTO_MS;
    logActivity(">> 📸 Triggering CAM capture (sets /controls/capture_photo=true)…");
    const sent = await writeControl("capture_photo", true);
    if (!sent) {
      expectUntilRef.current = 0;
      return;
    }
    window.setTimeout(() => void writeControl("capture_photo", false), CAM_HOLD_MS);
    toast("📸 Capture triggered — waiting for photo…", "info");
  };

  const openAnalysis = (img: AppImage, capturedAt?: string | number) => {
    showImage(img, capturedAt);
    setModal({
      open: true,
      image: img,
      busy: false,
      chat: [makeLine("sys", "VERDE AI (Gemini) — I can see this image + the analysis above. Ask follow-ups: “what disease?”, “how to treat?”, “should I water?”")],
    });
    void analyse(img);
  };

  const useCamPhoto = () => {
    const url = latestRef.current.imageUrl;
    if (!url) {
      logActivity(">> No CAM photo in Firebase yet — trigger capture first or upload your own.");
      toast("No CAM photo found in /latest_scan yet.", "warn");
      return;
    }
    openAnalysis({ src: url, source: "cam", name: "cam-capture" }, latestRef.current.captured_at);
  };

  const uploadPhoto = () => fileInputRef.current?.click();

  const onUserFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file to analyse", "warn");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast("Image is larger than 8 MB", "err");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast("Could not read this image — try another file", "err");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast("Could not read this image — try another file", "err");
        return;
      }
      openAnalysis({ src: reader.result, source: "user", name: file.name });
    };
    try {
      reader.readAsDataURL(file);
    } catch {
      toast("Could not open this image — try another file", "err");
    }
  };

  const telemetryLine = () => {
    const s = sensorsRef.current;
    const c = controlsRef.current;
    const tankText = tankPct === null ? "--" : Math.round(tankPct);
    return `moisture=${s.moisture ?? "--"}%, temp=${s.temperature ?? "--"}C, humidity=${s.humidity ?? "--"}%, tank=${tankText}%, light=${s.light ?? "--"}, pump=${c.pump_state ?? false}, mode=${c.manual_mode ? "MANUAL" : "AUTO"}, thresholds: moisture=${c.moisture_threshold ?? "--"}, tank_lock=${c.tank_threshold ?? "--"}, rain_override=${c.weather_override ?? 0}`;
  };

  const plantLabel = (r: PlantResult | null) => (r ? `${r.name} (${r.prob}%)` : "not analysed yet");

  const sendGemini = async (question: string) => {
    const q = question.trim();
    if (!q || aiBusy) return;
    const history = transcript(aiLines);
    pushAi("user", q);
    setAiBusy(true);
    const prompt = [
      `Plant Doctor context: ${plantLabel(plantResult)}. Live telemetry: ${telemetryLine()}.`,
      history ? `Conversation so far:\n${history}` : "",
      `Question: ${q}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const r = await api.gemini(prompt, currentImage?.src);
      pushAi("ai", `VERDE AI: ${r.text}`);
    } catch (e) {
      pushAi("err", `ERR: ${errMsg(e)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const sendModalGemini = async (question: string) => {
    const q = question.trim();
    const img = modal.image;
    if (!q || !img || modal.busy) return;
    const history = transcript(modal.chat);
    pushModal("user", q);
    setModal((m) => ({ ...m, busy: true }));
    const a = analysis.src === img.src ? analysis : null;
    const top = a?.status === "ok" ? a.crops[0] : undefined;
    const dis = a?.status === "ok" ? a.diseases[0] : undefined;
    const ctx = top
      ? `Crop.health identified: ${top.name} (${pct(top.probability)}%).${dis ? ` Disease suggestion: ${dis.name} (${pct(dis.probability)}%).` : ""}`
      : "No Crop.health analysis available for this image yet.";
    const prompt = [
      `This is a plant photo (source: ${img.source}). ${ctx}`,
      history ? `Conversation so far:\n${history}` : "",
      `Question about THIS plant photo: ${q}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const r = await api.gemini(prompt, img.src);
      pushModal("ai", `VERDE AI: ${r.text}`);
    } catch (e) {
      pushModal("err", `ERR: ${errMsg(e)}`);
    } finally {
      setModal((m) => ({ ...m, busy: false }));
    }
  };

  const systemPrompt = () => {
    const c = controlsRef.current;
    const s = sensorsRef.current;
    const w = weather.current;
    const pr = prediction;
    return [
      "You are VERDE AI, the sensor-aware assistant for a smart plant-care rig (ESP32 + Firebase). Answer briefly and practically using the live data below. If something is missing, say so.",
      `LIVE SENSORS: ${JSON.stringify(s)}`,
      `CONTROLS: ${JSON.stringify(c)}`,
      `TANK (calibrated): ${tankPct === null ? "unknown" : Math.round(tankPct) + "%"}`,
      `EXPECTED ACTUATORS: pump ${pr.pump ? "ON" : "OFF"} (${pr.pumpReason}); light ${pr.light ? "ON" : "OFF"} (${pr.lightReason})`,
      `WEATHER (${WEATHER_CITY}): ${w ? `${w.temp}°C, ${w.description}, humidity ${w.humidity}%, rain expected: ${weather.rain ? "yes" : "no"}` : "not loaded"}`,
      `PLANT DOCTOR LAST RESULT: ${plantLabel(plantResult)}`,
    ].join("\n");
  };

  const sendOpenRouter = async (question: string) => {
    const q = question.trim();
    if (!q || orBusy) return;
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt() },
      ...orLines
        .filter((l) => l.role === "user" || l.role === "ai")
        .slice(-8)
        .map((l) => ({ role: l.role === "user" ? ("user" as const) : ("assistant" as const), content: l.text })),
      { role: "user", content: q },
    ];
    pushOr("user", q);
    setOrBusy(true);
    try {
      const r = await api.openrouter(messages);
      pushOr("ai", r.text);
    } catch (e) {
      pushOr("err", `ERR: ${errMsg(e)}`);
    } finally {
      setOrBusy(false);
    }
  };

  const orQuick = (question: string) => void sendOpenRouter(question);

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => toast("Fullscreen is not available here", "warn"));
    }
  };

  const testWeather = async () => {
    setStatus((s) => ({ ...s, weather: { ok: true, text: "⏳ checking Delhi…" } }));
    try {
      const d = await api.weather();
      setStatus((s) => ({
        ...s,
        weather: { ok: true, text: `✅ ${d.current.city} ${d.current.temp}°C ${d.current.description} · ${d.forecast.length}-day forecast` },
      }));
    } catch (e) {
      setStatus((s) => ({ ...s, weather: { ok: false, text: `❌ ${errMsg(e)}` } }));
    }
  };

  const testRouter = async () => {
    setStatus((s) => ({ ...s, router: { ok: true, text: "⏳ pinging OpenRouter…" } }));
    try {
      const r = await api.openrouter([{ role: "user", content: "Say OK" }]);
      setStatus((s) => ({ ...s, router: { ok: true, text: `✅ ${r.text.slice(0, 60)}` } }));
    } catch (e) {
      setStatus((s) => ({ ...s, router: { ok: false, text: `❌ ${errMsg(e)}` } }));
    }
  };

  const testGemini = async () => {
    setStatus((s) => ({ ...s, gemini: { ok: true, text: "⏳ checking Gemini…" } }));
    try {
      const r = await api.gemini("Reply with exactly: VERDE OK");
      setStatus((s) => ({ ...s, gemini: { ok: true, text: `✅ ${r.text.slice(0, 60)}` } }));
    } catch (e) {
      setStatus((s) => ({ ...s, gemini: { ok: false, text: `❌ ${errMsg(e)}` } }));
    }
  };

  const pingDB = async () => {
    setStatus((s) => ({ ...s, db: { ok: true, text: "⏳ pinging Firebase…" } }));
    try {
      const j = await api.root();
      const nodes = Object.keys(j).join(", ") || "(empty)";
      setStatus((s) => ({ ...s, db: { ok: true, text: `✅ nodes: ${nodes}` } }));
      toast("🔥 Firebase reachable", "ok");
    } catch (e) {
      setStatus((s) => ({ ...s, db: { ok: false, text: `❌ ${errMsg(e)}` } }));
      toast(`Firebase ping failed: ${errMsg(e)}`, "err");
    }
  };

  const value: VerdeCtx = {
    page,
    setPage: (p) => {
      setPage(p);
      setNavOpen(false);
    },
    navOpen,
    setNavOpen,
    startedAt,
    toggleFullscreen,
    fileInputRef,
    toasts,
    toast,
    activity,
    pollState,
    sensors,
    controls,
    latestScan,
    history,
    tankCal,
    tankPct,
    rain,
    prediction,
    calTank,
    setCtrl,
    hover,
    setHover,
    graphKey,
    setGraphKey,
    weather,
    checkWeather,
    currentImage,
    flip,
    setFlip,
    photoTime,
    flashLive,
    analysis,
    plantResult,
    triggerCamCapture,
    useCamPhoto,
    uploadPhoto,
    onUserFile,
    aiLines,
    aiBusy,
    sendGemini,
    orLines,
    orBusy,
    sendOpenRouter,
    orQuick,
    modal,
    openAnalysis,
    closeModal,
    sendModalGemini,
    status,
    testWeather,
    testRouter,
    testGemini,
    pingDB,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
