#!/bin/bash
echo $2
jam=$(curl 'https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v='$1'&format=json')
#foo=$(curl 'https://gist.githubusercontent.com/djosephsen/a1a290366b569c5b98e9/raw/c0d01a18e16ba7c75d31a9893dd7fa1b8486a963/docker_issues')
#echo "nomo" $1
#echo 'https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v='$1'&format=json'
newname=$(date +%s)
title=$(echo $jam | jq -r '.title')
thumb=$(echo $jam | jq -r '.thumbnail_url')

echo "$title"
youtube-dl http://www.youtube.com/watch?v=$1 -o "$newname.mp4"
A=$(cut -d'-' -f1 <<<$title)
B=$(cut -d'-' -f2 <<<$title)

#echo $B
#echo "name is  $title"
#echo "dos was !"$2

ffmpeg -i "$newname.mp4" -acodec libmp3lame "$newname.mp3"
#id3tool -t $b -r $A "tmp.mp3"
ffmpeg -i "$newname.mp3" -i $thumb -map 0:0 -map 1:0 -c copy -metadata title="$B" -metadata author="$A" -metadata comment="hi" -y "$title.mp3"
id3tool -t "$B" -r "$A" "$title.mp3"
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
