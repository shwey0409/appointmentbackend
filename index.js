const express = require('express')
const app = express()
var cors = require('cors')
const port = 4000
var msgs = require('./messages');
var moment = require('moment');
var router = express.Router()
var dbCon = null;
var bodyParser = require('body-parser');  
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID;

//For Post and application/json request handling. Initialize app with body-parser
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
// app.use(function(req,res,next){
//   res.header("Access-Control-Allow-Origin","*");
//   res.header("Access-Control-Allow-Headers","")

// })
MongoClient.connect(msgs.dbUrl, function (err, client) {
  if (err) throw err
  dbCon = client.db(msgs.dbName);
  console.log(msgs.dbConnectinStatus);
});
//use it in app
router.get('/searchSeller',function(req,res){
    var sellers = [];
    dbCon.collection('sellers').find({}).toArray(function (err, result) {
        res.json(result);
    })
});
//use it in app
router.get('/searchSeller/:query', function (req, res) {
    if(req.params.query.trim() == "" || req.params.query == undefined){
      res.json([]);
    }else{
      dbCon.collection('sellers').find({ name: new RegExp(req.params.query, "i")})
      .toArray(function (err, result) {
          for(var i=0;i<result.length;i++){
            var slots = [];
            for(var j=0;j < result[i].slots.length;j++){
              result[i].slots[j].slotDate = moment(result[i].slots[j].slotDate).format("DD-MM-YYYY")
              // console.log(result[i].slots[j].slotTimings);
              result[i].slots[j].slotTimings.map(slotTiming => {
                slots.push({
                  slotDate: result[i].slots[j].slotDate,
                  id: slotTiming.id,
                  slotStart: slotTiming.slotStart,
                  slotEnd: slotTiming.slotEnd,
                  isbooked: slotTiming.isbooked,
                  numberOfAppointments: slotTiming.numberOfAppointments,
                  maxAppointmentsAllowed: slotTiming.maxAppointmentsAllowed,
                  isActive: slotTiming.isActive
                })
    
              })
              // console.log(slots);
              // console.log("************")
            }
            // console.log(slots);
            result[i].slots = slots;
          }
          res.json(result);
      })
    }
});
// use it in app
router.get('/bookAppointment/:slotId/:sellerId/:doa/:userId', function(req,res){
    slotId = req.params.slotId; //slotid
    sellerId = req.params.sellerId; //sellerid
    dateOfAppointment = req.params.doa; //data of appointment
    userId = req.params.userId;

    //creating the appointment object
    var appointmentObj = {
      "sellerId": new ObjectID(sellerId), //converting the seller id string to object id
      "dateOfAppointment": new Date(dateOfAppointment),
      "appointmentId": new ObjectID(slotId),
      "userId": new ObjectID(userId),
      "status": "pending"
    }

    dbCon.collection('appointments').insertOne(appointmentObj,function(err,doc){
      if(err) return res.status(200).json({'msg':msgs.errorBookingAppointment,'status': false})
      dbCon.collection('users').update({_id: new ObjectID(userId)},
      { $push:{ 
                "appointmentBooked": {$each: [doc.insertedId]}  //pushing the object to appointment Booked array
              }
      });
      res.status(200).json({'msg': msgs.successBookingAppointment + ". Your reference id is: " + doc.insertedId,'status': true})
    })
    
});
// use in web app
router.get('/manageSlots/addSlots/:sellerId/:slotDate/:startTime/:endTime',function(req,res){
  
      var slotDate = new Date(req.params.slotDate);
      var slotsList = [
        {
          "id" : new ObjectID(),
          "slotStart" : req.params.startTime,
          "slotEnd" : req.params.endTime,
          "isbooked" : 0.0,
          "numberOfAppointments" : 0,
          "maxAppointmentsAllowed" : 0,
          "isActive" : 1
        }
      ];

      var slotsObj = {    // combing the objects and tagging with the corresponding date
        "slotDate": slotDate,
        "slotTimings": slotsList
      };


      dbCon.collection('sellers').update({_id: new ObjectID(req.params.sellerId)},
      { $push:{ 
                "slots": {$each: [slotsObj]}    //pushing to the slots array 
              }
      },function(err,doc){
        if(err) return res.status(200).json({'msg': msgs.failManageSlots,'status': false});
        slotsList[0].slotDate = slotDate;
        res.status(200).json({'msg': msgs.successManageSlots,'status': true,'data': slotsList})
      });

});

// router.get('/manageSlots/deleteSlots/:sellerId/:slotId/:slotDate',function(req,res){

