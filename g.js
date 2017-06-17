var fs = require('fs'),
	path = require('path'),
	colors = require('colors'),
	xpath = require('xpath'),
	iconv  = require('iconv-lite'),
	HtmlDom = require('htmldom'),
	cheerio = require('cheerio'),
	dom = require('xmldom').DOMParser,
	id3 = require('id3-writer'),
	mkdirp = require('mkdirp'),
	writer = new id3.Writer(),
	glob = require("glob"),
	pictureTube = require('picture-tube'),
	tube = pictureTube(),
	inquirer = require('inquirer'),
	thenSearch = require('./thenSearch'),
	gm = require('gm').subClass({imageMagick: true}),
	getArtistTitle = require("get-artist-title"),
	request = require('request');

var move = function(oldPath, newPath){
	fs.rename(oldPath, newPath, function (err) {
	  if (err) console.log( err.red, oldPath, newPath);
	  console.log('Successfully movido a'.green, newPath.blue)
	});
}
var mkdirSync = function (dirPath, callback) {
	  mkdirp(dirPath, function (err) {
	    if (err) console.error(err)
	    else callback();
	});
}
function getData(body, error, callback){
	var _str = 'https://genius.com/'+artist.split(' ').join('-')+'-'+title.split(' ').join('-')+'-lyrics';
	request({
		url: _str, 
		encoding: null
	},
	function (_error, _response, _body) {
		if(_error){
			fillData();
			return false;
		}
		var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
  		var album = $('span:contains("Álbum")').parent().find('span').eq(1).find('a').text();
  		var fecha = $('span:contains("Fecha de lanzamiento")').parent().find('span').eq(1).text();
  		var genre = $('span:contains("Género")').parent().find('span').eq(1).text();
  		var $$ = cheerio.load(iconv.decode(new Buffer(_body), "ISO-8859-1"));
  		var cover_Art =  $$('div.cover_art').find('img').eq(0).attr('src');
		callback({
			artist: artist,
			title: title,
  			album: album,
  			year: fecha,
  			genre: genre

  		}, cover_Art);

	});
}

var f = process.argv.pop();
let [artist, title] = getArtistTitle(f);

if(!artist && !title){
	fillData();
}else{
	initializeNormal();
}

function initializeNormal(){
	var str = 'https://www.google.es/search?q=';
	str+=artist.split(' ').join('+')+'+'+title.split(' ').join('+');
	request({
		url: str, 
		encoding: null
		},
		function (error, response, body) {
	  		getData(body, error, function(id3, uriCover){
	  			getCover(uriCover, id3, function(id3){
	  				wiriteId(id3, function(meta, _iF){
	  					var dirPath =process.cwd()+'/'+meta.artist.replace(/\b\w/g, function(l){ return l.toUpperCase() })+'/'+meta.album.replace(/\b\w/g, function(l){ return l.toUpperCase() });
	  					var _file = _iF;
	  					mkdirSync(dirPath, function(){
	  						move(
	  							process.cwd()+'/'+_file+'.mp3', 
	  							dirPath+'/'+_file+'.mp3'
	  						);
	  					});
	  				});
	  			});
	  		});
	  	}
	);
}


function getCover(uri, tag, callback){
	try{
		request(uri).pipe(fs.createWriteStream(process.cwd()+'/tmp.jpg').on('close', function(){
			callback(tag)
		}));
	}catch (err) {
	  // Handle the error here.
	  fillData();
	}
	
}
function fillData(){
	console.log(f.green);
	var questions = [
	  {
	    type: 'input',
	    name: 'author',
	    message: 'author: ',
	    validate: function (text) {
	      if (text.length>1) {
	        return true;
	      }

	      return 'Must be at least 3 lines.';
	    }
	  },
	  {
	    type: 'input',
	    name: 'title',
	    message: 'title: ',
	    validate: function (text) {
	      if (text.length>1) {
	        return true;
	      }

	      return 'Must be at least 3 lines.';
	    }
	  }
	];
	inquirer.prompt(questions)
	.then(function (answers) {
		thenSearch(answers.author, answers.title, function(e){
			console.log('fin it', e);
			getCover(e.cover, e, function(id3){
  				wiriteId(id3, function(meta, _iF){
  					var dirPath =process.cwd()+'/'+meta.artist.replace(/\b\w/g, function(l){ return l.toUpperCase() })+'/'+meta.album.replace(/\b\w/g, function(l){ return l.toUpperCase() });
  					var _file = _iF;
  					mkdirSync(dirPath, function(){
  						move(
  							process.cwd()+'/'+_file+'.mp3', 
  							dirPath+'/'+_file+'.mp3'
  						);
  					});
  				});
  			});
		});
	});
	//
}
function wiriteId(tag, callback){
	var _iF  = (process.argv.length===3) ? process.argv.pop(): f;
	var _file = process.cwd()+'/'+_iF+'.mp3';
	console.log(_file.blue);
	var file = new id3.File(_file);
  	var meta = new id3.Meta({
	    artist: tag.artist,
	    title: tag.title,
	    album: tag.album,
	    genre: tag.genre || '',
	    year: (tag.year)  ? Number(tag.year) : 0
	},[new id3.Image(process.cwd()+'/tmp.jpg')]);
	writer.setFile(file).write(meta, function(err) {
		if (err) {
    		console.log(err.red);
		}else{
			tube.pipe(process.stdout);
			gm(process.cwd()+'/tmp.jpg').resize(240, 240);
			console.log(`Archivo ${f}.blue creado con tags e imagen`.green);
			callback(tag, _iF);
		}
	});
}
