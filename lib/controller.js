/* UI functions */

function SpotispyCtrl($scope, $timeout, SpotifyService, HueService) {

	let colorThief = new ColorThief();

	let setNextSong = function(title, artist, imgUrl) {
		document.getElementById('background').src = imgUrl;
		document.getElementById('cover').src = imgUrl;
		document.getElementById('title').innerHTML = title;
		document.getElementById('artist').innerHTML = artist;
		// Make everything visible and enable the progress bar
		document.getElementById('cover').style.visibility = "visible";
		document.getElementById('background').style.visibility = "visible";
		document.getElementById('track-info').style.visibility = "visible";
		document.getElementById('progressBarParent').style.visibility = "visible";
		document.getElementById('progressBarParent').style.animation = "none";
	}


	var setProgress = function(progress) {
		if (progress < 100) {
			document.getElementById('progressBar').style.width = (progress + "%");
		}
	}

	var setPaused = function() {
		document.getElementById('progressBarParent').style.animation = "blinker 3s linear infinite";
	}

	var setLoading = function(text) {
		document.getElementById('loading').innerHTML = text;
		document.getElementById('cover').style.visibility = "hidden";
		document.getElementById('background').style.visibility = "hidden";
		document.getElementById('track-info').style.visibility = "hidden";
		document.getElementById('progressBarParent').style.visibility = "hidden";
		document.getElementById('progressBarParent').style.animation = "none";
	}

	/* "backend"/logic functions */
	let tokenExpirationEpoch = 0;
	let lastSongId = "";
	let songStartEpochMs = 0;
	let songLengthMs = 0;
	let playing = false;
	let rateLimitEpoch = 0;
	let accessTokens = [];
// Set the initial loading screen as soon as doc is loaded
	let tid = setInterval(function () {
		if (document.readyState !== 'complete') return;
		clearInterval(tid);
		setLoading("Verbindet mit Spotify...");
	}, 10);

	// Refresh the access token for the API
	var refreshApiKeys = function (refreshKey) {
		// noinspection JSUnresolvedFunction
		SpotifyService.getAccessToken(refreshKey)
			.then(function (data) {
				accessTokens[refreshKey].accessToken = data['access_token'];
				accessTokens[refreshKey].tokenExpirationEpoch = (new Date().getTime() / 1000) + data['expires_in'];
				console.log('Refreshed token. It now expires in ' + Math.floor(accessTokens[refreshKey].tokenExpirationEpoch - new Date().getTime() / 1000) + ' seconds!');
			}, function (err) {
				console.log('Could not refresh the token!', err.data.error_description);
				config.refreshKeys.splice(config.refreshKeys.indexOf(refreshKey), 1);
			});
	}

	config.refreshKeys.forEach(function(key){
		accessTokens[key] = {};
		refreshApiKeys(key);
	});

// Main interval
	setInterval(function () {
		// Check if we are reate limited
		if ((rateLimitEpoch - new Date().getTime() / 1000) > 0) {
			setLoading("Warte auf Spotify...");
			console.log("Rate limited, waiting for " + (rateLimitEpoch - new Date().getTime() / 1000) + " seconds");
			return;
		}

		var actions = config.refreshKeys.map((key) => {

			if ((accessTokens[key].tokenExpirationEpoch - new Date().getTime() / 1000) < 60) {
				refreshApiKeys(key);
			}

			return SpotifyService.getPlaying(accessTokens[key].accessToken);
		});

		var results = Promise.all(actions);

		results.then(data => {
			let currentPlaying;

			data.forEach(function (singleData) {
				if(singleData['is_playing'] !== undefined && config.Rooms.indexOf(singleData['device'].name) !== -1) {
					currentPlaying = singleData;
				}
			});

			if (currentPlaying !== undefined) {
				updatePlayStateApi(currentPlaying);
			}
			else {
				setLoading("Wiedergabe ist gestoppt");
				console.log("Playback is stopped");
			}

		});

	}, 2000);


// Interval for progress bar updates
	setInterval(function () {
		if (playing === true) {
			// Update the progress bar
			setProgress(getCurrentProgressPercent());
		}
	}, 1000);

	function rgb2hsv () {
		var rr, gg, bb,
			r = arguments[0] / 255,
			g = arguments[1] / 255,
			b = arguments[2] / 255,
			h, s,
			v = Math.max(r, g, b),
			diff = v - Math.min(r, g, b),
			diffc = function(c){
				return (v - c) / 6 / diff + 1 / 2;
			};

		if (diff == 0) {
			h = s = 0;
		} else {
			s = diff / v;
			rr = diffc(r);
			gg = diffc(g);
			bb = diffc(b);

			if (r === v) {
				h = bb - gg;
			}else if (g === v) {
				h = (1 / 3) + rr - bb;
			}else if (b === v) {
				h = (2 / 3) + gg - rr;
			}
			if (h < 0) {
				h += 1;
			}else if (h > 1) {
				h -= 1;
			}
		}
		return {
			h: Math.round(h * 65535),
			s: Math.round(s * 254),
			v: Math.round(v * 100)
		};
	}

	var calcColorAverage = function (coverUrl) {
			img = new Image();

			img.onload = function () {
				let color = colorThief.getColor(this);
				hsv = (rgb2hsv(color[0], color[1], color[2]));
				HueService.setColor(hsv.h, hsv.s).then(function(response) {
					console.log("State: " + response.status);
				}, function(err) {
					console.log("Fehler: " + err);
				});
			}

			img.src = coverUrl;
	}

// "Main" function
	var updatePlayStateApi = function (data) {
				if (data.statusCode === 429) {
					// Rate limited
					rateLimitEpoch = (new Date().getTime() / 1000) + data.headers["Retry-After"] + 5;
				} else if (data["is_playing"] === false && lastSongId !== "") {
					// If paused and not first run
					playing = false;
					// Set an info if playback is paused
					setPaused();
					console.log("Playback is paused");
				} else {
					// Only update cover and title if song is different
					let title = data.item.name;
					let id = data.item.id;
					if (lastSongId !== id || playing === false) {
						lastSongId = id;
						let artists = getArtistsString(data.item["artists"]);
						let coverUrl = data.item["album"].images[0].url;
						console.log("Now Playing: " + title + " - " + artists);
						setNextSong(title, artists, coverUrl);
						calcColorAverage(coverUrl);
					}
					songLengthMs = data.item["duration_ms"];
					let newSongStartEpochMs = new Date().getTime() - data["progress_ms"];
					if (Math.abs(newSongStartEpochMs - songStartEpochMs) > 200) {
						// Only reset progress if it drifted by more than 200ms
						songStartEpochMs = newSongStartEpochMs;
					}
					playing = true;
				}
	}

	var getCurrentProgressPercent = function () {
		let progress_ms = new Date().getTime() - songStartEpochMs;
		return (progress_ms / songLengthMs) * 100;
	}

// Combine returned Artists API object into a single string
	var getArtistsString = function(artists) {
		let toReturn = "";
		for (let i = 0; i < artists.length; i++) {
			toReturn = toReturn + artists[i].name + " & ";
		}
		toReturn = toReturn.slice(0, -3);
		return toReturn;
	}


}

myModule.controller('SpotispyCtrl', SpotispyCtrl);
