#!/bin/bash
jam=$(curl 'https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v='$1'&format=json')
echo "Creando el archivo $title.mp3" 
newname=$(date +%s)
title=$(echo $jam | jq -r '.title'  | sed 's/"//g')
thumb=$(echo $jam | jq -r '.thumbnail_url')
youtube-dl --quiet --write-info-json  http://www.youtube.com/watch?v=$1 -o "$newname.mp4"
A=$(cut -d'-' -f1 <<<$title)
B=$(cut -d'-' -f2 <<<$title)
ffmpeg -loglevel error -i "$newname.mp4" -acodec libmp3lame "$newname.mp3"
ffmpeg -loglevel error -i "$newname.mp3" -i $thumb -map 0:0 -map 1:0 -c copy -metadata title="$B" -metadata author="$A" -metadata comment="hi" -y "$title.mp3"
id3tool -t "$B" -r "$A" "$title.mp3"
mv "$newname.mp4.info.json" "$title.json"
echo "Creado!!"
#this run
rm "$newname.mp4"
rm "$newname.mp3"
#!/bin/bash
if [ -z "$2" ]
then
node /home/vera/get-data/g.js "$title"
else
node /home/vera/get-data/g.js "$title" "$2"
fi
