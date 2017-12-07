var myProductName = "english", myVersion = "0.5.0";   

const request = require ("request");
const fs = require ("fs");
const davehttp = require ("davehttp");
const utils = require ("daveutils");
const qs = require ("querystring");


var config = {
	port: 1402,
	flLogToConsole: true,
	flAllowAccessFromAnywhere: true,
	userAgent: myProductName + " v" + myVersion
	};

const fnameConfig = "config.json";

function getFile (options, callback) {
	var url = "https://api.github.com/repos/" + options.username + "/" + options.repo + "/contents/" + options.repoPath;
	var theRequest = {
		method: "GET",
		url: url,
		headers: {
			"User-Agent": options.userAgent
			}
		};
	request (theRequest, function (err, response, body) { 
		var jstruct = undefined;
		if (err) {
			if (callback !== undefined) {
				callback (err);
				}
			}
		else {
			try {
				var jstruct = JSON.parse (body);
				if (callback !== undefined) {
					var buffer = new Buffer (jstruct.content, "base64"); 
					callback (undefined, buffer.toString (), jstruct);
					}
				}
			catch (err) {
				if (callback !== undefined) {
					callback (err);
					}
				}
			}
		});
	}
function getUserInfo (accessToken, callback) {
	var myRequest = {
		method: "GET",
		url: "https://api.github.com/user",
		headers: {
			"User-Agent": config.userAgent,
			"Authorization": "token " + accessToken
			}
		};
	request (myRequest, function (err, response, body) { 
		var myResponse = {
			flError: true,
			message: undefined
			};
		if (err) {
			myResponse.message = err.message;
			}
		else {
			try {
				myResponse.flError = false;
				myResponse.info = JSON.parse (body);
				}
			catch (err) {
				myResponse.message = err.message;
				}
			}
		callback (myResponse);
		});
	}
function saveFile (accessToken, username, repo, path, msg, name, email, filetext, callback) {
	var options = {
		accessToken: accessToken,
		username: username,
		repo: repo,
		repoPath: path,
		data: filetext,
		type: "text/plain",
		committer: {
			name: name,
			email: email
			},
		message: msg,
		userAgent: config.userAgent
		};
	var bodyStruct = { 
		message: options.message,
		committer: {
			name: options.committer.name,
			email: options.committer.email
			},
		content: new Buffer (options.data).toString ('base64')
		};
	getFile (options, function (err, data, jstruct) {
		if (jstruct !== undefined) {
			bodyStruct.sha = jstruct.sha;
			}
		var url = "https://api.github.com/repos/" + options.username + "/" + options.repo + "/contents/" + options.repoPath;
		var theRequest = {
			method: "PUT",
			url: url,
			body: JSON.stringify (bodyStruct),
			headers: {
				"User-Agent": options.userAgent,
				"Authorization": "token " + options.accessToken,
				"Content-Type": options.type
				}
			};
		request (theRequest, function (err, response, body) { 
			if (err) {
				console.log ("uploadFile: err.message == " + err.message);
				callback (err);
				}
			else {
				if (callback !== undefined) {
					callback (undefined, response);
					}
				}
			});
		});
	}

function handleHttpRequest (theRequest) {
	var accessToken = theRequest.params.accessToken;
	function returnData (jstruct) {
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function returnError (jstruct) {
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	
	switch (theRequest.lowerpath) {
		case "/now":
			theRequest.httpReturn (200, "text/plain", new Date ());
			return;
		case "/oauthcallback":
			var apiUrl = "https://github.com/login/oauth/access_token";
			apiUrl += "?client_id=" + config.clientId;
			apiUrl += "&client_secret=" + config.clientSecret;
			apiUrl += "&code=" + theRequest.params.code;
			
			
			var githubRequest = {
				method: "POST",
				url: apiUrl
				};
			request (githubRequest, function (err, response, body) {
				if (err) {
					console.log (err.message);
					theRequest.httpReturn (500, "text/plain", err.message);
					}
				else {
					var postbody = qs.parse (body);
					var httpResponse = theRequest.sysResponse;
					var urlRedirect = "http://scripting.com/english/?access_token=" + postbody.access_token;
					httpResponse.writeHead (302, {"location": urlRedirect});
					httpResponse.end ("Redirect to this URL: " + urlRedirect);
					theRequest.httpReturn (200, "text/plain", "We got the callback bubba.");
					}
				});
			return;
		case "/getuserinfo":
			getUserInfo (accessToken, function (result) {
				returnData (result);
				});
			return;
		case "/save":
			var text = theRequest.params.text;
			var repo = theRequest.params.repo;
			var path = theRequest.params.path;
			var msg = theRequest.params.msg;
			var name = theRequest.params.name;
			var email = theRequest.params.email;
			var username = theRequest.params.username;
			saveFile (accessToken, username, repo, path, msg, name, email, text, function (err, result) {
				if (err) {
					returnError (err);
					}
				else {
					returnData (result);
					}
				});
			return;
		}
	theRequest.httpReturn (404, "text/plain", "Not found.");
	}

function readConfig (callback) {
	utils.sureFilePath (fnameConfig, function () {
		fs.readFile (fnameConfig, function (err, data) {
			if (!err) {
				try {
					var jstruct = JSON.parse (data.toString ());
					for (var x in jstruct) {
						config [x] = jstruct [x];
						}
					}
				catch (err) {
					console.log ("readConfig: err == " + err.message);
					}
				}
			if (callback !== undefined) {
				callback ();
				}
			});
		});
	}
function everyMinute () {
	}
function everySecond () {
	}

readConfig (function () {
	console.log ("\n" + myProductName + " v" + myVersion + "\n");
	setInterval (everySecond, 1000); 
	utils.runAtTopOfMinute (function () {
		setInterval (everyMinute, 60000); 
		everyMinute ();
		});
	davehttp.start (config, function (theRequest) {
		handleHttpRequest (theRequest);
		});
	});


