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
//setData();
const setData = (name, json, title)=>{
	f = `${name}.mp4.info` || f;
	json = json || false;
	if (fs.existsSync(`${process.cwd()}/${f}.json`)) {
		if(json){
			initializeNormal(
				json.creator, 
				json.alt_title, 
				title, 
				name
			);
		}else{
			jsonfile.readFile(process.cwd()+'/'+f+'.json', function(err, obj) {
		  		if(err) return false;
		  		initializeNormal(obj.creator, obj.alt_title, title, name);
			});	
		}
	}else{
		// console.log(' porque falla!!!', getArtistTitle(title), f, title, `${process.cwd()}/${f}.json`);
		let [_artist, _title] = getArtistTitle(title);
		if(!_artist && !_title){
			fillData(title, name);
		}else{
			console.log(_artist,',', _title);
			initializeNormal(_artist, _title, title, name);
		}
	}
	
}
const getTitle = ()=>{

};
var normalizeGoogle = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '').replace(new RegExp(/\'/, 'g'), '').replace(new RegExp(/\?/, 'g'), '').split(' ').join('+');
}
var normalizeGenius = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '').replace(new RegExp(/\./, 'g'), '').replace(new RegExp(/\'/, 'g'), '').replace(/\?/, '').split(' ').join('-');
}
var move = function(oldPath, newPath){
	fs.rename(oldPath, newPath, function (err) {
	  if (err) console.log( err.red, oldPath, newPath);
	  console.log('Successfully moved to:\n'.green, newPath.blue)
	});
}
var mkdirSync = function (dirPath, callback) {
	  mkdirp(dirPath, function (err) {
	    if (err) console.error(err)
	    else callback();
	});
}
const getData = (artist, title, body, error, callback) =>{
	let _uri = `https://genius.com/${normalizeGenius(artist, '-')}-${normalizeGenius(title, '-')}-lyrics`;
	request({
		url: _uri, 
		encoding: null
	},
	(_error, _response, _body)=> {
		//https://genius.com/api/referents/multi?text_format=html%2Cplain&ids%5B%5D=4040021&ids%5B%5D=4795510
		getDifferent = (data)=>{
			let elms = [];
			for(let i =0; i<data.length; i++){
				let _m = data[i].match(/\d+/)
				if(elms.indexOf(_m[0])===-1){
					
					elms.push(_m[0]);
				}
			}
			return '&ids%5B%5D='+elms.join('&ids%5B%5D=')

		};
		if(_error){
			fillData();
			return false;
		}
		let __body = iconv.decode(new Buffer(_body), "ISO-8859-1");
		let _m = new RegExp(`(\\d+)\\/${normalizeGenius(artist, '-')}`, 'gi');
		let founds = __body.match(_m);
		request({
			url: 'https://genius.com/api/referents/multi?text_format=html%2Cplain'+getDifferent(founds),
			encoding: false,
			json: true
		}, (__error, __response, ___body)=> {
			console.log(___body.response.referents);
		})
		// console.log(' dame el body', founds, _m, _uri);
		// fs.writeFile(`./nada.html`, __body, function(err) {
		//     if(err) {
		//         return console.log(err);
		//     }

		//     console.log("The file was savedasdsdaasddas!");
		// });
		// var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
		// var $$ = cheerio.load(iconv.decode(new Buffer(_body), "ISO-8859-1"));
		// var album = $('span:contains("Álbum")').parent().find('span').eq(1).find('a').text();
  // 		var fecha = $('span:contains("Fecha de lanzamiento")').parent().find('span').eq(1).text();
  // 		var genre = $('span:contains("Género")').parent().find('span').eq(1).text();
		// if($$('h1').eq(0).text()=='Oops! Page not found'){
		// 	fillData(album, fecha, genre);
		// }else{
	 //  		var cover_Art =  $$('div.cover_art').find('img').eq(0).attr('src');
		// 	callback({
		// 		artist: artist,
		// 		title: title,
	 //  			album: album,
	 //  			year: fecha,
	 //  			genre: genre

	 //  		}, cover_Art);
		// }

	});
}
const appendId3Tags = (id3, cover, filename) =>{
	writeId(id3, cover, filename, (meta, file, name)=>{
		name = filename || name;
		let _artist = meta.artist.replace(/\b\w/g, function(l){ return l.toUpperCase() });
		let _album = meta.album.replace(/\b\w/g, function(l){ return l.toUpperCase() });
		let dirPath = `${process.cwd()}/${_artist}/${_album}`;
		mkdirSync(dirPath, ()=>{
			move(
				file, 
				`${dirPath}/${name}.mp3`
			);
			if(fs.existsSync(cover)){
				fs.unlink(cover);
			}
			if (fs.existsSync(`${process.cwd()}/${f}.json`)) {
				fs.unlink(`${process.cwd()}/${f}.json`);
			}
		});
	});
};





const initializeNormal = (artist, title, file, cname)=>{
	if(artist==null || title==null){
		fillData(file);
		return false;
	}
	var str = 'https://www.google.es/search?q=';
	str+=normalizeGoogle(artist)+'+'+normalizeGoogle(title);
	request({
		url: str, 
		encoding: null
		},
		(error, response, body)=>{
	  		getData(artist, title, body, error, function(id3, uriCover){
	  			getCover(uriCover, cname,(coverFile)=>{
					appendId3Tags(id3, coverFile, file);
				});
	  		});
	  	}
	);
}


const getCover = (uri, _name, callback) =>{
	try{
		//console.log(`getting cover from ${uri}`.yellow);
		let _name = _name || new Date().getTime();
		console.log(`${process.cwd()}/${_name}.jpg`);
		request(uri)
		.pipe(
			fs.createWriteStream(`${process.cwd()}/${_name}.jpg`).on('close', function(){
			callback(`${process.cwd()}/${_name}.jpg`)
		}));
	}catch (err) {
	  fillData();
	}
	
}
function fillData(file, cname){
	var name = file || f;
	console.log(`${name}`.red);
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
			getCover(e.cover, cname, function(coverFile){
				appendId3Tags(e, coverFile, file)
			});
		});
	});
	//
}
const writeId = (tag, cover, filename, callback) =>{
	var _name  = (process.argv.length===3) ? process.argv.pop() : f;
	_name = filename || _name;
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

module.exports = {
	setData
};