var fs = require('fs');
var promise = require('bluebird'); //promise library for pgp to run on
var pgp = require('pg-promise')( //postgres promise library makes it easier to execute user queries
  {promiseLib: promise}
);

//write to a logfile
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/removal.log', {flags : 'w'});
var log_stdout = process.stdout;

writeLog = function(d) { //
  log_file.write('[' + new Date().toUTCString() + '] ' + util.format(d) + '\n');
  log_stdout.write('[' + new Date().toUTCString() + '] ' + util.format(d) + '\n');
};

writeLog("Operating from " + __dirname)

function createConnection(){
  //CREATE THE CONNECTION TO THE DATABASE
  var cn = {
      host: 'localhost',
      port: 5432,
      database: 'cartlab',
      user: 'cartlabuser',
      password: 'R0b1ns0n!'
  };

  var db = pgp(cn); //do the connection using pg-promise library
  return db
}


db = createConnection()

db.any("SELECT * FROM resources where rejected = true;") //get all the records that have been rejected
  .then(function(data){
    writeLog("Processing " + data.length + " records.")
    for (var i=0; i < data.length; i++){
      record = data[i]
      fileRef = record['objectreference']
      fileRef = "../public" + fileRef // make relative URL
      resourceID = record['resourceid']
      writeLog("Attempting to remove record " + resourceID)
      //delete the actual file
      try {
        fs.unlinkSync(fileRef)
        writeLog("\tDONE: Removed file from filesystem.")
      } catch (err){
        writeLog("\tWARNING: Failed to remove file from filesystem.")
        writeLog("\t\tError Message: " + err.message)
      }
      //remove the metadata from the db
      db.tx(function(t){
        return t.batch([
          t.none("DELETE from authorship where resourceid = $1;", [resourceID]),
          t.none("DELETE from objectreferences where resourceid= $1;", [resourceID]),
          t.none("DELETE from tags where resourceid = $1", [resourceID]),
          t.none("DELETE from resources where resourceid = $1", [resourceID]),
        ])
      }).then(function(){
          writeLog("\tDONE: Removed all references to resource in database.")
        })
        .catch(function(err){
          writeLog("\tWARNING: Failed to remove references from database.")
          writeLog("\t\t Error message: " + err.message)
        })

    }//end loop
  })
  .catch(function(err){
    writeLog("FATAL: Failed to obtain records from database.")
    writeLog("\tError Message: " + err.message)
  })
