#!/usr/bin/env python3
"""
Japanese TTS using Google Cloud Text-to-Speech API

Prerequisites:
    pip install google-cloud-texttospeech
    gcloud auth application-default login
    gcloud services enable texttospeech.googleapis.com

Usage:
    python tts-google.py --text "こんにちは" --output greeting.mp3
    python tts-google.py --file input.txt --output narration.mp3
    python tts-google.py --text "こんにちは" --voice ja-JP-Neural2-C
"""

import argparse
import sys

try:
    from google.cloud import texttospeech
except ImportError:
    print("Error: google-cloud-texttospeech not installed")
    print("Run: pip install google-cloud-texttospeech")
    sys.exit(1)


# Available Japanese voices
VOICES = {
    # Neural2 (highest quality)
    "ja-JP-Neural2-B": {"gender": "FEMALE", "quality": "neural2"},
    "ja-JP-Neural2-C": {"gender": "MALE", "quality": "neural2"},
    "ja-JP-Neural2-D": {"gender": "MALE", "quality": "neural2"},
    # WaveNet (high quality)
    "ja-JP-Wavenet-A": {"gender": "FEMALE", "quality": "wavenet"},
    "ja-JP-Wavenet-B": {"gender": "FEMALE", "quality": "wavenet"},
    "ja-JP-Wavenet-C": {"gender": "MALE", "quality": "wavenet"},
    "ja-JP-Wavenet-D": {"gender": "MALE", "quality": "wavenet"},
    # Standard
    "ja-JP-Standard-A": {"gender": "FEMALE", "quality": "standard"},
    "ja-JP-Standard-B": {"gender": "FEMALE", "quality": "standard"},
    "ja-JP-Standard-C": {"gender": "MALE", "quality": "standard"},
    "ja-JP-Standard-D": {"gender": "MALE", "quality": "standard"},
}


def list_voices():
    """List available Japanese voices"""
    print("\nAvailable Japanese voices:")
    print("-" * 60)
    for name, info in VOICES.items():
        print(f"  {name:<25} {info['gender']:<10} {info['quality']}")
    print()


def synthesize_speech(text: str, output_file: str, voice_name: str = "ja-JP-Neural2-B",
                      speaking_rate: float = 1.0, pitch: float = 0.0):
    """
    Synthesize speech from text using Google Cloud TTS

    Args:
        text: Text to convert to speech
        output_file: Output file path (mp3/wav/ogg)
        voice_name: Voice name from VOICES
        speaking_rate: Speech speed (0.25 to 4.0, default 1.0)
        pitch: Voice pitch (-20.0 to 20.0 semitones, default 0.0)
    """
    client = texttospeech.TextToSpeechClient()

    # Set the text input
    synthesis_input = texttospeech.SynthesisInput(text=text)

    # Build the voice request
    voice = texttospeech.VoiceSelectionParams(
        language_code="ja-JP",
        name=voice_name
    )

    # Determine audio encoding from output file extension
    ext = output_file.lower().split('.')[-1]
    encoding_map = {
        'mp3': texttospeech.AudioEncoding.MP3,
        'wav': texttospeech.AudioEncoding.LINEAR16,
        'ogg': texttospeech.AudioEncoding.OGG_OPUS,
    }
    encoding = encoding_map.get(ext, texttospeech.AudioEncoding.MP3)

    # Configure audio output
    audio_config = texttospeech.AudioConfig(
        audio_encoding=encoding,
        speaking_rate=speaking_rate,
        pitch=pitch
    )

    # Perform the synthesis
    print(f"Synthesizing speech...")
    print(f"  Text: {text[:50]}{'...' if len(text) > 50 else ''}")
    print(f"  Voice: {voice_name}")
    print(f"  Rate: {speaking_rate}, Pitch: {pitch}")

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    # Write the response to the output file
    with open(output_file, "wb") as out:
        out.write(response.audio_content)

    print(f"✓ Audio saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Japanese TTS using Google Cloud Text-to-Speech"
    )
    parser.add_argument("--text", "-t", help="Text to convert to speech")
    parser.add_argument("--file", "-f", help="Text file to convert")
    parser.add_argument("--output", "-o", default="output.mp3", help="Output file")
    parser.add_argument("--voice", "-v", default="ja-JP-Neural2-B",
                        help="Voice name (default: ja-JP-Neural2-B)")
    parser.add_argument("--rate", "-r", type=float, default=1.0,
                        help="Speaking rate 0.25-4.0 (default: 1.0)")
    parser.add_argument("--pitch", "-p", type=float, default=0.0,
                        help="Pitch -20.0 to 20.0 (default: 0.0)")
    parser.add_argument("--list-voices", "-l", action="store_true",
                        help="List available voices")

    args = parser.parse_args()

    if args.list_voices:
        list_voices()
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

    # Validate voice
    if args.voice not in VOICES:
        print(f"Error: Unknown voice '{args.voice}'")
        list_voices()
        sys.exit(1)

    synthesize_speech(
        text=text,
        output_file=args.output,
        voice_name=args.voice,
        speaking_rate=args.rate,
        pitch=args.pitch
    )


if __name__ == "__main__":
    main()
