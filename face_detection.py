# main.py
import cv2, tempfile, os, shutil, sqlite3, uuid
import mediapipe as mp
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STORAGE_DIR = "stored_videos"
os.makedirs(STORAGE_DIR, exist_ok=True)

# --- DB setup ---
db = sqlite3.connect("videos.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS videos (id TEXT, filename TEXT, path TEXT)")
db.commit()

# --- Face check ---
mp_fd = mp.solutions.face_detection

def has_face(path, sample_every=15, conf=0.5):
    cap = cv2.VideoCapture(path)
    i = 0
    with mp_fd.FaceDetection(min_detection_confidence=conf) as fd:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % sample_every == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                if fd.process(rgb).detections:
                    cap.release()
                    return True
            i += 1
    cap.release()
    return False

@app.post("/upload")
async def upload(video: UploadFile = File(...)):
    suffix = os.path.splitext(video.filename)[1] or ".mp4"

    # 1. write to temp file for checking
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    # 2. GATE: check for face
    try:
        if has_face(tmp_path):
            os.remove(tmp_path)
            return {"allowed": False, "reason": "face detected — upload denied"}

        # 3. passed -> move to storage + record in DB
        vid_id = str(uuid.uuid4())
        final_path = os.path.join(STORAGE_DIR, vid_id + suffix)
        shutil.move(tmp_path, final_path)
        db.execute("INSERT INTO videos VALUES (?,?,?)", (vid_id, video.filename, final_path))
        db.commit()
        return {"allowed": True, "id": vid_id, "reason": "no face — stored"}
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return {"allowed": False, "reason": f"error: {e}"}