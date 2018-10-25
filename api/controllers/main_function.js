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
  getHomeContents: getContents,
  getCourses: getCourses,
  bookMyBooks: bookMyBooks,
  MyTransactionCount: MyTransactionCount,
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


function getContents(req, res){
    
    var getOb = req.swagger.params.attributes.value;
    var course = getOb.course;
    var dept = getOb.dept;
    var flag = getOb.flag;
    var data = {};
    var path;
    if(flag == 0 ){
      path = 'SemBooks/'+course+'/'+dept+'/'
    }
    else{
      var sem = getOb.semester;
      path = 'SemBooks/'+course+'/'+dept+'/'+sem
    }
    database.ref(path).once('value').then(function(snap){
        data = snap.val();
        if(data == null)
          res.send({
          fetch: 0,
          err: 'No Data'
        });
        
        else
        res.send({
          fetch: 1,
          data: data
        });
    }).catch(function(err){
        res.send({
          fetch: 0,
          error: err
        });
    })

}
// getCourses(0,0)
function getCourses(req, res){

  database.ref('Courses').once('value').then(function(snap){
    var snapshot = snap.val();
    res.send({
      fetch: 1,
      snapshot: snapshot
    })
   
  }).catch(function(error){
    res.send({
      fetch: 0,
      err: err
    })
  })
}

function MyTransactionCount(req, res){

     var getOb = req.swagger.params.attributes.value;
     var admission_number = getOb.admission_no;
     database.ref('MyTransactionCount/'+admission_number).once('value').then(function(snap){
      var snapshot = snap.val()
     
      if(snapshot == null){
              console.log('-----------------1')

          res.send({
            proceed: true,
            remaining: 0
          })
      }//

      else{
        var remaining = snapshot['book'];
        if(remaining == 0){//
                console.log('-----------------2')

          res.send({
            proceed: false,
            remaining: 0
          })
        }//

        else{////
          console.log('-----------3')
        res.send({
            proceed: true,
            remaining: remaining
          })
      }/////
      }///


     })

}

function bookMyBooks(req, res){
    var getOb = req.swagger.params.attributes.value;
    console.log(getOb)
    var admission_number = getOb.admission_no;
    var txn_id = 'TXN' + Date.now();
    var json = {}
    var date = new Date();
    var startDate = parseMyDate(date);
    
    date.setDate(date.getDate()+7)
    var finalDate = parseMyDate(date)
    
    var processObj = getOb.my_books
   
    var concatDateandReturn = {}
    concatDateandReturn = getOb.my_books
    var keys = Object.keys(concatDateandReturn)
    for(var m in keys){
      concatDateandReturn[keys[m]]['pick_date'] = startDate;
      concatDateandReturn[keys[m]]['last_date'] = startDate;
      concatDateandReturn[keys[m]]['return_status'] = false;

    }
    json['MyTransactions/'+admission_number+'/'+txn_id ] = {
      /*pick_date: startDate,
      last_date: finalDate,
      return: false,*/
      MyBooks: concatDateandReturn
    }
    

    database.ref().update(json).then(function(snap){
        res.send({
          update: 1
        })
        decrementBooks(getOb);
        updateMyCount(getOb);
    }).catch(function(err){
      res.send({
        update: 0,
        err: err
      })
    })

}
function updateMyCount(getOb){
  var admission_number = getOb.admission_no
  var json = {}
  database.ref('MyTransactionCount/'+admission_number).once('value').then(function(snap){
     var booked = 0;
     var count = 0;
     var iterateJson = getOb.my_books
     var keys = Object.keys(iterateJson);
      for(var m in keys){
        count+= iterateJson[keys[m]].booked_no;
      }
    var snapshot = snap.val()
    if(snapshot == null){
        booked = count;
    }
    else{
         booked = snapshot['book'] + count 
    }

     json['MyTransactionCount/'+admission_number] = {
        book: booked
       } 

       database.ref().update(json).then(function(gotData){

       })

  })
}

