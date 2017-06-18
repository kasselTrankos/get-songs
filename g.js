var fs = require('fs'),
	path = require('path'),
	colors = require('colors'),
	xpath = require('xpath'),
	iconv  = require('iconv-lite'),
	jsonfile =require('jsonfile'),
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

var f = process.argv.pop();

var construct = function(){

	if (fs.existsSync(process.cwd()+'/'+f+'.json')) {
		jsonfile.readFile(process.cwd()+'/'+f+'.json', function(err, obj) {
		  if(err) return false;
		  initializeNormal(obj.creator, obj.alt_title);
		});
	}else{
		let [artist, title] = getArtistTitle(f);
		if(!artist && !title){
			fillData();
		}else{
			initializeNormal(artist, title);
		}
	}
	
}
var normalizeGoogle = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '').replace(new RegExp(/\'/, 'g'), '').replace(new RegExp(/\?/, 'g'), '').split(' ').join('+');
}
var normalizeGenius = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '').replace(new RegExp(/\./, 'g'), '').replace(new RegExp(/\'/, 'g'), '').replace(/\?/, '').split(' ').join('-');
}
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
function getData(artist, title, body, error, callback){
	var _str = 'https://genius.com/'+normalizeGenius(artist, '-')+'-'+normalizeGenius(title, '-')+'-lyrics';
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
		var $$ = cheerio.load(iconv.decode(new Buffer(_body), "ISO-8859-1"));
		var album = $('span:contains("Álbum")').parent().find('span').eq(1).find('a').text();
  		var fecha = $('span:contains("Fecha de lanzamiento")').parent().find('span').eq(1).text();
  		var genre = $('span:contains("Género")').parent().find('span').eq(1).text();
		if($$('h1').eq(0).text()=='Oops! Page not found'){
			fillData(album, fecha, genre);
		}else{
	  		var cover_Art =  $$('div.cover_art').find('img').eq(0).attr('src');
			callback({
				artist: artist,
				title: title,
	  			album: album,
	  			year: fecha,
	  			genre: genre

	  		}, cover_Art);
		}

	});
}
var appendId3Tags = function(id3, cover){
	wiriteId(id3, cover, function(meta, file, name){
		var dirPath = process.cwd()+'/'+meta.artist.replace(/\b\w/g, function(l){ return l.toUpperCase() })+'/'+meta.album.replace(/\b\w/g, function(l){ return l.toUpperCase() });
		mkdirSync(dirPath, function() {
			move(
				file, 
				dirPath+'/'+name+'.mp3'
			);
			if (fs.existsSync(process.cwd()+'/'+f+'.json')) {
				fs.unlink(process.cwd()+'/'+name+'.json');
			}
		});
	});
};





function initializeNormal(artist, title){
	if(artist==null || title==null){
		fillData();
		return false;
	}
	var str = 'https://www.google.es/search?q=';
	str+=normalizeGoogle(artist)+'+'+normalizeGoogle(title);
	request({
		url: str, 
		encoding: null
		},
		function (error, response, body) {
	  		getData(artist, title, body, error, function(id3, uriCover){
	  			getCover(uriCover, function(coverFile){
					appendId3Tags(id3, coverFile)
				});
	  		});
	  	}
	);
}


function getCover(uri, callback){
	try{
		var _name = new Date().getTime();
		request(uri).pipe(fs.createWriteStream(process.cwd()+'/'+_name+'.jpg').on('close', function(){
			callback(process.cwd()+'/'+_name+'.jpg')
		}));
	}catch (err) {
	  fillData();
	}
	
}
function fillData(){
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
			getCover(e.cover, function(coverFile){
				appendId3Tags(e, coverFile)
			});
		});
	});
	//
}
function wiriteId(tag, cover, callback){
	var _name  = (process.argv.length===3) ? process.argv.pop(): f;
	var _file = process.cwd()+'/'+_name+'.mp3';
	var file = new id3.File(_file);
  	var meta = new id3.Meta({
	    artist: tag.artist,
	    title: tag.title,
	    album: tag.album,
	    genre: tag.genre || '',
	    year: (tag.year)  ? Number(tag.year) : 0
	},[new id3.Image(cover)]);
	writer.setFile(file).write(meta, function(err) {
		if (err) {
    		console.log(err.red);
		}else{
			fs.unlink(cover);
			console.log(`Archivo ${f}.blue creado con tags e imagen`.green);
			callback(tag, _file, _name);
		}
	});
}
construct();