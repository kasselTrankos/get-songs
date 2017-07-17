const args = process.argv;

const inquirer = require('inquirer'),
	Rx = require('rxjs/Rx'),
	colors = require('colors'),
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


	
	obtainVideo(answers, (youtubeJson)=>{
		youtubeJson.subscribe({
	      next: (e)=>{
	      	//new Error("Unkown Error")
	        
	      },
	      error: (e)=>{
	      	console.log(e.red);
	      }
	    });
	});
	

});
const obtainVideo = ({videoId} , callback) =>{
	let youtubeJson = Rx.Observable.create((observer) => {
		execa('curl', [`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`])
		.then(({stdout}) => {
			if(stdout==='Not Found'){
				///console.log('joder qye er')
				observer.error(`vaya Full de id "${videoId}"`);
				// console.log ( 'mierda error')
			}else{
				observer.next(stdout);
			}
			// console.log(result.stdout);
			//=> 'unicorns'
		});
	});
	callback(youtubeJson);
	//var uri = ``
	//console.log(videoId, `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
	// 
};

//console.log(args);