//Module imports
var http = require('http');
var express = require("express");
var dispatcher = require('httpdispatcher');
var formidable = require('formidable');
var path = require('path');
var pg = require('pg');
var util = require('util');
var fs = require('fs');
var promise = require('bluebird');
var pgp = require('pg-promise')(
  {promiseLib: promise}
);
var request = require('request');
var parser = require('xml2js').parseString;
//var fileupload = require('fileupload').createFileUpload('/uploadDir').middleware

session_email = 'sfarley2@wisc.edu'

var app = express()
app.use(express.static(__dirname + '/public'));
var bodyParser = require('body-parser');

function createConnection(){
  var cn = {
      host: 'localhost',
      port: 5432,
      database: 'cartlab',
      user: 'cartlabuser',
      password: 'R0b1ns0n!'
  };

  var db = pgp(cn);
  console.log("Connected.")
  return db
}

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//need to do this to allow cors
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});



var router = express.Router();

hostname = 'localhost'
username = 'cartLabUser'
password = 'R0b1ns0n!'
db = 'cartlab'

//Serve on this port
const PORT=8080;

app.post('/upload', function(req, res){
  //create new database object for using in this transaction
  db = createConnection()
  console.log("Connected")
  // create an incoming form object
  var form = new formidable.IncomingForm();
  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;
  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/public/uploads');
  // store and name the file
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });
  form.on('field', function(name, value){
    //put the file metadata into the database
    if (name == 'metadata'){
      metadata = JSON.parse(value)
      //create the resource first
      resourceName = metadata['resourceName']
      resourceID = metadata['resourceID']
      resourceDate = metadata['creationDate']
      resourceCategory = metadata['resourceCategory']
      resourceDescription = metadata['resourceDescription']
      notes = metadata['notes']
      resourceFilename = "/uploads/" + metadata['resourceFilename']
      resourceFileType = metadata['resourceMimeType']
      resourceSize = metadata['resourceSize']
      authors = metadata['authors']
      tags = metadata.tags
      references = metadata['references']
      uploaderName = metadata['uploader']['name']
      uploaderEmail = metadata['uploader']['email']
      console.log(metadata)
      vals = [resourceID, resourceName, resourceDate, resourceCategory.toLowerCase(), resourceDescription, notes, true, null, resourceFilename,  resourceFileType, resourceSize, uploaderName, uploaderEmail]
      //get the category for this

                                          //databaseID/resourceID/resourceName/resourceDate/category/                     description/notes/embargo/auth/path/type/size/name/email/modified
      db.one("INSERT INTO Resources Values(default, $1, $2, $3, (select categoryid from categories where lower(categorytext) = $4), $5, $6, $7, $8, $9, (select mediaTypeID from MediaTypes where lower(mimetype) = $10), $11, $12, $13, FALSE, default) returning resourceid;", vals)
      .then(function(data){
          //now add authorships
          var resourceID = data['resourceid']
          console.log("Inserted resource.  ID is " + resourceID)
          sql = ""
          vals = []
          for (var i=0; i<authors.length; i++){
            j = i * 4 + 1
            sql += "INSERT INTO Authorship VALUES (default, $" + j + ",$" + (j + 1) + ",$" + (j + 2) + ",$" + (j + 3) + ", default); "
            vals.push(resourceID, authors[i]['first'], authors[i]['last'], authors[i]['middle'])
          }
          db.none(sql, vals)
            .then(function(){
              console.log("Inserted authors, now doing tags...")
              //now add the tags
              sql = ""
              vals = []
              console.log(tags)
              if ((tags.length == 0) || (tags[0] == "") || (tags == [ '' ]) ){
                //skip this part
                console.log("tags")
                insertReference(db, references, resourceID);
              }else{
                  for (var i=0; i<tags.length; i++){
                      j = i * 2 + 1
                      tagValue = tags[i].replace(/ /g,''); //remove extra whitespace
                      sql += "INSERT INTO tags VALUES (default, $" + j + ", $" + (j + 1) + ", default); "
                      vals.push(resourceID, tagValue)
                  }
                  console.log(sql)
                  db.none(sql, vals)
                    .then(function(){
                      console.log("Inserted tags, now doing reference.")
                      console.log("Success!")
                      insertReference(db, references, resourceID)
                    })
                    .catch(function(err){
                      console.log("Error entering tag information.")
                      console.log(err)
                    })
              }
            })
            .catch(function(){
              console.log("Error entering authorship information.")
            })
        })
        .catch(function(err){
          console.log(err)
        })
    }
  })
  // log any file upload errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });
  form.on('end', function(fields) {
    //produce response for client
    res.json({success: true, data: []})
  });
  // parse the incoming request containing the form data
  form.parse(req, function(err, fields, files){

  });

});

