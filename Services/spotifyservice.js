
	function SpotifyService($http, $httpParamSerializer, $q) {
		var service = {};

		service.getAccessToken = function (refreshKey) {
			var deferred = $q.defer();
			var req = {
				method: 'POST',
				url: 'https://accounts.spotify.com/api/token',
				headers: {
					'Authorization': 'Basic ' + config.secret,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				data: $httpParamSerializer({'grant_type': "refresh_token", 'refresh_token': refreshKey})
			};
			$http(req).then(function (response) {
				deferred.resolve(response.data);
			}, function (error) {
				deferred.reject(error, refreshKey);
			});

			return deferred.promise;
		};

		var handleSpotifyApiError = function (error) {
			if (error.status === 401) {
				// Unauthorized, means the token is invalid
				console.debug("Token invalid, renewing" + error);
			} else if (error.status === 502 || error.status === 503) {
				console.debug(error);
			} else {
				console.log(error);
			}
		};

		service.getPlaying = function (token) {
			var defer = $q.defer();

			var req = {
				method: 'GET',
				url: 'https://api.spotify.com/v1/me/player',
				headers: {
					'Authorization': 'Bearer ' + token
				}
			};
			$http(req).then(function (response) {
				defer.resolve(response.data);
			}, function (error) {
				handleSpotifyApiError(error);
				defer.reject(error);
			});
			return defer.promise;
		};

		service.playNext = function (token) {
			var req = {
				method: 'POST',
				url: 'https://api.spotify.com/v1/me/player/next',
				headers: {
					'Authorization': 'Bearer ' + token
				}
			};
			$http(req).then(function () {
			}, function (error) {
				handleSpotifyApiError(error);
			});
		};

		service.playPrevious = function (token) {
			var req = {
				method: 'POST',
				url: 'https://api.spotify.com/v1/me/player/previous',
				headers: {
					'Authorization': 'Bearer ' + token
				}
			};
			$http(req).then(function () {
			}, function (error) {
				handleSpotifyApiError(error);
			});
		};

		service.pausePlayback = function (token) {
			var req = {
				method: 'PUT',
				url: 'https://api.spotify.com/v1/me/player/pause',
				headers: {
					'Authorization': 'Bearer ' + token
				}
			};
			$http(req).then(function () {
			}, function (error) {
				handleSpotifyApiError(error);
			});
		};

		return service;
	}

	myModule.service('SpotifyService', SpotifyService);

