'use strict';

var util = require('util');
var admin = require("firebase-admin");
var excel = require('xlsjs');

var serviceAccount = require("../keys/serviceKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://library-007.firebaseio.com"
});

var database = admin.database();

module.exports = {
  login: login,
  getHomeContents: getContents,
  getCourses: getCourses,
  bookMyBooks: bookMyBooks,
  MyTransactionCount: MyTransactionCount,
  getMyBookings: getMyBookings,
  renewOrreturn: renewOrreturn,
  getNonRenewables: getNonRenewables,
  getRecents: getRecents,
};
//curl -d '{"admission_number":"cs-2015-25","password":"190595"}}' -H "Content-Type: application/json" -X GET http://192.168.0.19:10010/login

/*var date1 = new Date("12/12/2010");
var date2 = new Date("12/07/2010");
var timeDiff = Math.abs(date2.getTime() - date1.getTime());
var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
console.log(diffDays)*/

function getRecents(req, res){
	var getOb = req.swagger.params.attributes.value;
    var course = getOb.course; 
    var dept = getOb.dept;
    var flag = getOb.flag;
    var data1 = {};
    var data2 = {};
    var data3 = {};
    var path = 'SemBooks/'+course+'/'+dept+'/S1'
    var json = {};
  	database.ref(path).once('value').then(function(snap){
  		var snapshot = snap.val()
  	 	var keys = Object.keys(snapshot)

  	 	for(var m in keys){
  	 		var upload = snapshot[keys[m]]['upload_date']
  	 		var d1 = new Date(upload)
  	 		var d2 = new Date();
  	 		var timeDiff = Math.abs(d1.getTime() - d2.getTime());
			var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
		
			if(diffDays == 1 ){
				data1[keys[m]] = snapshot[keys[m]]
				json[upload] = data1;
			}
			else if(diffDays == 2 ){
				data2[keys[m]] = snapshot[keys[m]]
				json[upload] = data2;
			}
			else if(diffDays == 3 ){
				data3[keys[m]] = snapshot[keys[m]]
				json[upload] = data3;
			}

  	 	// console.log(data);
  	 }
  	 res.send({
  	 	fetch: 1,
  	 	data: json
  	 });
   	}).catch(function(error){
   		res.send({
   			fetch: 0,
   			message: 'Data fetch error'
   		})
   	})

}

function getNonRenewables(req, res){
	console.log('this')
	database.ref('NR-Books').once('value').then(function(snap){
		
		res.send({
			fetch: 1,
			data: snap.val()
		})
	}).catch(function(err){
		res.send({
			fetch: 0,
			message: err
		})
	})
}
function renewOrreturn(req, res){
    var getOb = req.swagger.params.attributes.value;
    var renew_return = getOb.renew_return;
    var admission_no = getOb.admission_number
    var txn_id = getOb.txn_id
    var serial_no = getOb.serial_no
    var dept = getOb.dept
    var course = getOb.course
    var semester = getOb.semester
    var book_id = getOb.book_id
    var RN_NRN = getOb.RN_NRN
    var updateJson = {}
    var path
    if(renew_return == 1){ // for renewal
      var date = new Date();
      var startDate = parseMyDate(date);
      date.setDate(date.getDate()+7)
      var finalDate = parseMyDate(date)
      updateJson = {
        pick_date: startDate,
        last_date: finalDate,
      }
      database.ref('MyTransactions/'+admission_no+'/'+txn_id+'/MyBooks/'+serial_no).update(updateJson).then(function(snap){
        res.send({
          update: 1,
          startDate: startDate,
          finalDate: finalDate
        })
      }).catch(function(err){
        res.send({
          update: 0,
          err: err,
        })
      })
    }
    else{
        database.ref('MyTransactions/'+admission_no+'/'+txn_id+'/MyBooks/'+serial_no).update({return_status: true}).then(function(snap){
        	if(RN_NRN == 1)
        		path = 'SemBooks/'+course+'/'+dept+'/'+semester+'/'+book_id
        	else
        		path = 'NR-Books/' + book_id
        	console.log(path)
          database.ref(path).once('value').then(function(snap){
            var snapshot = snap.val()
            updateJson = {
              available: snapshot['available'] + 1
            }
            database.ref(path).update(updateJson).then(function(snap){
              res.send({
                update: 2
              })
              updateMyTrasactionCount(admission_no);
            }).catch(function(err){
        res.send({
          update: 0,
          err: err,
        })
      })
          }).catch(function(err){
        res.send({
          update: 0,
          err: err,
        })
      })
       }).catch(function(err){
        res.send({
          update: 0,
          err: err,
        })
      })
    }
}

