var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')
var conf = require('./staticserver.json')

// Serve up public/ftp folder
var serve = serveStatic('./', {'index': ['index.html']})

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res))
})

// Listen
server.listen(8081)