function insertReference(db, references, resourceID){
  //get the deconstructed reference from FreeCite
  console.log("Doing reference.")
  console.log(references)
  for (var i =0; i< references.length; i++){
    reference = references[i]
    if ((reference != "") && (reference  != null)){
      getCitation(reference, resourceID, db)
    }else{
      console.log("No reference")
    }
  }

}

function getCitation(referencetxt, resourceID, db){
  request.post('http://freecite.library.brown.edu/citations/create', {
		headers: {
			accept: "text/xml"
		},
		form: {
			citation: referencetxt
		}},function (err, response, body) {
      parser(body, function(err, json){
        citations = json['citations']
        theCitation = citations['citation'][0]
        isValid = theCitation['$']['valid']
        console.log(theCitation)
        if ((isValid) || (isValid == 'true')){
          insertCitation(theCitation, resourceID, db)
        }else{
          console.log("Error fetching or parsing citation from freeCite")
        }
      })
		});
}

function insertCitation(citation, resourceID, db){
  console.log(citation)
  authors = citation['authors'][0]['author']
  //format the authors for bibtex
  authorString = ""
  for (var j =0; j < authors.length; j++){
    thisAuthor = authors[j]
    console.log(thisAuthor)
    authorString += thisAuthor + " and "
  }
  authorString = authorString.slice(0, -5);
  try{
    title = citation['title'][0]
  }catch(err){
    title = null
  }
  try{
    journal = citation['journal'][0]
  }catch(err){
    journal = null
  }
  try{
    volume = citation['volume'][0]
  }catch(err){
    volume = null
  }
  try{
    number = citation['number'][0]
  }catch(err){
    number = null
  }
  try{
    pages = citation['pages'][0]
  }
  catch(err){
    pages = null
  }
  try{
    year = +citation['year'][0]
  }catch(err){
    year = null
  }
  raw = citation['raw_string'][0]
  try{
    publisher = citation['publisher'][0]
  }catch(err){
    publisher = null
  }
  place = null
  typeOfReference = null
  doi = null
  values = [resourceID, authorString, title, journal, place, volume, number, pages, year, publisher, doi, typeOfReference, raw]
  console.log(values)
  db.none("INSERT INTO objectreferences values(default, $1, $2, $3, $4, $5, $6, $7,$8, $9, $10, $11, $12, $13 )",
  values)
        .then(function(){
          console.log("Inserted reference")
        })
        .catch(function(err){
          console.log(err)
        })
}


app.get("/mediaTypes", function(req, res){
  db = createConnection()
  db.any("SELECT mimetype, description FROM mediatypes where allowed = TRUE")
  .then(function(data){
    res.status(200).json({success: true, data:data});
  })
  .catch(function(err){
    res.status(500).json({success: false, error: err})
  })
})

app.get("/categories", function(req, res){
  db = createConnection()
  db.any("SELECT categorytext FROM categories;")
    .then(function(data){
      res.status(200).json({success: true, data:data});
    })
    .catch(function(err){
      res.status(500).json({success: false, error: err})
    })
})