function decrementBooks(getOb){
  
  var course = getOb.course
  var dept = getOb.dept
  var semester = getOb.semester
  var getMyBooks = getOb.my_books
  var keys = Object.keys(getMyBooks);
  var decrementJson = {}
  var path = 'SemBooks/'+ course + '/' + dept + '/' + semester
  database.ref(path).once('value').then(function(snap){
    var snapshot = snap.val();
    var secondKey = Object.keys(snapshot);
    for(var m in keys){
        for(var n in secondKey){
          if(keys[m] == secondKey[n]){
              console.log('Found '+ keys[m])
              var bal = snapshot[keys[m]].available;
              bal = bal - getMyBooks[keys[m]].booked_no
              decrementJson[path+'/'+keys[m]+'/available'] = bal;  
          }
        }
    }
    database.ref().update(decrementJson).then(function(status){
      console.log('Finished')
    })
  })

}

function parseMyDate(today){

    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    if(dd<10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 
    var parsedDate = dd+'/'+mm+'/'+yyyy;
    return parsedDate
}

var workbook = excel.readFile( __dirname+'/sample_book.xls');
 var sheet_name_list = workbook.SheetNames;
 var xlData = excel.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
 var keys = Object.keys(xlData);
 var json = {}
   for(var m = 0; m<1000; m++)
   // for(var m in keys)
   {
    // console.log(xlData[keys[m]]["Admission_Number"])

   /* json[xlData[keys[m]]["Admission_Number"]] = {
      name: xlData[keys[m]].name,
      department: xlData[keys[m]].department,
      password:xlData[keys[m]].password,
      timestamp: new Date(),
      "Date-of-birth": xlData[keys[m]].dob,
      "year-of-joining": xlData[keys[m]].join_year,
       course: xlData[keys[m]].course,

    }*/
   var branch;
    var course;
    var random = Math.floor((Math.random() * 4) + 1); //random number between 1 and 4
    var random2 = Math.floor((Math.random() * 4) + 1);
    var renewable = false ;
      if(random==1){
        renewable = !renewable
        branch = 'B-TECH'
        if(random2 == 1){
          course = 'CS'
          
        } 
        if(random2 == 2){
          course = 'EC'
         
        }
        if(random2 == 3){
          course = 'EEE'
          
        }
        if(random2 == 4){
          course = 'ME'
         

        }
      }
      else if(random==2){
        renewable = !renewable
        branch = 'M-TECH'
        if(random2 == 1){
          course = 'CS'
         
        }
        if(random2 == 2){
          course = 'EC'
           

        }
        if(random2 == 3){
          course = 'EEE'
         
        }
        if(random2 == 4){
          course = 'ME'
          
        }
      }
      else if(random==3){
        renewable = !renewable
        branch = 'MBA'
        if(random2 == 1){
          course = 'FINANCE'
           

        }
        if(random2 == 2){
          course = 'MARKETING'
         
        }
        if(random2 == 3){
          course = 'IT'
          
        }
        if(random2 == 4){
          course = 'STRATEGY'
         
        }
      }
      else{
        renewable = !renewable
        branch = 'BBA'
        if(random2 == 1){
          course = 'FINANCE'
         
        }
        if(random2 == 2){
          course = 'MARKETING'
          
        }
        if(random2 == 3){
          course = 'HOTEL-MANAGEMENT'
         
        }
        if(random2 == 4){
          course = 'ACCOUNTING'
          
        }
      
      }
        json[branch+'/'+course+'/'+'BK-'+xlData[keys[m]]['book_no']] = {
          book_name: xlData[keys[m]].book_name,
          author:xlData[keys[m]].author,
          semester: 'S'+xlData[keys[m]].semester,
          published: xlData[keys[m]].published,
          volume: xlData[keys[m]].volume,
          available: xlData[keys[m]].available,
          renewable: renewable,
        }
        
   }
// updateFirebase()
function updateFirebase(){
  database.ref('/LibraryBooks/').update(json).then(function(snap){

});


}