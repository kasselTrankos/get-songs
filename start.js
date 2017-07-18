const args = process.argv;

const inquirer = require('inquirer'),
	Rx = require('rxjs/Rx'),
	colors = require('colors'),
	_progress = require('cli-progress'),
	ProgressBar = require('ascii-progress'),
	spawn = require('child_process').spawn,
	getStream = require('get-stream'),
	subject = new Rx.Subject(),
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
				next(e){
					getMp3(answers).subscribe({
						complete(e){
							rename(answers, JSON.parse(json)).subscribe({
								complete(e){
									rm(answers).subscribe({
										next(e){

										}
									});
								}
							});
						}
					});
				}
			});
			//conosle.log('e, next',e);
		}
	});
	// .zip(
	// 	obtainVideo(answers),
	// 	getMp4(answers),
	// 	getMp3(answers)

	// );
	// var subscription = source.subscribe(val => console.log(val));

});
const rm = ({videoId})=>{
	return Rx.Observable.create((observer) => {
		execa('rm', [`${videoId}.mp4`])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				observer.error(`vaya Full de id "${videoId}"`);
			}else{

				observer.next(stdout);
			}
		});
	});
};
const rename = ({videoId}, json)=>{

	return Rx.Observable.create((observer) => {
		execa('mv', [`${videoId}.mp3`, `${json.title}.mp3`])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				observer.error(`vaya Full de id "${videoId}"`);
			}else{
				observer.complete(stdout);
			}
		});
	});
}
const getMp3 = ({videoId})=>{
	return Rx.Observable.create((observer) => {
		var child = spawn('ffmpeg', [
			'-y', '-loglevel', 'info',
			 '-i',`${videoId}.mp4`, 
			'-acodec', 'libmp3lame',`${videoId}.mp3`
		]);
		// process.stdout.write(`\nCreating new mp3 file\n`.blue);
		child.stderr.on('data', (data) => {
			var str = data.toString();
			if(/^size\=/.test(str)){
				process.stdout.write(str.split('\n')[0].split('size=')[1].green);
			}
		});
		child.on('close', function(stdout) {
	        observer.complete(stdout);
	    });
	});
};
const obtainVideo = ({videoId}) =>{
	return Rx.Observable.create((observer) => {
		execa('curl', [`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				observer.error(`vaya Full de id "${videoId}"`);
			}else{

				observer.next(stdout);
			}
		});
	});
};
const getMp4 = ({videoId})=>{
	const bar = new ProgressBar({ 
	    schema: 'downloading: [:bar].cyan.bgWhite :percent.cyan',
	    total : 5
	});
	return Rx.Observable.create((observer) => {
		let c = 0;
		var child = spawn('youtube-dl', ['--write-info-json', 
		 `http://www.youtube.com/watch?v=${videoId}`, '-o', `${videoId}.mp4`], {shell: true});
		child.stdout.on('data', function(data) {
			++c;
			bar.tick();
			if(bar.completed){
				observer.next(`mp3 is created ${videoId}.mp3`);
			}
		});
	});
};

//console.log(args);