function updateMyTrasactionCount(admission_no){

  database.ref('MyTransactionCount/'+admission_no).once('value').then(function(snap){
    var snapshot = snap.val();
    var count = snapshot['book'];
    count--;
    snapshot['book'] = count;
    if(count == 0){
      snapshot['book'] = null
    }
    database.ref('MyTransactionCount/'+admission_no).update(snapshot).then(function(snap){
      
    })
  })
}

function getMyBookings(req, res){
    var getOb = req.swagger.params.attributes.value;
    var admission_number = getOb.admission_no;
    database.ref('MyTransactions/'+admission_number).once('value').then(function(snap){
      var snapshot = snap.val()
      if(snapshot == null){
        res.send({
          fetch: 0,
          err: 'No data'
        })
      }
      else
        res.send({
          fetch: 1,
          data: snapshot
        })
    }).catch(function(err){
      res.send({
          fetch: 0,
          err: err
        })
    })

}
 
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
          res.send({
            proceed: true,
            remaining: 0
          })
      }//

      else{
        var remaining = snapshot['book'];
        if(remaining == 0){//
          res.send({
            proceed: false,
            remaining: 0
          })
        }//

        else{////
        res.send({
            proceed: true,
            remaining: remaining
          })
      }/////
      }///


     })

}
var response_to;
function bookMyBooks(req, res){
    var getOb = req.swagger.params.attributes.value;
    console.log(getOb)
    response_to = res;
    var admission_number = getOb.admission_no;
    var txn_id = 'TXN' + Date.now();
    var json = {}
    var date = new Date();
    var startDate = parseMyDate(date);
    date.setDate(date.getDate()+7)
    var finalDate = parseMyDate(date)
    
    var processObj = getOb.my_books
   
    var concatDateandReturn = {}
    var finalCount = 0;
    concatDateandReturn = getOb.my_books
    var keys = Object.keys(concatDateandReturn)
    var serial = 150;
    var proJson = {}
    var changeCount = {}
    console.log(concatDateandReturn)
    for(var m in keys){
      concatDateandReturn[keys[m]]['pick_date'] = startDate;
      concatDateandReturn[keys[m]]['last_date'] = finalDate;
      concatDateandReturn[keys[m]]['return_status'] = false;
      var cc = concatDateandReturn[keys[m]]['booked_no'];
      var start = 0;
      while(start<cc){
        concatDateandReturn[keys[m]]['booked_no'] = 1;
        concatDateandReturn[keys[m]]['book_id'] = keys[m];
        proJson['SL-' + serial++] = concatDateandReturn[keys[m]];
        start++
        finalCount++;
        changeCount[keys[m]] = start
        // decrementBooks(getOb,keys[m]);

      } 
      if(m==keys.length-1){
      	console.log(changeCount)
      	decrementBooks(getOb,changeCount)
      }

    }
    json['MyTransactions/'+admission_number+'/'+txn_id+'/MyBooks/' ] = proJson
    

    database.ref().update(json).then(function(snap){
        // decrementBooks(getOb);
        updateMyCount(admission_number,finalCount);
    }).catch(function(err){
      res.send({
        update: 0,
        err: err
      })
    })

}
function updateMyCount(admission_number,finalCount){
  
  var json = {}
  database.ref('MyTransactionCount/'+admission_number).once('value').then(function(snap){
     var booked = 0;
     
    var snapshot = snap.val()
    if(snapshot == null){
        booked = finalCount;
    }
    else{
         booked = snapshot['book'] + finalCount 
    }

     json['MyTransactionCount/'+admission_number] = {
        book: booked
       } 

       database.ref().update(json).then(function(gotData){
       		 response_to.send({
        	  update: 1
      		  })
       })

  })
}

