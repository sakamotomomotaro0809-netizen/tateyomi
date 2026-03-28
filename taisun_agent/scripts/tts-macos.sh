#!/bin/bash
# Japanese TTS using macOS say command
# Usage: ./tts-macos.sh "テキスト" [output.mp3] [Kyoko] [200]

set -e

TEXT="$1"
OUTPUT="${2:-output.aiff}"
VOICE="${3:-Kyoko}"
RATE="${4:-200}"

if [ -z "$TEXT" ]; then
    echo "Usage: $0 \"テキスト\" [output_file] [voice] [rate]"
    echo ""
    echo "Available Japanese voices:"
    say -v '?' | grep ja_JP
    echo ""
    echo "Examples:"
    echo "  $0 \"こんにちは\""
    echo "  $0 \"こんにちは\" greeting.mp3"
    echo "  $0 \"こんにちは\" greeting.mp3 Otoya"
    echo "  $0 \"こんにちは\" greeting.mp3 Kyoko 150"
    exit 1
fi

echo "Generating speech..."
echo "  Text: $TEXT"
echo "  Voice: $VOICE"
echo "  Rate: $RATE"
echo "  Output: $OUTPUT"

# Determine output handling based on extension
if [[ "$OUTPUT" == *.mp3 ]]; then
    # Generate AIFF first, then convert to MP3
    TEMP_AIFF="${OUTPUT%.mp3}.aiff"
    say -v "$VOICE" -r "$RATE" -o "$TEMP_AIFF" "$TEXT"

    if command -v ffmpeg &> /dev/null; then
        ffmpeg -i "$TEMP_AIFF" -y -loglevel error "$OUTPUT"
        rm "$TEMP_AIFF"
        echo "✓ Audio saved to $OUTPUT (MP3)"
    else
        echo "Warning: ffmpeg not found. Output saved as AIFF."
        echo "Install ffmpeg for MP3 conversion: brew install ffmpeg"
        echo "✓ Audio saved to $TEMP_AIFF"
    fi
elif [[ "$OUTPUT" == *.wav ]]; then
    # Generate AIFF first, then convert to WAV
    TEMP_AIFF="${OUTPUT%.wav}.aiff"
    say -v "$VOICE" -r "$RATE" -o "$TEMP_AIFF" "$TEXT"

    if command -v ffmpeg &> /dev/null; then
        ffmpeg -i "$TEMP_AIFF" -y -loglevel error "$OUTPUT"
        rm "$TEMP_AIFF"
        echo "✓ Audio saved to $OUTPUT (WAV)"
    else
        echo "Warning: ffmpeg not found. Output saved as AIFF."
        echo "✓ Audio saved to $TEMP_AIFF"
    fi
else
    # Generate AIFF directly
    say -v "$VOICE" -r "$RATE" -o "$OUTPUT" "$TEXT"
    echo "✓ Audio saved to $OUTPUT"
fi
