# nodejs-persistable-scheduler
==============================

## Summary:
A nodejs based, persist by mysql, timely task framework;

## Installation:
```sh
$ npm install nodejs-persistable-scheduler
```

## Dependency:
1. [q](https://www.npmjs.com/package/q): *A library for promises (CommonJS/Promises/A,B,D);*
2. [mysql](https://www.npmjs.com/package/mysql): *A node.js driver for mysql. It is written in JavaScript, does not require compiling, and is 100% MIT licensed.*

## Introduction:
This module is a nodejs based, persist by mysql, timely task framework;  
There are 4 components that compose the whole module:  
### 1. Initialization component:  
Which is repsonsible to doing the initialization works for making the functions of whole module available. In general, the initialization works are sperated into 2 parts: A system initialization task which will create 2 database tables named "fixtimetask" and "scanrecord" in the DB reference that discribed in the configurations; and a customized initialization task which will add maintaining level tasks(not user event triggered tasks, on some other words) if you need any.  
This component will be executed **ONLY ONCE** (Well, actually, you can execute it more than once within some tricky way, referring to the (Best Prectice)[#tests:] please);  
### 2. Fallback component:  
Which is responsible to doing 2 steps of fallback work evertime the current instance of [nodejs-persistable-scheduler](https://www.npmjs.com/package/nodejs-persistable-scheduler) startup: 1. Find out the in-complete executing initialization and maintainess tasks in the last running from the persistance, and run them again; And 2 start the tasks maintainess monitor;  
### 3. Task component:  
Which is a framework for registering/executing/delaying/hastening/cancelling/pausing/restarting tasks from customers; 
### 4. Result recording component:  
Which is responsible to recording the initialization/maintainess task status into persistance while executing.


## Best Prectice:
### 1. How to initial/startup:  
```js
var scheduler = require('nodejs-persistable-scheduler');
var q = require('q');
var methodArr = [];
/***************************
 ***************************
  DONT CHANGE THE ORDER of mehtodArr!!!!
  JUST PUSH THE NEW ADDED ONES AT THE TAIL!!!
  **************************
  **************************/
method1 = function(param) {
  var defer = Q.defer();
  //functional codes for method1...
  return defer.promise;
};

methodArr.push({name:'METHOD1',method1});

method2 = function(param) {
  var defer = Q.defer();
  //functional codes for method2...
  return defer.promise;
};
methodArr.push({name:'METHOD2',method2});

initialTask = function() {
  var defer = Q.defer();
  var AM = new Date();
  AM.setHours(12,0,0);
  scheduler.registerTask("daily",AM,'METHOD1',null,null).then(function(ID) {
    if (ID)
    {
      defer.resolve(true);
    }
  },function(err) {
    defer.reject(err);
  });
  return defer.promise;
};

var schedulerConfig = {
  initFunc: initialTask, 
  scanInterval: 24*60*60*1000//scan interval time, in MS
};

var initialConfig = {
  db:
  {
    host: '<DB_ADDRESS>',
    user: '<DB_ADMIN_NAME>',
    password: '<DB_ADMIN_PASSWORD>',
    database:'<DB_NAME>',
    port: <DB_PORT>
  },//DB config
  methods:methodArr,
  scheduler:schedulerConfig
};

scheduler.initialize(initialConfig);
```  
**Caution that:**  
1. Please keep available of the DB naming 'fixtimetask' and 'scanrecord' for module 'nodejs-persistable-scheduler';  
2. Inside one NODEJS instance, or multiple NODEJS instances that sharing a same DB, only 1 'nodejs-persistable-scheduler' instance allowed.  
3. For different NODEJS instances that are not sharing a same DB, there could be multiple 'nodejs-persistable-scheduler' instances.  

**Tips:**  
If you want to re-initial the whole 'nodejs-persistable-scheduler' module (run the customized initialization module more than once), you can clean up the record in DB table 'scanrecord' with recordType equals to 0;  

### 2. How to use task component:  
Refer the comments inside [nodejs-persistable-scheduler/index.js](https://github.com/easyfan/nodejs-persistable-scheduler/blob/master/index.js) please;

## Tests:

## Contributors:
* [Easyfan Zheng](mailto://zheng.easyfan@gmail.com)  

## Release History:
