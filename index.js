const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const User = require('./schemas/User.js');

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.URI, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  let user = new User({ username: req.body.username, log: [] });

  user.save((err, data) => {
    if (err) res.json({ rc: -1, message: err });
    res.json(data);
  });

});

app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, data) => {
    if (err) res.json({ rc: -1, message: "Not found" });
    res.json(data);
  })
});

app.post('/api/exercise/add', (req, res) => {
  if (req.body.date == "" || (!req.body.date)) {
    req.body.date = new Date();
    req.body.date = req.body.date.toDateString();
  } else {
    req.body.date = new Date(req.body.date);
    req.body.date = req.body.date.toDateString();
  }

  User.findOne({ _id: req.body.userId }, (err, data) => {

    if (err) { res.send("Not found"); console.log("Not found"); }
    let log = {
      description: req.body.description,
      duration: Number.parseInt(req.body.duration),
      date: req.body.date
    };

    let logArray = data.log;
    logArray.push(log);

    User.findOneAndUpdate({ _id: req.body.userId }, { log: logArray }, (err, data) => {
      if (err) res.send("Not found");
      let output = {
        username: data.username,
        description: req.body.description,
        duration: Number.parseInt(req.body.duration),
        _id: req.body.userId,
        date: req.body.date,
      };
      res.json(output);
    });
  });

});

app.get('/api/exercise/log', (req, res) => {
  let id = req.query.userId;
  let fromDate = new Date(req.query.from);
  let toDate = new Date(req.query.to);
  let limit = Number.parseInt(req.query.limit);

  User.findOne({ _id: id }, (err, data) => {
    if (err) res.send("Error");
    let logSelect = [];

    for (let i = 0; i < data.log.length; i++) {
      console.log("Limit: " + req.query.limit);
      let dateTemp = new Date(data.log[i].date);
      if (!req.query.from || dateTemp >= fromDate) {
        if (!req.query.to || dateTemp <= toDate) {
          if (limit <= 0 || !limit || logSelect.length < limit) {
            logSelect.push(data.log[i]);
          }
        }
      }
    }

    console.log(logSelect);

    let output = {
      _id: data._id,
      username: data.username,
      count: logSelect.length,
      log: logSelect
    };

    res.send(output);
  })
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
});

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
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
