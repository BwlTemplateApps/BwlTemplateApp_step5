var http = require("http"); // for the status codes

/* ---------------------------------------------------
   These helpers are used in handlebar files (.hbs).
   --------------------------------------------------- */
var helpers = {
	/* -----------------------------------------------------------
	   General helper to allow more advanced if conditions
	   ----------------------------------------------------------- */
	ifCond: function (v1, operator, v2, options) {
		switch (operator) {
		case '!=':
			return (v1 != v2) ? options.fn(this) : options.inverse(this);
		case '==':
			return (v1 == v2) ? options.fn(this) : options.inverse(this);
		case '===':
			return (v1 === v2) ? options.fn(this) : options.inverse(this);
		case '<':
			return (v1 < v2) ? options.fn(this) : options.inverse(this);
		case '<=':
			return (v1 <= v2) ? options.fn(this) : options.inverse(this);
		case '>':
			return (v1 > v2) ? options.fn(this) : options.inverse(this);
		case '>=':
			return (v1 >= v2) ? options.fn(this) : options.inverse(this);
		case '&&':
			return (v1 && v2) ? options.fn(this) : options.inverse(this);
		case '||':
			return (v1 || v2) ? options.fn(this) : options.inverse(this);
		default:
			return options.inverse(this);
		}
	},
	ifEqual: function(string1,string2,result) {
		if (string1 == string2) return result;
		return '';
	},
	/* ===========================================================
	   'join' array to string and
	   'split' string into array
	   'splitCSV' string into array (use for one csv line)
	   'splitLines' into array (e.g. to process csv data)
	   =========================================================== */
	join: function(array,glue) {
		if (typeof glue == "undefined") glue = ',';
		return array.join(glue);
	},
	split: function(string) {
		return string.split(',');
	},
	splitCSV: function(string) {
		var myArr;
		try {
			myArr = eval('['+string.replace(/""/g,'\\\"')+']');
		} catch(e) {
			myArr = string.replace(/^"/,'').replace(/"$/,'').split('","');
		}
		return myArr;
		/* --- the above should work for most cases
			   do it properly with csv2json:
		var CSVConverter = require("csvtojson").Converter;
		var converter = new CSVConverter({});
		converter.fromString(csvString, function(err,result){
			//your code here 
		});
		---- */
	},
	splitLines: function(string) {
		return string.split('\n');
	},
	sortOn: function(array,key) {
		var newarray = array.slice();
		newarray.sort(function(a, b){
			var _a = a[key].toLowerCase(), _b = b[key].toLowerCase();
			if(_a < _b) return -1;
			else if(_a > _b) return 1;
			return 0;
		});
		return newarray;
	},
	substr: function(string,start,length) {
		if (!string) return null;
		return string.substr(start,length);
	},
	index: function(o,k) {
		return o[k];
	},
	/* -----------------------------------------------------------
	   size of an object, e.g. array
	   ----------------------------------------------------------- */
	getSize: function(obj) {
		if (obj) return Object.keys(obj).length;   // for arrays and objects
		else return 0;
	},
	/* ===========================================================
	   Conversion helpers:
       'toString' can be used to encode to base64, utf8, ...
	   'toJSON' formatted string from js object
	   'decodeURI' 
	   'encodeURI' 
	   'utcSeconds2Date' 
	   =========================================================== */
	toString: function(object,encoding) {
		if (encoding) return object.toString(encoding);
		else return object.toString();
	},
	toJSON: function(object,indent) {
		if (indent == null || isNaN(indent)) return JSON.stringify(object,null,2);
		else return JSON.stringify(object,null,indent);
	},
	decodeURI: function(string) {
		return decodeURI(string);
	},
	encodeURI: function(string) {
		return encodeURI(string);
	},
	utcSeconds2Date: function(utcSeconds) {
		var d = new Date(0);
		var result;
		if (typeof utcSeconds == 'undefined') return 'n/a';
		try {
			d.setUTCSeconds(0.001*utcSeconds);
			result = d.toISOString().replace(/T/, ' ').replace(/\..+/, '');
		} catch(e) {
			result = 'ERROR for date '+utcSeconds+': '+e;
		}
		return result;
	},
	/* -----------------------------------------------------------
	   add a description to http response code
	   ----------------------------------------------------------- */
	statusDesc: function(code) {
		if (code) 
			return code+" - "+http.STATUS_CODES[code];
		else
			return 'unknown';
	},
	/* -----------------------------------------------------------
	   the category for a given http response code
	   ----------------------------------------------------------- */
	statusCategory: function(code) {
		if (code >= 200 && code < 300)  
			return 'success';
		else if (code >= 300 && code < 400)  
			return 'warning';
		else
			return 'error';
	}
}

module.exports = helpers;
