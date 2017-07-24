var express = require('express');
var router = express.Router();
var bwlapi = require('./bwlapi');

/* ----------------------------------
   showing some info during routing
   ---------------------------------- */
var loginfo = function (req, res, next) {
  var method = req.method;
  console.log('INFO('+method+') ------------------------------');
  console.log('INFO('+method+') host: '+req.hostname+' url: '+req.originalUrl+' base-url: '+req.baseUrl);
  console.log('INFO('+method+') params: '+JSON.stringify(req.params)); // parameters from route such as /test/<id>
  console.log('INFO('+method+') query: '+JSON.stringify(req.query)); // string parameters such as ?id=123
  console.log('INFO('+method+') body: '+JSON.stringify(req.body)); // post arguments
  next();
}
router.use(loginfo);

/* ==================================
   BWL response handle function
   ================================== */
var handleBWLResponse = function (resData) {
//  if (resData.status >= 200 && resData.status < 300) {}
  if ('content-type' in resData.headers) {
	var ct = resData.headers['content-type'];
	if (/^application\/json/.test(ct)) {
		try{
			resData.data = JSON.parse(resData.data);   // convert buffer data to json
			resData.contentType = "JSON";
		} catch(e){
			//JSON parse error: e
			resData.data = resData.data.toString('utf8');
			resData.contentType = "error-JSON";
		}
	} else if (/^text/.test(ct)) {
		resData.data = resData.data.toString('utf8');
		resData.contentType = "Text";
	} else if (/^image/.test(ct)) {
		resData.data = resData.data.toString('base64');
		resData.contentType = "Image";
	} else if (/^application\/pdf/.test(ct)) {
		resData.contentType = "PDF";
		resData.data = resData.data.toString('base64');
	} else {
		resData.data = resData.data.toString('utf8');
		resData.contentType = "other";
	}
  } else if ('content-length' in resData.headers && resData.headers['content-length'] == 0) {
    resData.data = "No content returned";
    resData.contentType = "empty";
  } else {
		try{
			resData.data = JSON.parse(resData.data);
			resData.contentType = "JSON";    // might be JSON or text
		} catch(e){
			resData.data = resData.data.toString('utf8');
			resData.contentType = "unknown";
		}
  }
  return resData;
};
/* ---------------------------------------------------------------
   Input: _reqData with fields: account, login, password
   determinEndpoint will add the field host to _reqData
   and then call handle()
   --------------------------------------------------------------- */
var determineEndpoint = function(req,res,_reqData, handle) {
	var login = _reqData.login;
	var password = _reqData.password;
	var account = _reqData.account;

	_reqData.host = 'www.blueworkslive.com'; // this is the host if we don't know better
	if (!account) {
		console.log("Endpoint: no account given");
		handle();
	} else if (req.session.endpoint && req.session.endpoint.account == account) {// cashed
		console.log("Endpoint: cashed endpoint for account "+account+" is "+req.session.endpoint.host);
		_reqData.host = req.session.endpoint.host;
		handle();
	} else {
		var reqData = {
			'method': 'get',
			'host': 'www.blueworkslive.com',
			'path': '/api/Auth?version=20110917&account='+encodeURI(account),
			'login': login,
			'password': password
		};
		bwlapi.callAPI(req, res, reqData, function (req, res, resData) {
			console.log("Endpoint: determine endpoint for account "+account);
			if (resData.status >= 200 && resData.status < 300) {
				var dataObject = JSON.parse(resData.data);
				if ('serviceProviderAddress' in dataObject) {
					var newendpoint = dataObject.serviceProviderAddress.replace('https://','');
					console.log("Endpoint: for account "+account+" is "+newendpoint);
					_reqData.host = newendpoint;
					// cash for next time
					req.session.endpoint = {'account': account,'host': newendpoint};
				}
			}
			handle();
		});
	}
}

/* ==================================
   Pages
   ================================== */
router.get('/', function(req, res, next) {
	if (!req.session.userdat || !req.session.userdat.authenticated) {
		res.redirect('/welcome');
		return;
	}
	res.redirect('/process');
});

