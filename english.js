var myProductName = "english", myVersion = "0.5.21";   

const request = require ("request");
const fs = require ("fs");
const davehttp = require ("davehttp");
const utils = require ("daveutils");
const qs = require ("querystring");
const yaml = require ("js-yaml");
const gitpub = require ("./src/githubpub.js");

var config = {
	port: 1402,
	flLogToConsole: true,
	flAllowAccessFromAnywhere: true,
	flPostEnabled: true,
	userAgent: myProductName + " v" + myVersion,
	urlEnglishApp: "http://scripting.com/english/testing/" //9/16/18 by DW
	};

const fnameConfig = "config.json";

function getFileExtension (url) {
	return (utils.stringLastField (url, ".").toLowerCase ());
	}
function urlToMime (url) {
	var ext = getFileExtension (url);
	return (utils.httpExt2MIME (ext));
	}
function buildParamList (paramtable) { 
	var s = "";
	for (var x in paramtable) {
		if (s.length > 0) {
			s += "&";
			}
		s += x + "=" + encodeURIComponent (paramtable [x]);
		}
	return (s);
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
	function getFile (callback) {
		var url = "https://api.github.com/repos/" + username + "/" + repo + "/contents/" + path;
		var theRequest = {
			method: "GET",
			url: url,
			headers: {
				"User-Agent": config.userAgent
				}
			};
		request (theRequest, function (err, response, body) { 
			var jstruct = undefined;
			if (err) {
				callback (err);
				}
			else {
				try {
					var jstruct = JSON.parse (body);
					var buffer = new Buffer (jstruct.content, "base64"); 
					callback (undefined, buffer.toString (), jstruct);
					}
				catch (err) {
					callback (err);
					}
				}
			});
		}
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
	getFile (function (err, data, jstruct) {
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
					var jstruct = {
						domain: gitpub.getRepositoryDomain (username, repo)
						};
					callback (undefined, jstruct);
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
					var urlRedirect = config.urlEnglishApp + "?access_token=" + postbody.access_token;
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
		case "/get":
			var username = theRequest.params.username;
			var repository = theRequest.params.repo;
			var path = theRequest.params.path;
			gitpub.getFromGitHub (username, repository, path, function (err, jstruct) {
				if (err) {
					returnError (err);
					}
				else {
					var content = jstruct.content;
					if (jstruct.encoding == "base64") {
						content = new Buffer (content, "base64"); 
						}
					theRequest.httpReturn (200, urlToMime (path), content);
					}
				});
			
			return;
		case "/savepost":
			function yamlIze (jsontext) {
				var jstruct = JSON.parse (jsontext);
				const delimiter = "---\n";
				var text = jstruct.text;
				delete jstruct.text;
				var s = delimiter + yaml.safeDump (jstruct) + delimiter + text;
				return (s);
				}
			var text = yamlIze (theRequest.params.text);
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
		case "/getpost":
			function deYamlIze (data) {
				const delimiter = "---\n";
				var filetext = data.toString ();
				if (utils.beginsWith (filetext, delimiter)) {
					var frontmatter = utils.stringNthField (filetext, delimiter, 2);
					var remainingtext = utils.stringDelete (filetext, 1, frontmatter.length + (2 * delimiter.length));
					if (frontmatter.length > 0) {
						var jstruct = yaml.safeLoad (frontmatter);
						jstruct.text = remainingtext;
						return (jstruct);
						}
					return ({text: filetext});
					}
				return ({text: filetext});
				}
			var username = theRequest.params.username;
			var repository = theRequest.params.repo;
			var path = theRequest.params.path;
			gitpub.getFromGitHub (username, repository, path, function (err, jstruct) {
				if (err) {
					returnError (err);
					}
				else {
					var content = jstruct.content;
					if (jstruct.encoding == "base64") {
						content = new Buffer (content, "base64"); 
						}
					
					var returnStruct = deYamlIze (content);
					returnStruct.domain = gitpub.getRepositoryDomain (username, repository);
					returnData (returnStruct);
					}
				});
			return;
		}
	gitpub.handleRequest (theRequest, theRequest.httpReturn);
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
	var cachesize = gitpub.getCacheSize ();
	var cachemsg = cachesize + ((cachesize != 1) ? " files" : " file") + " in cache";
	console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", " + cachemsg + ".\n");
	}
function everySecond () {
	}

readConfig (function () {
	console.log ("\n" + myProductName + " v" + myVersion + "\n");
	setInterval (everySecond, 1000); 
	
	utils.runEveryMinute (everyMinute);
	
	gitpub.init (config, false);
	davehttp.start (config, function (theRequest) {
		handleHttpRequest (theRequest);
		});
	});


