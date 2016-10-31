//neo4j driver operation reference from https://neo4j.com/developer/language-guides/
var neo4j = require('neo4j-driver').v1;
//var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "1234"));
var connectString = "bolt://localhost:7687";
var dbAccount = "neo4j";
var dbPassword = "1234";

exports.Login = function (res, UserName, token,id) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "Merge(user:User{ name: {uName} }) " +
               "Set user.token={token} " +
               "Set user.id={id} " +
               "return user";
    session.run(query, { uName: UserName,token:token,id:id })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        res.send(result);
      
    })
}
function UpdatePreferGenreScores(res, UserId) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "Match(user:User)-[r:likes]->(artist)-[r1:hasGenre]->(genre) " +
                "Where user.id={UserId} "+
                "with user as user, genre as genre, count(genre) as numOfGenre " +
                "Merge(user)-[r2:prefer]->(genre) " +
                "Set r2.score=numOfGenre "+
                "return genre,r2.score "+
                "order by r2.score desc ";
    session.run(query, { UserId: UserId })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        res.send(result);
      
    })
    
};

exports.CreatePeopleAndMusicNodes = function (res, result, UserName, UserId) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();  
    var res = res;
    var counter = 0;
    var resultLenght = result.length;
    var uName = UserName;

    for (var i = 0; i < result.length; i++) {
        
        var bandName = result[i].bandName;
        var NumberOfGenre = result[i].genre.length;
        var query = "Merge (band:Artist{name:{bName}}) " +
                    "Merge(people:User { name: {uName} }) " +
                    "With band, people ";+
                    "Where people.id={id} ";
        var queryEnd = "Merge (people)-[:likes]->(band) ";
     
        for (var j = 0; j < NumberOfGenre; j++) {
            var tempString = 
            'Merge(genre'+j+':MusicGenre{ name: "'+result[i].genre[j].name +'"}) ' +
            "Merge (band)-[:hasGenre]->(genre"+j+") ";
            query= query.concat(tempString);
        }
        query = query.concat(queryEnd);
        var tt = query;
        //var query = "Merge (band:Artist{name:{bName}}) "+
        //            "Merge(people:User { name: {uName} }) "+
        //            "With band, people "+
        //            "Merge(genre:MusicGenre{ name: {gName}}) "+
        //            "Merge (band)-[r:hasGenre]->(genre) "+
        //            "Merge (people)-[r1:likes]->(band) ";

        session.run(query, {bName: bandName,uName:UserName,id: UserId})
        .then(function (result) {
            console.log(result);
            if (counter === resultLenght - 1) {
                UpdatePreferGenreScores(res, UserId);
                session.close();
                driver.close();
            }
            counter++;
          
        })
    }

};

exports.PreferMusicGenreByPeople = function (res, UserID) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query ="MATCH(u:User)-[r:prefer]->(n) " + 
               "Where u.id={UserID} "+
               "RETURN n.name as genreName, r.score "+
               "order by r.score desc "+
                "LIMIT 25"
    session.run(query, { UserID: UserID })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var genreName = result.records[i]._fields[0];
            var Score = result.records[i]._fields[1].low;
            var obj = new Object();
            var comment;
            if (Score < 50) {
                Score = Score + 30;
                
            }
            else if (Score > 100) {
                Score = 100;
                
            }
            else if (Score > 50&&Score<80) {
                Score = Score + 20;
                
            }
            if (Score <= 40) {
                comment = "Somewhat enjoy";
            }
            else if (Score >= 70) {
                comment = "Absolutely love";
            }
            else if (Score > 40 && Score < 70) {
                comment = "Like it";
            }

            obj["genreName"] = genreName;
            obj["Score"] = Score;
            obj["comment"] = comment;
            JsonObj.data.push(obj);
        }
        res.send(JsonObj);
      
    })

}

exports.RecommendArtists = function (res, UserID) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "MATCH(u:User)-[r:prefer]->(n) " + 
               "Where u.id={UserID} " +
               "RETURN n.name as genreName " +
               "order by r.score desc " +
                "LIMIT 1"
    session.run(query, { UserID: UserID })
        .then(function (result) {
        var genreName = result.records[0]._fields[0];
        var subquery= "MATCH(a:MusicGenre { name:{genreName} })-[r:stylisticOrigins]->(b)<-[r2:stylisticOrigins]-(c:MusicGenre)<-[:hasGenre]-(artist:Artist), (u:User) "+
                      "with count(b) as b , a as a, c as c, u, artist "+
                      "Where u.id ={UserID} and not (u)-[:likes]->(artist) and not (u)-[:dislikes]->(artist) "+
                      "return distinct artist.name limit 20"
        return session.run(subquery, { UserID: UserID,genreName: genreName })

    }).then(function (result) {
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var ArtistName = result.records[i]._fields[0];
            JsonObj.data.push(ArtistName);
        }
        res.send(JsonObj);
    })

}

exports.RecommendArtistsProfile = function (res, UserID, ArtistName) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "MATCH(a:Artist { name: {ArtistName} })-[r1:hasGenre]->(g)<-[r2:hasGenre]-(b:Artist) "+
                "with b "+
                "Match(u:User) "+
                "where u.id={UserID} and (u)-[:likes]-(b) "+
                "return b.name, count(b) "+
                "order by count(b) desc limit 5 "
    session.run(query, { UserID: UserID, ArtistName: ArtistName })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var artistName = result.records[i]._fields[0];
            JsonObj.data.push(artistName);
        }
        res.send(JsonObj);
      
    })

}

