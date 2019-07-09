const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true}).then(
  () => {
    console.log("mongo opened:", process.env.MLAB_URI)    
  },
  err => {
    console.error("### error starting mongo:", process.env.MLAB_URI)
    console.error(err)
  }
);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
//app.use((req, res, next) => {
  //return next({status: 404, message: 'not found'})
//})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//All assignment Logic below
//Data Model
//User Schema
var usersSchema = mongoose.Schema({
  userName: {type: String, required:[true]},
  _id: String
});
var userModel = mongoose.model('userModel', usersSchema);

//Exercises Schema
var userExercises = mongoose.Schema({
  userId:String,
  description: String,
  duration: Number,
  date: Date
});
var userExerciseModel = mongoose.model('userExerciseModel', userExercises);

//User story 1: I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post('/api/exercise/new-user',function(req,res){
    console.log("New User creation request "+ req.body.username);
    var requested_user_name = req.body.username; 
    var generated_user_id;
    checkIfUserExists(requested_user_name, function(err, data){
        if(err) res.json(err)
        console.log('Did we find the user already?'+ data);
        if(data==null){
          //New user. Username available
          //Generate a short id
          generated_user_id = shortid.generate();
          saveNewUser(requested_user_name, generated_user_id, function(err,data){
            if(err) res.json(err);
            res.json({'username':requested_user_name, '_id':generated_user_id});  
          })          
        }else{
          res.send('username already taken');
        }
    })    
})

app.post('/api/exercise/add', function(req,res){
  console.log('Adding new exercise for userid '+ req.body.userId);
  var newexercise = new userExerciseModel;
  newexercise.userId = req.body.userId;
  newexercise.description = req.body.description;
  newexercise.duration = req.body.duration;
  newexercise.date = req.body.date;
  var userName;
  getUserName(newexercise.userId, function(err,data){
      if(err) res.json(err);
      if(data == null)
        res.send('unknown _id');
      else
        userName = data.userName;
    
      saveNewExercise(newexercise, function(err,data){
          if(err) res.send(err.message)
          res.json({"username":userName,"description":data.description,"duration":data.duration,"_id":data.userId,"date":data.date});
      })
  })
})

app.get('/api/exercise/log', function(req,res){
    console.log('Getting exercise for user '+ req.query.userid)
    var userid, from, to, limit;
    if(req.query.userid)
      userid = req.query.userid;    
    if(req.query.from)
      from = req.query.from;
    if(req.query.to)
      to = req.query.to;
    if(req.query.limit)
      limit = req.query.limit;
  
    var userName, exerciseCount;
    var searchCriteria = 
    {'userid':userid,'from':from,'to':to,'limit':limit};
  
    if(userid){
        getUserName(userid, function(err,data){
          if(err) res.json(err);
          if(data == null)
            res.send('unknown _id');
          else
            userName = data.userName;

          getExercise(searchCriteria, function(err,data){
              if(err) res.send(err.message)
              if(data){
                console.log(data);
                exerciseCount = data.length;
              }else{
                exerciseCount = 0;
              }
            console.log('No. of exercises we have '+ exerciseCount);
              res.json({"username":userName,"exercise":data, "totalCount":exerciseCount});
          })
      })
    }else{
      res.send('Unknown User ID');
    }
})

//DB methods
var checkIfUserExists = function(user_name, done) {
  console.log("Finding User "+ user_name);
  userModel.findOne({userName:user_name}, (err, data) => {
      if(err) {
         done(err); 
      }
      done(null, data);
    });
}

var getUserName = function(user_id, done){
  console.log("Finding User "+ user_id);
  userModel.findOne({_id:user_id}, (err, data) => {
      if(err) {
         done(err); 
      }
      done(null, data);
    });
}
var saveNewUser = function(user_name, user_id, done){
  console.log("Saving new user "+ user_name);
  var newuser = new userModel;
  newuser.userName = user_name;
  newuser._id = user_id;
  
  newuser.save(function(err, newuser){
    if(err) done(err)
    done(null, newuser);
  });
}

var saveNewExercise = function(newexercise, done){
  console.log("Saving new exercise for user "+newexercise.userId);
  newexercise.save(function(err, newexercise){
    if(err) done(err);
    done(null, newexercise);
  })
}

var getExercise = function(searchCriteria, done){
  console.log("Fetching Exercise for user Id "+ searchCriteria.userid);
  console.log("Fetching Exercise for user Id From "+ searchCriteria.from);
  console.log("Fetching Exercise for user Id To "+ searchCriteria.to);
  console.log("Fetching Exercise for user Id Limit "+ searchCriteria.limit);
  
  const query = userExerciseModel.find();
  query.where('userId',searchCriteria.userid);
  if(searchCriteria.from)
    query.where('date').gte(searchCriteria.from);
  if(searchCriteria.to)
    query.where('date').lte(searchCriteria.to);
  if(searchCriteria.limit)
    query.limit(Number(searchCriteria.limit));
  
   
  query.exec(function(err, data){
      if(err) done(err)
        done(null, data);  
  })
  console.log('My query '+ query);
}