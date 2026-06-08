import asyncio
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import edge_tts
from fastapi import Body, FastAPI, HTTPException, Path as FastAPIPath, Query, Response
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
    story_id: str | None = Field(default=None, max_length=160)
    text: str = Field(..., min_length=1, max_length=2000)


def _default_story_audio_dir() -> Path:
    configured_dir = os.getenv("BABYENGLISH_STORY_AUDIO_DIR")
    if configured_dir:
        return Path(configured_dir).expanduser()

    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "BabyEnglish" / "story_audio"

    return Path(tempfile.gettempdir()) / "BabyEnglish" / "story_audio"


STORY_AUDIO_DIR = _default_story_audio_dir()

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


def fetch_tts_audio(text: str) -> tuple[bytes, str]:
    return fetch_youdao_tts_audio(text), "audio/mpeg"


def _safe_audio_filename(word: str) -> str:
    safe_name = "".join(
        c for c in word.strip().lower()
        if c.isalnum() or c in "_- "
    ).strip().replace(" ", "_")
    return safe_name or "story"


def _story_audio_key(word: str, story_id: str | None = None) -> str:
    return (story_id or word).strip()


async def _synthesize_story_audio(audio_key: str, text: str) -> bytes:
    STORY_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = STORY_AUDIO_DIR / f"{_safe_audio_filename(audio_key)}.mp3"
    communicate = edge_tts.Communicate(text, "en-US-JennyNeural")
    await communicate.save(str(cache_path))
    return cache_path.read_bytes()


def _parse_story_response(text: str) -> tuple[str, str]:
    en_match = re.search(
        r"\[ENGLISH\]\s*(.+?)\s*\[/ENGLISH\]",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    cn_match = re.search(
        r"\[CHINESE\]\s*(.+?)\s*\[/CHINESE\]",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    en = en_match.group(1).strip() if en_match else ""
    cn = cn_match.group(1).strip() if cn_match else ""
    return en, cn


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
        "你是一位少儿英语老师，面向 3-8 岁中国小朋友。"
        "请围绕用户提供的英文单词，写 1-3 句极简单的英文短故事，总共 15-35 个英文单词。"
        "用词必须简单，句式简短，适合英语启蒙阶段，并附上自然、准确的中文翻译。"
        "请严格按照下面的标签格式输出，不要添加 Markdown 或其他内容：\n"
        "[ENGLISH]\n"
        "<英文短故事>\n"
        "[/ENGLISH]\n"
        "[CHINESE]\n"
        "<对应的中文翻译>\n"
        "[/CHINESE]"
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


def _story_audio_response(audio_key: str) -> Response:
    cache_path = STORY_AUDIO_DIR / f"{_safe_audio_filename(audio_key)}.mp3"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="该单词的故事音频尚未生成")

    return Response(
        content=cache_path.read_bytes(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/story_audio")
async def get_story_audio_file(
    word: str = Query(..., min_length=1, max_length=80),
    story_id: str | None = Query(default=None, max_length=160),
):
    return _story_audio_response(_story_audio_key(word, story_id))


@app.get("/api/story_audio/{audio_key}.mp3")
async def get_story_audio_file_with_extension(
    audio_key: str = FastAPIPath(..., min_length=1, max_length=160),
):
    return _story_audio_response(audio_key)


@app.post("/api/story_audio")
async def create_story_audio(payload: StoryAudioRequest):
    word = payload.word.strip()
    audio_key = _story_audio_key(word, payload.story_id)
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    try:
        await _synthesize_story_audio(audio_key, text)
    except TimeoutError:
        raise HTTPException(status_code=504, detail="TTS 任务超时，请稍后重试")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS 服务失败: {exc}") from exc

    return {"success": True, "word": word, "story_id": payload.story_id or ""}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "Englishtest:app",
        host="192.168.31.95",
        port=8000,
        reload=True,
    )
