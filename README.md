# cartlabdb
 Backend web scripts and database configuration for UW Cartography Website

## Running the service
1. Clone this repository: 
```git clone https://github.com/uwcartlab/cartlabdb/```

2. Add conf.js to the backend folder with the following format:

```
{
  "db": {
    "host" : "host.url",
    "username" : "username",
    "password" : "password",
    "db" : "dbname",
    "port" : 5432
  },
  "SMTP" : {
    "host" : "smtp.host",
    "port" : 000,
    "secure" : true or false,
    "username" : "email user",
    "password" : "email password"
  },
  "application": {
    "servePort" : 8080,
    "URI": "the uri to serve on"
  },
  "cookieKey" : "key"
}
```