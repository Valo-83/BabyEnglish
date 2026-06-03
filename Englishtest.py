import asyncio
import base64
import os
import subprocess
import tempfile
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
        "创作一段极简的英文绘本互动对话或小故事，"
        "且每次只生成一个小故事，并附带中文翻译。"
        "注意：请输出纯文本，绝对不要包含 **、### 等任何 Markdown 标记或特殊符号。"
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

    return {"status": "success", "word": selected_word, "ai_story": ai_reply}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "Englishtest:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=os.path.dirname(__file__),
    )
