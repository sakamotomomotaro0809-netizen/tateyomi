#!/usr/bin/env python3
"""
Japanese TTS using VOICEVOX Engine

Prerequisites:
    # Start VOICEVOX engine with Docker
    docker pull voicevox/voicevox_engine:cpu-ubuntu20.04-latest
    docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest

Usage:
    python tts-voicevox.py --text "こんにちは" --output greeting.wav
    python tts-voicevox.py --text "ずんだもんなのだ" --speaker 1
    python tts-voicevox.py --list-speakers
"""

import argparse
import json
import sys
from urllib.request import urlopen, Request
from urllib.error import URLError

VOICEVOX_URL = "http://localhost:50021"

# Common speaker IDs
SPEAKERS = {
    0: "四国めたん（あまあま）",
    1: "ずんだもん（あまあま）",
    2: "四国めたん（ノーマル）",
    3: "ずんだもん（ノーマル）",
    4: "四国めたん（セクシー）",
    5: "ずんだもん（セクシー）",
    6: "四国めたん（ツンツン）",
    7: "ずんだもん（ツンツン）",
    8: "春日部つむぎ（ノーマル）",
    9: "波音リツ（ノーマル）",
    10: "雨晴はう（ノーマル）",
    11: "玄野武宏（ノーマル）",
    12: "白上虎太郎（ふつう）",
    13: "青山龍星（ノーマル）",
    14: "冥鳴ひまり（ノーマル）",
    15: "九州そら（あまあま）",
}


def check_voicevox_running():
    """Check if VOICEVOX engine is running"""
    try:
        req = Request(f"{VOICEVOX_URL}/speakers")
        with urlopen(req, timeout=5) as response:
            return True
    except URLError:
        return False


def list_speakers():
    """List available speakers from VOICEVOX"""
    print("\nAvailable VOICEVOX speakers:")
    print("-" * 50)

    if not check_voicevox_running():
        print("(VOICEVOX not running - showing common speakers)")
        for speaker_id, name in SPEAKERS.items():
            print(f"  {speaker_id:3d}: {name}")
        print("\nTo start VOICEVOX:")
        print("  docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest")
        return

    try:
        req = Request(f"{VOICEVOX_URL}/speakers")
        with urlopen(req) as response:
            speakers = json.loads(response.read().decode('utf-8'))

        for speaker in speakers:
            print(f"\n{speaker['name']}:")
            for style in speaker['styles']:
                print(f"  {style['id']:3d}: {style['name']}")
    except Exception as e:
        print(f"Error: {e}")


def synthesize_voicevox(text: str, speaker: int = 1, output_file: str = "output.wav",
                        speed: float = 1.0, pitch: float = 0.0, intonation: float = 1.0):
    """
    Synthesize speech using VOICEVOX

    Args:
        text: Text to convert to speech
        speaker: Speaker ID
        output_file: Output WAV file path
        speed: Speaking speed (0.5-2.0, default 1.0)
        pitch: Voice pitch (-0.15 to 0.15, default 0.0)
        intonation: Intonation (0.0-2.0, default 1.0)
    """
    if not check_voicevox_running():
        print("Error: VOICEVOX engine is not running")
        print("\nStart with Docker:")
        print("  docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest")
        sys.exit(1)

    print(f"Synthesizing speech...")
    print(f"  Text: {text[:50]}{'...' if len(text) > 50 else ''}")
    print(f"  Speaker: {speaker} ({SPEAKERS.get(speaker, 'Unknown')})")
    print(f"  Speed: {speed}, Pitch: {pitch}, Intonation: {intonation}")

    # Step 1: Create audio query
    query_url = f"{VOICEVOX_URL}/audio_query?text={text}&speaker={speaker}"
    req = Request(query_url, method='POST')
    req.add_header('Content-Type', 'application/json')

    try:
        with urlopen(req) as response:
            query = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error creating audio query: {e}")
        sys.exit(1)

    # Adjust parameters
    query['speedScale'] = speed
    query['pitchScale'] = pitch
    query['intonationScale'] = intonation

    # Step 2: Synthesize speech
    synthesis_url = f"{VOICEVOX_URL}/synthesis?speaker={speaker}"
    req = Request(synthesis_url, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.data = json.dumps(query).encode('utf-8')

    try:
        with urlopen(req) as response:
            audio_data = response.read()
    except Exception as e:
        print(f"Error synthesizing speech: {e}")
        sys.exit(1)

    # Save to file
    with open(output_file, 'wb') as f:
        f.write(audio_data)

    print(f"✓ Audio saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Japanese TTS using VOICEVOX"
    )
    parser.add_argument("--text", "-t", help="Text to convert to speech")
    parser.add_argument("--file", "-f", help="Text file to convert")
    parser.add_argument("--output", "-o", default="output.wav", help="Output WAV file")
    parser.add_argument("--speaker", "-s", type=int, default=1,
                        help="Speaker ID (default: 1 = ずんだもん)")
    parser.add_argument("--speed", type=float, default=1.0,
                        help="Speaking speed 0.5-2.0 (default: 1.0)")
    parser.add_argument("--pitch", type=float, default=0.0,
                        help="Pitch -0.15 to 0.15 (default: 0.0)")
    parser.add_argument("--intonation", type=float, default=1.0,
                        help="Intonation 0.0-2.0 (default: 1.0)")
    parser.add_argument("--list-speakers", "-l", action="store_true",
                        help="List available speakers")

    args = parser.parse_args()

    if args.list_speakers:
        list_speakers()
        return

    # Get text from argument or file
    if args.text:
        text = args.text
    elif args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            text = f.read()
    else:
        parser.print_help()
        print("\nError: Either --text or --file is required")
        sys.exit(1)

    synthesize_voicevox(
        text=text,
        speaker=args.speaker,
        output_file=args.output,
        speed=args.speed,
        pitch=args.pitch,
        intonation=args.intonation
    )


if __name__ == "__main__":
    main()
