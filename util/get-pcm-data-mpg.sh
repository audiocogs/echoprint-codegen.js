#!/bin/sh

mpg123 --quiet --singlemix --stdout --rate 11025 --wav - $1
