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
    var circle = [];
    var paths = strokes.map(function(object, index){
      var parsedPath = Svg.parseSvgPathDesc(object["$"].d);
      var markerRelPath = "M" + (parseFloat(parsedPath[0].M.x) + (options.width * index))
                          + "," + parsedPath[0].M.y;
      circle.push({
          '$' : {
            cx: parseFloat(parsedPath[0].M.x) + (options.width * index),
            cy: parsedPath[0].M.y,
            r: 5,
            'stroke-width': 0,
            fill: "#FF2A00",
            opacity: 0.7
          }
        });
      var curveTo = "";
      for (var path in parsedPath){
        if (parsedPath[path].c){
          curveTo += "c" + parsedPath[path].c.dc1x + ","
                     + parsedPath[path].c.dc1y + ","
                     + parsedPath[path].c.dc2x + ","
                     + parsedPath[path].c.dc2y + ","
                     + parsedPath[path].c.dx + ","
                     + parsedPath[path].c.dy;
        } else if (parsedPath[path]["C"]){
          curveTo += "C" + (parseFloat(parsedPath[path]["C"].c1x) + (options.width * index)) + ","
                     + parsedPath[path]["C"].c1y + ","
                     + (parseFloat(parsedPath[path]["C"].c2x) + (options.width * index)) + ","
                     + parsedPath[path]["C"].c2y + ","
                     + (parseFloat(parsedPath[path]["C"].x) + (options.width * index)) + ","
                     + parsedPath[path]["C"].y;
        } 
      }
      var relPath = markerRelPath + curveTo;
      var pathObject = {
        '$' : {
          d: relPath,
          style: options.lineStyle
        }
      }
      return pathObject;
    });
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
              circle: circle
            });
  },
  parseSvgPathDesc: function(pathString){
    var pathDRegex = /(?=[MZLHVCSQTAmzlhvcsqta])/;
    var pathDVal = pathString.split(pathDRegex).filter(function(n){return n});
    var pathObject = pathDVal.map(function(value){
      var pathDesc = value.split(/([a-zA-Z])/).filter(function(n){return n});
      switch(pathDesc[0]){
        case 'M': //Marker
          var pathCoords = pathDesc[1].split(',');
          return {
                    M: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'm': //Marker Relative
          var pathCoords = pathDesc[1].split(',');
          return { m: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'C': //Cubic Bezier Curve
          var pathCoords = pathDesc[1].split(',');
          return { C: {
                    c1x: pathCoords[0],
                    c1y: pathCoords[1],
                    c2x: pathCoords[2],
                    c2y: pathCoords[3],
                    x: pathCoords[4],
                    y: pathCoords[5],
                    }
                  }
          break;
        case 'c': //Cubic Bezier Curve Relative
          var pathCoords = pathDesc[1].split(',');
          return { c: {
                    dc1x: pathCoords[0],
                    dc1y: pathCoords[1],
                    dc2x: pathCoords[2],
                    dc2y: pathCoords[3],
                    dx: pathCoords[4],
                    dy: pathCoords[5],
                    }
                  }
          break;
        case 'L': //Line To
          var pathCoords = pathDesc[1].split(',');
          return { L: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'l': //Line To Relative
          var pathCoords = pathDesc[1].split(',');
          return { l: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'H': //Line To Horizontal
          var pathCoords = pathDesc[1].split(',');
          return { H: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'h': //Line To Horizontal Relative
          var pathCoords = pathDesc[1].split(',');
          return { h: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'V': //Line To Vertical
          var pathCoords = pathDesc[1].split(',');
          return { V: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'v': //Line To Vertical Relative
          var pathCoords = pathDesc[1].split(',');
          return { v: {
                      x: pathCoords[0],
                      y: pathCoords[1]
                      }
                 }
          break;
        case 'Q': //Quadratic Bezier Curve
          var pathCoords = pathDesc[1].split(',');
          return { Q: {
                    c1x: pathCoords[0],
                    c1y: pathCoords[1],
                    x: pathCoords[2],
                    y: pathCoords[3],
                    }
                  }
          break;
        case 'q': //Quadratic Bezier Curve Relative
          var pathCoords = pathDesc[1].split(',');
          return { q: {
                    dc1x: pathCoords[0],
                    dc1y: pathCoords[1],
                    dx: pathCoords[2],
                    dy: pathCoords[3],
                    }
                  }
          break;
        case 'T': //Shorthand/Smooth Quadratic Bezier Curve
          var pathCoords = pathDesc[1].split(',');
          return { T: {
                    x: pathCoords[0],
                    y: pathCoords[1],
                    }
                  }
          break;
        case 't': //Shorthand/Smooth Quadratic Bezier Curve Relative
          var pathCoords = pathDesc[1].split(',');
          return { t: {
                    dx: pathCoords[0],
                    dy: pathCoords[1],
                    }
                  }
          break;
        case 'S': //Shorthand/Smooth Cubic Bezier Curve
          var pathCoords = pathDesc[1].split(',');
          return { S: {
                    c2x: pathCoords[0],
                    c2y: pathCoords[1],
                    x: pathCoords[2],
                    y: pathCoords[3],
                    }
                  }
          break;
        case 's': //Shorthand/Smooth Cubic Bezier Curve Relative
          var pathCoords = pathDesc[1].split(',');
          return { s: {
                    dc2x: pathCoords[0],
                    dc2y: pathCoords[1],
                    dx: pathCoords[2],
                    dy: pathCoords[3],
                    }
                  }
          break;
        default:
          return value;
          break;
      }
    });
    return pathObject;
  },
  getPathsFromObject: function(object){
    for(value in object){
      // console.log(object[value].length);
    }
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
  cwd: './kanji/'//program.dir
};

var buildFrameOptions = {
  height: 109,
  width: 109,
  lineStyle: "fill:none;stroke:black;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;",
  borderlineStyle: "stroke:#ddd;stroke-width:2",
  graphLineStyle: "stroke:#ddd;stroke-width:2;stroke-dasharray:3 3"
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