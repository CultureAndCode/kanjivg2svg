#! /usr/bin/env node

var program = require('commander'),
    glob = require('glob'),
    fs = require('fs'),
    xml2js = require('xml2js');

var parserOptions = {
  stripPrefix: false,
  explicitChildren: false,
  preserveChildrenOrder: false
};
var builderOptions = {
  rootName: 'svg',
  headless: true
};

var parser = new xml2js.Parser(parserOptions);
var builder = new xml2js.Builder(builderOptions);

program
  .version('0.0.1')
  .usage('-d <dir> -type [type]')
  // .usage('[-d <dir> | -f <file>] -type [type]') //Reserved for future use
  // .option('-f, --file <file>', 'KanjiVG SVG file')
  .option('-d, --dir <dir>', 'KanjiVG SVG directory')
  .option('-t --type [type]', 'SVG type', /^(frames|animated|numbers)$/i, 'frames')
  .parse(process.argv);

var Svg = {
  buildFrames: function(svg, options, callback){
    var height = options.height ? options.height : 109;
    var width = options.width ? options.width: 109;
    var paths = svg.svg.g[0].g[0].path.map(function(object){
      var pathObject = {
        '$' : {
          d: object["$"].d,
          style: "fill:none;stroke:black;stroke-width:3"
        }
      }
      return pathObject;
    });
    callback({
              '$': {
                xmlns: 'http://www.w3.org/2000/svg',
                height: height,
                width: width,
                viewBox: '0 0 ' + height + ' ' + width + ' '
              }, 
              path: paths });
  },
  getSvg: function(file, callback){
    fs.readFile(file, function(err, data){
      parser.parseString(data, function(err, result){
        callback(result);
      });
    });
  }
};

var options = {
  cwd: program.dir
};

var buildFrameOptions = {
  // height: 200,
  // width: 200
}

glob("*.svg", options, function(err, files){
  for (var file in files){
    if(files[file] === "05927.svg"){
      var fileName = files[file];
      Svg.getSvg(options.cwd + fileName, function(svg){
        Svg.buildFrames(svg, buildFrameOptions, function(data){
          var xml = builder.buildObject(data);
          fs.writeFile('./svgs/test_' + fileName, xml, function(err) {
            if (err) {
              console.log(err);
            }
          });
        });
      });
    }
  }
});

module.exports = Svg;