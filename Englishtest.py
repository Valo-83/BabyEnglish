import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import Body, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StoryRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=80)


class StoryAudioRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=80)
    text: str = Field(..., min_length=1, max_length=2000)


STORY_AUDIO_DIR = Path(__file__).parent / "story_audio"

# Module-level token cache for Alibaba NLS
_nls_token_cache = {"token": None, "expires_at": 0}


api_key = os.getenv("DEEPSEEK_API_KEY")

client = (
    AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    if api_key
    else None
)


def fetch_youdao_tts_audio(text: str) -> bytes:
    query = urlencode({"audio": text, "type": "1"})
    request = Request(
        f"https://dict.youdao.com/dictvoice?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urlopen(request, timeout=10) as response:
        audio = response.read()
    if not audio:
        raise ValueError("empty audio response")
    return audio


def synthesize_windows_tts_audio(text: str) -> bytes:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
        temp_path = temp_file.name

    encoded_text = base64.b64encode(text.encode("utf-8")).decode("ascii")
    encoded_path = base64.b64encode(temp_path.encode("utf-8")).decode("ascii")
    script = (
        "Add-Type -AssemblyName System.Speech; "
        f"$text = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded_text}')); "
        f"$path = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded_path}')); "
        "$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$speaker.Rate = -1; "
        "$speaker.SetOutputToWaveFile($path); "
        "$speaker.Speak($text); "
        "$speaker.Dispose();"
    )

    try:
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-Command", script],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
        if completed.returncode != 0:
            error_output = (completed.stderr or completed.stdout or "").strip()
            raise RuntimeError(error_output or "Windows speech synthesis failed")
        with open(temp_path, "rb") as audio_file:
            audio = audio_file.read()
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    if not audio:
        raise ValueError("empty audio response")
    return audio


def fetch_tts_audio(text: str) -> tuple[bytes, str]:
    try:
        return synthesize_windows_tts_audio(text), "audio/wav"
    except Exception:
        return fetch_youdao_tts_audio(text), "audio/mpeg"


# ---------------------------------------------------------------------------
# Alibaba Cloud NLS Long-Text TTS
# ---------------------------------------------------------------------------

def _safe_audio_filename(word: str) -> str:
    return "".join(c for c in word.strip() if c.isalnum() or c in "_- ").strip().replace(" ", "_")


def _parse_story_response(text: str) -> tuple[str, str]:
    en_match = re.search(r'\[ENGLISH\]\s*(.+?)\s*\[/ENGLISH\]', text, re.DOTALL)
    cn_match = re.search(r'\[CHINESE\]\s*(.+?)\s*\[/CHINESE\]', text, re.DOTALL)
    en = en_match.group(1).strip() if en_match else ""
    cn = cn_match.group(1).strip() if cn_match else ""
    return en, cn


def _fetch_alibaba_nls_token() -> str:
    now_ts = time.time()
    if _nls_token_cache["token"] and now_ts < _nls_token_cache["expires_at"]:
        return _nls_token_cache["token"]

    access_key_id = os.getenv("ALIBABA_ACCESS_KEY_ID")
    access_key_secret = os.getenv("ALIBABA_ACCESS_KEY_SECRET")
    if not access_key_id or not access_key_secret:
        raise RuntimeError("请设置 ALIBABA_ACCESS_KEY_ID 和 ALIBABA_ACCESS_KEY_SECRET")

    date_str = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    string_to_sign = date_str
    signature = base64.b64encode(
        hmac.new(access_key_secret.encode(), string_to_sign.encode(), hashlib.sha1).digest()
    ).decode()

    auth_header = f"Dataplus {access_key_id}:{signature}"
    req = Request(
        "https://nls-meta.cn-shanghai.aliyuncs.com/pop/2018-05-18/tokens",
        headers={"Date": date_str, "Authorization": auth_header},
        method="POST",
    )
    with urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    token = data.get("Token", {}).get("Id")
    if not token:
        raise RuntimeError(f"获取阿里云NLS Token失败: {data}")

    _nls_token_cache["token"] = token
    _nls_token_cache["expires_at"] = now_ts + 3300
    return token


def _submit_nls_tts_task(token: str, app_key: str, text: str, voice: str = "harry") -> str:
    body = json.dumps({
        "appkey": app_key,
        "text": text,
        "voice": voice,
        "format": "mp3",
        "sample_rate": 16000,
        "volume": 50,
        "speech_rate": 0,
        "pitch_rate": 0,
    }).encode()
    req = Request(
        "https://nls-slp.cn-shanghai.aliyuncs.com/api/v1/tts",
        data=body,
        headers={
            "X-NLS-Token": token,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    task_id = (data.get("data", {}) or {}).get("task_id")
    if not task_id:
        raise RuntimeError(f"提交TTS任务失败: {data}")
    return task_id


def _poll_nls_tts_task(token: str, task_id: str, max_wait: int = 30) -> str:
    deadline = time.time() + max_wait
    while time.time() < deadline:
        req = Request(
            f"https://nls-slp.cn-shanghai.aliyuncs.com/api/v1/tts/{task_id}",
            headers={"X-NLS-Token": token},
        )
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        status = (data.get("data", {}) or {}).get("task_status") or data.get("status")
        if status == "SUCCESS":
            result_url = (data.get("data", {}) or {}).get("result")
            if not result_url:
                raise RuntimeError("TTS任务完成但无音频下载地址")
            return result_url
        if status == "FAILED":
            raise RuntimeError(f"TTS任务失败: {data}")
        time.sleep(1.5)
    raise TimeoutError("TTS任务超时未完成")


def _download_nls_audio(result_url: str) -> bytes:
    req = Request(result_url, headers={"User-Agent": "BabyEnglish/1.0"})
    with urlopen(req, timeout=30) as resp:
        audio = resp.read()
    if not audio:
        raise ValueError("下载的音频为空")
    return audio


def _synthesize_story_audio(word: str, text: str) -> bytes:
    token = _fetch_alibaba_nls_token()
    app_key = os.getenv("ALIBABA_NLS_APP_KEY")
    if not app_key:
        raise RuntimeError("请设置 ALIBABA_NLS_APP_KEY")

    task_id = _submit_nls_tts_task(token, app_key, text)
    result_url = _poll_nls_tts_task(token, task_id)
    audio = _download_nls_audio(result_url)

    STORY_AUDIO_DIR.mkdir(exist_ok=True)
    cache_path = STORY_AUDIO_DIR / f"{_safe_audio_filename(word)}.mp3"
    cache_path.write_bytes(audio)

    return audio


@app.get("/api/tts")
async def get_tts_audio(
    text: str = Query(..., min_length=1, max_length=240),
):
    spoken_text = text.strip()
    if not spoken_text:
        raise HTTPException(status_code=400, detail="text is required")

    try:
        audio, media_type = await asyncio.to_thread(fetch_tts_audio, spoken_text)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS service failed: {exc}") from exc

    return Response(
        content=audio,
        media_type=media_type,
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/ai_story")
async def get_story_from_ai(
    payload: StoryRequest | None = Body(default=None),
    word: str | None = Query(default=None),
):
    selected_word = payload.word if payload else word
    if not selected_word or not selected_word.strip():
        raise HTTPException(status_code=400, detail="请传入英文单词 word")

    if client is None:
        raise HTTPException(status_code=500, detail="请先设置环境变量 DEEPSEEK_API_KEY")

    selected_word = selected_word.strip()

    system_prompt = (
        "你是一位少儿英语老师。请根据用户提供的英文单词，"
        "创作一段极简的英文绘本互动对话或小故事（30-80词），"
        "并附带中文翻译。"
        "请严格按照以下格式输出，不要添加任何其他内容：\n"
        "[ENGLISH]\n<纯英文故事文本>\n[/ENGLISH]\n"
        "[CHINESE]\n<对应的中文翻译>\n[/CHINESE]"
    )

    try:
        response = await client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请围绕这个单词创作：{selected_word}"},
            ],
            stream=False,
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"AI 服务调用失败：{exc}") from exc

    ai_reply = response.choices[0].message.content
    if not ai_reply:
        raise HTTPException(status_code=502, detail="AI 服务没有返回有效内容")

    en_story, cn_story = _parse_story_response(ai_reply)
    return {
        "status": "success",
        "word": selected_word,
        "ai_story": ai_reply,
        "en": en_story,
        "cn": cn_story,
    }


@app.get("/api/story_audio")
async def get_story_audio_file(
    word: str = Query(..., min_length=1, max_length=80),
):
    safe_name = _safe_audio_filename(word.strip())
    cache_path = STORY_AUDIO_DIR / f"{safe_name}.mp3"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="该单词的故事音频尚未生成")
    return Response(
        content=cache_path.read_bytes(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.post("/api/story_audio")
async def create_story_audio(payload: StoryAudioRequest):
    word = payload.word.strip()
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    STORY_AUDIO_DIR.mkdir(exist_ok=True)
    cache_path = STORY_AUDIO_DIR / f"{_safe_audio_filename(word)}.mp3"

    if cache_path.exists():
        return {"success": True, "word": word, "cached": True}

    try:
        await asyncio.to_thread(_synthesize_story_audio, word, text)
    except TimeoutError:
        raise HTTPException(status_code=504, detail="TTS任务超时，请稍后重试")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS服务失败: {exc}") from exc

    return {"success": True, "word": word, "cached": False}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "Englishtest:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=os.path.dirname(__file__),
    )
