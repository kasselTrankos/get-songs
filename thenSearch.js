var URL ='https://genius.com/search?q=';
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
			url: URL+author.split(' ').join('-')+'-'+title.split(' ').join('-'), 
			encoding: null
		},
		function (_error, _response, body) {
			//callback(tag)
			var $  = cheerio.load(iconv.decode(new Buffer(body), "ISO-8859-1"));
			$('.search_results.song_list.primary_list li').each(function(i, el){
				results.push({
					value: {
						title: $(this).find('a').find('span').find('span').eq(0).text(),
						author: $(this).find('a').find('span').find('span').eq(2).text(),
						uri: $(this).find('a').attr('href')
					},
					
					name: $(this).find('a').find('span').find('span').eq(2).text()+'/'+$(this).find('a').find('span').find('span').eq(0).text(),
					checked: false
				});
			});
			/*fs.writeFile("./joder.html", $('.search_results.song_list.primary_list').html(), function(err) {
			    if(err) {
			        return console.log(err);
			    }

			    console.log("The file was saved!");
			});*/
			callback(results);
		});
	}
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
		  Selected(answer.choice[0].uri, answer.choice[0].author, answer.choice[0].title, function(album, cover_Art){
		  	callback({
		  		album: album, 
		  		artist: author,
		  		title: title,
		  		cover: cover_Art
		  	});
		  });
		});
	});
	//author = 
}
//thenSearch();
module.exports = thenSearch;