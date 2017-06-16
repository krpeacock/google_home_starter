require('dotenv').config();

const rpi433 = require('rpi-433');
const PythonShell = require('python-shell');
const fs = require('fs');
const express = require('express');
const bodyParser= require('body-parser');
const path = require('path')
const app = express();

var rfEmitter = rpi433.emitter({
  pin: 0,
  pulseLength: 189
})


// Switch states held in memory
const switches = [];

// Read state from saveState.json, populate switches array
var readableStream = fs.createReadStream('saveState.json');
var data = ''

readableStream.on('data', function(chunk) {
    data+=chunk;
});

readableStream.on('end', function() {
  var parsed = JSON.parse(data);

  for (i=0;i<parsed.switches.length;i++){
    switches.push(new Switch(parsed.switches[i]))
  }
});


var switchCodes = [ {},
  { 'on': 283955, 'off': 283964 },
  { 'on': 284099, 'off': 284108 },
  { 'on': 284419, 'off': 284428 },
  { 'on': 285955, 'off': 285964 },
  { 'on': 292099, 'off': 292108 }]

// Switch Model
// Expects an object:{
  // id:"sw" + number,
  // state: "on" or "off",
  // name: any name you want to display. Defaults to "switch"
// }

function Switch(switchValues){
  this.id = switchValues.id || "sw"
  this.state = switchValues.state || "off"
  this.name = switchValues.name || "switch"
  this.toggle = function(){
    if(this.state === "on"){
      this.setState("off")
    } 
    else{
      this.setState("on");
    }
  }
  this.setState = function(state){
    var code = switchCodes[Number(this.id.substring(2) )][state];
    var signals = 10;

    var blastIntervals = new Promise(function(resolve, reject){
      var interval = setInterval(function(){
      console.log("Transmitting code " + code + "; " + signals + " signals remaining");
      if (signals > 0){
        rfEmitter.sendCode(code, function(error, stdout){
          if (!error) console.log(stdout)
        });
        signals -=1;
      }
      else {
        clearInterval(blastIntervals);
        resolve('success');
      }
    }, 50)

    blastIntervals.then(this.state = state).bind(this);

  })
  // Invokes setState on init to set the switch to its last recalled state.
  this.setState(this.state);
}    

// needed due to a quirk with PythonShell
function onString(number){
  return './public/python/switch.py ' + number + ' on'
}
function offString(number){
  return './public/python/switch.py ' + number + ' off'
}




// Switch Lookup
function getSwitch(string){
  return switches.filter(function(element){
    return element.id === string;
  })[0]
}

// Updates saveState.json
function saveState (){
  var formattedState = {
    switches: switches
  }
  fs.writeFile('./saveState.json', JSON.stringify(formattedState) )
}


//Server Configuration
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'));

// If you have a frontend, drop it in the Public folder with an entry point of index.html
app.get('/', function(req, res){
  res.sendFile('index');
})

// Switch Routes for API
app.get('/api/switches', function(req, res){
  res.send(switches);
})

app.get('/api/switches/:id', function(req, res){
  var found = getSwitch(req.params.id);
  res.json(found);
})

app.post('/api/switches/:id', function(req, res){

// For now, uses a simple password query in the url string. 
// Example: POST to localhost:8000/API/switches/sw1?password=test
  if (req.query.password === process.env.PASS){
    var foundSwitch = getSwitch(req.params.id);
    
    // Optional On / Off command. If not included, defaults to a toggle.

    if(!(req.query.command === "on" || req.query.command === "off")){
      foundSwitch.toggle();
    }
    else {
      foundSwitch.setState(req.query.command)
    }

    saveState();
    console.log("postSwitch "+JSON.stringify(foundSwitch));
    res.json(foundSwitch);
  }
  else {
    console.log("invalid password")
    res.send("try again")
  }
  
})

app.listen(process.env.PORT, function(){
 console.log('Listening on port ' + process.env.PORT);
})

