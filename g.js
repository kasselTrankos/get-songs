var fs = require('fs'),
	path = require('path'),
	colors = require('colors'),
	xpath = require('xpath'),
	iconv  = require('iconv-lite'),
	HtmlDom = require('htmldom'),
	cheerio = require('cheerio'),
	dom = require('xmldom').DOMParser,
	id3 = require('id3-writer'),
	writer = new id3.Writer(),
	glob = require("glob"),
	getArtistTitle = require("get-artist-title"),
	request = require('request');

var str = 'https://www.google.es/search?q=';
console.log(process.argv);
var f = process.argv.pop();
let [artist, title] = getArtistTitle(f);
str+=artist.split(' ').join('+')+'+'+title.split(' ').join('+');

request({
	url: str, 
	encoding: null
	},
	function (error, response, body) {
  		getData(body, error, function(id3, uriCover){
  			getCover(uriCover, id3, function(id3){
  				wiriteId(id3);
  			});
  		});
  	}
);

function getCover(uri, tag, callback){
	request(uri).pipe(fs.createWriteStream(process.cwd()+'/tmp.jpg').on('close', function(){
		callback(tag)
	}));
}
function wiriteId(tag){
	var _iF  = (process.argv.length===3) ? process.argv.pop(): f;
	var _file = process.cwd()+'/'+_iF+'.mp3';
	var file = new id3.File(_file);
  	var meta = new id3.Meta({
	    artist: tag.artist,
	    title: tag.title,
	    album: tag.album,
	    genre: tag.genre,
	    year: Number(tag.year)
	},[new id3.Image(process.cwd()+'/tmp.jpg')]);
	writer.setFile(file).write(meta, function(err) {
		if (err) {
    		console.log(err.red);
		}else{
			console.log(`Archivo ${f}.blue creado con tags e imagen`.green);
		}
	});
}
function getData(body, error, callback){
	var _str = 'https://genius.com/'+artist.split(' ').join('-')+'-'+title.split(' ').join('-')+'-lyrics';
	console.log(_str.red);
	request({
		url: _str, 
		encoding: null
	},
	function (_error, _response, _body) {
		var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
  		var album = $('span:contains("Álbum")').parent().find('span').eq(1).find('a').text();
  		var fecha = $('span:contains("Fecha de lanzamiento")').parent().find('span').eq(1).text();
  		var genre = $('span:contains("Género")').parent().find('span').eq(1).text();
  		var $$ = cheerio.load(iconv.decode(new Buffer(_body), "ISO-8859-1"));
  		var cover_Art =  $$('div.cover_art').find('img').eq(0).attr('src');
  		/*fs.writeFile("./joder.html", $('span:contains("Género")').parent().find('span').eq(1).html(), function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    console.log("The file was saved!");
		});*/ 
		callback({
			artist: artist,
			title: title,
  			album: album,
  			year: fecha,
  			genre: genre

  		}, cover_Art);

	});
}