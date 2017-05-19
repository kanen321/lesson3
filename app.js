var express = require('express');
var logger = require('morgan');
var superagent = require('superagent');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var url = require('url');

var app = express();
var cnodeUrl = 'https://cnodejs.org/';

app.use(logger('dev'));

app.get('/', function (req, res, next) {
	// use superagent to catch content form https://cnodejs.org
	superagent.get(cnodeUrl)
		.end(function (err, sres) {
			if (err) {
				return next(err);
			}
			var $ = cheerio.load(sres.text);
			var items = [];
			var topic_urls = [];

			$('#topic_list .topic_title').each(function (idx, element) {
				var $element = $(element);
				items.push({
					title: $element.attr('title'),
					href: $element.attr('href')
				});

				var href = url.resolve(cnodeUrl, $element.attr('href'));
				topic_urls.push(href);
			});

			res.send(items);
			send_request(topic_urls);
		});
});

function send_request(topic_urls) {
	console.log('------------------------------------');
	console.log(topic_urls);
	console.log('------------------------------------');

	var ep = eventproxy();

	ep.after('topic_html', topic_urls.length, function (topics) {

		topics = topics.map(function (topicPair) {
			var topicUrl = topicPair[0];
			var topicHtml = topicPair[1];
			var $ = cheerio.load(topicHtml);
			return ({
				title: $('.topic_full_title').text().trim(),
				href: topicUrl,
				comment1: $('.reply_content').eq(0).text().trim(),
			});
		});

		console.log('------------------------------------');
		console.log('final');
		console.log(topics);
		console.log('------------------------------------');
	});

	topic_urls.forEach(function (topicUrl) {
		superagent.get(topicUrl)
			.end(function (err, res) {
				console.log('fetch ' + topicUrl + ' successful');
				ep.emit('topic_html', [topicUrl, res.text]);
			});
	});
}

app.listen(3000);

console.log('app is listening on 3000');