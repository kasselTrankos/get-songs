const args = process.argv;

const inquirer = require('inquirer'),
	Rx = require('rxjs/Rx'),
	colors = require('colors'),
	{setData} = require('./g'),
	_progress = require('cli-progress'),
	ProgressBar = require('ascii-progress'),
	spawn = require('child_process').spawn,
	getStream = require('get-stream'),
	subject = new Rx.Subject(),
	cp = require('child_process'),

	execa = require('execa');

const questions = [{
  name: 'videoId',
  message: 'Video id:',
  validate: function(str){
    return str.length>0; //Yoda had *better not* use this application!!
  }
}]
inquirer.prompt(questions).then((answers)=>{
	obtainVideo(answers).subscribe({
		error(e){
			console.log('e error', e);
		},
		next(json){
			getMp4(answers).subscribe({
				error(e){
					console.log('e error', e);
				},
				complete(e){
					getMp3(answers).subscribe({
						complete(e){
							rename(answers, JSON.parse(json)).subscribe({
								complete(e){
									rm(answers).subscribe({
										complete(e){
											console.log(`\n file renamed to  and mp3 done`.green);
											file(answers, JSON.parse(json));
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});

});
const file = ({videoId}, json)=>{
	setData(`${videoId}`, json, `${json.title.replace(/"/g,"")}`);
};
const rm = ({videoId})=>{
	return Rx.Observable.create((observer) => {
		const child = spawn('rm', [`${videoId}.mp4`]);
		child.on('exit', (data)=>{
			observer.complete();
		});
	});
};
const rename = ({videoId}, json)=>{
	return Rx.Observable.create((observer) => {
		const child = spawn('mv', [`${videoId}.mp3`, `${json.title.replace(/"/g,"")}.mp3`]);
		child.on('exit', (data)=>{
			observer.complete();
		});
	});
}
const getMp3 = ({videoId})=>{
	process.stdout.write(`\nCreating new mp3 file\n`.blue);
	return Rx.Observable.create((observer) => {
		const child = spawn('ffmpeg', [
			'-y', '-loglevel', 'info',
			 '-i',`${videoId}.mp4`, 
			'-acodec', 'libmp3lame',`${videoId}.mp3`
		]);
		
		child.stderr.on('data', (data) => {
			var str = data.toString();
			if(/^size\=/.test(str)){
				process.stdout.write(str.split('\n')[0].split('size=')[1].green);
			}
		});
		child.on('exit', (data)=>{
			observer.complete(data);
		});
	});
};
const obtainVideo = ({videoId}) =>{
	console.log(`Downloading video\n`.blue);
	return Rx.Observable.create((observer) => {
		execa('curl', 
		[`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				observer.error(`vaya Full de youtubeId "${videoId}"`);
			}else{
				
				observer.next(stdout);
				observer.complete();
			}
		});
	});
};
const getMp4 = ({videoId})=>{
	var bar1 = new _progress.Bar({}, _progress.Presets.shades_classic);
	bar1.start(5, 0);
	return Rx.Observable.create((observer) => {
		let c = 0;
		var child = spawn('youtube-dl', ['--write-info-json', 
		 `http://www.youtube.com/watch?v=${videoId}`, '-o', `${videoId}.mp4`], {shell: true});
		child.stdout.on('data', function(data) {
			++c;
			bar1.update(c);
			if(c===5){
				bar1.stop();
			}
		});
		child.on('exit', ()=>{
			observer.complete();
		});
	});
};
