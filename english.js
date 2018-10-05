var myProductName = "english", myVersion = "0.6.6";   

const fs = require ("fs");
const davehttp = require ("davehttp");
const utils = require ("daveutils");
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
readConfig (function () {
	function everyMinute () {
		var cachesize = gitpub.getCacheSize ();
		var cachemsg = cachesize + ((cachesize != 1) ? " files" : " file") + " in cache";
		console.log ("\n" + myProductName + " v" + myVersion + ": " + new Date ().toLocaleTimeString () + ", " + cachemsg + ".\n");
		}
	function everySecond () {
		}
	console.log ("\n" + myProductName + " v" + myVersion + "\n");
	setInterval (everySecond, 1000); 
	utils.runEveryMinute (everyMinute);
	gitpub.init (config, false);
	davehttp.start (config, function (theRequest) {
		gitpub.handleRequest (theRequest, theRequest.httpReturn);
		});
	});


