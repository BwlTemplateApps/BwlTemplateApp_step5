var https = require("https");
/* --------------------------------------
   Examples for path (GET,POST,PUT,DELETE):
   Account activity
   G--- /scr/api/activity
   User management
   G--- /api/Auth
   G--- /scr/api/UserList
   G--- /scr/api/Avatar
   G-PD /scr/api/provision/user
   G-PD /scr/api/ManageGroup
   ...
   -------------------------------------- */
function callAPI(req,res,reqData,handleResponse){
  if (!reqData.headers) reqData.headers = {};
  if (reqData.login && reqData.password)
    reqData.headers.Authorization = 'Basic ' + new Buffer(reqData.login+':'+reqData.password).toString('base64');
  var options = {
    'host': reqData.host,
    'path': reqData.path,
    'method': reqData.method,
    'headers': reqData.headers
  };
  var bwlResData = {};
  console.log('BwlApiCall: Request '+options.method+' https://'+options.host+options.path);
  var bwlRequest = https.request(options, function(bwlResponse) {
	console.log("BwlApiCall: Response status="+bwlResponse.statusCode);
	bwlResData.status = bwlResponse.statusCode;   // statusCode >= 200 and < 300 is OK
	bwlResData.headers = bwlResponse.headers;
	var bufferData = [];
	bwlResponse.on('data', function(data) {
	  bufferData.push(data);
      console.info('BwlApiCall: Response data received');
	});
	bwlResponse.on('end', function() {
      console.info('BwlApiCall: completed, calling callback');
	  bwlResData.data = Buffer.concat(bufferData);
	  handleResponse(req, res, bwlResData);
    });
  });
/*  if ((reqData.method == "post" || reqData.method == "put") && reqData.senddata) {
    console.log(reqData.method+' sending data: '+reqData.senddata);
    bwlRequest.write(reqData.senddata);
  } */
  bwlRequest.end();
  bwlRequest.on('error', function(e){
    console.error('BwlApiCall: REQUEST-ERROR '+e);
  });
}

exports.callAPI=callAPI;
