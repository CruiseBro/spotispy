/* UI functions */

function SpotispyCtrl($scope, $timeout, SpotifyService) {
	var setNextSong = function(title, artist, imgUrl) {
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
	let lastSongName = "";
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
				//updatePlayStateApi(accessTokens[refreshKey].accessToken);
			}, function (err) {
				console.log('Could not refresh the token!', err.message);
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

// "Main" function
	var updatePlayStateApi = function (data) {
				if (data.statusCode === 429) {
					// Rate limited
					rateLimitEpoch = (new Date().getTime() / 1000) + data.headers["Retry-After"] + 5;
				} else if (data["is_playing"] === false && lastSongName !== "") {
					// If paused and not first run
					playing = false;
					// Set an info if playback is paused
					setPaused();
					console.log("Playback is paused");
				} else {
					// Only update cover and title if song is different
					let title = data.item.name;
					if (lastSongName !== title || playing === false) {
						lastSongName = title;
						let artists = getArtistsString(data.item["artists"]);
						let coverUrl = data.item["album"].images[0].url;
						console.log("Now Playing: " + title + " - " + artists);
						setNextSong(title, artists, coverUrl);
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