app.get("/unauthorizedResource", function(req, res){
  db = createConnection();
  //first choose the resource
  sql = "SELECT * From Resources "
  sql += " INNER JOIN Categories on Resources.ResourceCategory = Categories.CategoryID  "
  sql += " INNER JOIN MediaTypes on Resources.ObjectType = MediaTypes.MediaTypeID "
  sql += "  WHERE EmbargoStatus = TRUE AND Rejected = FALSE "
  sql += " ORDER BY resourceID DESC LIMIT 1;"
  console.log(sql)
  db.oneOrNone(sql)
    .then(function(resourceData){
      //get the ResourceID
      response = resourceData
      if (response  == null){
        res.status(200).json({success: true, data: []})
      }else{
        resourceID = resourceData['resourceid']
        //now get the associated tags
        sql = "SELECT tagid, tagtext FROM Tags WHERE ResourceID = $1;"
        db.any(sql, [resourceID])
          .then(function(tags){
            //make a nice list instead of the object
            tagList = []
            for (var i= 0; i< tags.length; i ++){
              tagList.push(tags[i]['tagtext'])
            }
            response['tags'] = tagList
            //now get the authors
            //same resourceID
            sql = "SELECT authorshipid, authorfirst, authormiddle, authorlast FROM Authorship where ResourceID = $1;"
            db.any(sql, [resourceID])
              .then(function(authors){
                response['authors'] = authors
                //finally, get the references, and then return
                sql = "SELECT referenceid, rawRef from objectreferences where resourceID = $1;"
                db.any(sql, [resourceID])
                  .then(function(references){
                    response['references'] = references
                    res.status(200).json({success: true, data:response})
                  }).catch(function(err){
                    //catch errors from reference call
                    res.status(500).json({success:false, error:err, location: "References"})
                  })
              }).catch(function(err){
                //catch errors from authors call
                res.status(500).json({success: false, error: err, location: "Authors"})
              })
          })
          .catch(function(err){
            //catch errors from tags call
            res.status(500).json({success: false, error: err, location: "Tags"})
          })
      }
    })
    .catch(function(err){
      //catch errors from resources call
      res.status(500).json({success: false, error: err, location: "Resources"})
    })
})


app.get("/approve/:id", function(req, res){
  //approve this resource and release the EmbargoStatus
  //attach the authorization to an authorized user
  thisResource = req.params.id
  db = createConnection()
  sql = "UPDATE Resources SET EmbargoStatus=FALSE, embargoauth=(SELECT UserID from authusers where lower(useremail)=lower($1)), modified=current_timestamp WHERE resourceid=$2;"
  values = [session_email, thisResource]
  console.log(values)
  db.none(sql, values)
    .then(function(){
      //insert into the authorized users action table, so we can keep track of rejections and approvals
      sql = "INSERT INTO AuthActions VALUES (DEFAULT, $1, 'Resource', (SELECT UserID from authusers where lower(useremail)=lower($2)), TRUE, default);"
      db.none(sql, values)
        .then(function(){
          res.json({success: true, data:[]})
        })
        .catch(function(err){
          res.json({success: false, error: err, location: "AuthActions"})
        })
    })
    .catch(function(err){
      res.json({success:false, error: err, location:"Embargo release"})
    })
})

app.get("/reject/:id", function(req, res){
  //reject an upload
  thisResource = req.params.id
  db = createConnection()
  sql = "UPDATE Resources SET Rejected=TRUE, modified=current_timestamp WHERE resourceid=$1;"
  values = [thisResource]
  db.none(sql, values)
    .then(function(){
      //insert into the authorized users action table, so we can keep track of rejections and approvals
      sql = "INSERT INTO AuthActions VALUES (DEFAULT, $1, 'Resource', (SELECT UserID from authusers where lower(useremail)=lower($2)), FALSE, default);"
      db.none(sql, [thisResource, session_email])
        .then(function(){
          res.json({success: true, data:[]})
        })
        .catch(function(err){
          res.json({success: false, error: err, location: "AuthActions"})
        })
    })
    .catch(function(err){
      res.json({success:false, error: err, location:"Rejection"})
    })
})


app.get("/resourceStatistics", function(req, res){
  sql = "SELECT count(*) FROM resources where embargostatus = TRUE;"
  db = createConnection()
  db.one(sql)
    .then(function(data){
      res.json({success: true, data: {embargoed: data['count']}})
    }).catch(function(err){
      res.json({success: false, error: err, location: "Embargo stats."})
    })
})

app.post("/signup", function(req, res){
  //adds a new authorized user to the database
  //collect the POSTed data
  var userFirst = req.body.firstName;
  var userLast = req.body.lastName;
  var userEmail = req.body.email;
  var userPass = req.body.p;
  // bcrypt.hash(myPlaintextPassword, saltRounds, function(err, hash) {
  //   db = createConnection()
  //   //check to see if the user email already exists
  //   sql = "SELECT count(*) FROM authusers where useremail = $1";
  //   db.one(sql, [userEmail])
  //     .then(function(data){
  //       count = data['count']
  //       if (count > 0){
  //         //user already exists
  //         res.json({success: false, error: "User with that email already exists."})
  //       }else{
  //         sql = "INSERT INTO authusers VALUES(default, $1, $2, $3, $4, FALSE, default)"
  //         values = [userFirst, userLast, userEmail, hash]
  //         db.none(sql, values)
  //           .then(function(){
  //             res.json({success: true, data:[]})
  //           })
  //           .catch(function(err){
  //             res.json({success: false, error:err, location: "User insert."})
  //           })
  //       }
  //     }).catch(function(err){
  //       res.json({success: false, error: err, location: "User existance check."})
  //     })
  // });
})

