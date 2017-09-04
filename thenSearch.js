var URL ='https://genius.com/api/search/multi?per_page=5&q=';
var fs = require('fs'),
	cheerio = require('cheerio'),
	iconv  = require('iconv-lite'),
	inquirer = require('inquirer'),
	request = require('request');



var thenSearch = function(author, title, callback){
	author = getVar('-a') || author;
	title = getVar('-t') || title;
	var results = [];
	function Search(author, title, callback){
		request({
			url: `${URL+author.split(' ').join('+')+'+'+title.split(' ').join('+')}`, 
			encoding: null,
			json:true
		},
		function (_error, _response, body) {
			let _songs = obtainSongsList(body.response.sections);
			let results = [];
			_songs.map((elm)=>{
				results.push({
					value: {
						title: elm.result.title,
						author: elm.result.primary_artist.name,
						uri: elm.result.url,
						cover: elm.result.header_image_url
					},
					name: `${elm.result.primary_artist.name}/${elm.result.title}`,
					checked: false
				});
			});
			callback(results);
		});
	}
	const obtainSongsList = (data)=>{
		for(let i=0; i<data.length; i++){
			if(data[i].type==='song'){
				return data[i].hits;
			}
		}
		return [];
	}
	function Google (author, title, callback){
		var str = 'https://www.google.es/search?q=';
		str+=author.split(' ').join('+')+'+'+title.split(' ').join('+');
		request({
			url: str, 
			encoding: null
			},
			function (error, response, body) {
				var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
		  		var fecha = $('span:contains("Fecha de lanzamiento")').parent().find('span').eq(1).text();
		  		var genre = $('span:contains("Género")').parent().find('span').eq(1).text();
		  		callback(fecha, genre);
		});
	};
	function Selected(uri, author, title, callback){
		request({
			url: uri, 
			encoding: null
		},
		function (_error, _response, body) {
			//callback(tag)
			var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));

			var album = $('h3 .metadata_unit span:contains("Album")').parent().find('span').eq(1).find('a').text();
			var $$ = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
  			var cover_Art =  $$('div.cover_art').find('img').eq(0).attr('src');
			/*fs.writeFile("./nnnn.html", $('div.cover_art'), function(err) {
			    if(err) {
			        return console.log(err);
			    }

			    console.log("The file was savedasdsdaasddas!");
			});*/
			callback(album, cover_Art);
		});
	}
	function getVar(str){
		for(var i =0; i<process.argv.length; i++){
			if(process.argv[i]==str){
				return process.argv[i+1];
			}
		}
		return false;
	}
	Search(author, title, function(e){
		inquirer.prompt([
  			{
		    type: 'checkbox',
		    message: 'Elige cual es:',
		    name: 'choice',
		    choices: e,
		    validate: function (answer) {
		      if (answer.length == 1) {
		        return true;
		      }
		      return 'Debes elegi uno y solo uno.';
		    }
		  }
		]).then(function (answer) {
		  Selected(answer.choice[0].uri, 
		  	answer.choice[0].author, 
		  	answer.choice[0].title, 
		  	function(album, cover_Art){
			  	Google(author, title, function(year, genre){
			  		callback({
				  		album: album, 
				  		artist: author,
				  		title: title,
				  		cover: cover_Art,
				  		year: year,
				  		genre: genre
				  	});
			  	});
		  	});
		});
	});
	//author = 
}
//thenSearch();
// thenSearch('REM', 'country feedback');
module.exports = thenSearch;