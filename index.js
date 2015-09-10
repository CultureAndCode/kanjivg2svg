#! /usr/bin/env node

var program = require('commander'),
    glob = require('glob'),
    fs = require('fs'),
    xml2js = require('xml2js');

var parserOptions = {
  // xmlns: true,
  // explicitCharkey: true,
  // stripPrefix: false,
  // explicitChildren: false,
  preserveChildrenOrder: true
};
var builderOptions = {
  rootName: 'svg',
  headless: true,
  doctype: {
    ATTLIST: {
      'kvg:element' : '#IMPLIED'
    }
  }
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
    var strokes = Svg.getPathsFromObject(svg.svg.g[0]);
    var height = options.height ? options.height : 109;
    var width = options.width ? (options.width * strokes.length): (109 * strokes.length);
    var circles = [];
    var origPaths = strokes.map(function(object){
      return Svg.parseSvgPathDesc(object["$"].d);
    });

    var paths = [];
    for(obj in origPaths){
      paths.push(function(){
        var descString = "";
        for(str in origPaths[obj]){
          descString += origPaths[obj][str][0] + " " + origPaths[obj][str][1].join(" ")
        }
        return {'$': {
          d: descString,
          style: options.lineStyle
        }};
      }());
    };

    var lines = [
      {
        '$' : {
          x1: width - 1,
          y1: 1,
          x2: width - 1,
          y2: height - 1,
          style: options.borderlineStyle
        }
      },
      {
        '$' : {
          x1: 1,
          y1: 1,
          x2: 1,
          y2: height - 1,
          style: options.borderlineStyle
        }
      },
      {
        '$' : {
          x1: 1,
          y1: height / 2,
          x2: width,
          y2: height / 2,
          style: options.graphLineStyle
        }
      },
      {
        '$' : {
          x1: 1,
          y1: 1,
          x2: width - 1,
          y2: 1,
          style: options.borderlineStyle
        }
      },
      {
        '$' : {
          x1: 1,
          y1: height - 1,
          x2: width - 1,
          y2: height - 1,
          style: options.borderlineStyle
        }
      }
    ];
    for(var i = strokes.length; i > 0; i--){
      lines.push({
        '$' : {
          x1: (i * options.width) - (options.width / 2),
          y1: 1,
          x2: (i * options.width) - (options.width / 2),
          y2: height - 1,
          style: options.graphLineStyle
        }
      });
    };
    for(var i = strokes.length; i > 0; i--){
      lines.push({
        '$' : {
          x1: (i * options.width),
          y1: 1,
          x2: (i * options.width),
          y2: height - 1,
          style: options.borderlineStyle
        }
      });
    };
    callback({
              '$': {
                xmlns: 'http://www.w3.org/2000/svg',
                height: height,
                width: width,
                viewBox: '0 0 ' + width + 'px ' + height + 'px'
              },
              line: lines,
              path: paths,
              circle: circles
            });
  },
  parseSvgPathDesc: function(descString){
    // Give this arbitrary string:
    // M19.38,48.25c1.49,0.51,5.03,0.89,7.6,0.49C41.12,46.5,63,43,77.19,42.44c2.7-0.11,4.87-0.06,7.31,0.33
    // I need to parse it like this:
    // { M : ['19.38','48.25'],
    //   c : ['1.49','0.51','5.03','0.89','7.6','0.49'],
    //   C : ['41.12','46.5','63','43','77.19','42.44'],
    //   c : ['2.7','-0.11','4.87','-0.06','7.31','0.33']
    // }
    var pathDRegex = /(?=[MZLHVCSQTAmzlhvcsqta])/;
    var pathDVals = descString
                      .replace(/(\-)/g, ",-") //Some negative values aren't separated from the previous value
                      .split(pathDRegex)
                      .filter(function(n){return n})
                      .map(function(value){
                            return pathDesc = value
                                          .split(/([a-zA-Z])/)
                                          .filter(function(n){return n});
                            });
    var pathObjArr = pathDVals.map(function(val){
      var obj = [val[0], val[1].split(",")];
      return obj;
    });
    return pathObjArr;
  },
  getPathsFromObject: function(object){
    // for(value in object){
    //   console.log(object[value].length);
    // }
    return object.g[0].path;
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
  cwd: './kanji/',//program.dir,
  frame: {
    height: 109,
    width: 109,
    rows: 1,
    lineStyle: "fill:none;stroke:black;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
    prevStrokeLineStyle: "fill:none;stroke:#888;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
    borderlineStyle: "stroke:#ccc;stroke-width:2",
    graphLineStyle: "stroke:#ddd;stroke-width:2;stroke-dasharray:3 3"
  }
};

glob("*.svg", options, function(err, files){
  for (var file in files){
    if(files[file] === "05927.svg"){
      var fileName = files[file];
      Svg.getSvg(options.cwd + fileName, function(svg){
        Svg.buildFrames(svg, options.frame, function(data){
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