function decrementBooks(getOb,keyValue){
  
  var course = getOb.course
  var dept = getOb.dept
  var semester = getOb.semester
  var getMyBooks = getOb.my_books
  var RN_NRN = getOb.RN_NRN
  // var keys = Object.keys(getMyBooks);
  var decrementJson = {}
  var path;
  if(RN_NRN == 1)
   path = 'SemBooks/'+ course + '/' + dept + '/' + semester
  else
  	path = 'NR-Books'

  database.ref(path).once('value').then(function(snap){
  var snapshot = snap.val();
  var secondKey = Object.keys(snapshot);
  var keys = Object.keys(keyValue)

    for(var m in keys){
    	var bal = keyValue[keys[m]];
        for(var n in secondKey){
          if(keys[m] == secondKey[n]){
              console.log('Found '+bal)
              bal = snapshot[secondKey[n]].available - bal
              // bal = bal - increment
              console.log('Found-2 '+bal)
              decrementJson[keys[m]+'/available'] = bal;  
          }
	          if(m==keys.length-1){

	        	database.ref(path).update(decrementJson).then(function(status){

	       		 })
	        }
        }
            
    }
   		/*for(var m in keys){
   			decrementJson[path+'/'+keys[m]+'/available'] = 
   		}*/

        
    
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
    var parsedDate = mm+'/'+dd+'/'+yyyy;
    return parsedDate
}

// ----------------------------------------------neglect the code below(from line 486 to 704)-------------------------------------------------------------
// updateFirebase()
/*var snapshot = {};
function updateFirebase(){
 
 // database.ref('NR-Books').update(json).then(function(snap){

 //  }).catch(function(err){
 //  	console.log(err)
 //  });

// database.ref('SemBooks').update(snapshot).then(function(snap){
//   }).catch(function(err){
//   	console.log(err)
//   });
  
}

// database.ref('SemBooks').once('value').then(function(snap){
//     snapshot = snap.val();
//     doIterations();
//   })


// adminFunctions()
function adminFunctions(){
	var workbook = excel.readFile( __dirname+'/sample_book.xls');
 var sheet_name_list = workbook.SheetNames;
 var xlData = excel.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
 var keys = Object.keys(xlData);
 var json = {}
 // console.log(xlData)
   // for(var m in keys)
    for(var m = 0;m < 20; m++)
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

    // }
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
      var date = new Date();
    
      if(random2 == 1)
    	date.setDate(date.getDate()-0)
      else if(random2 == 2)
      	    	date.setDate(date.getDate()-1)
      else if(random2 == 3)
      	    	date.setDate(date.getDate()-2)
      else if(random2 == 4)	
      	    	date.setDate(date.getDate()-3)

        json['BK-NR'+xlData[keys[m]]['book_no']] = {
          book_name: xlData[keys[m]].book_name,
          author:xlData[keys[m]].author,
          // semester: xlData[keys[m]].semester,
          published: xlData[keys[m]].published,
          volume: xlData[keys[m]].volume,
          available: xlData[keys[m]].available,
          upload_date: parseMyDate(date),
          faculty: 'nil',
          // subject: xlData[keys[m]].subject,
          renewable: false,
        }
        
   }
}


// if any changes to all books 
function doIterations(){
  var teachers = [];
  teachers.push('DR.SUKUMARAN NAIR C G')	
  teachers.push('BESHIBA WILSON')
  teachers.push('PRIYA SEKHAR S')
  teachers.push('RENETHA J B')
  teachers.push('CHITHRA A.S')
  teachers.push('ASHA A S')
  // teachers.push('SONIA GEORGE')
  teachers.push('LEKSHMI CHANDRAN')
  teachers.push('ASHITHA.S.S')
  teachers.push('CHRISTY JOJY')
  teachers.push('AMBILY JANE')
  teachers.push('DIVYA CHRISTOPHER')
  teachers.push('ANJANA THAMPY S')
  teachers.push('SHEEJA BEEVI S')
  teachers.push('CHITHIRA RAKSHMI G')
  teachers.push('SARANYA B S')
  teachers.push('NISHA O.S')
  teachers.push('SMITHA J C')
  teachers.push('SUMI MARIA ABRAHAM')
  teachers.push('PREETHI W')
  teachers.push('GREESHMA R G')
  teachers.push('ASHA S')
  var count = 0;
  var keys = Object.keys(snapshot); // btech
  for(var m in keys){
    var keys2 = Object.keys(snapshot[keys[m]]);  // cs
    for(var n in keys2){
      var keys3 = Object.keys(snapshot[keys[m]][keys2[n]]); //s1
      for(var o in keys3){
        var keys4 = Object.keys(snapshot[keys[m]][keys2[n]][keys3[o]]);
        for(var p in keys4){
          // snapshot[keys[m]][keys2[n]][keys3[o]][keys4[p]]['renewable'] = true;
          var date = new Date();
          console.log(keys[m]+'/'+keys2[n]+'/'+keys3[o]+'/'+keys4[p])
          if(count<3){
          	date.setDate(date.getDate()-count)
            snapshot[keys[m]][keys2[n]][keys3[o]][keys4[p]]['upload_date'] =  parseMyDate(date)
             // snapshot[keys[m]][keys2[n]][keys3[o]][keys4[p]]['faculty'] = teachers[count]
            count++;
		  }
		  else{
		  	count = 0;
		  	date.setDate(date.getDate()-count)
			snapshot[keys[m]][keys2[n]][keys3[o]][keys4[p]]['upload_date'] =  parseMyDate(date)
			// snapshot[keys[m]][keys2[n]][keys3[o]][keys4[p]]['faculty'] = teachers[count]
		  }
        }
      }
    }
  }
  updateFirebase()
}*/
