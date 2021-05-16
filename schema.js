const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID;
var msgs = require('./messages');
var dbCon = null;
 var counter = 0;
MongoClient.connect(msgs.dbUrl, function (err, client) {
    if (err) throw err
    dbCon = client.db(msgs.dbName);
    console.log(msgs.dbConnectinStatus);

    dbCon.dropDatabase();
    dbCon.createCollection('sellers');
    console.log('sellers collection created')
    dbCon.createCollection('users');
    console.log('users collection created')
    dbCon.createCollection('appointments');
    console.log('appointments collection created')
   

    var sellers = [
        {
            "_id": new ObjectID(),
            "name" : "xyz pvt ltd",
            "slots" : [ 
                {
                    "slotDate" : new Date("2021-05-17T00:00:00.000Z"),
                    "slotTimings" : [ 
                        {
                            id: new ObjectID(),
                            "slotStart" : "12:30pm",
                            "slotEnd" : "04:30pm",
                            "isbooked" : 0,
                            "numberOfAppointments" : 0,
                            "maxAppointmentsAllowed" : 0,
                            "isActive" : 1
                        }, 
                        {
                            id: new ObjectID(),
                            "slotStart" : "04:30pm",
                            "slotEnd" : "05:30pm",
                            "isbooked" : 0,
                            "numberOfAppointments" : 0,
                            "maxAppointmentsAllowed" : 0,
                            "isActive" : 1
                        }
                    ]
                }
            ]
        },
        {
            "_id": new ObjectID(),
            "name" : "abc pvt ltd",
            "slots" : [ 
                {
                    "slotDate" : new Date("2021-05-17T00:00:00.000Z"),
                    "slotTimings" : [ 
                        {
                            id: new ObjectID(),
                            "slotStart" : "11:30pm",
                            "slotEnd" : "01:30pm",
                            "isbooked" : 0,
                            "numberOfAppointments" : 0,
                            "maxAppointmentsAllowed" : 0,
                            "isActive" : 1
                        }, 
                        {
                            id: new ObjectID(),
                            "slotStart" : "01:30pm",
                            "slotEnd" : "03:30pm",
                            "isbooked" : 0,
                            "numberOfAppointments" : 0,
                            "maxAppointmentsAllowed" : 0,
                            "isActive" : 1
                        }
                    ]
                }
            ]
        }
    ];

    var users = 
    [{
        "_id": new ObjectID(),
        "nameOfUser" : "John Doe",
        "email" : "john.doe@someuser.com",
        "appointmentBooked" : []
    },
    {
        "_id": new ObjectID(),
        "nameOfUser" : "Ahmad Sheikh",
        "email" : "ahmad.sheikh@someuser1.com",
        "appointmentBooked" : []
    }];

    var appointments = {}
    
    var sellers =  dbCon.collection('sellers').insertMany(sellers).then((res) => {
        console.log('sellers collection initialized');
    }).catch(err =>{
        console.log("error initializing sellers collection")
    });
    var users =  dbCon.collection('users').insertMany(users).then((res)=>{
        console.log('users collection initialized');
    }).catch(err => {
        console.log("error initializing users collection")
    });

    Promise.all([sellers,users]).then(function(err,res){
        process.exit(0);
    })
});
    


