module.exports = function(app) {
  'use strict';

  var fs = require('fs-extra');
  var moment = require('moment');
  var sprintf = require('sprintf');

  var Comic = require('fonflatter-comics/lib/Comic');

  var MAX_NUM_TRANSCRIPTIONS = 10;

  function getDefaultValues(comic, _) {
    var filePath = getFilePath(comic);
    var transcriptionFiles = fs.readdir(filePath, _);
    transcriptionFiles.sort();
    var lastTranscriptionFile = transcriptionFiles.pop();

    var lastTranscription = fs.readJSON(filePath + '/' + lastTranscriptionFile,
      _);
    lastTranscription.date =
      moment(lastTranscriptionFile.replace(/\.json$/, ''));

    return lastTranscription;
  }

  function getFilePath(comic) {
    return 'data/transcriptions/' + comic.date.format('YYYY/MM/DD/');
  }

  function isCorrectSolution(solution, firstNumber, secondNumber) {
    if (solution === 'doof') {
      return true;
    }

    return parseInt(solution) ===
      parseInt(firstNumber) + parseInt(secondNumber);
  }

  function saveTranscription(comic, data, _) {
    var filePath = getFilePath(comic);

    fs.mkdirp(filePath, _);

    if (fs.readdir(filePath, _).length + 1 > MAX_NUM_TRANSCRIPTIONS) {
      throw new Error('Too many transcriptions for ' +
      comic.date.format('YYYY-MM-DD') + '!');
    }

    if (!data.user) {
      data.user = null;
    }

    var now = moment.utc();
    var fileName = filePath + now.format() + '.json';
    fs.writeFile(fileName, JSON.stringify({
      user: data.user,
      text: data.text,
    }, null, 4) + '\n', _);
  }

  app.get(Comic.URL_PATTERN, function(req, res, _) {
    var comic = new Comic(req.params);

    var input;
    try {
      input = getDefaultValues(comic, _);
    } catch (e) {
      input = {};
    }

    res.render('transcribe.html', {
      app: req.app,
      comic: comic,
      input: input,
    });
  });

  app.post(Comic.URL_PATTERN, function(req, res, _) {
    var comic = new Comic(req.params);
    var result = {
      errors: [],
      submitted: false,
    };

    if (!isCorrectSolution(req.body.solution, req.body.firstNumber,
        req.body.secondNumber)) {
      result.errors.push('wrong_solution');
    }

    if (!req.body.text) {
      result.errors.push('transcription_missing');
    }

    if (result.errors.length === 0) {
      try {
        saveTranscription(comic, {
          user: req.body.user.trim(),
          text: req.body.text,
        }, _);
        result.submitted = true;
      } catch (e) {
        console.log(e.stack);
        result.errors.push('could_not_save');
      }
    }

    res.render('transcribe.html', {
      app: req.app,
      input: req.body,
      result: result,
    });
  });
};
