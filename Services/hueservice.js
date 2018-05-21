function HueService($http, $httpParamSerializer, $q) {
	let url = config.Hue.url;
	let username = config.Hue.username;
	let uid = config.Hue.uid;

	let service = {};

	service.setColor = function (hue, sat) {
		var deferred = $q.defer();
		var req = {
			method: 'PUT',
			url: url + username + "/lights/" + uid + "/state",
			data: {"hue": hue, "sat": sat ,"on": true}
		};
		$http(req).then(function (response) {
			deferred.resolve(response);
		}, function (error) {
			deferred.reject(error);
		});

		return deferred.promise;
	};

	return service;
}

myModule.service('HueService', HueService);