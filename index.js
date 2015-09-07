#! /usr/bin/env node

var program = require('commander'),
    glob = require('glob'),
    fs = require('fs'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser();
var builder = new xml2js.Builder();

program
  .version('0.0.1')
  .usage('-d <dir> -type [type]')
  // .usage('[-d <dir> | -f <file>] -type [type]') //Reserved for future use
  // .option('-f, --file <file>', 'KanjiVG SVG file')
  .option('-d, --dir <dir>', 'KanjiVG SVG directory')
  .option('-t --type [type]', 'SVG type', /^(frames|animated|numbers)$/i, 'frames')
  .parse(process.argv);

var buildSvgFrames = function(svg, callback){
  callback(svg);
}

var getSvg = function(file, callback){
  var path = program.dir + file;
  fs.readFile(path, function(err, data){
    var options = {
      stripPrefix: true
    };
    parser.parseString(data, function(err, result){
      callback(result);
    });
  });
}

var options = {
  cwd: program.dir
};

glob("*.svg", options, function(err, files){
  for (file in files){
    if(files[file] === "05927.svg"){
      var fileName = files[file];
      getSvg(fileName, function(svg){
        // buildSvgFrames(svg, function(output){
        //   console.log(output.svg.g[0]);
        // });
        var xml = builder.buildObject(svg);
        fs.writeFile('./svgs/test_' + fileName, xml, function(err) {
          if (err) {
          }
        });
      });
    }
  }
});
