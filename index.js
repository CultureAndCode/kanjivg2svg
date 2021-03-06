#! /usr/bin/env node

var program = require('commander'),
    glob = require('glob'),
    fs = require('fs'),
    xml2js = require('xml2js');

var parserOptions = {
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
  .option('-f, --file <file>', 'KanjiVG SVG file')
  .option('-d, --dir <dir>', 'KanjiVG SVG directory')
  .option('-t --type [type]', 'SVG type', /^(frames|animated|numbers|highlight)$/i, 'frames')
  .option('-n --num [num]', 'Highlighted stroke number', /^(\d{1,2})$/i, 1)
  .parse(process.argv);

var Svg = {
  buildFrames: function(svg, options, callback){
    var strokes = Svg.getPathsFromObject(svg);
    var strokeCount = strokes.length;
    var height = options.height ? options.height : 109;
    var width = options.width ? (options.width * strokeCount): (109 * strokeCount);
    var circles = [];
    var origPaths = strokes.map(function(object){
      return Svg.parseSvgPathDesc(object);
    });

    var paths = [];
    var count = 0;
    for(obj in origPaths){
      for (var i = 0; i < (parseInt(obj) + 1); i++){
        var style = (i < obj) ? options.prevStrokeLineStyle : options.lineStyle;
        paths.push(function(){
          var descString = "";
          for(str in origPaths[i]){
            if (origPaths[i][str][0] === "M"){
              var relX = origPaths[i][str][1][0] + (obj * (width / strokeCount));
              var relY = origPaths[i][str][1][1];
              descString += "M " + relX + " " + relY + " ";
            } else if (origPaths[i][str][0] === "C"){
              var cPath = origPaths[i][str][1].slice(0);
              for (var x = 0; x < 5; x += 2){
                var relX = cPath[x] + (obj * (width / strokeCount));
                cPath[x] = parseFloat(cPath[x] + (obj * (width / strokeCount)));
              }
              descString += origPaths[i][str][0] + " " + cPath.join(" ") + " ";
            } else if (origPaths[i][str][0] === "c"){
              descString += origPaths[i][str][0] + " " + origPaths[i][str][1].join(" ") + " ";
            }
          }
          return {'$': {
            d: descString,
            style: style
          }};
        }());
      };
    };

    for(obj in origPaths){
      var cx = origPaths[obj][0][1][0] + (obj * (width / strokeCount));
      var cy = origPaths[obj][0][1][1];
      circles.push(function(f){
        var circle = {'$': {
              cx: cx,
              cy: cy,
              r: options.circle.radius,
              'stroke-width': options.circle['stroke-width'],
              fill: options.circle.fill,
              opacity: options.circle.opacity
            }
          };
        return circle;
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
    for(var i = strokeCount; i > 0; i--){
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
    for(var i = strokeCount; i > 0; i--){
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
  highlightedStroke: function(svg, stroke, options, callback, err){
    var strokes = Svg.getPathsFromObject(svg);
    var strokeCount = strokes.length;
    var height = options.height;
    var width = options.width;
    var circles = [];
    var origPaths = strokes.map(function(object){
      return Svg.parseSvgPathDesc(object);
    });

    if(stroke > origPaths.length){
      stroke = 1;
    }

    var paths = [];
    
    for(obj in origPaths){
        var style = (obj == stroke - 1) ? options.highlightLineStyle : options.lineStyle;
        paths.push(function(){
          var descString = "";
          for(str in origPaths[obj]){
            if (origPaths[obj][str][0] === "M"){
              var relX = origPaths[obj][str][1][0];
              var relY = origPaths[obj][str][1][1];
              descString += "M " + relX + " " + relY + " ";
            } else if (origPaths[obj][str][0] === "C"){
              var cPath = origPaths[obj][str][1].slice(0);
              for (var x = 0; x < 5; x += 2){
                var relX = cPath[x];
                cPath[x] = parseFloat(cPath[x]);
              }
              descString += origPaths[obj][str][0] + " " + cPath.join(" ") + " ";
            } else if (origPaths[obj][str][0] === "c"){
              descString += origPaths[obj][str][0] + " " + origPaths[obj][str][1].join(" ") + " ";
            }
          }
          return {'$': {
            d: descString,
            style: style
          }};
        }());
    };

    callback({
              '$': {
                xmlns: 'http://www.w3.org/2000/svg',
                height: height,
                width: width,
                viewBox: '0 0 ' + width + 'px ' + height + 'px'
              },
              path: paths
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
                      .replace(/(\-)/, ",-")
                      .split(pathDRegex)
                      .filter(function(n){return n})
                      .map(function(value){
                            var val = value
                                        .split(/([a-zA-Z])/g)
                                        .filter(function(n){return n});
                            return val;      
                            });
    var pathObjArr = pathDVals.map(function(val){
      var obj = [val[0], val[1]
                              .replace(/(\-)/g, ',-')
                              .replace(/(\s)/g, ',')
                              .split(/(\,)/g)
                              .filter(function(n){
                                  if(n == ','){
                                    return;
                                  }
                                  return n;
                                })
                              .map(function(v){return parseFloat(v)})
                ];
      return obj;
    });
    return pathObjArr;
  },
  getPathsFromObject: function(obj){
    var keys = [];
    for(o in obj){
      if(obj[o].hasOwnProperty("d")){
        keys.push(obj[o].d);
      } else if(typeof obj[o] === 'object') {
        keys.push(Svg.getPathsFromObject(obj[o]));
      }
    };
    return keys.concat.apply([], keys);
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
  cwd: function(){
    if(program.dir){
      return program.dir;
    } else {
      return process.cwd();
    }
  }(),
  outputPath: './svgs/',
  frame: {
    height: 109,
    width: 109,
    rows: 1,
    lineStyle: "fill:none;stroke:black;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
    prevStrokeLineStyle: "fill:none;stroke:#999;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
    borderlineStyle: "stroke:#ccc;stroke-width:1",
    graphLineStyle: "stroke:#ddd;stroke-width:2;stroke-dasharray:2 5",
    circle: {
      radius: 5,
      'stroke-width': 0,
      fill: "#FF2A00",
      opacity: 0.7
    }
  },
  highlight: {
    height: 109,
    width: 109,
    lineStyle: "fill:none;stroke:black;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
    highlightLineStyle: "fill:none;stroke:#F00;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;"
  }
};

if(program.file && (program.type === 'frames') ) {
  var fileName = program.file.replace(/^.*[\\\/]/, '').split('.')[0];
  var pType = program.type ? program.type : 'frames';
  var filePath = options.outputPath + fileName + '_' + pType;
  Svg.getSvg(program.file, function(svg){
    Svg.buildFrames(svg, options.frame, function(data, err){
      if (err){
        throw(err);
      }
      var xml = builder.buildObject(data);
      fs.writeFile(filePath + '.svg', xml, function(err) {
        if(err){
          console.log(err);
        }
        console.log(filePath + " written to file");
      });
    });
  });
}

if(program.file && (program.type === 'highlight' && program.num !== 'undefined')) {
  var fileName = program.file.replace(/^.*[\\\/]/, '').split('.')[0];
  var pType = program.type ? program.type : 'frames';
  var filePath = options.outputPath + fileName + '_' + pType;
  Svg.getSvg(program.file, function(svg){
    Svg.highlightedStroke(svg, program.num, options.highlight, function(data, err){
      if (err){
        throw(err);
      }
      var xml = builder.buildObject(data);
      fs.writeFile(filePath + '.svg', xml, function(err) {
        if(err){
          console.log(err);
        }
        console.log(filePath + " written to file");
      });
    });
  });
}

module.exports = Svg;