app.get("/unapprovedUsers", function(req, res){
  // list all of the users who have not yet been approved by an existing authorized user
  db = createConnection()
  sql = "SELECT * FROM authusers where approved = FALSE;"
  db.any(sql)
    .then(function(data){
      res.json({success: true, data: data})
    })
    .catch(function(err){
      res.json({success:false, error: err, location: "Authorized User Selection."})
    })
})

app.get("/approveUser/:userID", function(req, res){
  //approve a user, giving them the ability to approve documents
  //need a session token here...TODO
  userID = req.params.userID
  db = createConnection()
  sql = "UPDATE authusers set approved = TRUE, modified = current_timestamp where userid = $1";
  db.none(sql, [userID])
    .then(function(){
      //tie this action to an existing user
      sql = "INSERT INTO AuthActions VALUES (DEFAULT, $1, 'User', (SELECT UserID from authusers where lower(useremail)=lower($2)), TRUE, default);"
      values = [userID, session_email]
      db.none(sql, values)
        .then(function(){
          res.json({success: true, data: []})
        })
        .catch(function(err){
          res.json({success: false, error: err, location: "Authorized action insert."})
        })
    })
    .catch(function(err){
      res.json({success: false, errror:err, location: "Authorized user update."})
    })
})

app.get("/removeUser/:ID", function(req, res){
  //permanently remove a user (approved or unapproved)
  //add session token
  userID = req.params.userID
  db = createConnection()
  sql = "DELETE FROM authusers where userid = $1";
  db.none(sql, [userID])
    .then(function(){
      //tie this action to an existing user
      sql = "INSERT INTO AuthActions VALUES (DEFAULT, $1, 'User', (SELECT UserID from authusers where lower(useremail)=lower($2)), TRUE, default);"
      values = [userID, session_email]
      db.none(sql, values)
        .then(function(){
          res.json({success: true, data: []})
        })
        .catch(function(err){
          res.json({success: false, error: err, location: "Authorized action insert."})
        })
    })
    .catch(function(err){
      res.json({success: false, errror:err, location: "Authorized user removal."})
    })
})

app.post("/login", function(req, res){
  var email = req.body.email;
  var password = req.body.p
  db = createConnection()
  //get the password from the database
  sql = "SELECT * FROM authusers where lower(useremail) = lower($1) LIMIT 1;"
  values = [email]
//   db.any(sql, values)
//     .then(function(data){
//       if (data.length == 0){
//         //no results were returned
//         //the user doesn't exist
//         res.json({success: false, error: "User does not exist."})
//       }
//     })
//   bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
})

