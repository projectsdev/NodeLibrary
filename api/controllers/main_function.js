'use strict';
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var util = require('util');
var admin = require("firebase-admin");
var mysql = require('mysql');
var excel = require('xlsjs');

var serviceAccount = require("../keys/serviceKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://library-007.firebaseio.com"
});
var connection = mysql.createConnection({
  
  host: 'localhost',
  user: 'projectsdev',
  password:'projectsdev',
  database: 'Library',
  
});
var database = admin.database();

module.exports = {
  login: login,
  getBooks: getBooks,
  getRecent: getRecent,
};
//curl -d '{"admission_number":"cs-2015-25","password":"190595"}}' -H "Content-Type: application/json" -X GET http://192.168.0.19:10010/login

 
function login(req, res) {

  	var getOb = req.swagger.params.attributes.value;
    var admission_number = getOb.admission_number;
    var password = getOb.password;
    var return_json = {};

    database.ref('/Students/' + admission_number).once('value').then(function(snapshot){
      var details = snapshot.val();
      var key = details['password']; // most probably dob
      if(password == key){
        details['password'] = null;
        return_json = {
          success: true,
          details: details,
        }
        res.send(return_json);
      }
      else{
        return_json = {
        success: false,
        reason: 'Password incorrect',
      }
      res.send(return_json)
      }
    }).catch(function(err){
      return_json = {
        success: false,
        reason: 'Invalid Admission Number',
      }
      res.send(return_json)
    })
}


function getBooks(req, res){


}

function getRecent(req, res){


}

