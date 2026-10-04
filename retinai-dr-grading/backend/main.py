"""RetinAI backend: CNN (EfficientNet) + attention-LSTM decoder for diabetic retinopathy grading."""
import base64, os
import cv2, numpy as np, timm, torch, torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

HERE = os.path.dirname(os.path.abspath(__file__))
BACKBONE = os.getenv("BACKBONE", "efficientnet_b0")
WEIGHTS = os.getenv("WEIGHTS", os.path.join(HERE, "best_cnnlstm_efficientnet_b0_fold0.pth"))
IMG, HID, EMB = 320, 256, 128
PAD, SOS, EOS, VOCAB, MAXLEN = 0, 1, 2, 7, 5
LABELS = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"]
STAGES = ["mild", "moderate", "severe", "proliferative"]
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD = np.array([0.229, 0.224, 0.225], np.float32)


# ---- model (identical to the training notebook so the weights load) ----
class Attention(nn.Module):
    def __init__(self, enc_dim, dec_dim, att_dim=128):
        super().__init__()
        self.w_enc = nn.Linear(enc_dim, att_dim)
        self.w_dec = nn.Linear(dec_dim, att_dim)
        self.v = nn.Linear(att_dim, 1)

    def forward(self, mem, h):
        e = self.v(torch.tanh(self.w_enc(mem) + self.w_dec(h).unsqueeze(1))).squeeze(2)
        a = torch.softmax(e, 1)
        return (a.unsqueeze(2) * mem).sum(1), a


class CNNLSTM(nn.Module):
    def __init__(self, backbone=BACKBONE, hid=HID, emb=EMB):
        super().__init__()
        self.cnn = timm.create_model(backbone, pretrained=False, num_classes=0)
        self.proj = nn.Sequential(nn.Conv2d(self.cnn.num_features, hid, 1), nn.ReLU())
        self.init_h = nn.Linear(hid, hid)
        self.init_c = nn.Linear(hid, hid)
        self.embed = nn.Embedding(VOCAB, emb, padding_idx=PAD)
        self.att = Attention(hid, hid)
        self.cell = nn.LSTMCell(emb + hid, hid)
        self.drop = nn.Dropout(0.3)
        self.out = nn.Linear(hid, VOCAB)

    def encode(self, x):
        f = self.proj(self.cnn.forward_features(x))
        _, _, H, W = f.shape
        mem = f.flatten(2).transpose(1, 2)
        g = mem.mean(1)
        return mem, torch.tanh(self.init_h(g)), torch.tanh(self.init_c(g)), (H, W)

    def step(self, tok, mem, h, c):
        ctx, a = self.att(mem, h)
        h, c = self.cell(torch.cat([self.embed(tok), ctx], 1), (h, c))
        return self.out(self.drop(h)), h, c, a


def allowed_mask(t):
    m = torch.full((VOCAB,), float("-inf"))
    m[EOS] = 0
    if t < 4:
        m[3 + t] = 0
    return m


model = CNNLSTM()
state = torch.load(WEIGHTS, map_location="cpu")
model.load_state_dict(state.get("state_dict", state) if isinstance(state, dict) else state)
model.eval()
torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))


# ---- preprocessing (same as training: crop > pad square > resize > Ben Graham) ----
def preprocess(raw: bytes):
    bgr = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("not an image")
    img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    mask = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) > 7
    if mask.any():
        ys, xs = np.where(mask.any(1))[0], np.where(mask.any(0))[0]
        img = img[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
    h, w = img.shape[:2]
    s = max(h, w)
    sq = np.zeros((s, s, 3), np.uint8)
    sq[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = img
    disp = cv2.resize(sq, (IMG, IMG), interpolation=cv2.INTER_AREA)
    ben = cv2.addWeighted(disp, 4, cv2.GaussianBlur(disp, (0, 0), IMG / 30), -4, 128)
    x = (ben.astype(np.float32) / 255.0 - MEAN) / STD
    return disp, torch.from_numpy(x.transpose(2, 0, 1)).unsqueeze(0)


@torch.no_grad()
def analyze(x):
    mem, h0, c0, (H, W) = model.encode(x)
    # 1) greedy generation: stage tokens until <eos>
    h, c, tok = h0, c0, torch.tensor([SOS])
    seq, atts, conf = [], [], 1.0
    for t in range(MAXLEN):
        lg, h, c, a = model.step(tok, mem, h, c)
        p = torch.softmax(lg[0] + allowed_mask(t), 0)
        nxt = int(p.argmax())
        conf *= float(p[nxt])
        atts.append(a[0])
        if nxt == EOS:
            break
        seq.append(STAGES[t])
        tok = torch.tensor([nxt])
    # 2) probability of each grade along the "keep progressing" path
    h, c, tok, ps = h0, c0, torch.tensor([SOS]), []
    for t in range(4):
        lg, h, c, _ = model.step(tok, mem, h, c)
        ps.append(float(torch.softmax(torch.stack([lg[0, 3 + t], lg[0, EOS]]), 0)[0]))
        tok = torch.tensor([3 + t])
    probs, cum = [], 1.0
    for p_ in ps:
        probs.append(cum * (1 - p_))
        cum *= p_
    probs.append(cum)
    att = torch.stack(atts).mean(0).reshape(H, W).numpy()
    return len(seq), seq, conf, probs, att


def overlay(disp, att):
    a = (att - att.min()) / (att.max() - att.min() + 1e-8)
    a = np.clip(cv2.resize(a.astype(np.float32), (IMG, IMG), interpolation=cv2.INTER_CUBIC), 0, 1)
    heat = cv2.cvtColor(cv2.applyColorMap((a * 255).astype(np.uint8), cv2.COLORMAP_MAGMA), cv2.COLOR_BGR2RGB)
    return cv2.addWeighted(disp, 0.55, heat, 0.45, 0)


def b64(rgb):
    _, buf = cv2.imencode(".jpg", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


# ---- API ----
app = FastAPI(title="RetinAI API")
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "backbone": BACKBONE}


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    raw = file.file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 15 MB)")
    try:
        disp, x = preprocess(raw)
    except Exception:
        raise HTTPException(400, "Could not read this file as an image")
    grade, seq, conf, probs, att = analyze(x)
    return {
        "grade": grade,
        "label": LABELS[grade],
        "sequence": seq,
        "confidence": round(conf, 4),
        "probabilities": [round(p, 4) for p in probs],
        "processed": b64(disp),
        "heatmap": b64(overlay(disp, att)),
        "disclaimer": "Research prototype. Not a medical device or a diagnosis.",
    }
