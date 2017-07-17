const args = process.argv;

const inquirer = require('inquirer'),
	Rx = require('rxjs/Rx'),
	colors = require('colors'),
	_progress = require('cli-progress'),
	ProgressBar = require('ascii-progress'),
	spawn = require('child_process').spawn,
	getStream = require('get-stream'),
	execa = require('execa');

const questions = [{
  name: 'videoId',
  message: 'Video id:',
  validate: function(str){
    return str.length>0; //Yoda had *better not* use this application!!
  }
}]
inquirer.prompt(questions).then((answers)=>{
	///const {videoId} = answers;
	//console.log(videoId, 11111);


	const newname = new Date().getTime();
	let _youtubeJson = obtainVideo(answers);
	let _getMp4 = getMp4(answers);
	let _getMp3 = getMp3(answers);
	Rx.Observable.merge([_youtubeJson, _getMp4, _getMp3]).subscribe({
		next: (e)=>{
			console.log(e);
      	},
      	error: (e)=>{
	      	console.log(e.red);
      	}
	});

});
const getMp3 = ({videoId})=>{
	return Rx.Observable.create((observer) => {
		execa('ffmpeg', [
			'-loglevel', 'error', '-i',`${videoId}.mp4`, 
			'-acodec', 'libmp3lame',`${videoId}.mp3`
		])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				observer.error(`vaya Full de id "${videoId}"`);
			}else{
				observer.next(stdout);
			}
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
			// if(bar.completed){
			// }
		});
		// child.stderr.on('data', (data) => {
		//   observer.error(`vaya Error en el spawn de id "${videoId}"`);
		// });
		child.on('close', function(stdout) {
	        observer.next(stdout);
	    });
	});
};

//console.log(args);