exports.RecommendFriends = function (res, id) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "Match (user:User)-[r:prefer]->(genre)<-[r1:prefer]-(user1:User) " +
                "with sum(r.score*r1.score) as s, " +
                "SQRT(reduce(a=0.0,n in collect(r.score)|a+n^2)) as aLength, " +
                "SQRT(reduce(b=0.0,n in collect(r1.score)|b+n^2)) as bLength,user1,user " +
                "with s/(aLength*bLength) as sim,user1,user " +
                "where user.id={id} and not (user)-[:friend]-(user1) " +
                "return  sim,user1.id,user1.name " +
                "order by sim desc "
    session.run(query, { id: id })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var sim = result.records[i]._fields[0];
            var id = result.records[i]._fields[1];
            var name = result.records[i]._fields[2];
            var comment = "";
            var score = 0;
            var dataObj = new Object();
            if (sim > 0.95 && sim<=1) {
                comment = "Super Match";
                score = 100;
            } else if (sim > 0.9 && sim <= 0.95) {
                comment = "Good Match";
                score = 80;
            }
            else if (sim > 0.8 && sim <= 0.9) {
                comment = "Match";
                score = 60;
            }
            else if (sim > 0.7 && sim <= 0.8) {
                comment = "Little Match";
                score = 40;
            } else if (sim <= 0.7) {
                comment = "Not too Match";
                score = 20;
            }

            dataObj["sim"] = sim;
            dataObj["id"] = id;
            dataObj["name"] = name;
            dataObj["comment"] = comment;
            dataObj["score"] = score;
            JsonObj.data.push(dataObj);
        }
        res.send(JsonObj);
      
    })

}

exports.RecommendFriendsProfile = function (res, UserID, RfriendID) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "Match (user:User)-[r:prefer]->(genre)<-[r1:prefer]-(user1:User) " +
                "where user.id={UserID} and user1.id ={RfriendID} " +
                "return  genre.name " +
                "order by r.score desc limit 10"
    session.run(query, { UserID: UserID,RfriendID: RfriendID })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var genreName = result.records[i]._fields[0];
            JsonObj.data.push(genreName);
        }
        res.send(JsonObj);
      
    })

}


exports.RecommendFriendsLikeArtist = function (res, UserID, RfriendID) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var query = "MATCH(u)-[r:likes]->(artist)<-[r1:likes]-(u2) "+ 
                "Where u.id ={UserID} and u2.id = {RfriendID} "+
                "Return artist.name limit 10 "
    session.run(query, { UserID: UserID, RfriendID: RfriendID })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        var JsonObj = new Object();
        JsonObj["data"] = [];
        for (var i = 0; i < result.records.length; i++) {
            var artistName = result.records[i]._fields[0];
            JsonObj.data.push(artistName);
        }
        res.send(JsonObj);
      
    })

}


exports.LikeArtist = function (res, UserID, ArtistName) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var UserID = UserID;
    var query = "MATCH(u:User), (a:Artist { name:{ArtistName} }) " +
                "Where u.id = {UserID} " +
                "Merge(u)-[r:likes]->(a) " +
                "RETURN u, r, a";
    session.run(query, { UserID: UserID, ArtistName: ArtistName })
        .then(function (result) {
        console.log(result);
        UserId = result.summary.statement.parameters.UserID;
        UpdatePreferGenreScores(res, UserId);
        session.close();
        driver.close();
      
    })

}

exports.DislikeArtist = function (res, UserID, ArtistName) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var UserID = UserID;
    var query = "MATCH(u:User)-[r:likes]->(a:Artist { name:{ArtistName} }) " +
                "Where u.id = {UserID} " +
                "Delete r " +
                "RETURN u, r, a";
    session.run(query, { UserID: UserID, ArtistName: ArtistName })
        .then(function (result) {
        console.log(result);
        UserId=result.summary.statement.parameters.UserID;
        UpdatePreferGenreScores(res, UserId);
        session.close();
        driver.close();
      
    })

}

exports.DontRecommendTheArtist = function (res, UserID, ArtistName) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var UserID = UserID;
    var query = "MATCH(u:User),(a:Artist { name:{ArtistName} }) "+
                "where u.id ={UserID} "+
                "Merge(u)-[r:dislikes]-(a) "+
                "return a, r, u"
    session.run(query, { UserID: UserID, ArtistName: ArtistName })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        res.send(result)
    })

}


exports.CheckUserLikesTheArtist = function (res, UserID, ArtistName) {
    var driver = neo4j.driver(connectString, neo4j.auth.basic(dbAccount, dbPassword));
    var session = driver.session();
    var res = res;
    var UserID = UserID;
    var query = "MATCH(u)-[r:likes]->(a) "+
                "where u.id = {UserID} and a.name = {ArtistName} "+
                "RETURN u, a"
    session.run(query, { UserID: UserID, ArtistName: ArtistName })
        .then(function (result) {
        console.log(result);
        session.close();
        driver.close();
        if (result.records.length === 0) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    })

}