//       var sellerId = req.params.sellerId;
//       var slotId = req.params.slotId;
//       var slotDate = req.params.slotDate;
//       dbCon.collection('sellers').find({_id: new ObjectID(sellerId)}).toArray(function(err,results){
//           var doc = results[0];
//           var targetSubDoc = null;
//           doc.slots.map(slot => {
//             if(moment(slot.slotDate).format("YYYY-MM-DD") == slotDate){
//               targetDoc = 
//             }
//           });
//       });

//       dbCon.collection('sellers').update({_id: new ObjectID(sellerId)},
//       { $push:{ 
//                 "slots": {$each: [slotsObj]}    //pushing to the slots array 
//               }
//       },function(err,doc){
//         if(err) return res.status(200).json({'msg': msgs.failManageSlots,'status': false});
//         slotsList[0].slotDate = slotDate;
//         res.status(200).json({'msg': msgs.successManageSlots,'status': true,'data': slotsList})
//       });

// });
//use in web app
router.get('/fetchAppointments', function (req, res) {
    dbCon.collection('appointments').aggregate([
      { //stage 1 - user details
        $lookup:{
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user_details"
        }
      },
      { //stage 2 - intermediate details
        $lookup:{
          from: "sellers",
          localField: "sellerId",
          foreignField: "_id",
          as: "seller_details"
        }
      },
      { //stage 3 - seller details
        $lookup:{
          from: "sellers",
          localField: "appointmentId",
          foreignField: "slots.slotTimings.id",
          as: "appointment_details"
        }
      },
      { $unwind: "$appointment_details"}, //unwinding level 1 for slots
      { $unwind: "$appointment_details.slots"}, //unwinding level 2 for slotTimings
      { $unwind: "$appointment_details.slots.slotTimings"} //unwinding slotTimings for id inspection
    ]).toArray(function (err, appointments) {
          if(err) return res.status(200).json({'msg': msgs.errorFetchingAppointments,'status': false}); 
          var finalAppointmentsArray = [];
          appointments.map((appointment) => {
            if(appointment.appointmentId.equals(appointment.appointment_details.slots.slotTimings.id)){
              appointment.appointment_details.slots.slotDate = moment(appointment.appointment_details.slots.slotDate).format("YYYY-MM-DD");
              finalAppointmentsArray.push(appointment);
            }
          });
          res.json(finalAppointmentsArray);
    })
});

router.get('/fetchSellers',function(req,res){
  
  dbCon.collection('sellers').find({}).toArray(function (err, result) {
      for(var i=0;i<result.length;i++){
        var slots = [];
        for(var j=0;j < result[i].slots.length;j++){
          result[i].slots[j].slotDate = moment(result[i].slots[j].slotDate).format("DD-MM-YYYY")
          // console.log(result[i].slots[j].slotTimings);
          result[i].slots[j].slotTimings.map(slotTiming => {
            slots.push({
              slotDate: result[i].slots[j].slotDate,
              id: slotTiming.id,
              slotStart: slotTiming.slotStart,
              slotEnd: slotTiming.slotEnd,
              isbooked: slotTiming.isbooked,
              numberOfAppointments: slotTiming.numberOfAppointments,
              maxAppointmentsAllowed: slotTiming.maxAppointmentsAllowed,
              isActive: slotTiming.isActive
            })

          })
          // console.log(slots);
          // console.log("************")
        }
        // console.log(slots);
        result[i].slots = slots;
      }
      // console.log(result);
      res.json(result);
  })
})

router.get('/manageAppointments/:appointmentId/:status',function(req,res){
  var appointmentId = req.params.appointmentId;
  var status = req.params.status;
  if(status != 'approved' && status != 'rejected'){
    return res.status(200).json({msg: msgs.invalidStatusOfAppointment,'status': false})
  }
  dbCon.collection('appointments').update({_id: new ObjectID(appointmentId)},{
    $set: {"status": status}
  },function(err,doc){
    if(err) return res.status(200).json({'msg': msgs.failStatusUpdate,'status': false});
    return res.status(200).json({'msg': msgs.successStatusUpdate,'status': true});
  });
})

router.get('/fetchUsers',function(req,res){
  dbCon.collection('users').find({}).toArray(function(err,result){
    if(err) return res.status(200).json({msg: "no users exists","status": false});
    res.json(result);
  })
});

app.use('/', router)
app.listen(port, () => {
    console.log(`Appointment app listening at http://localhost:${port}`)
})