app.get("/search", function(req, res){
  //get the query string
  q = req.query.q //matches again authorfirst, authorlast, tagtest, category, title,
  sortBy = req.query.sortBy
  mindate = req.query.minDate
  maxdate = req.query.maxDate
  author = req.query.author
  journal = req.query.journal
  title = req.query.title
  category = req.query.category
  refQ = req.query.refq //query any reference
  tags = req.query.category
  offset = req.query.offset
  limit = +req.query.limit
  offset = +req.query.offset
  pubYear = req.query.pubYear //year of publication
  refOnly = req.query.refOnly //only include objects with references



  //make sure things are correctly defined or undefined
  if ((isNaN(limit)) || (limit === undefined)){
    limit = 100;
  }
  if ((isNaN(offset)) || (offset === undefined)){
    offset = 0;
  }

  if(sortBy != undefined){
    sortby = sortBy.lower()
  }
  //format tags into regex
  if (tags != undefined){
    tagstring = ""
    for (var  i=0; i< tags.length; i++){
      tag = tags[i]
      tagstring += "(" + tag + ") | "
    }
  }else{
    tagstring = null
  }
  console.log(tagstring)
  //correctly specify the field to sortBy
  switch(sortBy){
    case 'title':
      sortField = 'resources.resourcetitle';
      break;
    case 'upload':
      sortField = 'resources.modified';
      break
    case 'created':
      sortField = 'resources.resourcedate'
      break
    case 'author':
      sortField = 'authorships.authorlast';
      break
    default:
      sortField = 'resources.resourceid'
  }
  //sort out the min/max
  maxResource = offset + limit

  //build the query
  db = createConnection()

  sql = "SELECT\
          resources.resourceid, resources.resourcename, resources.resourcetitle, \
          resources.resourcedate, resources.resourcedescription, categories.categorytext, \
          resources.objectreference, resources.objectsize, authorship.authorshipid, authorship.authorfirst, authorship.authorlast, \
          authorship.authormiddle, tags.tagtext, objectreferences.referenceid, objectreferences.authors, \
          objectreferences.title, objectreferences.journal, objectreferences.place, objectreferences.volume, \
          objectreferences.issue, objectreferences.pages, objectreferences.pubyear, objectreferences.publisher, \
          objectreferences.doi, objectreferences.typeofreference, objectreferences.rawref, mediatypes.mimetype, mediatypes.description \
          FROM (SELECT DENSE_RANK() OVER (ORDER BY resources.resourceid) AS dr, resources.*\
             FROM resources) resources  \
      	LEFT OUTER JOIN Authorship on Authorship.resourceid = resources.resourceid \
        LEFT OUTER JOIN Tags on Tags.resourceid = resources.resourceid \
      	LEFT OUTER JOIN ObjectReferences on ObjectReferences.resourceid = resources.resourceid \
      	INNER JOIN Categories on Categories.categoryid = Resources.resourcecategory \
        INNER JOIN MediaTypes on Resources.ObjectType = MediaTypes.mediatypeid \
      WHERE \
        	1 = 1 \
          AND (($1 IS NULL OR lower(resourcetitle) LIKE '%' || lower($1) || '%') \
            OR ($1 IS NULL OR lower(authorfirst) LIKE '%' || lower($1) || '%') \
            OR ($1 IS NULL OR lower(authorlast) LIKE '%' || lower($1) || '%') \
            OR ($1 IS NULL OR lower(tagtext) LIKE '%' || lower($1) || '%') \
            OR ($1 IS NULL OR lower(categorytext) LIKE '%' || lower($1) || '%')) \
          AND (($2 IS NULL OR lower(authorfirst) LIKE '%' || lower($2) || '%')\
            OR ($2 IS NULL OR lower(authorlast) LIKE '%' || lower($2) || '%'))\
          AND ($3 IS NULL OR lower (categorytext) LIKE '%' || lower($3) || '%')\
          AND ($4 IS NULL OR lower(journal) LIKE '%' || lower($4) || '%')\
          AND ($5 IS NULL OR lower(resourcetitle) LIKE '%' || lower($5) || '%')\
          AND ($6 IS NULL OR lower(tagtext) LIKE '%' || lower($6) || '%')\
          AND ($7 IS NULL OR resourcedate <= $7)\
          AND ($8 IS NULL OR resourcedate >= $8)\
          AND (rejected = FALSE)\
          AND (embargostatus = FALSE) \
          AND (($9 IS NULL or lower(title) LIKE '%' || lower($9) || '%')\
            OR ($9 IS NULL or lower(journal) LIKE '%' || lower($9) || '%')\
            OR ($9 IS NULL or lower(authors) LIKE '%' || lower($9) || '%')\
            OR ($9 IS NULL or lower(place) LIKE '%' || lower($9) || '%')\
            OR ($9 IS NULL or lower(publisher) LIKE '%' || lower($9) || '%')\
            OR ($9 IS NULL or lower(rawref) LIKE '%' || lower($9) || '%'))\
          AND ($10 IS NULL or pubYear = $10)\
          AND dr BETWEEN $12:value AND ($13:value)\
      ORDER BY $11:value \
        ;"
  console.log(sql)
  values =[q, author, category, journal, title, tagstring, maxdate, mindate, refQ, pubYear, sortField, offset, maxResource]
  console.log(values)
  db.any(sql, values)
    .then(function(data){
      //now we need to convert straight rows to nested JSON
      //structure is resource --> author(s) --> tag(s) -- > reference(s)
      success = true
      timestamp = new Date().toLocaleString()
      theJSON = {timestamp: timestamp}
      responses = {}
      for (var i =0; i<data.length; i++){
        //check if we have processed this one already
        thisRow = data[i]
        thisID = thisRow['resourceid']
        console.log(thisRow)
        if (responses[thisID] === undefined){
          responses[thisID] = {
            authors : [],
            references : [],
            tags : []
          } //this is the base response, to which we add additional properties
          //add the properties directly
          responses[thisID]['resourceID'] = thisID
          responses[thisID]['resourceTitle'] = thisRow['resourcetitle']
          responses[thisID]['resourceCreationDate'] = thisRow['resourcedate']
          responses[thisID]['resourceCategory'] = thisRow['categorytext']
          responses[thisID]['resourceShortName'] = thisRow['resourcename']
          responses[thisID]['resourceDescription'] = thisRow['resourcedescription']
          responses[thisID]['fileReference'] = thisRow['objectreference']
          responses[thisID]['mimetype'] = thisRow['mimetype']
          responses[thisID]['fileDescription'] = thisRow['Description']
          responses[thisID]['fileSize'] = thisRow['objectSize']
          responses[thisID]['uploaderName'] = thisRow['uploaderName']
        } //end new resource creation
        //if its not new, we can add authors, tags, and references
        //do this because it's a left join
        authorFirst = thisRow['authorfirst']
        authorMiddle = thisRow['authormiddle']
        authorLast = thisRow['authorlast']
        authorshipid = thisRow['authorshipid'] //this is just for reference purposes so that the object is IDed in the array
        thisAuthor = {
          'first' : authorFirst,
          'last' : authorLast,
          'middle' : authorMiddle,
          'id' : authorshipid
        }
        if (!pluckByID(responses[thisID].authors, authorshipid, true)){
          responses[thisID].authors.push(thisAuthor)
        }
        //now do tags
        tagtext = thisRow['tagtext']
        if ((tagtext != null) && (tagtext != undefined)){
          tagtext = tagtext.toLowerCase()
          if (responses[thisID].tags.indexOf(tagtext) == -1){
            responses[thisID].tags.push(tagtext)
          }
        } // end of tag-if

        //finally do references
        thisRefID = thisRow['referenceid']
        console.log(thisRefID)
        if ((thisRefID != null) && (thisRefID != undefined)){
          //we definitely have a reference then, so go ahead and parse it
          //this could be easily modified to return bibtex
          refTitle = thisRow['title']
          refAuthors = thisRow['authors']
          refJournal = thisRow['journal']
          refPlace = thisRow['place']
          refVolume = thisRow['volume']
          refPages = thisRow['pages']
          refPubYear =  thisRow['pubyear']
          refPub = thisRow['publisher']
          refDOI = thisRow['doi']
          refType = thisRow['typeofreference']
          refRaw = thisRow['rawref']
          ref  = {
            'title' : refTitle,
            'authors': refAuthors,
            'journal' : refJournal,
            'place' : refPlace,
            'volume' : refVolume,
            'pages' : refPages,
            'year' : refPubYear,
            'publisher' : refPub,
            'doi' : refDOI,
            'type' : refType,
            'string' : refRaw,
            'id' : thisRefID
          }
          if (!pluckByID(responses[thisID].references, thisRefID,  true)){
            responses[thisID].references.push(ref)
          }else{
            console.log("Reference exists.")
          }
          ref = {}
        }//end of ref-if
      } // end loop

      //now convert the object to an array for transmit
      responseList = []
      for(key in responses){
        response = responses[key]
        responseList.push(response) //this is an individual resource object
      }

      //now send it back to the client
      theJSON['data'] = responseList
      res.json(theJSON)

    }) //end db success function
    .catch(function(err){
      res.json(err)
    })
})

app.get("/", function(req, res){
  db = createConnection();
  res.json({message: "App is up and running.", serverStatus: "Running", dbStatus: "Running"})
})

function pluckByID(inArr, id, exists)
{
    for (i = 0; i < inArr.length; i++ )
    {
        if (inArr[i].id == id)
        {
            return (exists === true) ? true : inArr[i];
        }
    }
}

function pluckByName(inArr, id, exists)
{
    for (i = 0; i < inArr.length; i++ )
    {
        if (inArr[i].name == name)
        {
            return (exists === true) ? true : inArr[i];
        }
    }
}

app.listen(PORT);
