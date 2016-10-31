var express = require('express');
var router = express.Router();
var SparqlClient = require('sparql-client');
var util = require('util');
var Neo4j = require("./Neo4JHelper");
var endpoint = 'http://dbpedia.org/sparql';

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: "MusicGraph" });
});

router.post('/Login', function (req, res) {
    var JsonData = req.body;
    var result = [];
    var UserName = JsonData.name;
    var token = JsonData.token;
    var id = JsonData.id;
    if (token != "" && id!="") {
        Neo4j.Login(res, UserName, token,id);
    }
    else {
        res.send('token is not valid');
    }
  
});
router.post('/', function (req, res) {
    var JsonData = req.body;
    var counter = 0;
    var result = [];
    var UserName = JsonData.name;
    var token = JsonData.token;
    var UserId= JsonData.id;
    if (token != "") {
        for (var i = 0; i < JsonData.data.length; i++) {
            var name = JsonData.data[i].name;
            var ArtistName = '"' + name + '"';
            var GetGenre = "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                   "PREFIX foaf: <http://xmlns.com/foaf/0.1/> " +
                   "prefix dbp:  <http://dbpedia.org/property/> " + 
                   "SELECT ?bandName ?GenreName  WHERE { " +
                   "?band dbp:name ?bandName. " +
                   " ?band <http://dbpedia.org/ontology/genre> ?genre. " +
                   "?genre rdfs:label ?GenreName " + 
                    "FILTER (lang(?GenreName ) = 'en') " +
                    "FILTER (str(?bandName) =" + ArtistName + ") " +
                    "FILTER (lang(?bandName) = 'en')} ";
            var client = new SparqlClient(endpoint);
            console.log("Query to " + endpoint);
            console.log("Query: " + GetGenre);
            client.query(GetGenre)
            .execute(function (error, results) {
                
                
                if (results!=null&& results.results.bindings.length>0) {
                    var resultLength = results.results.bindings.length;
                    var resultObj = new Object();
                    resultObj["genre"] = [];
                    var bandName = results.results.bindings[0].bandName.value;
                    resultObj["bandName"] = bandName;
                    for (var i = 0; i < resultLength; i++) {
                        var genreName = results.results.bindings[i].GenreName.value;
                        resultObj["genre"].push({ "name": genreName });
                
                    }
                    result.push(resultObj);
                }
                
                if (counter === JsonData.data.length - 1) {
                    Neo4j.CreatePeopleAndMusicNodes(res, result, UserName, UserId);
               // res.send(result);
                }
                counter++;
                process.stdout.write(util.inspect(arguments, null, 20, true) + "\n"); 1
            });
        }
    }
    else { 
      res.send('token is not valid');
    }
  
});
router.get('/PreferMusicGenre/:id', function (req, res) {
    var UserID = req.params.id;
    Neo4j.PreferMusicGenreByPeople(res, UserID);
});

router.get('/RecommendArtists/:id', function (req, res) {
    var id = req.params.id;
    Neo4j.RecommendArtists(res, id);
});

router.post('/RecommendArtistsProfile', function (req, res) {
    var JsonData = req.body;
    var ArtistName = JsonData.ArtistName;
    var UserId = JsonData.id;
    Neo4j.RecommendArtistsProfile(res, UserId, ArtistName);
});


router.get('/RecommendFriends/:id', function (req, res) {
    var id = req.params.id;
    Neo4j.RecommendFriends(res, id);
});

router.get('/RecommendFriendsProfile/:id/:RfriendsID', function (req, res) {
    var UserId = req.params.id;
    var RfriendsID = req.params.RfriendsID;
    Neo4j.RecommendFriendsProfile(res, UserId, RfriendsID);
});

router.get('/RecommendFriendsLikeArtist/:id/:RfriendsID', function (req, res) {
    var UserId = req.params.id;
    var RfriendsID = req.params.RfriendsID;
    Neo4j.RecommendFriendsLikeArtist(res, UserId, RfriendsID);
});

router.post('/LikeArtist', function (req, res) {
    var JsonData = req.body;
    var ArtistName = JsonData.ArtistName;
    var UserId = JsonData.id;

    Neo4j.LikeArtist(res, UserId, ArtistName);
});

router.post('/DislikeArtist', function (req, res) {
    var JsonData = req.body;
    var ArtistName = JsonData.ArtistName;
    var UserId = JsonData.id;
    Neo4j.DislikeArtist(res, UserId, ArtistName);
});

router.post('/DontRecommendTheArtist', function (req, res) {
    var JsonData = req.body;
    var ArtistName = JsonData.ArtistName;
    var UserId = JsonData.id;
    Neo4j.DontRecommendTheArtist(res, UserId, ArtistName);
});

router.post('/CheckUserLikesTheArtist', function (req, res) {
    var JsonData = req.body;
    var ArtistName = JsonData.ArtistName;
    var UserId = JsonData.id;
    Neo4j.CheckUserLikesTheArtist(res, UserId, ArtistName);
});

router.post('/test', function (req, res) {
    var result = req.body;
    res.send(result);
});
module.exports = router;