
const stream = require('stream');
let remote = new stream.Writable();
const config = require('../config.json');

remote.start = function () {
	const express = require('express');
	const app = express();
	const fs = require('fs');
	const request = require('request');
	const cors = require('cors');
	const server = require('http').createServer(app);
	const querystring = require('querystring');
	let storedState;

	server.listen(8888);
	app.use(express.static(__dirname + '/Ressources/remote/dist/remote'));
	remote.io = require('socket.io')(server);

	app.get('/spotifycallback', function (req, res) {
		let code = req.query.code || null;
		let state = req.query.state || null;

		console.log(req.query);
		console.log(req.cookies);

		if(state === null || state !== storedState) {
			res.redirect('/#' +
				querystring.stringify({
					error: 'state_mismatch'
				}));
		} else {
			let authOptions = {
				url: 'https://accounts.spotify.com/api/token',
				form: {
					code: code,
					redirect_uri: config.uri +'/spotifycallback',
					grant_type: 'authorization_code'
				},
				headers: {
					'Authorization': 'Basic ' + (new Buffer(config.clientId + ':' + config.clientSecret).toString('base64'))
				},
				json: true
			};

			request.post(authOptions, function (error, response, body) {
				//let access_token = body.access_token;
				let refresh_token = body.refresh_token;
				config.refreshKeys.push(refresh_token);
				saveConfig(config);
				res.redirect('/#');
			})
		}
	});

	remote.io.on('connection', function (socket) {
		socket.emit('connected');

		socket.on('saveConfig', function(data) {
			saveConfig(data);
		});
		
		socket.on('stateGenerated', function (state) {
			storedState = state;
		})

		socket.on('getConfig', function () {
			socket.emit('config', config);
		})

	})

	function saveConfig(data) {
		let dir = __dirname.slice(0, __dirname.length - 7); // Path to Root directory; -7 because Folder name "Remote" hat 6 letters plus the last "/"
;		fs.writeFile(dir + '/config.json', JSON.stringify(data, null, 2), "utf8", function (err) {
			if(err) {
				console.error(err);
			}
			else {
				console.log(JSON.stringify(data, null, 2));
				remote.emit('relaunch');
			}
		})
	}

}

module.exports = remote;