router.get('/welcome', function(req, res, next) {
	res.render('welcome', {title: 'BWL Template Application', userdat: req.session.userdat});
});

router.post('/logout', function(req, res, next) {
	req.session.destroy();
	res.redirect('/');
});
router.post('/login', function(req, res, next) {
	req.session.userdat = {
		'login': req.body.login,
		'password': req.body.password,
		'authenticated': false,
		'account': ''
	}
	var reqData = {
		'method': 'get',
		'host': 'www.blueworkslive.com',
		'path': '/api/Auth?version=20091212',
		'login': req.body.login,
		'password': req.body.password
	}
	console.log("login: "+req.body.login);
	bwlapi.callAPI(req, res, reqData, function (req, res, resData) {
		console.log("BWL response received for auth request");
		handleBWLResponse(resData);
		
		if (resData.status == 200) {
			// store auth result in general session data
			console.log(JSON.stringify(resData.data));
			if (resData.data.result == "authenticated" || resData.data.result == "multiaccount") {
				req.session.userdat.authenticated = true;
				if (resData.data.result == "multiaccount") {
					req.session.userdat.accounts = resData.data.accounts;
				} else {
					req.session.userdat.account = resData.data.accounts[0];
				}
				req.session.authentication = resData.data.result;
				res.redirect('/process');
				return;
			}
			req.session.userdat.error = 'Blueworks Live authentication failed for user '+req.session.userdat.login;
		} else {
			req.session.userdat.error = 'Blueworks Live authentication failed with code '+resData.status;
		}
		res.redirect('/welcome');
/*		res.render('accountinfo', {
			title: 'BWL Account Information',
			status: resData.status,
			user: req.body.login,
			dat: resData.data
		}); */
	});
});

router.get('/process', function(req, res, next) {
	if (!req.session.userdat || !req.session.userdat.authenticated) {
		res.redirect('/welcome');
		return;
	}
	if (!!req.query.account) {
		req.session.userdat.account = req.query.account;
	}
	if (req.session.userdat.account != '' && !!req.query.id) {
		// get process data
		var reqData = {
			'method': 'get',
			'host': 'www.blueworkslive.com',
			'path': '/scr/api/ProcessData?account='+req.session.userdat.account+'&processId='+req.query.id,
			'login': req.session.userdat.login,
			'password': req.session.userdat.password,
			'account': req.session.userdat.account
		}
		reqData.path='/scr/api/PrintDiagram?account='+req.session.userdat.account+'&processId='+req.query.id;
		determineEndpoint(req,res,reqData,function() {
			bwlapi.callAPI(req, res, reqData, function (req, res, resData) {
				console.log("BWL response received for request "+reqData.path);
				handleBWLResponse(resData);
				//res.render('processdetails', {title: 'BWL Template Application', userdat: req.session.userdat, status: resData.status, data: resData.data});
				res.render('processpdf', {title: 'BWL Template Application', userdat: req.session.userdat, status: resData.status, data: resData.data});
			});
		});
	} else if (req.session.userdat.account != '') {
		// get process list
		var reqData = {
			'method': 'get',
			'host': 'www.blueworkslive.com',
			'path': '/scr/api/LibraryArtifact?account='+req.session.userdat.account+'&returnFields=NAME,ID&activeState=ACTIVE&publishedState=PUBLISHED&type=BLUEPRINT',
			'login': req.session.userdat.login,
			'password': req.session.userdat.password,
			'account': req.session.userdat.account
		}
		determineEndpoint(req,res,reqData,function() {
			bwlapi.callAPI(req, res, reqData, function (req, res, resData) {
				console.log("BWL response received for request "+reqData.path);
				handleBWLResponse(resData);
				res.render('processlist', {title: 'BWL Template Application', userdat: req.session.userdat, status: resData.status, data: resData.data});
			});
		});
	} else {
		res.render('processlist', {title: 'BWL Template Application', userdat: req.session.userdat});
	}
});

module.exports = router;
