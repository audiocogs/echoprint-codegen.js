#!/bin/sh

usage() {
    echo "$(basename $0) [seconds] [ofset] file"
}

channels=1
sampling_rate=11025

if [ $# -eq 3 ]; then
    seconds=$1
    offset=$2
    file=$3
    ffmpeg -i "$file" -ac $channels -ar $sampling_rate -f s16le -t $seconds -ss $offset - 2>/dev/null
elif [ $# -eq 1 ]; then
    file=$1
    ffmpeg -i "$file" -ac $channels -ar $sampling_rate -f s16le - 2>/dev/null
else
    usage
fi

