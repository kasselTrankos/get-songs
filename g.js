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
var vid = null;
//setData();
const setData = (videoId, json, title, filenamed) =>{
	f = `${videoId}.mp4.info` || f;
	vid = videoId;
	json = json || false;
	if(json){
		initializeNormal(
			json.creator, 
			json.alt_title, 
			title, 
			videoId,
			filenamed
		);
		return false;
	}
	if (fs.existsSync(`${process.cwd()}/${f}.json`)) {
		jsonfile.readFile(process.cwd()+'/'+f+'.json', function(err, obj) {
	  		if(err) return false;
	  		initializeNormal(obj.creator, obj.alt_title, title, videoId, filenamed);
		});
		return false;
	}
	let [_artist, _title] = getArtistTitle(title);
	if(!_artist && !_title){
		fillData(filenamed);
	}else{
		initializeNormal(_artist, _title, title, videoId, filenamed);
	}
	
	
}
const getTitle = ()=>{

};
var normalizeGoogle = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '').replace(new RegExp(/\'/, 'g'), '').replace(new RegExp(/\?/, 'g'), '').split(' ').join('+');
}
var normalizeGenius = function(str){
	return str.replace(new RegExp(/\,/, 'g'), '')
		.replace(new RegExp(/\+|\+\s|\s\+/, 'g'), '')
		.replace(new RegExp(/\./, 'g'), '')
		.replace(new RegExp(/\'/, 'g'), '')
		.replace(/\?/, '')
		.split(' ')
		.join('-');
}
var move = function(oldPath, newPath){
	fs.rename(oldPath, newPath, function (err) {
	  if (err) console.log( err.red, oldPath, newPath);
	  // console.log('Successfully moved '.green)
	});
}
var mkdirSync = function (dirPath, callback) {
	  mkdirp(dirPath, function (err) {
	    if (err) console.error(err)
	    else callback();
	});
}
const getData = (artist, title, body, error, filenamed, callback) =>{
	let _uri = `https://genius.com/${normalizeGenius(artist, '-')}-${normalizeGenius(title, '-')}-lyrics`;
	request({
		url: _uri, 
		encoding: null
	},
	(_error, _response, _body)=> {
		const getDifferent = (data)=>{
			if (!data) return '';
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
			fillData(filenamed);
			return false;
		}
		let __body = iconv.decode(new Buffer(_body), "ISO-8859-1");
		let _m = new RegExp(`(\\d+)\\/${normalizeGenius(artist, '-')}`, 'gi');
		let founds = __body.match(_m);
		request({
			url: `https://genius.com/api/referents/multi?text_format=html%2Cplain${getDifferent(founds)}`,
			encoding: false,
			json: true
		}, (__error, __response, ___body)=> {
			let _r = ___body.response.referents;
			let image_url = null, artist = null, title = null;
			for(elmt in _r){
				image_url= _r[elmt]['annotatable']['image_url'];
				artist = _r[elmt]['annotatable']['context'];
				title = _r[elmt]['annotatable']['title']
			}
			callback({
				artist: artist,
				title: title,
	  			album: '',
	  			year: '',
	  			genre: ''

	  		}, image_url);
		})

	});
}
const initializeNormal = (artist, title, file, cname, filenamed)=>{
	if(artist==null || title==null){
		fillData(filenamed);
		return false;
	}
	getData(artist, title, body, error, filenamed, function(id3, uriCover){
		getCover(uriCover, filenamed,(coverFile)=>{
			appendId3Tags(id3, coverFile, file);
		});
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
				`${dirPath}/${name}`
			);
			if(fs.existsSync(cover)){
				fs.unlink(cover);
			}
			if (fs.existsSync(`${process.cwd()}/${f}`)) {
				fs.unlink(`${process.cwd()}/${f}`);
			}
		});
	});
};
const getCover = (uri, filename, callback) =>{
	try{
		filename = filename || new Date().getTime();
		request(uri)
		.pipe(
			fs.createWriteStream(`${process.cwd()}/${vid}.jpg`).on('close', function(){
			callback(`${process.cwd()}/${vid}.jpg`)
		}));
	}catch (err) {
	  fillData(filename);
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
			getCover(e.cover, file, function(coverFile){
				appendId3Tags(e, coverFile, file)
			});
		});
	});
	//
}
const writeId = (tag, cover, filename, callback) =>{
	var _name  = (process.argv.length===3) ? process.argv.pop() : f;
	_name = filename || _name;
	var _file = process.cwd()+'/'+_name;
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
			if(fs.existsSync(cover)){
				fs.unlink(cover);
			}
			if (fs.existsSync(`${process.cwd()}/${f}`)) {
				fs.unlink(`${process.cwd()}/${f}`);
			}
			console.log(`Archivo creado`.green);
			callback(tag, _file, _name);
		}
	});
}

module.exports = {
	setData
};