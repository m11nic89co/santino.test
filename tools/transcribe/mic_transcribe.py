"""
mic_transcribe.py

Простой локальный аудио-транскрайбер: слушает микрофон кусками, распознаёт речь
и копирует распознанный текст в буфер обмена.

Поддержка: faster-whisper (рекомендуется) или openai/whisper (fallback).
Использует sounddevice для записи, pyperclip для буфера обмена.

Запуск:
    python mic_transcribe.py --duration 4 --model small --device cpu --lang ru

Ctrl+C для выхода.
"""
import argparse
import sys
import tempfile
import wave
import time

try:
    import sounddevice as sd
    import numpy as np
    import pyperclip
except Exception as e:
    print("Ошибка: отсутствуют нужные зависимости (sounddevice/numpy/pyperclip).\nУстановите их: pip install -r requirements.txt")
    raise

# Try faster-whisper first, fallback to whisper if available
WHISPER_IMPL = None
try:
    from faster_whisper import WhisperModel
    WHISPER_IMPL = 'faster'
except Exception:
    try:
        import whisper
        WHISPER_IMPL = 'openai'
    except Exception:
        WHISPER_IMPL = None


def record_chunk(seconds, samplerate):
    print(f"Recording {seconds}s...")
    data = sd.rec(int(seconds * samplerate), samplerate=samplerate, channels=1, dtype='int16')
    sd.wait()
    return data


def save_wav(arr, path, samplerate):
    # arr is numpy array of int16
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(samplerate)
        wf.writeframes(arr.tobytes())


def transcribe_faster(path, model_name, lang):
    model = WhisperModel(model_name, device="cpu")
    segments, info = model.transcribe(path, language=lang, vad_filter=False)
    text = " ".join([s.text for s in segments]).strip()
    return text


def transcribe_openai(path, model_name, lang):
    m = whisper.load_model(model_name)
    result = m.transcribe(path, language=lang)
    return result.get('text','').strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--duration', type=float, default=4.0, help='Chunk duration in seconds')
    parser.add_argument('--samplerate', type=int, default=16000, help='Sampling rate')
    parser.add_argument('--model', type=str, default='small', help='Model name (faster-whisper or whisper)')
    parser.add_argument('--device', type=str, default='cpu', help='Device (cpu or cuda)')
    parser.add_argument('--lang', type=str, default='ru', help='Language code for transcription')
    args = parser.parse_args()

    if WHISPER_IMPL is None:
        print("Ни faster-whisper, ни openai/whisper не установлены. Установите одну из реализаций для транскрипции.")
        sys.exit(1)

    print(f"Используем реализацию: {WHISPER_IMPL}")

    try:
        while True:
            audio = record_chunk(args.duration, args.samplerate)
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
                save_wav(audio, tf.name, args.samplerate)
                print('Saved chunk to', tf.name)
                try:
                    if WHISPER_IMPL == 'faster':
                        text = transcribe_faster(tf.name, args.model, args.lang)
                    else:
                        text = transcribe_openai(tf.name, args.model, args.lang)
                except Exception as e:
                    print('Ошибка при транскрипции:', e)
                    text = ''

                if text:
                    pyperclip.copy(text)
                    print('Транскрибировано (скопировано в буфер):')
                    print(text)
                else:
                    print('Ничего не распознано в этом фрагменте.')
                # small pause to avoid tight loop
                time.sleep(0.2)
    except KeyboardInterrupt:
        print('\nОстановка по Ctrl+C')


if __name__ == '__main__':
    main()
